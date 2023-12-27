'use strict'

let Job = require('job');

class Job_Store extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Store.constructor - executing');

        this.jobType = 'store';
    }

    getDesiredSpawn(spawn)
    {
        return null;
    }

    getTask(creep)
    {
        if (!creep)
            return null;

        if (!this.room || !this.room.isMyBase())
            return null;

        let creepCarry = creep.getResourceAmount();
        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        //console.log('Mission_Store.getTask - ' + creep.name + ' - creepCarry: ' + creepCarry + ' - ' + Game.time + ' - ' + creep.lostResourceAmount);
        if (creepCarry <= 0)
            return null;
        if (creepCarry > creepEnergy && !this.room.hasMyStorageOrTerminal())
            return null;

        let dropOffPos = this.room.bonfirePos;
        if (!dropOffPos)
            return null;

        return { utility: 0.001, jobId: this.id, jobType: this.jobType, name: 'store', program: 'task_store', data: { r: this.roomName } };
    }
}

module.exports = Job_Store;
