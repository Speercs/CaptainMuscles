'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Extract extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Extract.constructor - executing');

        this.jobType = 'extract';
        this.desiredSpawnType = 'work';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task };
    }

    getTask(creep, spawn)
    {
        if (!this.room)
            return null;

        // if (spawn)
        //     console.log('Job_Extract.getTask - ' + this.roomName + ' - checking extract job');

        let mineral = Game.getObjectById(this.data.source);
        if (!mineral)
        {
            //console.log('Job_Extract.getTask - ' + this.roomName + ' - no mineral');
            return null;
        }

        if (creep && this.desiredSpawnType != creep.memory.type)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.getCreeps().length > 0)
        {
            //console.log('Job_Extract.getTask - ' + this.roomName + ' - already have creep');
            return null;
        }
            
        if (mineral.ticksToRegeneration)
        {
            //console.log('Job_Extract.getTask - ' + this.roomName + ' - mineral regenerating');
            return null;
        }

        if (!mineral.extractor)
        {
            //console.log('Job_Extract.getTask - ' + this.roomName + ' - no extractor');
            return null;
        }

        if (!mineral.container || !mineral.container.store)
        {
            //console.log('Job_Extract.getTask - ' + this.roomName + ' - no container');
            return null;
        }

        if (mineral.container.store.getFreeCapacity() <= 0)
        {
            //console.log('Job_Extract.getTask - ' + this.roomName + ' - container full');
            return null;
        }

        let nearestBase = Room.getNearestBase(this.roomName);
        if (!nearestBase)
        {
            //console.log('Job_Extract.getTask - ' + this.roomName + ' - no nearest base');
            return null;
        }

        // if (Room.getResourceAmountLevel(nearestBase.name, mineral.mineralType) >= constants.RESOURCE_LEVEL_EXCESS)
        // {
        //     //console.log('Job_Extract.getTask - ' + this.roomName + ' - ' + mineral.mineralType + ' level high');
        //     return null;
        // }

        //console.log('Job_Extract.getTask - ' + this.roomName + ' - returning extract job');

        return { utility: 0.001, jobId: this.id, jobType: this.jobType, name: 'extract', program: 'task_extract', source: mineral.id, data: { t: mineral.id, x: mineral.pos.x, y: mineral.pos.y, r: mineral.pos.roomName }};
    }
}

module.exports = Job_Extract;
