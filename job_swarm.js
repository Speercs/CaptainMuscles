'use strict'

let Job = require('job');

class Job_Swarm extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Swarm.constructor - executing');

        this.jobType = 'swarm';
        this.desiredSpawnType = 'destroy';

        this.isMilitary = true;
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: 1, task: task, swarm: 1 };
    }

    getTask(creep, spawn)
    {
        //console.log('****************Job_Swarm.getTask - ' + this.roomName + ' - checking for task. Creeps: ' + this.getCreeps().length);

        let flag = Game.flags['swarm'];
        if (!flag || flag.secondaryColor == COLOR_RED)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'swarm', program: 'task_swarm', data: { r: flag.pos.roomName }};
    }
}

module.exports = Job_Swarm;
