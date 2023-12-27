'use strict'

let Job = require('job');

class Job_Controller_Blocker extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Controller_Blocker.constructor - executing');

        this.jobType = 'controller_blocker';
        this.desiredSpawnType = 'move';
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
        if (!this.room || !this.room.controller || !this.room.controller.my || !this.room.controller.upgradeBlocked)
            return null;

        let openPositions = this.room.controller.pos.getOpenPositionsInRange(2);
        let desiredCount = openPositions.length;

        if (this.getCreeps().length >= desiredCount)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        return { utility: 0.001, jobId: this.id, jobType: this.jobType, name: 'block_controller', program: 'task_block_controller', data: { r: this.roomName }};
    }
}

module.exports = Job_Controller_Blocker;
