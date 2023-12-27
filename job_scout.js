'use strict'

let Job = require('job');

class Job_Scout extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Scout.constructor - executing');

        this.jobType = 'scout';
        this.desiredSpawnType = 'move';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: 1, task: task };
    }

    getTask(creep)
    {
        if (!this.room || !this.room.controller || this.room.controller.level >= 8)
            return null;

        let desiredCount = 1;
        if (Game.shard.name == 'shardSeason')
            desiredCount = 2;
            
        if (this.getCreeps().length >= desiredCount)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        return { utility: 0.001, jobId: this.id, jobType: this.jobType, name: 'scout', program: 'task_scout', data: { r: this.roomName }};
    }
}

module.exports = Job_Scout;
