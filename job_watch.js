'use strict'

let Job = require('job');

class Job_Watch extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Watch.constructor - executing');

        this.jobType = 'watch';
        this.desiredSpawnType = 'move';

        this.isMilitary = true;
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: 1, task: task };
    }

    getTask(creep, spawn)
    {
        //console.log('****************Job_Watch.getTask - ' + this.roomName + ' - checking for task. Creeps: ' + this.getCreeps().length);
            
        if (this.getCreeps().length >= 1)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'watch', program: 'task_watch', data: { r: this.roomName }};
    }
}

module.exports = Job_Watch;
