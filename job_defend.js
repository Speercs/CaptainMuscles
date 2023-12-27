'use strict'

const constants = require('constants');
let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');

class Job_Defend extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Defend.constructor - executing');

        this.jobType = 'defend';
        this.desiredSpawnType = 'defend';

        this.isMilitary = true;

        let missionInfo = { type: 'defend', room: this.roomName };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (missionMemory)
            this.missionMemory = missionMemory;
    }

    static createTask(roomName)
    {
        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'defend', program: 'task_defend', data: { r: roomName }};
    }

    getDesiredSpawn(spawn)
    {
        if (!this.missionMemory)
            return null;

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let maxParts = null;
        if (this.missionMemory.testing)
            maxParts = 1;

        let boosts = this.getDesiredBoosts(spawn, this.missionMemory.testing);

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        if (!this.missionMemory)
            return null;

        //console.log('Job_Defend.getTask - ' + this.roomName + ' - checking');
        if (!this.room || !this.room.isMyBase())
            return null;

        //console.log('Job_Defend.getTask - ' + this.roomName + ' - found mission');

        if (!this.missionMemory.wantSpawn || (Game.flags['defenseTest'] && Game.flags['defenseTest'].pos.roomName == roomName))
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
        {
            if (creep.memory.type != 'ranged' && creep.memory.type != 'ranged_boosted')
                return null;
            if (!this.missionMemory.allowRanged)
                return null;
        }

        if (spawn)
        {
            let hostiles = this.room.find(FIND_HOSTILE_CREEPS).filter(c => c.killOnSight());
            let desiredAmount = hostiles.length;
    
            if (this.getCreeps().length >= desiredAmount)
                return null;
        }

        //console.log('Job_Defend.getTask - ' + this.roomName + ' - returning task');

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'defend', program: 'task_defend', data: { r: this.roomName }};
    }

    getDesiredBoosts(spawn, testing)
    {
        if (!spawn || !this.room)
            return null;

        if (!testing)
        {
            let roomMemory = Room.getMemory(this.roomName);
            if (!roomMemory || !roomMemory.hostiles || !roomMemory.hostiles.partCount)
                return null;

            let totalEnemyParts = _.sum(roomMemory.hostiles.partCount);
            let partThreshold = MAX_CREEP_SIZE * (this.room.getStructures(STRUCTURE_SPAWN).length + 1);
            if (totalEnemyParts <= partThreshold)
                return null;
        }

        let boosts = [];

        if (Room.getResourceAmountLevel(spawn.room.name, 'XKHO2') >= constants.RESOURCE_LEVEL_LOW)
            boosts.push({ b: 'XKHO2', r: 0 });
        // if (Room.getResourceAmountLevel(spawn.room.name, 'XZHO2') >= constants.RESOURCE_LEVEL_LOW)
        //     boosts.push({ b: 'XZHO2', r: 0 });

        if (boosts.length <= 0)
            return null;

        return boosts;
    }
}

module.exports = Job_Defend;
