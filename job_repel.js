'use strict'

const constants = require('constants');

let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');

class Job_Repel extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Repel.constructor - executing');

        this.jobType = 'repel';
        this.desiredSpawnType = 'ranged';

        this.isMilitary = true;

        let missionInfo = { type: 'repel', room: this.roomName };
        this.missionMemory = Mission_Creeps.getMemory(missionInfo);
    }

    static createTask(roomName)
    {
        return { utility: 1.0, jobId: 'repel', jobType: 'repel', name: 'repel', program: 'task_repel', data: { r: roomName, squad: 1 }};
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

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let boosts = null;
        if (this.missionMemory.boost)
        {
            boosts = this.getDesiredBoosts(spawn, this.missionMemory.boost);
            if (!boosts)
            {
                //console.log('XXXXXXXXXXXXXXXX Job_Commando.Job_Repel - ' + this.roomName + ' - boosts not available to ' + spawn.room.name );
                return null;
            }
        }

        let minPartCount = 1;
        if (!Room.isMyBase(this.roomName))
            minPartCount = Math.max(1, Math.floor(this.missionMemory.minPartCount * .8));

        let type = this.desiredSpawnType;
        if (boosts)
        {
            type = 'ranged_boosted';
            minPartCount = Math.max(minPartCount, 20);
        }
        else
        {
            minPartCount = Math.min(minPartCount, 20);
        }
        
        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: type, minParts: minPartCount, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        //console.log('Job_Repel.getTask - ' + this.roomName + ' - checking');

        if (!this.missionMemory)
            return null;

        //console.log('Job_Repel.getTask - ' + this.roomName + ' - found missionMemory');

        if (!this.missionMemory.wantSpawn)
            return null;

        //console.log('Job_Repel.getTask - ' + this.roomName + ' - found wantSpawn');

        if (creep && !this.isCreepAllowed(creep))
            return null;

        //console.log('Job_Repel.getTask - ' + this.roomName + ' - giving repel task to creep: ' + creep + ', spawn: ' + spawn);

        return Job_Repel.createTask(this.roomName)
    }
    
    isCreepAllowed(creep)
    {
        if (creep.memory.type != 'ranged' && creep.memory.type != 'ranged_boosted')
            return false;
        
        if (creep.partCountBoosted(RANGED_ATTACK) >= this.missionMemory.minPartCount)
            return true;
    
        if (!creep.memory.boostRequests)
            return false;
            
        let rangedPartCount = creep.memory[RANGED_ATTACK];
        if (_.find(creep.memory.boostRequests, br => br.boost == 'KO'))
            rangedPartCount *= 2;
        else if (_.find(creep.memory.boostRequests, br => br.boost == 'KHO2'))
            rangedPartCount *= 3;
        else if (_.find(creep.memory.boostRequests, br => br.boost == 'XKHO2'))
            rangedPartCount *= 4;
            
        return (rangedPartCount >= this.missionMemory.minPartCount);
    }
    
    getDesiredBoosts(spawn, boostLevel)
    {
        if (!spawn)
            return null;

        if (boostLevel >= 3)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XGHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XKHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'XLHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;

            return [{ b: 'XZHO2', r: 1 }, { b: 'XGHO2', r: 1 }, { b: 'XKHO2', r: 1 }, { b: 'XLHO2', r: 1 }];
        }
        else if (boostLevel >= 2)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'ZHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'KHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'LHO2') < constants.RESOURCE_LEVEL_LOW)
                return null;

            return [{ b: 'ZHO2', r: 1 }, { b: 'KHO2', r: 1 }, { b: 'LHO2', r: 1 }];
        }
        else if (boostLevel >= 1)
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'KO') < constants.RESOURCE_LEVEL_LOW)
                return null;
            if (Room.getResourceAmountLevel(spawn.room.name, 'LO') < constants.RESOURCE_LEVEL_LOW)
                return null;

            return [{ b: 'KO', r: 1 }, { b: 'LO', r: 1 }];
        }
    }
}

module.exports = Job_Repel;
