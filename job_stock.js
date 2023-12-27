'use strict'

let Job = require('job');

class Job_Stock extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Stock.constructor - executing');
        this.desiredSpawnType = 'transfer';
        // if (this.room && this.room.controller.level >= 7)
        //     this.desiredSpawnType = 'carry';

        this.jobType = 'stock';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null);
        if (!task)
            return null;

        let maxParts = 16;

        if (this.desiredSpawnType == 'transfer' && !Room.sendingAwayResources(this.room.name))
        {
            maxParts = 4;
            if (this.room.controller.level >= 8)
                maxParts = 16;
            // else if (this.room.controller.level >= 7)
            //     maxParts = 8;
            
        }

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task };
    }

    getTask(creep)
    {
        if (!this.room || !this.room.isMyBase())
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && Room.sendingAwayResources(this.room.name) && this.room.energyCapacityAvailable >= 300 && creep.memory[CARRY] <= 4)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.getCreeps().length > 0)
            return null;

        if (this.room.controller.level < 4 || !this.room.hasMyStorageOrTerminal())
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'stock', program: 'task_stock', data: { r: this.roomName }};
    }
}

module.exports = Job_Stock;
