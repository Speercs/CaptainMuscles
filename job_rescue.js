'use strict'

let Job = require('job');

class Job_Rescue extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Rescue.constructor - executing');

        this.jobType = 'rescue';
        this.desiredSpawnType = 'worry';

        this.isMilitary = true;
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
        //console.log('****************Job_Rescue.getTask - ' + this.roomName + ' - checking for task. Creeps: ' + this.getCreeps().length);

        if (!Game.flags['rescue_' + this.roomName] || Game.flags['rescue_' + this.roomName].color == COLOR_RED)
            return null;

        let healthyCreeps = this.getCreeps().filter(c => (c.ticksToLive || CREEP_LIFE_TIME) > (creep || spawn).wpos.getRangeTo(c.wpos) );
            
        if (healthyCreeps.length >= 4)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'rescue', program: 'task_rescue', data: { r: this.roomName }};
    }
}

module.exports = Job_Rescue;
