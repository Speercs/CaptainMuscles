'use strict'

let Squad = require('squad');
let Mission_Creeps = require('program_mission_creeps');

class Mission_Smash extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 0;

        this.minSquadSize = 2;
        this.maxSquadSize = 4;
        this.maxTotal = 4;

        this.frontCount = 2;
        this.backCount = 2;
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'smash', room: this.data.room });

        if (!this.memory.squads)
            this.memory.squads = [];

        this.memory.creeps = _.filter(this.memory.creeps, cn => Game.creeps[cn]);

        this.creeps = this.memory.creeps.map(cn => Game.creeps[cn]);

        this.flag = Game.flags['smash'];
    }

    creepAdded(creepName)
    {
        if (this.memory.creeps.indexOf(creepName) >= 0)
        {
            console.log('Mission_Smash.creepAdded - attempted to add ' + creepName + ' to mission again');
            return;
        }

        this.memory.creeps.push(creepName);

        let squad = this.findSquadForCreep(creepName);
        squad.creeps.push(creepName);

        console.log('Mission_Smash.creepAdded - ' + creepName + ' added to squad');

        if (this.memory.creeps.length < this.maxTotal)
            this.memory.wantSpawn = 1;
        else
            delete this.memory.wantSpawn;
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

            //console.log('Mission_Smash.creepAdded - ' + creepName + ' removed from squad');

            if (squad.creeps.length <= 0)
            {
                let squadIndex = this.memory.squads.indexOf(squad);
                this.memory.squads.splice(squadIndex, 1);

                console.log('Mission_Smash.creepAdded - ' + this.data.room + ' - squad deleted');
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

    updateDesiredCreeps()
    {
        let creeps = Room.getJobCreeps(this.data.room, 'smash');
        let room = Game.rooms[this.data.room];

        let creepsDesired = this.minSquadSize;
        let roomMemory = Room.getMemory(this.data.room);
        if (roomMemory && roomMemory.hostiles && roomMemory.hostiles.tc > 2)
            creepsDesired = this.maxSquadSize;

        if (creeps.length < creepsDesired)
        {
            let noValidTargets = (room && (!room.controller.owner || room.controller.my || room.controller.safeMode || (room.towers.length <= 0 && (!room.terminal || room.terminal.my) && (!room.storage || room.storage.my))));
            if (noValidTargets)
            {
                delete this.memory.wantSpawn;
            }
            else
            {
                let fronts = _.filter(creeps, c => c.memory.type == 'front');
                let backs = _.filter(creeps, c => c.memory.type == 'back');
                if (backs.length < this.backCount && backs.length < fronts.length)
                    this.memory.wantSpawn = 'back'
                else if (fronts.length < this.frontCount)
                    this.memory.wantSpawn = 'front';
                else
                    delete this.memory.wantSpawn;
            }
        }
        else
        {
            delete this.memory.wantSpawn;
        }
    }

    run()
    {
        super.run();

        delete this.memory.flee;

        Game.map.visual.line(new RoomPosition(0, 0, this.data.room), new RoomPosition(49, 49, this.data.room), {opacity: 0.5, color: '#ff0000', width: 1});
        Game.map.visual.line(new RoomPosition(0, 49, this.data.room), new RoomPosition(49, 0, this.data.room), {opacity: 0.5, color: '#ff0000', width: 1});

        if (!this.flag)
            return this.suicide();

        let creeps = this.getCreeps();
        let fronts = _.filter(creeps, c => c.memory.type == 'front');
        let backs = _.filter(creeps, c => c.memory.type == 'back');

        for (let creep of creeps)
        {
            if (!creep.hasTask({ n: 'task_smash', r: this.data.room }))
                this.creepRemoved(creep.name);
        }

        if (creeps.length < this.minSquadSize || _.filter(creeps, c => c.spawning).length > 0)
            this.memory.flee = 1;

        this.updateDesiredCreeps();

        // if (creeps.length < this.minSquadSize && !this.memory.wantSpawn)
        // {
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
        if (squad.creeps.length > 0)
        {
            let spawnedCreeps = _.filter(squad.creeps, c => !c.spawning);
            if (spawnedCreeps.length > 0)
            {
                let oldestSquadMember = _.min(spawnedCreeps, c => c.ticksToLive)
                if (oldestSquadMember.ticksToLive <= 100)
                    squadFlee = true;
            }
        }

        if (squadFlee)
        {
            return this.doSquadFlee(squad);
        }

        if (squad.leader.room.name != this.data.room)
        {
            squad.moveTo(new RoomPosition(25, 25, this.data.room), 22);
            this.doSquadActions(squad);
        }
        else
        {
            let primaryTarget = this.selectPrimaryTarget(this.data.room, squad.leader);
            let range = 2;
    
            if (primaryTarget)
            {
                if (!primaryTarget.hasParts || !primaryTarget.hasParts(ATTACK))
                    range = 1;
    
                squad.moveTo(primaryTarget.pos, range);
            }

            this.doSquadActions(squad, primaryTarget);
        }
    }

    doSquadFlee(squad)
    {
        if (squad.leader.room.name != this.data.room)
        {
            let spawnedCreeps = _.filter(squad.creeps, c => !c.spawning);
            if (spawnedCreeps.length > 0)
            {
                let oldestSquadMember = _.min(spawnedCreeps, c => c.ticksToLive)
                let youngestSquadMember = _.max(spawnedCreeps, c => c.ticksToLive)
                if (oldestSquadMember.ticksToLive < youngestSquadMember.ticksToLive / 2)
                    return this.doSquadDisband(squad);
            }
        }

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
        console.log('Mission_Smash.doSquadDisband - ' + this.data.room + ' - disbanding squad');
        
        for (let creep of squad.creeps)
        {
            delete creep.memory.tasks;
        }
    }

    selectPrimaryTargetPos(squad)
    {
        let primaryTarget = this.selectPrimaryTarget(this.data.room, squad.leader);
        if (primaryTarget)
        {
            if (primaryTarget.pos)
                return primaryTarget.pos;
            else
                return primaryTarget;
        }

        return null;
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
        //     potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: cr => !cr.isSourceKeeper() && !cr.pos.nearEdge(0) && _.find(cr.body, p => p.type == ATTACK || p.type == RANGED_ATTACK) });
        //     if (potentialTargets.length > 0)
        //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        //
        //     return null;
        // }

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.structureType == STRUCTURE_STORAGE || st.structureType == STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = room.find(FIND_HOSTILE_SPAWNS);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        if (room.terminal && !room.terminal.my)
            return room.terminal;

        if (room.storage && !room.storage.my)
            return room.storage;

        potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        // potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));
        //
        // potentialTargets = room.find(FIND_STRUCTURES, { filter: st => !st.my && st.hits && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_CREEPS, { filter: c => !c.pos.nearEdge(0) && !c.isSourceKeeper() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        if (!this.flag)
            this.suicide();
        return null;
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
        let filter = (pt => pt.hits && !pt.my && (isEnemyBase|| (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));
        let potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 1, filter);

        return _.min(potentialTargets, pt => pt.hits);
    }

    selectMeleeTarget(creep, primaryTarget)
    {
        if (primaryTarget && primaryTarget.hits && primaryTarget.structureType && creep.pos.getRangeTo(primaryTarget.pos) <= 1)
            return primaryTarget;

        let creepFilter = (pt => !pt.my);
        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, 1, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, 1, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let structureFilter = (pt => pt.hits && !pt.my && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

        potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 1, structureFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }

    selectRangedTarget(creep, primaryTarget, range, allowRamparted)
    {
        let creepFilter = (pt => !pt.my && !pt.spawning);
        if (!allowRamparted)
            creepFilter = (pt => !pt.my && !pt.spawning && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART));

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
            structureFilter = (pt => pt.hits && !pt.my && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART) && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

        potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, range, structureFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }

    selectHealMeleeTarget(creep, hurtOnly)
    {
        let range = 1;

        let creepFilter = (pt => pt.my);
        if (hurtOnly || !Room.inDanger(creep.pos.roomName))
            creepFilter = (pt => pt.my && pt.hits < pt.hitsMax);

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

        let creepFilter = (pt => pt.my);
        if (hurtOnly || !Room.inDanger(creep.pos.roomName))
            creepFilter = (pt => pt.my && pt.hits < pt.hitsMax);

        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);


        return null;
    }
}

module.exports = Mission_Smash