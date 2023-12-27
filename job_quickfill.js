'use strict'

let Job = require('job');

class Job_Quickfill extends Job
{
    constructor (...args)
    {
        //console.log('Job_Quickfill.constructor - executing');
        super(...args);

        this.jobType = 'quickfill';
        this.desiredSpawnType = 'transfer';
    }

    creepAdded(creepName, jobMemory)
    {
        let creepMemory = Memory.creeps[creepName];
        let desiredCount = this.getDesiredCount();

        let existingCreeps = _.filter(this.getCreeps(), c => c.name != creepName);
        let existingSpotNumbers = [];

        for (let otherCreep of existingCreeps)
        {
            let jobMemory = otherCreep.memory.job;
            if (!jobMemory || jobMemory.task != this.id || _.isUndefined(jobMemory.spot))
                continue;
            existingSpotNumbers.push(jobMemory.spot);
        }

        let creepSpotNumber = 0;
        for (let i = 0; i < desiredCount; ++i)
        {
            creepSpotNumber = i;
            if (existingSpotNumbers.indexOf(i) < 0)
            {
                //console.log('Job_Quickfill.creepAdded - ' + creepName + ' - spot available: ' + i);
                break;
            }

            //console.log('Job_Quickfill.creepAdded - ' + creepName + ' - spot taken: ' + i);
        }

        //console.log('Job_Quickfill.creepAdded - ' + creepName + ' - given spot ' + creepSpotNumber + ', existing creep count: ' + existingCreeps.length + ', existingSpotNumbers = ' + JSON.stringify(existingSpotNumbers));
        jobMemory.spot = creepSpotNumber;
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let maxParts = 4;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task };
    }

    getTask(creep, spawn)
    {
        if (creep && (creep.memory.type != this.desiredSpawnType || creep.memory[CARRY] > 4))
            return null;

        if (!this.room || !this.room.isMyBase())
            return null;

        // if (this.room.controller.level >= 8 && this.room.isPowerCreepActive(PWR_OPERATE_EXTENSION, 3))
        //     return null;

        let desiredCount = this.getDesiredCount();

        let existingCreeps = this.getCreeps();

        let creepCount = existingCreeps.length;

        if (creepCount < desiredCount &&
           ((this.room.quickLink && Room.getStoredResourceAmount(this.room.name, RESOURCE_ENERGY) > 0 ) ||
           (this.room.quickCan1 && this.room.quickCan1.store.getUsedCapacity(RESOURCE_ENERGY) > 0) ||
           (this.room.quickCan2 && this.room.quickCan2.store.getUsedCapacity(RESOURCE_ENERGY) > 0) ||
            this.room.bonfire))
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'quickfill', program: 'task_quickfill', data: { r: this.roomName }};

        return null;
    }

    getDesiredCount()
    {
        if (!this.room)
            return 0;

        let controllerLevel = this.room.controller.level;
        let desiredCount = 4;

        if (controllerLevel == 1 || controllerLevel == 2)
            desiredCount = 1;
        else if (controllerLevel == 3)
            desiredCount = 3;


        return desiredCount;
    }
}

module.exports = Job_Quickfill;
