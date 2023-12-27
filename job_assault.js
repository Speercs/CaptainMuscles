'use strict'

const constants = require('constants');
let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');


class Job_Assault extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Assault.constructor - executing');

        this.jobType = 'assault';
        this.desiredSpawnType = 'assaulter';

        this.isMilitary = true;

        let missionInfo = { type: 'assault', room: this.roomName };
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

        let boosts = this.getDesiredBoosts(spawn);
        if (!boosts)
        {
            console.log('XXXXXXXXXXXXXXXX Job_Assault.getDesiredSpawn - ' + this.roomName + ' - boosts not available to ' + spawn.room.name );
            return null;
        }

        let partList = this.getDesiredPartList();
        if (!partList || partList.length <= 0)
        {
            console.log('XXXXXXXXXXXXXXXX Job_Assault.getDesiredSpawn - ' + this.roomName + ' - invalid part list for ' + this.desiredSpawnType + ' in ' + spawn.room.name );
            return null;
        }

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, partList: partList, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        if (!this.missionMemory)
            return null;

        if (spawn && !this.missionMemory.wantSpawn)
            return null;
        
        if (creep && !this.missionMemory.wantCreep)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && !creep.memory.boosts && !creep.memory.boostRequests)
            return null;

        // if (creep && !creep.spawning && creep.ticksToLive < CREEP_LIFE_TIME / 2)
        //     return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'assault', program: 'task_assault', data: { r: this.roomName, squad: 1 }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn)
            return null;

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

    getDesiredPartList()
    {
        return [
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

            MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE, MOVE,

            HEAL, HEAL, HEAL, HEAL, HEAL,
            HEAL, HEAL, HEAL, HEAL, HEAL];
    }
}

module.exports = Job_Assault;
