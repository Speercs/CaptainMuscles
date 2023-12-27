'use strict'

let Job = require('job');

class Job_Empty_Labs extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Empty_Labs.constructor - executing');

        this.jobType = 'empty_labs';
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

            let creepSpace = creep.store.getFreeCapacity();
            if (creepSpace <= 0)
                return null;

            if (creep.getResourceAmount(RESOURCE_ENERGY) > 0)
                return null;

            totalCapacity = this.getTotalSpawnedCreepCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
        }

        let carryNeeded = this.getCarryNeeded();

        if (carryNeeded <= totalCapacity)
            return null;

        //console.log('Job_Empty_Labs.getTask - ' + this.data.room + ' - canEnergyNeeded: ' + canEnergyNeeded + ' - creepEnergy: ' + creepEnergy);

        let utility = 1.0 - (totalCapacity / carryNeeded);
        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'empty_labs', program: 'task_empty_labs', data: { r: this.roomName }};
    }

    getCarryNeeded()
    {
        if (!this.room)
            return 0;

        let baseLabsMemory = Room.getBaseLabsMemory(this.room.name);
        if (!baseLabsMemory || !baseLabsMemory.labStatus)
            return 0;

        let carryNeeded = 0;
        for (let labStatus of baseLabsMemory.labStatus)
        {
            let lab = Game.getObjectById(labStatus.id);
            if (lab && lab.needsUnload())
                carryNeeded += lab.store.getUsedCapacity(lab.mineralType);
        }

        //console.log('Job_Empty_Labs.getEnergyNeeded - ' + this.roomName + ' - carryNeeded: ' + carryNeeded);

        return carryNeeded;
    }
}

module.exports = Job_Empty_Labs;
