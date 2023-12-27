'use strict'

const constants = require('constants');
let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');


class Job_Smash extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Smash.constructor - executing');

        this.jobType = 'smash';
        this.desiredSpawnType1 = 'front';
        this.desiredSpawnType2 = 'back';

        this.isMilitary = true;

        let missionInfo = { type: 'smash', room: this.roomName };
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

        if (spawn.room.controller.level < 8)
            return null;

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let desiredSpawnType = this.missionMemory.wantSpawn;

        let boosts = this.getDesiredBoosts(spawn, desiredSpawnType);
        if (!boosts)
        {
            //console.log('XXXXXXXXXXXXXXXX Job_Smash.getDesiredSpawn - ' + this.roomName + ' - boosts not available to ' + spawn.room.name );
            return null;
        }

        let partList = this.getDesiredPartList(desiredSpawnType);
        if (!partList || partList.length <= 0)
        {
            console.log('XXXXXXXXXXXXXXXX Job_Smash.getDesiredSpawn - ' + this.roomName + ' - invalid part list for ' + desiredSpawnType + ' in ' + spawn.room.name );
            return null;
        }

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: desiredSpawnType, partList: partList, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        if (!this.missionMemory)
            return null;

        if (!this.missionMemory.wantSpawn)
            return null;

        if (creep && creep.memory.type != this.missionMemory.wantSpawn)
            return null;

        if (creep && !creep.spawning && creep.ticksToLive < CREEP_LIFE_TIME / 2)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'smash', program: 'task_smash', data: { r: this.roomName, squad: 1 }};
    }

    getDesiredBoosts(spawn, type)
    {
        if (!spawn)
            return null;

        if (type == this.desiredSpawnType1)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XGHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZH2O') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XLHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XKHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;

            return [{ b: 'XZHO2', r: 1 }, { b: 'XGHO2', r: 1 }, { b: 'XZH2O', r: 1 }, { b: 'XLHO2', r: 1 }];
        }

        if (type == this.desiredSpawnType2)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XGHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZH2O') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XLHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XKHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;

            return [{ b: 'XZHO2', r: 1 }, { b: 'XGHO2', r: 1 }, { b: 'XKHO2', r: 1 }, { b: 'XLHO2', r: 1 }];
        }
            

        //console.log('Job_Smash.getDesiredBoosts - ' + this.roomName + ' - could not boost type ' + type);
        return null;
    }

    getDesiredPartList(type)
    {
        let towerCount =  Room.getMemory(this.roomName).hostiles.tc;

        if (type == this.desiredSpawnType1)
        {
            return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                    TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

                    TOUGH, TOUGH,

                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,

                    WORK, WORK, WORK, WORK, WORK,
                    WORK, WORK, WORK, WORK, WORK,

                    WORK, WORK, WORK, WORK, WORK,
                    WORK, WORK, WORK, WORK, WORK,

                    WORK, WORK, WORK, WORK, WORK,
                    WORK, WORK, WORK];
        }

        if (type == this.desiredSpawnType2)
        {
            return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                    TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

                    TOUGH, TOUGH,

                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,

                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                    HEAL, HEAL, HEAL, HEAL, HEAL,
                    HEAL, HEAL, HEAL, HEAL, HEAL,

                    HEAL, HEAL, HEAL, HEAL, HEAL,
                    HEAL, HEAL, HEAL];
        }

        return null;
    }
}

module.exports = Job_Smash;
