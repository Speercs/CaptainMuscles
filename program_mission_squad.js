'use strict'

let Squad = require('squad');
let Mission_Creeps = require('program_mission_creeps');

class Mission_Squad extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 0;
        this.priority = PROCESS_PRIORITY_ATTACK;

        this.minSquadSize = 4;
        this.maxSquadSize = 4;
        this.maxTotal = this.data.size;
    }

    end()
    {
        console.log('****************Mission_Squad.end - ' + this.data.room + ' - mission ended');

        if (this.flag)
            this.flag.remove();

        super.end();
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'squad', room: this.data.room });

        if (!this.memory.squads)
            this.memory.squads = [];

        this.memory.squads = this.memory.squads.filter(s => s.creeps.length > 0);

        this.memory.creeps = _.filter(this.memory.creeps, cn => Game.creeps[cn]);

        this.creeps = this.memory.creeps.map(cn => Game.creeps[cn]);

        this.flag = Game.flags[this.data.flag];

        this.rallyRoom = Game.rooms[this.data.room];
        this.rallyRoomMemory = Room.getMemory(this.data.room);

        if (this.flag)
        {

            this.targetRoom = Game.rooms[this.flag.pos.roomName];
            this.targetRoomMemory = Room.getMemory(this.flag.pos.roomName);

            let colorValue = ((this.flag.secondaryColor % 10) + 1) * 4;

            this.minSquadSize = 4;
            this.maxSquadSize = 4;
            this.maxTotal = colorValue;
        }
    }

    creepAdded(creepName)
    {
        if (!Game.creeps[creepName])
            return;

        if (this.memory.creeps.indexOf(creepName) >= 0)
        {
            console.log('Mission_Squad.creepAdded - attempted to add ' + creepName + ' to mission again');
            return;
        }

        this.memory.creeps.push(creepName);

        let squad = this.findSquadForCreep(creepName);
        squad.creeps.push(creepName);

        console.log('Mission_Squad.creepAdded - ' + creepName + ' added to squad');
    }

    creepRemoved(creepName, jobMemory)
    {
        {
            let creepIndex = this.memory.creeps.indexOf(creepName);
            if (creepIndex >= 0)
            {
                this.memory.creeps.splice(creepIndex, 1);
                console.log('****************Mission_Squad.creepRemoved - ' + this.data.room + ' - ' + creepName + ' removed from mission');
            }
                
        }
        let squad = _.find(this.memory.squads, s => s.creeps.indexOf(creepName) >= 0);
        if (squad)
        {
            let creepIndex = squad.creeps.indexOf(creepName);
            squad.creeps.splice(creepIndex, 1);

            console.log('****************Mission_Squad.creepRemoved - ' + creepName + ' removed from squad');

            if (squad.creeps.length <= 0)
            {
                let squadIndex = this.memory.squads.indexOf(squad);
                this.memory.squads.splice(squadIndex, 1);

                console.log('Mission_Squad.creepRemoved - ' + this.data.room + ' - squad deleted');
            }
        }
    }

    findSquadForCreep(creepName)
    {
        let creep = Game.creeps[creepName];
        let boosted = creep && creep.memory.boosts;
        for (let squad of this.memory.squads)
        {
            if (squad.creeps.length < this.maxSquadSize)
            {
                if ((boosted && !squad.renew) || (!boosted && squad.renew))
                    return squad;
            }
        }

        let newSquad = { creeps: [], moveFormation: 'O' };
        if (!boosted)
            newSquad.renew = 1;
        this.memory.squads.push(newSquad);

        return newSquad;
    }

    updateDesiredCreeps(allCreeps, spawnedCreeps)
    {
        this.memory.wantCreep = 1;
        this.memory.wantSpawn = 1;

        let creepsMoreThanHalfAlive = allCreeps.filter(c => c.spawing || c.ticksToLive > (CREEP_LIFE_TIME / 2));

        if (creepsMoreThanHalfAlive.length >= this.maxTotal || (this.targetRoomMemory && this.targetRoomMemory.controller && this.targetRoomMemory.controller.o != ME && this.targetRoomMemory.controller.sm))
        {
            this.memory.wantSpawn = 0;
            return;
        }
    }

    updateSquads()
    {
        let leftoverCreeps = this.memory.creeps.filter(c => !this.memory.squads.find(s => s.creeps.find(cn => cn == c)));

        let incompleteSquads = this.memory.squads.filter(s => s.creeps.length < this.minSquadSize && !s.boost && !s.renew);
        if (incompleteSquads.length > 1)
        {
            for (let squad of incompleteSquads)
                leftoverCreeps = leftoverCreeps.concat(squad.creeps);

            this.memory.squads = this.memory.squads.filter(s => s.creeps.length >= this.minSquadSize || s.boost || s.renew);
        }

        for (let creepName of leftoverCreeps)
        {
            let squad = this.findSquadForCreep(creepName);
            squad.creeps.push(creepName);
        }
            
    }

    run()
    {
        super.run();

        if (!this.flag)
            return this.suicide();

        this.updateSquads();

        delete this.memory.flee;

        let creeps = this.getCreeps();

        Game.map.visual.line(new RoomPosition( 0,  0, this.flag.pos.roomName), new RoomPosition(49, 49, this.flag.pos.roomName), {opacity: 0.5, color: '#ff0000', width: 1});
        Game.map.visual.line(new RoomPosition( 0, 49, this.flag.pos.roomName), new RoomPosition(49,  0, this.flag.pos.roomName), {opacity: 0.5, color: '#ff0000', width: 1});

        for (let creep of creeps)
        {
            if (!creep.spawning && !creep.hasTask({ n: 'task_squad', r: this.data.room }))
                this.creepRemoved(creep.name);
        }

        // if (creeps.length < this.minSquadSize || _.filter(creeps, c => c.spawning).length > 0)
        //     this.memory.flee = 1;

        let creepsForJob = Room.getJobCreeps(this.data.room, 'squad');

        this.updateDesiredCreeps(creepsForJob, creeps);

        for (let squadData of this.memory.squads)
        {
            let squad = new Squad(squadData);

            if (!squad.leader)
                continue;


            squadData.advanceUnlessWounded = (this.flag.color == COLOR_GREEN);
            
            squadData.fleePos = this.getSquadFleePosition(squad);
            if (this.flag && this.flag.color == COLOR_RED)
                squadData.flee = 1;
            else
                delete squadData.flee;

            if (squadData.renew && squad.creeps.length >= this.minSquadSize)
                this.doSquadRenew(squad, squadData);
            else if (squadData.boost)
                this.doSquadBoost(squad, squadData);
            else if (!squadData.renew && !squadData.boost)
                this.doSquad(squad);
        }
    }

    doSquadRenew(squad, squadData)
    {
        console.log('Mission_Squad.doSquadRenew - ' + this.data.room + ' RENEWING');
        let renewableCreeps = squad.spawnedCreeps.filter(c => c.hasTask({ n: 'task_renew' }) || (!c.memory.boosts && Room.isMyBase(c.room.name) && CREEP_LIFE_TIME - c.ticksToLive >= (c.body.length * CREEP_SPAWN_TIME) * 2));
        if (renewableCreeps.length <= 0 && squad.spawnedCreeps.length >= 4)
        {
            delete squadData.renew;
            squadData.boost = 1;
            return;
        }
            
        for (let creep of renewableCreeps)
        {
            if (creep.hasTask({ n: 'task_renew' }))
                continue;

            let spawns = creep.room.find(FIND_MY_SPAWNS);
            let bestSpawn = spawns.find(s => !s.spawning);
            if (!bestSpawn)
                bestSpawn = _.min(spawns, s => s.spawning.remainingTime);
            if (!bestSpawn)
                continue;

            creep.pushTaskProgram('renew', 'task_renew',  { creep: creep.name, t: bestSpawn.id, x: bestSpawn.pos.x, y: bestSpawn.pos.y, r: bestSpawn.pos.roomName }, true);
        }
    }

    doSquadBoost(squad, squadData)
    {
        console.log('Mission_Squad.doSquadBoost - ' + this.data.room + ' BOOSTING');
        let boostableCreeps = squad.spawnedCreeps.filter(c => c.hasTask({ n: 'task_get_boosted' }) || c.memory.boostRequests);
        if (boostableCreeps.length <= 0)
        {
            delete squadData.boost;
            return;
        }
            
        for (let creep of boostableCreeps)
        {
            if (creep.hasTask({ n: 'task_get_boosted' }))
                continue;

            creep.pushTaskProgram('get_boosted', 'task_get_boosted',  { creep: creep.name, r: creep.room.name }, true);
        }
    }

    doSquad(squad)
    {
        if (squad.leader)
        {
            // if (Game.time % 2)
            //     squad.leader.say("LESS", true);
            // else
            //     squad.leader.say("MALARKEY", true);
            
        }
        let squadFlee = false;

        let room = Game.rooms[this.flag.pos.roomName];
        if (room && room.controller && !room.controller.my && room.controller.safeMode)
            squadFlee = true;
        // if (squad.creeps.length > 0 && squad.creeps.length <= 4)
        // {
        //     let spawnedCreeps = _.filter(squad.creeps, c => !c.spawning);
        //     if (spawnedCreeps.length > 0 && spawnedCreeps.length <= 4)
        //     {
        //         let oldestSquadMember = _.min(spawnedCreeps, c => c.ticksToLive)
        //         if (oldestSquadMember.ticksToLive <= 100)
        //             squadFlee = true;
        //     }
        // }

        if (squadFlee)
        {
            //console.log('Mission_Squad.doSquad - squad fleeing');
            squad.memory.flee = 1;
            this.doSquadActions(squad);
            return;
        }
            
        if (squad.leader.room.name != this.flag.pos.roomName)
        {
            squad.moveTarget = this.flag.pos;
            squad.moveRange = 0;
            this.doSquadActions(squad);
            return;
        }
        
        let primaryTarget = this.flag;
        if (this.flag.color != COLOR_GREEN)
            primaryTarget = this.selectPrimaryTarget(squad.leader.room.name, squad.leader) || this.flag;
        let range = 2;

        if (primaryTarget)
        {
            if (primaryTarget.owner && primaryTarget.owner.username == 'asdpof' && squad.leader.pos.getRangeTo(primaryTarget) <= 3)
                squad.leader.say('🖕', true);
                
            let targetEnRoute = this.selectTargetEnRouteToPrimaryTarget(squad.leader, primaryTarget);
            if (targetEnRoute)
                primaryTarget = targetEnRoute;

            primaryTarget.room.visual.circle(primaryTarget.pos, { radius: .45, fill: "transparent", stroke: '#ff0000', strokeWidth: .15, opacity: 0.5 });

            //console.log('Mission_Squad.doSquad - primary target at: ' + primaryTarget.pos);

            // if (!primaryTarget.hasParts || !primaryTarget.hasParts(ATTACK))
            //     range = 1;

            squad.moveTarget = primaryTarget.pos;
            squad.moveRange = range;
        }
        else
        {
            squad.moveTarget = this.flag.pos;
            squad.moveRange = 2;
        }

        this.doSquadActions(squad, primaryTarget);
    }

    getSquadFleePosition(squad)
    {
        let rallyFlag = Game.flags['rally_' + this.data.room];
        if (rallyFlag)
            return rallyFlag.pos;

        let nearestBase = Room.getNearestBase(squad.leader.room.name);
        if (nearestBase)
        {
            if (nearestBase.towerFillPos)
                return nearestBase.towerFillPos;
            else
                return nearestBase.controller.pos;
        }

        return null;
    }

    doSquadFlee(squad)
    {
        //console.log('Mission_Squad.doSquadFlee - squad fleeing');

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
        console.log('Mission_Squad.doSquadDisband - ' + this.data.room + ' - disbanding squad');
        
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

        if (this.flag && this.flag.pos.roomName == creep.room.name)
        {
            potentialTargets = this.flag.pos.lookFor(LOOK_CREEPS);
            potentialTargets = potentialTargets.concat(this.flag.pos.lookFor(LOOK_POWER_CREEPS));
            potentialTargets = potentialTargets.concat(this.flag.pos.lookFor(LOOK_STRUCTURES));
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => t.hits);
        }
  
        let inTargetRoom = (creep.room.name == room.name);

        if (!inTargetRoom)
        {
            potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: cr => !cr.spawning && !cr.pos.nearEdge(0) && cr.killOnSight() && _.find(cr.body, p => p.type == ATTACK || p.type == RANGED_ATTACK) });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        
            return null;
        }

        let accessibleObjectFilter =
        (
            o =>
            {
                if (!o.hits && !o.progress)
                    return false;

                if (o.owner && !o.killOnSight())
                    return false;

                if (o.pos.nearEdge(0))
                    return false;

                if (o.spawning && !o.body)
                    return false;

                if (o.structureType == STRUCTURE_POWER_BANK || o.structureType == STRUCTURE_CONTROLLER || o.structureType == STRUCTURE_WALL)
                    return false;

                if (o.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART))
                    return false;

                //console.log('Mission_Squad.selectPrimaryTarget - ' + creep.name + ' - looking for mapRoom flag');

                let mapRoomFlag = Game.flags['mapRoom_' + creep.room.name];
                if (!mapRoomFlag)
                    return true;

                let mapRoomProcess = kernel.scheduler.getProcessFromId(mapRoomFlag.memory.pid);
                if (!mapRoomProcess)
                    return true;

                return mapRoomProcess.objectIsAccessible(creep, o);
            }
        );

        potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: accessibleObjectFilter });

        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && (st.structureType == STRUCTURE_STORAGE || st.structureType == STRUCTURE_TERMINAL) });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = room.find(FIND_HOSTILE_SPAWNS, { filter: c => c.killOnSight()});
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

        potentialTargets = room.find(FIND_HOSTILE_CREEPS, { filter: c => !c.spawning && !c.pos.nearEdge(0) && c.hits < c.hitsMax && c.healInCombat() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

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
            let potentialTarget = _.find(pathPosition.lookFor(LOOK_STRUCTURES), st => st.attackInCombat() && st.hits && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_TERMINAL && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_CONTAINER);
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
        squad.move();
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
            if (target && creep.dismantle(target) == OK)
            {
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
            }
        }

        if (canMelee)
        {
            let target = this.selectMeleeTarget(creep, primaryTarget);
            if (target && creep.attack(target) == OK)
            {
                canDismantle = false;
                canMelee = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
            }
        }

        if (canHealMelee)
        {
            if (creep.hits < creep.hitsMax && creep.heal(creep) == OK) 
            {
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                canHealRanged = false;
            }
        }

        if (canHealMelee)
        {
            let target = this.selectHealMeleeTarget(creep, true);
            if (target && creep.pos.getRangeTo(target) <= 1 && creep.heal(target) == OK)
            {
                this.memory.lastHealTarget = target.id;
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                canHealRanged = false;
            }
        }

        if (canHealMelee && !creep.room.controller && this.memory.lastHealTarget)
        {
            let lastHealTarget = Game.getObjectById(this.memory.lastHealTarget);
            if (lastHealTarget && lastHealTarget.room.name == creep.room.name && creep.pos.getRangeTo(lastHealTarget.pos) <= 1 && creep.heal(lastHealTarget) == OK)
            {
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                canHealRanged = false;
            }
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
            if (primaryTarget && primaryTarget.attackInCombat() && creep.pos.getRangeTo(primaryTarget) <= 3)
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
            if (target && target.owner && !target.my)
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
            if (target && creep.pos.getRangeTo(target) <= 3 && creep.rangedHeal(target) == OK)
            {
                canRanged = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
            }
        }

        if (canHealMelee && primaryTarget && creep.room.name == primaryTarget.room.name && creep.heal(creep) == OK)
        {
            canDismantle = false;
            canMelee = false;
            canHealMelee = false;
            canHealRanged = false;
        }

        if (canHealMelee)
        {
            let target = this.selectHealMeleeTarget(creep, false);
            if (target && creep.pos.getRangeTo(target) <= 1 && creep.heal(target) == OK)
            {
                this.memory.lastHealTarget = target.id;
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
            }
        }

        if (canHealRanged)
        {
            let target = this.selectHealRangedTarget(creep, false);
            if (target && creep.pos.getRangeTo(target) <= 3 && creep.rangedHeal(target) == OK)
            {
                canRanged = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
            }
        }
    }

    selectDismantleTarget(creep, primaryTarget)
    {
        if (primaryTarget && primaryTarget.hits && primaryTarget.structureType && creep.pos.getRangeTo(primaryTarget.pos) <= 1)
            return primaryTarget;

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let filter = (pt => pt.hits && pt.attackInCombat() && (isEnemyBase|| (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));
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
        let creepFilter = (pt => !pt.spawning && pt.attackInCombat());
        if (!allowRamparted)
            creepFilter = (pt => !pt.spawning && pt.attackInCombat() && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART));

        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        if (primaryTarget && primaryTarget.hits && primaryTarget.structureType && creep.room.name == primaryTarget.room.name && creep.pos.getRangeTo(primaryTarget.pos) <= range)
            return primaryTarget;

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let structureFilter = (pt => pt.hits && pt.attackInCombat())// && !pt.my && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));
        if (!allowRamparted)
            structureFilter = (pt => pt.hits && pt.attackInCombat() && pt.structureType != STRUCTURE_WALL && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART) && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

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

        // if (hurtOnly && this.memory.lastHealTarget)
        // {
        //     let lastHealTarget = Game.getObjectById(this.memory.lastHealTarget);
        //     if (lastHealTarget && lastHealTarget.room.name == creep.room.name && creep.pos.getRangeTo(lastHealTarget) <= 1)
        //         return lastHealTarget;
        // }

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

module.exports = Mission_Squad