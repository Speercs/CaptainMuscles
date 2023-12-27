'use strict'

const constants = require('constants');
let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');


class Job_Attack extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Attack.constructor - executing');

        this.jobType = 'attack';
        this.desiredSpawnType = 'assaulter';

        this.isMilitary = true;

        let missionInfo = { type: 'attack', room: this.roomName };
        this.missionMemory = Mission_Creeps.getMemory(missionInfo);
    }

    creepAdded(creepName, jobMemory)
    {
        if (!this.missionMemory)
            return false;

        let missionProcess = kernel.scheduler.getProcessFromId(this.missionMemory.pid);
        if (!missionProcess)
            return false;

        missionProcess.creepAdded(creepName);
    }

    creepRemoved(creepName)
    {
        if (!this.missionMemory)
            return false;

        let missionProcess = kernel.scheduler.getProcessFromId(this.missionMemory.pid);
        if (!missionProcess)
            return false;

        missionProcess.creepRemoved(creepName);
    }

    getDesiredSpawn(spawn)
    {
        if (!this.missionMemory)
            return null;

        if (!this.missionMemory.wantSpawn)
            return null;

        if (spawn.room.controller.level < 7)
            return null;

        let baseMemory = Room.getBaseMemory(spawn.room.name);
        if (!baseMemory || !baseMemory.canAttack)
            return null;

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let boosts = this.getDesiredBoosts(spawn);
        if (!boosts)
        {
            console.log('XXXXXXXXXXXXXXXX Job_Attack.getDesiredSpawn - ' + this.roomName + ' - boosts not available to ' + spawn.room.name );
            return null;
        }

        let partList = this.getDesiredPartList(spawn);
        if (!partList || partList.length <= 0)
        {
            console.log('XXXXXXXXXXXXXXXX Job_Attack.getDesiredSpawn - ' + this.roomName + ' - invalid part list for ' + this.desiredSpawnType + ' in ' + spawn.room.name );
            return null;
        }

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, partList: partList, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        // if (creep)
        //     console.log('XXXXXXXXXXXXXXXX Job_Attack.getTask - ' + this.roomName + ' - ' + creep.name + ' - checking for job' );

        if (!this.missionMemory)
            return null;

        if (spawn && !this.missionMemory.wantSpawn)
            return null;
        
        if (creep && !this.missionMemory.wantCreep)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && !this.creepHasAppropriateBoosts(creep))
        {
            console.log('XXXXXXXXXXXXXXXX Job_Attack.getTask - ' + this.roomName + ' - ' + creep.name + ' - does not have appropriate boosts' );
            return null;
        }
            


        // if (creep && !creep.memory.boosts && !creep.memory.boostRequests)
        //     return null;

        // if (creep && !creep.spawning && creep.ticksToLive < CREEP_LIFE_TIME / 2)
        //     return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'attack', program: 'task_attack', data: { r: this.roomName, squad: 1 }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return null;

        let towerCount = 0;
        if (roomMemory && roomMemory.hostiles && roomMemory.hostiles.tc)
            towerCount = roomMemory.hostiles.tc;
        if (towerCount <= 0 && roomMemory.hostiles && roomMemory.hostiles.sc)
            towerCount = 1;

        if (towerCount <= 1)
            return [];

        if (towerCount == 2)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'LO') >= constants.RESOURCE_LEVEL_LOW)
                return [{ b: 'LO', r: 1 }];

            return null;
        }

        if (towerCount == 3)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'LHO2') >= constants.RESOURCE_LEVEL_LOW)
                return [{ b: 'LHO2', r: 1 }];

            // if (Room.getResourceAmountLevel(spawn.room.name, 'LO') >= constants.RESOURCE_LEVEL_LOW && 
            //     Room.getResourceAmountLevel(spawn.room.name, 'GO') >= constants.RESOURCE_LEVEL_LOW)
            //     return [{ b: 'LO', r: 1 }, { b: 'GO', r: 1 }];

            return null;
        }

        if (towerCount > 3)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            // if (Room.getResourceAmountLevel(spawn.room.name, 'XZH2O') < constants.RESOURCE_LEVEL_LOW)
            //     return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XGHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XKHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XLHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;

            return [{ b: 'XZHO2', r: 1 }, /*{ b: 'XZH2O', r: 1 },*/ { b: 'XGHO2', r: 1 }, { b: 'XKHO2', r: 1 }, { b: 'XLHO2', r: 1 }];
        }

        return null;
    }

    getDesiredPartList(spawn)
    {
        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return null;
        
        let towerCount = 0;
        if (roomMemory && roomMemory.hostiles && roomMemory.hostiles.tc)
            towerCount = roomMemory.hostiles.tc;
        if (towerCount <= 0 && roomMemory.hostiles && roomMemory.hostiles.sc)
            towerCount = 1;

        if (towerCount > 3)
        {
            return [TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK,

                    TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK, 
                    TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK,

                    TOUGH, RANGED_ATTACK,
                    TOUGH, RANGED_ATTACK,


                    HEAL, HEAL, HEAL, HEAL, HEAL,
                    HEAL, HEAL, HEAL, HEAL, HEAL,

                    HEAL, 

                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,

                    HEAL, HEAL, HEAL, HEAL, HEAL];
        }


        let preferredPartList = 
            [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
        
            MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE, MOVE,

            MOVE, MOVE, MOVE, MOVE, MOVE,

            MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE, MOVE,

            HEAL, HEAL, HEAL, HEAL, HEAL,
            HEAL, HEAL, HEAL, HEAL, HEAL,

            HEAL, HEAL, HEAL, HEAL, HEAL];

        if (spawn.room.energyCapacityAvailable >= global.calculatePartListCost(preferredPartList))
            return preferredPartList;

        return [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,

                MOVE, MOVE, MOVE,

                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE,

                HEAL, HEAL, HEAL, HEAL, HEAL,
                HEAL, HEAL, HEAL, HEAL, HEAL,

                HEAL, HEAL, HEAL];
    }

    creepHasAppropriateBoosts(creep)
    {
        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return false;
            
        if (!roomMemory.hostiles || !roomMemory.hostiles.tc)
            return true;
            
        let towerCount = roomMemory.hostiles.tc;


        if (towerCount == 1)
            return true;

        if (towerCount == 2)
        {
            if (creep.memory.boosts && creep.memory.boosts.find(b => b == 'LO'))
                return true;

            if (creep.memory.boostRequests && creep.memory.boostRequests.find(br => br.boost == 'LO'))
                return true;
        }

        if (towerCount == 3)
        {
            if (creep.memory.boosts && creep.memory.boosts.find(b => b == 'LHO2'))
                return true;

            if (creep.memory.boostRequests && creep.memory.boostRequests.find(br => br.boost == 'LHO2'))
                return true;
        }

        if (towerCount > 3)
        {
            if (creep.memory.boosts && 
                creep.memory.boosts.find(b => b == 'XZHO2') &&
                creep.memory.boosts.find(b => b == 'XGHO2') &&
                creep.memory.boosts.find(b => b == 'XKHO2') &&
                creep.memory.boosts.find(b => b == 'XLHO2'))
                return true;

            if (creep.memory.boostRequests &&
                creep.memory.boostRequests.find(br => br.boost == 'XZHO2') &&
                creep.memory.boostRequests.find(br => br.boost == 'XGHO2') &&
                creep.memory.boostRequests.find(br => br.boost == 'XKHO2') &&
                creep.memory.boostRequests.find(br => br.boost == 'XLHO2'))
                return true;
        }

        return false;
    }
}

module.exports = Job_Attack;
