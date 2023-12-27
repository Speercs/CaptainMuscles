'use strict'

let Job = require('job');

class Job_Fill_Lab extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Fill_Lab.constructor - executing');

        this.jobType = 'fill_lab';
        this.desiredSpawnType = 'carry';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task };
    }

    getTask(creep)
    {
        if (!this.room || !this.room.isMyBase())
            return null;

        let totalCapacity = 0;
        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            if (creep.getResourceAmount(RESOURCE_ENERGY) > 0)
                return null;
        }

        let lab = Game.getObjectById(this.data.source);
        if (!lab)
            return null;

        if (lab.needsUnload())
            return null;

        if (!lab.needsLoad())
            return null;

        let labDesiredCarry = lab.desiredResourceLoadAmount();
        if (!labDesiredCarry)
            return null;

        let labDesiredResource = lab.desiredMineralType();
        if (!labDesiredResource)
            return null;

        let storedResourceAmount = Room.getStoredResourceAmount(this.roomName, labDesiredResource);
        if (storedResourceAmount <= 0)
            return null;

        if (creep)
        {
            totalCapacity = this.getTotalSpawnedCreepCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
        }

        if (totalCapacity >= labDesiredCarry)
            return null;

        let minHaveOrNeeded = Math.min(labDesiredCarry, storedResourceAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        if (utility <= 0)
            return null

        //console.log('Job_Fill_Lab.getTask - ' + this.roomName + ' - energyNeeded: ' + energyNeeded + ' - creepEnergy: ' + creepEnergy);


        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'fill_lab', program: 'task_fill_lab', data: { t: lab.id, x: lab.pos.x, y: lab.pos.y, r: lab.room.name, res: labDesiredResource }};
    }
}

module.exports = Job_Fill_Lab;
