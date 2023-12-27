'use strict'

let Job = require('job');

class Job_Fill_Can extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Fill_Can.constructor - executing');

        this.jobType = 'fill_can';
        this.desiredSpawnType = 'carry';
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
        if (!this.room || !this.room.isMyBase())
            return null;

        let totalCapacity = 0;
        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            if (creep.getResourceAmount(RESOURCE_ENERGY) > 0)
                return null;

            totalCapacity = this.getTotalSpawnedCreepCapacity() + creep.store.getCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
            if (this.getCreeps().length > 0)
                totalCapacity += totalCapacity / this.creeps.length;
        }

        let can = Game.getObjectById(this.data.target);
        if (!can)
            return null;

        let canEnergyNeeded = can.store.getFreeCapacity();
        //console.log('Job_Fill_Can.getTask - ' + this.data.room + ' - canEnergyNeeded: ' + canEnergyNeeded);
        if (canEnergyNeeded <= totalCapacity)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        //console.log('Job_Fill_Can.getTask - ' + this.data.room + ' - storedEnergyAmount: ' + storedEnergyAmount);
        if (storedEnergyAmount <= totalCapacity)
            return null;

        let minHaveOrNeeded = Math.min(canEnergyNeeded, storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);
        if (utility <= 0)
            return null;

        //console.log('Job_Fill_Can.getTask - ' + this.data.room + ' - canEnergyNeeded: ' + canEnergyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'fill_can', program: 'task_fill_can', data: { t: can.id, x: can.pos.x, y: can.pos.y, r: can.pos.roomName }};
    }

    getStoredEnergy()
    {
        let energyAmount = Room.getStoredResourceAmount(this.roomName, RESOURCE_ENERGY);
        if (energyAmount <= 0 && this.room)
            energyAmount = this.room.totalBonfireAmount;

        //console.log('Job_Fill_Can.getStoredEnergy - ' + this.data.room + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Job_Fill_Can;
