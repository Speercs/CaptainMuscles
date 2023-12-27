'use strict'

let Squad = require('squad');
let Mission_Creeps = require('program_mission_creeps');

class Mission_Assault extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 0;
        this.priority = PROCESS_PRIORITY_ATTACK;

        this.minSquadSize = 1;
        this.maxSquadSize = Infinity;
        this.maxTotal = 4;
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'assault', room: this.data.room });

        if (!this.memory.squads)
            this.memory.squads = [];

        this.memory.creeps = _.filter(this.memory.creeps, cn => Game.creeps[cn]);

        this.creeps = this.memory.creeps.map(cn => Game.creeps[cn]);

        this.flag = Game.flags['assault'];

        this.room = Game.rooms[this.data.room];
        if (this.flag)
            this.targetRoom = Game.rooms[this.flag.pos.roomName];
    }

    creepAdded(creepName)
    {
        if (this.memory.creeps.indexOf(creepName) >= 0)
        {
            console.log('Mission_Assault.creepAdded - attempted to add ' + creepName + ' to mission again');
            return;
        }

        this.memory.creeps.push(creepName);

        let squad = this.findSquadForCreep(creepName);
        squad.creeps.push(creepName);

        console.log('Mission_Assault.creepAdded - ' + creepName + ' added to squad');
    }

    creepRemoved(creepName, jobMemory)
    {
        {
            let creepIndex = this.memory.creeps.indexOf(creepName);
            if (creepIndex >= 0)
                this.memory.creeps.splice(creepIndex, 1);
        }

        let squad = _.find(this.memory.squads, s => s.creeps.indexOf(creepName) >= 0);
        if (squad)
        {
            let creepIndex = squad.creeps.indexOf(creepName);
            squad.creeps.splice(creepIndex, 1);

            console.log('****************Mission_Assault.creepAdded - ' + creepName + ' removed from squad');

            if (squad.creeps.length <= 0)
            {
                let squadIndex = this.memory.squads.indexOf(squad);
                this.memory.squads.splice(squadIndex, 1);

                console.log('Mission_Assault.creepAdded - ' + this.data.room + ' - ' + this.flag.pos.roomName + ' - squad deleted');
            }
        }
    }

    findSquadForCreep(creepName)
    {
        for (let squad of this.memory.squads)
        {
            if (squad.creeps.length < this.maxSquadSize)
                return squad;
        }

        let newSquad = { creeps: [], moveFormation: 'O' };
        this.memory.squads.push(newSquad);

        return newSquad;
    }

    updateDesiredCreeps(allCreeps, spawnedCreeps)
    {
        let creepsDesired = this.maxTotal;

        let maxLifeTime = creepsDesired * CREEP_LIFE_TIME
        let totalLife = _.sum(allCreeps, o => o.ticksToLive || CREEP_LIFE_TIME);
        let totalLifeSpawned = _.sum(allCreeps, o => o.ticksToLive || CREEP_LIFE_TIME);

        if (totalLife >= maxLifeTime)
        {
            delete this.memory.wantSpawn;
        }
        else if (!this.flag)
        {
            let noValidTargets = (this.targetRoom && (!this.targetRoom.controller.owner || this.targetRoom.controller.my || this.targetRoom.controller.safeMode || (this.targetRoom.towers.length <= 0 && (!this.targetRoom.terminal || this.targetRoom.terminal.my) && (!this.targetRoom.storage || this.targetRoom.storage.my))));
            if (noValidTargets)
            {
                delete this.memory.wantSpawn;
            }
        }
        else
        {
            this.memory.wantSpawn = 1;
        }

        if (totalLifeSpawned < maxLifeTime)
        {
            this.memory.wantCreep = 1;
        }
        else
        {
            this.memory.wantCreep = 1;
        }
    }

    run()
    {
        super.run();

        delete this.memory.flee;

        if (this.targetRoom && this.targetRoom.controller && (this.targetRoom.controller.my || this.targetRoom.controller.safeMode))
        {
            if (this.flag)
                this.flag.remove();
            return this.suicide();
        }

        Game.map.visual.line(new RoomPosition(0, 0, this.flag.pos.roomName), new RoomPosition(49, 49, this.flag.pos.roomName), {opacity: 0.5, color: '#ff0000', width: 1});
        Game.map.visual.line(new RoomPosition(0, 49, this.flag.pos.roomName), new RoomPosition(49, 0, this.flag.pos.roomName), {opacity: 0.5, color: '#ff0000', width: 1});

        // if (!this.flag)
        //     return this.suicide();

        let creeps = this.getCreeps();

        for (let creep of creeps)
        {
            if (!creep.hasTask({ n: 'task_assault', r: this.data.room }))
                this.creepRemoved(creep.name);
        }

        if (creeps.length < this.minSquadSize || _.filter(creeps, c => c.spawning).length > 0)
            this.memory.flee = 1;

        let creepsForJob = Room.getJobCreeps(this.data.room, 'assault');

        this.updateDesiredCreeps(creepsForJob, creeps);

        // if (creepsForJob.length < this.minSquadSize && !this.memory.wantSpawn && !this.memory.wantCreep)
        // {
        //     console.log('Mission_Assault.run - do not want creeps');
        //     return this.suicide();
        // }

        for (let squadData of this.memory.squads)
        {
            let squad = new Squad(squadData);

            if (!squad.leader)
                continue;

            if (this.memory.flee)
                this.doSquadFlee(squad);
            else
                this.doSquad(squad);
        }
    }

    doSquad(squad)
    {
        let squadFlee = false;
        if (squad.creeps.length > 0 && squad.creeps.length <= 4)
        {
            let spawnedCreeps = _.filter(squad.creeps, c => !c.spawning);
            if (spawnedCreeps.length > 0 && spawnedCreeps.length <= 4)
            {
                let oldestSquadMember = _.min(spawnedCreeps, c => c.ticksToLive)
                if (oldestSquadMember.ticksToLive <= 100)
                    squadFlee = true;
            }
        }

        if (squadFlee)
        {
            console.log('Mission_Assault.doSquad - squad fleeing');
            return this.doSquadFlee(squad);
        }

        let rallyRoom = this.data.room;
        let rallyPos = new RoomPosition(25, 25, this.data.room);
        let rallyDistance = 22;

        if (squad.leader.room.name != rallyRoom && squad.leader.room.name != this.flag.pos.roomName)
        {
            squad.moveTo(rallyPos, rallyDistance, this.data.room);
            this.doSquadActions(squad);
            return;
        }

        if (this.flag)
        {
            rallyRoom = this.flag.pos.roomName;
            rallyPos = this.flag.pos;
            rallyDistance = 1;
        }
            
        if (squad.leader.room.name != rallyRoom)
        {
            squad.moveTo(rallyPos, rallyDistance, this.data.room);
            this.doSquadActions(squad);
            return;
        }
        
        let primaryTarget = this.selectPrimaryTarget(rallyRoom, squad.leader);
        let range = 2;

        if (primaryTarget)
        {
            let targetEnRoute = this.selectTargetEnRouteToPrimaryTarget(squad.leader, primaryTarget);
            if (targetEnRoute)
                primaryTarget = targetEnRoute;

            primaryTarget.room.visual.circle(primaryTarget.pos, { radius: .45, fill: "transparent", stroke: '#ff0000', strokeWidth: .15, opacity: 0.5 });

            console.log('Mission_Assault.doSquad - primary target at: ' + primaryTarget.pos);

            if (!primaryTarget.hasParts || !primaryTarget.hasParts(ATTACK))
                range = 1;

            squad.moveTo(primaryTarget.pos, range, this.data.room);
        }
        else
        {
            squad.moveTo(rallyPos, rallyDistance, this.data.room);
        }

        this.doSquadActions(squad, primaryTarget);
    }

    doSquadFlee(squad)
    {
        console.log('Mission_Assault.doSquadFlee - squad fleeing');

        // if (squad.leader.room.name != rallyRoom && squad.leader.room.name != this.flag.pos.roomName)
        // {
        //     let spawnedCreeps = _.filter(squad.creeps, c => !c.spawning);
        //     if (spawnedCreeps.length > 0)
        //     {
        //         let oldestSquadMember = _.min(spawnedCreeps, c => c.ticksToLive)
        //         let youngestSquadMember = _.max(spawnedCreeps, c => c.ticksToLive)
        //         if (oldestSquadMember.ticksToLive < youngestSquadMember.ticksToLive / 2)
        //             return this.doSquadDisband(squad);
        //     }
        // }

        let nearestBase = Room.getNearestBase(squad.leader.room.name);
        if (nearestBase)
        {
            if (nearestBase.towerFillPos)
                squad.moveTo(nearestBase.towerFillPos, 3);
            else
                squad.moveTo(nearestBase.controller.pos, 3);
        }

        this.doSquadActions(squad);
    }

    doSquadDisband(squad)
    {
        console.log('Mission_Assault.doSquadDisband - ' + this.data.room + ' - ' + this.flag.pos.roomName + ' - disbanding squad');
        
        for (let creep of squad.creeps)
        {
            delete creep.memory.tasks;
        }
    }

    selectPrimaryTarget(roomName, creep)
    {
        let potentialTargets = [];
        let room = Game.rooms[roomName];
        if (!room)
            return null;

        // let inTargetRoom = (creep.room.name == room.name);
        //
        // if (!inTargetRoom)
        // {
        //     potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: cr => cr.killOnSight() && !cr.pos.nearEdge(0) && _.find(cr.body, p => p.type == ATTACK || p.type == RANGED_ATTACK) });
        //     if (potentialTargets.length > 0)
        //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        //
        //     return null;
        // }

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && (st.structureType == STRUCTURE_STORAGE || st.structureType == STRUCTURE_TERMINAL) });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_SPAWNS, range, { filter: c => c.killOnSight()});
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        if (room.terminal && room.terminal.killOnSight())
            return room.terminal;

        if (room.storage && room.storage.killOnSight())
            return room.storage;

        potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        // potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));
        //
        // potentialTargets = room.find(FIND_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_CREEPS, { filter: c => !c.pos.nearEdge(0) && c.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        if (!this.flag)
            this.suicide();
        return null;
    }

    selectTargetEnRouteToPrimaryTarget(leader, target)
    {
        let pathInfo = PathFinder.search(leader.pos, {pos: target.pos, range: 1}, {maxRooms: 1, plainCost: 1, swampCost: 5, maxOps: 500000, roomCallback: this.makeEnRouteCostMatrix});
        if (pathInfo.incomplete)
        {
            console.log('Squad.selectTargetEnRouteToPrimaryTarget - ' + leader.pos + ' -> ' + target.pos + ' - could not find path');
            return null;
        }

        for (let pathPosition of pathInfo.path)
        {
            let potentialTarget = _.find(pathPosition.lookFor(LOOK_STRUCTURES), st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_CONTAINER);
            if (potentialTarget)
                return potentialTarget;
        }

        return null;
    }

    makeEnRouteCostMatrix(roomName)
    {
        let costMatrix = new PathFinder.CostMatrix;

        let roadCost = 1;
        let demolishableCost = 250;

        let room = Game.rooms[roomName];
        if (!room)
            return costMatrix;

        let structures = room.find(FIND_STRUCTURES);
        if (!structures || structures.length <= 0)
            return costMatrix;

        let maxHits = _.max(structures, s => s.hits).hits;

        structures.forEach(function(struct)
        {
            // Walk on roads
            if (struct.structureType === STRUCTURE_ROAD)
                costMatrix.set(struct.pos.x, struct.pos.y, roadCost);
            else if (!struct.attackInCombat() && struct.blocksMovement())
                costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
            // // Try to go around demolishable buildings
            // else if (struct.isDemolishable())
            //     costMatrix.set(struct.pos.x, struct.pos.y, demolishableCost);
            else if (!struct.my && (struct.structureType == STRUCTURE_RAMPART || struct.structureType == STRUCTURE_WALL))
                costMatrix.set(struct.pos.x, struct.pos.y, Math.max(1, (struct.hits / maxHits) * 250));
            else if (struct.blocksMovement())
                costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
        });

        return costMatrix;
    }

    doSquadActions(squad, primaryTarget)
    {
        for (let creep of squad.creeps)
            this.doSquadCreepActions(creep, squad, primaryTarget);
    }

    doSquadCreepActions(creep, squad, primaryTarget)
    {
        let canDismantle = !!creep.memory[WORK];
        let canMelee = !!creep.memory[ATTACK];
        let canRanged = !!creep.memory[RANGED_ATTACK];
        let canHeal = !!creep.memory[HEAL];
        let canHealMelee = canHeal;
        let canHealRanged = canHeal;

        if (canDismantle)
        {
            let target = this.selectDismantleTarget(creep, primaryTarget);
            if (target)
            {
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                creep.dismantle(target);
            }
        }

        if (canMelee)
        {
            let target = this.selectMeleeTarget(creep, primaryTarget);
            if (target)
            {
                canDismantle = false;
                canMelee = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
                creep.attack(target);
            }
        }

        if (canHealMelee)
        {
            let target = this.selectHealMeleeTarget(creep, true);
            if (target)
            {
                this.memory.lastHealTarget = target.id;
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                canHealRanged = false;
                creep.heal(target);
            }
        }

        if (canHealMelee && primaryTarget && creep.room.name == primaryTarget.room.name)
        {
            canDismantle = false;
            canMelee = false;
            canHealMelee = false;
            canHealRanged = false;
            creep.heal(creep);
        }

        if (canRanged)
        {
            let target = this.selectRangedTarget(creep, primaryTarget, 3, false);
            if (target)
            {
                canRanged = false;
                canHealRanged = false;

                if (creep.pos.getRangeTo(target) <= 1 && (target.owner && !target.my))
                    creep.rangedMassAttack();
                else
                    creep.rangedAttack(target);
            }
        }

        if (canRanged)
        {
            if (primaryTarget && creep.pos.getRangeTo(primaryTarget) <= 3)
            {
                canRanged = false;
                canHealRanged = false;

                if (creep.pos.getRangeTo(primaryTarget) <= 1 && (primaryTarget.owner && !primaryTarget.my))
                    creep.rangedMassAttack();
                else
                    creep.rangedAttack(primaryTarget);
            }
        }

        if (canRanged)
        {
            let target = this.selectRangedTarget(creep, primaryTarget, 1, true);
            if (target)
            {
                canRanged = false;
                canHealRanged = false;

                if (creep.pos.getRangeTo(target) <= 1 && (target.owner && !target.my))
                    creep.rangedMassAttack();
                else
                    creep.rangedAttack(target);
            }
        }

        if (canRanged)
        {
            let target = this.selectRangedTarget(creep, primaryTarget, 3, true);
            if (target)
            {
                canRanged = false;
                canHealRanged = false;

                creep.rangedAttack(target);
            }
        }

        if (canHealRanged)
        {
            let target = this.selectHealRangedTarget(creep, true);
            if (target)
            {
                canRanged = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
                creep.rangedHeal(target);
            }
        }

        if (canHealMelee)
        {
            let target = this.selectHealMeleeTarget(creep, false);
            if (target)
            {
                this.memory.lastHealTarget = target.id;
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                creep.heal(target);
            }
        }

        if (canHealRanged)
        {
            let target = this.selectHealRangedTarget(creep, false);
            if (target)
            {
                canRanged = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
                creep.rangedHeal(target);
            }
        }
    }

    selectDismantleTarget(creep, primaryTarget)
    {
        if (primaryTarget && primaryTarget.hits && primaryTarget.structureType && creep.pos.getRangeTo(primaryTarget.pos) <= 1)
            return primaryTarget;

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let filter = (pt => pt.hits && pt.attackInCombat() && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));
        let potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 1, filter);

        return _.min(potentialTargets, pt => pt.hits);
    }

    selectMeleeTarget(creep, primaryTarget)
    {
        if (primaryTarget && primaryTarget.hits && primaryTarget.structureType && creep.pos.getRangeTo(primaryTarget.pos) <= 1)
            return primaryTarget;

        let creepFilter = (pt => pt.attackInCombat());
        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, 1, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, 1, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let structureFilter = (pt => pt.hits && pt.attackInCombat() && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

        potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 1, structureFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }

    selectRangedTarget(creep, primaryTarget, range, allowRamparted)
    {
        let creepFilter = (pt => !pt.my && !pt.spawning && pt.attackInCombat());
        if (!allowRamparted)
            creepFilter = (pt => !pt.my && !pt.spawning && pt.attackInCombat() && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART));

        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        if (primaryTarget && primaryTarget.hits && primaryTarget.structureType && creep.room.name == primaryTarget.room.name && creep.pos.getRangeTo(primaryTarget.pos) <= range)
            return primaryTarget;

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let structureFilter = (pt => pt.hits && !pt.my && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));
        if (!allowRamparted)
            structureFilter = (pt => pt.hits && pt.attackInCombat() && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART) && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

        potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, range, structureFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }

    selectHealMeleeTarget(creep, hurtOnly)
    {
        let range = 1;

        let creepFilter = (pt => pt.my && pt.healInCombat());
        if (hurtOnly || !Room.inDanger(creep.pos.roomName))
            creepFilter = (pt => pt.my && pt.hits < pt.hitsMax && pt.healInCombat());

        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        if (hurtOnly && this.memory.lastHealTarget)
        {
            let lastHealTarget = Game.getObjectById(this.memory.lastHealTarget);
            if (lastHealTarget && creep.pos.getRangeTo(lastHealTarget) <= 1)
                return lastHealTarget;
        }

        return null;
    }

    selectHealRangedTarget(creep, hurtOnly)
    {
        let range = 3;

        let creepFilter = (pt => pt.my && pt.healInCombat());
        if (hurtOnly || !Room.inDanger(creep.pos.roomName))
            creepFilter = (pt => pt.my && pt.hits < pt.hitsMax && pt.healInCombat());

        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);


        return null;
    }
}

module.exports = Mission_Assault