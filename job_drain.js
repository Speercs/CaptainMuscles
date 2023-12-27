'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Drain extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Drain.constructor - executing');

        this.jobType = 'drain';
        this.desiredSpawnType = 'ranged_boosted';
    
        this.isMilitary = true;
    }

    getDesiredSpawn(spawn)
    {
        // let drainFlag = Game.flags['drain_' + this.roomName] || Game.flags['drain'];
        // // if (!drainFlag || drainFlag.pos.roomName != this.roomName)
        // //     return null;

        let task = this.getTask(null, spawn);
        if (!task)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredSpawn - ' + this.roomName + ' - TASK not available to ' + spawn.room.name );
            return null;
        }
            
        let partList = this.getDesiredPartList(spawn);
        if (!partList || partList.length <= 0)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredSpawn - ' + this.roomName + ' - PARTS not available to ' + spawn.room.name );
            return null;
        }

        let boosts = this.getDesiredBoosts(spawn, partList);
        if (!boosts)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredSpawn - ' + this.roomName + ' - BOOSTS not available to ' + spawn.room.name );
            return null;
        }

        //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredSpawn - ' + this.roomName + ' - requesting spawn in ' + spawn.room.name );

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, partList: partList, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        return null;
        let drainFlag = Game.flags['drain_' + this.roomName] || Game.flags['drain'];
        // if (!drainFlag || drainFlag.pos.roomName != this.roomName)
        //     return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && !creep.memory.boosts && !creep.memory.boostRequests)
            return null;

        // if (Room.isEnemyBase(this.roomName) && !Game.flags['attack_' + this.roomName])
        //     return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return null;

        if (roomMemory.noDrain)
            return null;

        if (roomMemory.controller && roomMemory.controller.sm && roomMemory.controller.sm > Game.time)
            return null;

        // if (!roomMemory.hostiles)
        //     return null;

        // if (roomMemory.controller)
        //     return null;

        // if (!roomMemory.hostiles.etc && !roomMemory.hostiles.sc)
        //     return null;

        // if (roomMemory.hostiles.etc && roomMemory.hostiles.etc > 3)
        //     return null;

        // if (!roomMemory || (roomMemory.controller && roomMemory.controller.sm && roomMemory.controller.sm > Game.time) || !roomMemory.hostiles || !roomMemory.hostiles.etc || roomMemory.hostiles.etc > 3)
        //     return null;

        let searchingRoom = null;
        if (creep)
            searchingRoom = creep.room;
        else
            searchingRoom = spawn.room;

        let towerCount = 1;
        if (roomMemory.hostiles && roomMemory.hostiles.etc)
            towerCount = roomMemory.hostiles.etc;

        let desiredCount = 1;
        if (drainFlag)
            desiredCount = drainFlag.color % 9;//

        let totalCreepLife = _.sum(this.getCreeps(), c => c.ticksToLive || CREEP_LIFE_TIME);
        if (totalCreepLife >= desiredCount * (CREEP_LIFE_TIME / 2))
            return null;
            

        //console.log('XXXXXXXXXXXXXXXX Job_Drain.getTask - ' + this.roomName + ' - task available to ' + searchingRoom.name );

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'drain', program: 'task_drain', data: { r: this.roomName }};
    }

    getDesiredBoosts(spawn, partList)
    {
        if (!spawn)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return null;

        let partCounts = _.countBy(partList, part => part);

        //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredBoosts - ' + JSON.stringify(partCounts))

        let creepCount = this.getCreeps().filter(c => c.memory && !c.memory.boosts).length + 1;

        let workCount = (partCounts[WORK] || 0) * creepCount;
        let toughCount = (partCounts[TOUGH] || 0) * creepCount;
        let moveCount = (partCounts[MOVE] || 0) * creepCount;
        let rangedAttackCount = (partCounts[RANGED_ATTACK] || 0) * creepCount;
        let healCount = (partCounts[HEAL] || 0) * creepCount;

        if (Room.getStoredResourceAmount(spawn.room.name, 'XZHO2') < LAB_BOOST_MINERAL * moveCount)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredBoosts - ' + this.roomName + ' - XZHO2 desired: ' + LAB_BOOST_MINERAL * moveCount + ', available: ' + Room.getStoredResourceAmount(spawn.room.name, 'XZHO2'));
            return null;
        }
        
        if (Room.getStoredResourceAmount(spawn.room.name, 'XGHO2') < LAB_BOOST_MINERAL * toughCount)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredBoosts - ' + this.roomName + ' - XGHO2 desired: ' + LAB_BOOST_MINERAL * toughCount + ', available: ' + Room.getStoredResourceAmount(spawn.room.name, 'XGHO2'));
            return null;
        }

        if (Room.getStoredResourceAmount(spawn.room.name, 'XKHO2') < LAB_BOOST_MINERAL * rangedAttackCount)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredBoosts - ' + this.roomName + ' - XKHO2 desired: ' + LAB_BOOST_MINERAL * rangedAttackCount + ', available: ' + Room.getStoredResourceAmount(spawn.room.name, 'XKHO2'));
            return null;
        }

        if (Room.getStoredResourceAmount(spawn.room.name, 'XLHO2') < LAB_BOOST_MINERAL * healCount)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredBoosts - ' + this.roomName + ' - XLHO2 desired: ' + LAB_BOOST_MINERAL * healCount + ', available: ' + Room.getStoredResourceAmount(spawn.room.name, 'XLHO2'));
            return null;
        }

        let boosts = [{ b: 'XZHO2', r: 1 }, /*{ b: 'XZH2O', r: 1 },*/ { b: 'XGHO2', r: 1 }, { b: 'XKHO2', r: 1 }, { b: 'XLHO2', r: 1 }];

        if (roomMemory.controller && roomMemory.controller.o)
        {
            if (Room.getStoredResourceAmount(spawn.room.name, 'XZH2O') < LAB_BOOST_MINERAL * workCount)
            {
                //console.log('XXXXXXXXXXXXXXXX Job_Drain.getDesiredBoosts - ' + this.roomName + ' - XZH2O desired: ' + LAB_BOOST_MINERAL * workCount + ', available: ' + Room.getStoredResourceAmount(spawn.room.name, 'XZH2O'));
                return null;
            }

            boosts.push({ b: 'XZH2O', r: 1 });
        }

        return boosts;
    }

    getDesiredPartList(spawn)
    {
        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return null;
        let towerCount = roomMemory.hostiles.etc;
        if (towerCount <= 0 && roomMemory.hostiles.sc)
            towerCount = 1;
        //let towerCount = 3;

        if (spawn.room.controller.level >= 8)
        {
            if (roomMemory.controller && roomMemory.controller.o && !Room.trusted(this.roomName))
            {
                if (towerCount >= 3)
                {
                    return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                            TOUGH, TOUGH,
    
                            MOVE, MOVE, MOVE, MOVE, MOVE,
                            MOVE, MOVE, MOVE, MOVE, MOVE,
    
                            WORK, WORK, WORK, WORK, WORK,
                            WORK, WORK, WORK, WORK, WORK,
    
                            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
    
                            HEAL, HEAL, HEAL, HEAL, HEAL,
                            HEAL, HEAL, HEAL, HEAL, HEAL,
                            HEAL, HEAL, HEAL];
                }
    
                if (towerCount == 2)
                {
                    return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
    
                            MOVE, MOVE, MOVE, MOVE, MOVE,
                            MOVE, MOVE, MOVE, MOVE, MOVE,
    
                            WORK, WORK, WORK, WORK, WORK,
                            WORK, WORK, WORK, WORK, WORK,
    
                            WORK, WORK, WORK, WORK, WORK,
    
                            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
    
                            HEAL, HEAL, HEAL, HEAL, HEAL,
                            HEAL, HEAL, HEAL, HEAL, HEAL];
                }
    
                if (towerCount == 1)
                {
                    return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
    
                            MOVE, MOVE, MOVE, MOVE, MOVE,
                            MOVE, MOVE, MOVE, MOVE, MOVE,
    
                            WORK, WORK, WORK, WORK, WORK,
                            WORK, WORK, WORK, WORK, WORK,
    
                            WORK, WORK, WORK, WORK, WORK,
                            WORK, WORK, WORK, WORK, WORK,
    
                            WORK, WORK, WORK, WORK, WORK,
    
                            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
    
                            HEAL, HEAL, HEAL, HEAL, HEAL];
                }
            }
    
            if (towerCount >= 3)
            {
                return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                        TOUGH, TOUGH, TOUGH,
    
                        MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, MOVE, MOVE, MOVE, MOVE,
    
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
    
                        HEAL, HEAL, HEAL, HEAL, HEAL,
                        HEAL, HEAL, HEAL, HEAL, HEAL,
                        HEAL, HEAL];
            }
    
            if (towerCount == 2)
            {
                return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
    
                        MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, MOVE, MOVE, MOVE, MOVE,
    
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
    
                        HEAL, HEAL, HEAL, HEAL, HEAL,
                        HEAL, HEAL, HEAL, HEAL, HEAL];
            }
    
            if (towerCount == 1)
            {
                return [TOUGH, TOUGH, TOUGH, TOUGH,
    
                        MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, MOVE, MOVE, MOVE, MOVE,
    
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
    
                        HEAL, HEAL, HEAL, HEAL, HEAL,
                        HEAL];
            }

            return null;
        }

        if (roomMemory.controller && roomMemory.controller.o && !Room.trusted(this.roomName))
        {
            if (towerCount >= 3)
            {
                return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                        TOUGH, TOUGH,

                        MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, MOVE, MOVE, MOVE, MOVE,

                        WORK, WORK, WORK, WORK, WORK,
                        WORK, WORK, WORK, WORK, WORK,

                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, //RANGED_ATTACK, RANGED_ATTACK,

                        HEAL, HEAL, HEAL, HEAL, HEAL,
                        HEAL, HEAL, HEAL, HEAL, HEAL,
                        HEAL, HEAL, HEAL];
            }

            if (towerCount == 2)
            {
                return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

                        MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, MOVE, MOVE, MOVE, MOVE,

                        WORK, WORK, WORK, WORK, WORK,
                        WORK, WORK, WORK, WORK, WORK,

                        WORK, WORK, WORK, WORK, WORK,

                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                        HEAL, HEAL, HEAL, HEAL, HEAL,
                        HEAL, HEAL, HEAL, HEAL, HEAL];
            }

            if (towerCount == 1)
            {
                return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

                        MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, MOVE, MOVE, MOVE, MOVE,

                        WORK, WORK, WORK, WORK, WORK,
                        WORK, WORK, WORK, WORK, WORK,

                        WORK, WORK, WORK, WORK, WORK,
                        WORK, WORK, WORK, WORK, WORK,

                        WORK, WORK, WORK, WORK, WORK,

                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                        HEAL, HEAL, HEAL, HEAL, HEAL];
            }
        }

        if (towerCount >= 3)
        {
            return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                    TOUGH, TOUGH, TOUGH,

                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, //MOVE, MOVE,

                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, //RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    // RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                    HEAL, HEAL, HEAL, HEAL, HEAL,
                    HEAL, HEAL, HEAL, HEAL, HEAL,
                    HEAL, HEAL];
        }

        if (towerCount == 2)
        {
            return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,

                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    // RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    // RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                    HEAL, HEAL, HEAL, HEAL, HEAL,
                    HEAL, HEAL, HEAL, HEAL, HEAL];
        }

        if (towerCount == 1)
        {
            return [TOUGH, TOUGH, TOUGH, TOUGH,

                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,

                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    // RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    // RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                    HEAL, HEAL, HEAL, HEAL, HEAL,
                    HEAL];
        }

        return null;
    }
}

module.exports = Job_Drain;
