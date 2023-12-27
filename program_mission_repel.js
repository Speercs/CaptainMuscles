'use strict'

let Squad = require('squad');
let Mission_Creeps = require('program_mission_creeps');
let Job_Defend = require('job_defend');
let Job_Repel = require('job_repel');
const constants = require('./constants');

const timeOutTicks = 1000;

class Mission_Repel extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 0;
        this.priority = PROCESS_PRIORITY_ATTACK;
    }

    start()
    {
        super.start();
        this.memory.lastChecked = Game.time;
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'repel', room: this.data.room });

        if (!this.memory.squads)
            this.memory.squads = [];

        this.memory.creeps = _.filter(this.memory.creeps, cn => Game.creeps[cn]);

        this.creeps = this.memory.creeps.map(cn => Game.creeps[cn]);
    }

    creepAdded(creepName)
    {
        if (this.memory.creeps.indexOf(creepName) >= 0)
        {
            console.log('Mission_Repel.creepAdded - attempted to add ' + creepName + ' to mission again');
            return;
        }

        this.memory.creeps.push(creepName);

        let squad = this.findSquadForCreep(creepName);
        squad.creeps.push(creepName);

        this.creeps = this.memory.creeps.map(cn => Game.creeps[cn]);

        //console.log('Mission_Repel.creepAdded - ' + creepName + ' added to squad');

        this.updateDesiredCreeps();
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

            //console.log('Mission_Repel.creepAdded - ' + creepName + ' removed from squad');

            if (squad.creeps.length <= 0)
            {
                let squadIndex = this.memory.squads.indexOf(squad);
                this.memory.squads.splice(squadIndex, 1);

                console.log('Mission_Repel.creepAdded - ' + this.data.room + ' - squad deleted');
            }

            this.updateDesiredCreeps();
        }
    }

    findSquadForCreep(creepName)
    {
        for (let squad of this.memory.squads)
        {
            if (squad.creeps.length < 4)
                return squad;
        }

        let newSquad = { creeps: [], moveFormation: 'O' };
        this.memory.squads.push(newSquad);

        return newSquad;
    }

    updateDesiredCreeps()
    {
        //console.log('Mission_Repel.updateDesiredCreeps - ' + this.data.room + ' - checking');

        this.memory.minPartCount = 1;

        delete this.memory.wantSpawn;
        delete this.memory.boost;
        delete this.memory.hostileAttackSum;
        delete this.memory.myattackSum;
        //delete this.memory.flee;

        let creeps = this.creeps;//Room.getJobCreeps(this.data.room, 'repel');

        //console.log('Mission_Repel.updateDesiredCreeps - ' + this.data.room + ' - creep count: ' + creeps.length);

        let creepsByHitsPercent = _.sortBy(creeps, c => c.hitsPercent);
        let creepNamesByHitsPercent = creepsByHitsPercent.map(c => c.name);

        let fleeThreshold = 0.8;
        if (this.memory.flee)
            fleeThreshold = 1;
        let flee = false;

        // let defenders = Room.getJobSpawnedCreeps(this.data.room, 'defend');
        // if (defenders.length <= 0)
        // {
        //     for (let creepIndex in creepsByHitsPercent)
        //     {
        //         if (creepsByHitsPercent[creepIndex].hitsPercent < fleeThreshold)
        //             flee = true;
        //     }
        // }


        if (flee)
            this.memory.flee = 1;
        else
            delete this.memory.flee;

        if (!flee)
        {
            let spawningCreeps = _.filter(creeps, c => c.spawning);
            if (spawningCreeps.length > 0)
                this.memory.flee = 1;
        }

        let roomMemory = Room.getMemory(this.data.room);
        let creepTotalTicksToLive = _.sum(creeps, c => c.ticksToLive);

        // if (this.room && this.room.isMyBase() && creepTotalTicksToLive <= CREEP_LIFE_TIME && (roomMemory.hostiles || !this.room.controller.canSafeMode()) && this.room.getStructures(STRUCTURE_TOWER).length <= 0)
        // {
        //     this.memory.minPartCount = 0;
        //     this.memory.wantSpawn = 1;
        //     this.memory.flee = 1;
        //     return;
        // }

        let repelTestFlag = Game.flags['repelTest'];
        if (repelTestFlag)
        {
            if (creeps.length < 4)
            {
                this.memory.minPartCount = 0;
                this.memory.wantSpawn = 1;
                this.memory.flee = 1;
            }

            return;
        }

        if (this.room && this.room.isMyBase() && this.room.spawns.length <= 0)
        {
            if (creeps.length < 1)
            {
                this.memory.minPartCount = 0;
                this.memory.wantSpawn = 1;
                this.memory.flee = 1;
                
                return;
            }
        }

        if (roomMemory && !roomMemory.hostiles && (Room.isEnemyBase(this.data.room) || (constants.SEASON_FIVE_ACTIVE && Room.isCoreRoom(this.data.room))))
        {
            if (creeps.length < 1)
            {
                this.memory.minPartCount = 0;
                this.memory.wantSpawn = 1;
                this.memory.flee = 1;
                return;
            }
        }

        if (roomMemory && roomMemory.hostiles && !roomMemory.hostiles.etc)
        {
            //console.log('Mission_Repel.updateDesiredCreeps - ' + this.data.room + ' - found hostiles');

            let hostileAttackSum = 0;
            let hostilePartSum = 0;
            if (roomMemory.hostiles.partCount)
            {
                hostilePartSum = _.sum(roomMemory.hostiles.partCount);
                hostileAttackSum = ((roomMemory.hostiles.partCount[ATTACK] || 0) + (roomMemory.hostiles.partCount[RANGED_ATTACK] || 0) + (roomMemory.hostiles.partCount[HEAL] || 0)) || 1;
            }
                
            let myPartSum = _.sum(creeps, c => c.partCountBoosted(null, false));
            let myattackSum = this.getMyAttackSum(creeps);
            let attackDifference = hostileAttackSum - myattackSum;
            let wait = (attackDifference >= 0 && hostileAttackSum > 0);
            this.memory.hostileAttackSum = hostileAttackSum;
            this.memory.myattackSum = myattackSum;

            //console.log('Mission_Repel.updateDesiredCreeps - ' + this.data.room + ' - hostileAttackSum: ' + hostileAttackSum + ', myattackSum: ' + myattackSum);

            if (wait)
            {
                let minPartCount = 1;
                if (roomMemory.hostiles.maxPartCount)
                    minPartCount = Math.min(25, Math.ceil(hostileAttackSum / 4));//Math.max(minPartCount, (roomMemory.hostiles.maxPartCount[ATTACK] || 0), (roomMemory.hostiles.maxPartCount[RANGED_ATTACK] || 0), (roomMemory.hostiles.maxPartCount[HEAL] || 0));
                    
                if (hostileAttackSum > 432)
                    this.memory.boost = 3;
                else if (hostileAttackSum > 256)
                    this.memory.boost = 2;
                else if (hostileAttackSum > 100)
                    this.memory.boost = 1;
                

                //console.log('Mission_Repel.updateDesiredCreeps - ' + this.data.room + ' - requesting creeps');
                this.memory.minPartCount = minPartCount;
                this.memory.wantSpawn = 1;
                this.memory.flee = 1;
            }
        }
    }

    getMyAttackSum(creeps)
    {
        let attackSum = 0;
        for (let creep of creeps)
        {
            let healDivisor = 1.0;
            attackSum += creep.memory[ATTACK] || 0;
            attackSum += creep.memory[RANGED_ATTACK] || 0;
            attackSum += creep.memory[HEAL] || 0;

            if (creep.memory.boostRequests)
            {
                for (let boostRequest of creep.memory.boostRequests)
                {
                    let desiredBoost = boostRequest.boost;
                    switch(desiredBoost)
                    {
                        case 'UH':
                            attackSum += creep.memory[ATTACK];
                            break;
                        case 'UH2O':
                            attackSum += creep.memory[ATTACK] * 2;
                            break;
                        case 'XUH2O':
                            attackSum += creep.memory[ATTACK] * 3;
                            break;

                        case 'KO':
                            attackSum += creep.memory[RANGED_ATTACK];
                            break;
                        case 'KHO2':
                            attackSum += creep.memory[RANGED_ATTACK] * 2;
                            break;
                        case 'XKHO2':
                            attackSum += creep.memory[RANGED_ATTACK] * 3;
                            break;

                        case 'LO':
                            attackSum += creep.memory[HEAL];
                            break;
                        case 'LHO2':
                            attackSum += creep.memory[HEAL] * 2;
                            break;
                        case 'XLHO2':
                            attackSum += creep.memory[HEAL] * 3;
                            break;

                        case 'GO':
                            healDivisor = 0.7;
                            break;
                        case 'GHO2':
                            healDivisor = 0.5;
                            break;
                        case 'XGHO2':
                            healDivisor = 0.3;
                            break;
                    }   
                }
            }
            
            if (creep.memory.boosts)
            {
                for (let boost of creep.memory.boosts)
                {
                    switch(boost)
                    {
                        case 'UH':
                            attackSum += creep.memory[ATTACK];
                            break;
                        case 'UH2O':
                            attackSum += creep.memory[ATTACK] * 2;
                            break;
                        case 'XUH2O':
                            attackSum += creep.memory[ATTACK] * 3;
                            break;

                        case 'KO':
                            attackSum += creep.memory[RANGED_ATTACK];
                            break;
                        case 'KHO2':
                            attackSum += creep.memory[RANGED_ATTACK] * 2;
                            break;
                        case 'XKHO2':
                            attackSum += creep.memory[RANGED_ATTACK] * 3;
                            break;

                        case 'LO':
                            attackSum += creep.memory[HEAL];
                            break;
                        case 'LHO2':
                            attackSum += creep.memory[HEAL] * 2;
                            break;
                        case 'XLHO2':
                            attackSum += creep.memory[HEAL] * 3;
                            break;

                        case 'GO':
                            healDivisor = 0.7;
                            break;
                        case 'GHO2':
                            healDivisor = 0.5;
                            break;
                        case 'XGHO2':
                            healDivisor = 0.3;
                            break;
                    }   
                }
            }

            //attackSum = attackSum * (creep.ticksToLive || CREEP_LIFE_TIME) / CREEP_LIFE_TIME;

            attackSum = Math.ceil(attackSum / healDivisor);
        }
        
        return attackSum;
    }

    run()
    {
        super.run();

        let roomMemory = Room.getMemory(this.data.room);
        let room = Game.rooms[this.data.room];

        if (room)
            this.memory.lastChecked = Game.time;

        if (this.wantToEndMission(room, roomMemory))
            return this.suicide();

        Game.map.visual.rect(new RoomPosition(0, 0, this.data.room), 50, 50, {fill: 'transparent', stroke: '#ff0000', strokeWidth: 1});

        delete this.memory.doRemote;
    
        if (this.wantToDoMissionRemotely(room, roomMemory))
            this.memory.doRemote = 1;
        
        let testFlag = Game.flags['repelTest'];
        if (testFlag && testFlag.pos.roomName != this.data.room)
            testFlag = null;


        let removedSomeone = false;
        let creeps = this.getCreeps();
        for (let creep of creeps)
        {
            if (!creep.hasTask({ n: 'task_repel', r: this.data.room }) || ((creep.memory.n > 3 ||creep.memory.boosts) && !roomMemory.hostiles))
            {
                removedSomeone = true;
                this.creepRemoved(creep.name);
            }
        }

        if (removedSomeone)
            creeps = this.getCreeps();

        for (let creep of creeps)
        {
            if (creep.room.name != this.data.room && creep.memory.pid)
            {
                if (Room.inDanger(creep.room.name))
                {
                    let defendMissionInfo = { type: 'defend', room: creep.room.name };
                    let defendMissionMemory = Mission_Creeps.getMemory(defendMissionInfo);
    
                    if (defendMissionMemory && (!creep.memory.boosts || defendMissionMemory.wantSpawn))
                    {
                        removedSomeone = true;
                        console.log('Mission_Repel.run - moving ' + creep.name + ' to defend mission for ' + creep.room.name);
                        kernel.scheduler.callProcessFunction(creep.memory.pid, 'laidOff');
                        let newTask = Job_Defend.createTask(creep.room.name);
                        newTask.room = creep.room.name;
                        kernel.scheduler.callProcessFunction(creep.memory.pid, 'assignToJobTask', newTask);
                        continue;
                    }
                }
                

                let currentRoomMissionInfo = { type: 'repel', room: creep.room.name };
                let currentRoomMissionMemory = Mission_Creeps.getMemory(currentRoomMissionInfo);

                if (currentRoomMissionMemory && (!creep.memory.boosts || currentRoomMissionMemory.wantSpawn))
                {
                    removedSomeone = true;
                    console.log('Mission_Repel.run - moving ' + creep.name + ' to repel mission for ' + creep.room.name);
                    kernel.scheduler.callProcessFunction(creep.memory.pid, 'laidOff');
                    let newTask = Job_Repel.createTask(creep.room.name);
                    newTask.room = creep.room.name;
                    kernel.scheduler.callProcessFunction(creep.memory.pid, 'assignToJobTask', newTask);
                    continue;
                }
            }
        }

        if (removedSomeone)
            creeps = this.getCreeps();

        this.updateDesiredCreeps();

        for (let squadData of this.memory.squads)
        {
            let squad = new Squad(squadData);

            if (!squad.leader)
                continue;

            squadData.advanceUnlessWounded = (!this.memory.flee);

            if (this.memory.flee)
                this.doSquadFlee(squad);
            else
                this.doSquad(squad, testFlag);
        }
    }

    wantToDoMissionRemotely(room, roomMemory)
    {
        if (roomMemory.defendUntil)
            return true;

        if (Room.isEnemyBase(this.data.room))
            return true;

        if (Room.wantToClaim(this.data.room) || (Room.isMyBase(this.data.room) && room && room.spawns.length <= 0))// || (!Room.isMyBase(this.data.room) && Room.isEnemyBase(this.data.room) && Room.trusted(this.data.room))))
            return true;

        if (constants.SEASON_FIVE_ACTIVE && Room.isCoreRoom(this.data.room))
            return true;

        if (room)
        {
            let hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
            return hostileCreeps.some(c => c.killRemotely());
        }

        return false;
    }

    wantToEndMission(room, roomMemory)
    {
        let testFlag = Game.flags['repelTest'];
        if (testFlag && testFlag.pos.roomName != this.data.room)
            testFlag = null;

        if (testFlag)
            return false;
            

        if (!roomMemory)
        {
            console.log('0000000000000000000000000 - Mission_Repel.wantToEndMission - ' + this.data.room + ' - ending mission - no roomMemory');
            return true;
        }
            
        if (room && room.controller && room.controller.safeMode && !roomMemory.hostiles)
        {
            console.log('0000000000000000000000000 - Mission_Repel.wantToEndMission - ' + this.data.room + ' - safemode - no hostiles');
            return true;
        }

        if (roomMemory.controller && roomMemory.controller.sm && roomMemory.controller.sm > Game.time && roomMemory.controller.o != ME)
        {
            console.log('0000000000000000000000000 - Mission_Repel.wantToEndMission - ' + this.data.room + ' - safemode - not my base');
            return true;
        }

        if (roomMemory.defendUntil)
            return false;

        if (!Room.isMyBase(this.data.room) && Room.wantToClaim(this.data.room))
            return false;

        if (constants.SEASON_FIVE_ACTIVE && Room.isCoreRoom(this.data.room))
            return false;

        if (room && room.isMyBase() && (room.isBootstrapping() || room.spawns.length <= 0))
            return false;

        if (Room.isEnemyBase(this.data.room) && Room.trusted(this.data.room))
        {
            if (!room)
                return false;

            return (room.spawns.length > 0 && room.towers.length > 0)
        }

        if (room && roomMemory.hostiles && roomMemory.hostiles.etc)
        {
            console.log('0000000000000000000000000 - Mission_Repel.wantToEndMission - ' + this.data.room + ' - enemy has energized towers');
            return true;
        }

        if (room && (room.find(FIND_CREEPS).some(c => c.hits < c.hitsMax && c.healInCombat()) || room.find(FIND_HOSTILE_STRUCTURES).some(c => c.killOnSight())))
            return false;

        if (roomMemory.hostiles && !roomMemory.hostiles.tc && !roomMemory.hostiles.partCount)
        {
            console.log('0000000000000000000000000 - Mission_Repel.wantToEndMission - ' + this.data.room + ' - no targets');
            return true;
        }

        if (!roomMemory.hostiles && (!Room.isEnemyBase(this.data.room) || Room.friendly(this.data.room)))
        {
            console.log('0000000000000000000000000 - Mission_Repel.wantToEndMission - ' + this.data.room + ' - no targets 2');
            return true;
        }

        if (!this.memory.lastChecked || Game.time - this.memory.lastChecked > timeOutTicks)
        {
            console.log('0000000000000000000000000 - Mission_Repel.wantToEndMission - ' + this.data.room + ' - time out');
            return true;
        }
    }

    doSquad(squad, testFlag)
    {
        let primaryTarget = this.selectPrimaryTarget(this.data.room, squad.leader);
        let range = 2;

        if (primaryTarget)
        {
            if (primaryTarget.progress)
                range = 0;
            else if (!primaryTarget.hasParts || !primaryTarget.hasParts(ATTACK))
                range = 1;

            primaryTarget.room.visual.circle(primaryTarget.pos, { radius: .45, fill: "transparent", stroke: '#ff0000', strokeWidth: .15, opacity: 0.5 });

            squad.moveTarget = primaryTarget.pos;
            squad.moveRange = range;

            squad.move();
        }
        else if (testFlag)
        {
            squad.moveTarget = testFlag.pos;
            squad.moveRange = 2;

            squad.move();
        }
        else
        {
            squad.moveTarget = new RoomPosition(25, 25, this.data.room);
            squad.moveRange = 22;

            squad.move();
        }

        this.doSquadActions(squad, primaryTarget);
    }

    doSquadFlee(squad)
    {
        // if (!Room.inDanger(creep.room.name))
        //     return creep;

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

        let inTargetRoom = (creep.room.name == roomName);
        let attackInvaderCore = false;//!Room.isCenterRoom(roomName);
        
        if (!inTargetRoom)
        {
            potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: cr => !cr.spawning && !cr.pos.nearEdge(0) && cr.killOnSight() && _.find(cr.body, p => p.type == ATTACK || p.type == RANGED_ATTACK) });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        
            return null;
        }

        
        let room = Game.rooms[roomName];
        if (!room)
            return null;

        let accessibleObjectFilter =
        (
            o =>
            {
                if (!o.hits && !o.progress)
                    return false;

                if (o.pos.nearEdge(0))
                    return false;

                if (o.spawning && !o.body)
                    return false;

                if (o.owner && !o.killOnSight())
                    return false;

                if (o.structureType == STRUCTURE_POWER_BANK || o.structureType == STRUCTURE_CONTROLLER || o.structureType == STRUCTURE_WALL)
                    return false;

                if (o.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART))
                    return false;

                //console.log('Mission_Repel.selectPrimaryTarget - ' + creep.name + ' - looking for mapRoom flag');

                let mapRoomFlag = Game.flags['mapRoom_' + creep.room.name];
                if (!mapRoomFlag)
                    return true;

                let mapRoomProcess = kernel.scheduler.getProcessFromId(mapRoomFlag.memory.pid);
                if (!mapRoomProcess)
                    return true;

                return mapRoomProcess.objectIsAccessible(creep, o);
            }
        );

        potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: accessibleObjectFilter })
                   .concat(creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: accessibleObjectFilter }))
                   .concat(creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES, { filter: accessibleObjectFilter }));
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && (st.structureType == STRUCTURE_STORAGE || st.structureType == STRUCTURE_TERMINAL) });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = room.find(FIND_HOSTILE_SPAWNS, { filter: st => st.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_CREEPS, { filter: c => !c.spawning && !c.pos.nearEdge(0) && c.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_CONSTRUCTION_SITES, { filter: st => st.killOnSight() && st.progress });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && (attackInvaderCore || st.structureType != STRUCTURE_INVADER_CORE) && st.structureType != STRUCTURE_POWER_BANK });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        // potentialTargets = room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));
        //

        if (Room.isEnemyBase(room.name) && Room.killOnSight(room.name))
        {
            potentialTargets = room.find(FIND_STRUCTURES, { filter: st => st.hits });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));
        }

        potentialTargets = room.find(FIND_MY_CREEPS, { filter: c => !c.spawning && !c.pos.nearEdge(0) && c.hits < c.hitsMax });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        if (constants.SEASON_FIVE_ACTIVE && creep.room.reactor)
            return creep.room.reactor;

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
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                creep.heal(target);
            }
        }

        if (canRanged)
        {
            let target = this.selectRangedTarget(creep, primaryTarget);
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

    selectRangedTarget(creep, primaryTarget)
    {
        let range = 3;

        let creepFilter = (pt => !pt.spawning && pt.attackInCombat());
        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.max(potentialTargets, pt => pt.partCount(ATTACK, false) + pt.partCount(RANGED_ATTACK, false) + pt.partCount(HEAL, false) + ((pt.hitsMax - pt.hits) / 100));

        if (primaryTarget && !primaryTarget.spawning && primaryTarget.hits && primaryTarget.structureType && creep.pos.getRangeTo(primaryTarget.pos) <= range)
            return primaryTarget;

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let structureFilter = (pt => pt.hits && pt.attackInCombat() && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

        potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 3, structureFilter);
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

module.exports = Mission_Repel
