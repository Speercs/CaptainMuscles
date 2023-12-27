'use strict'

let Job = require('job');

class Job_Fill_Towers extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Fill_Towers.constructor - executing');

        this.jobType = 'fill_towers';
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

            totalCapacity = this.getTotalSpawnedCreepCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
        }

        let energyNeeded = this.getEnergyNeeded();
        //console.log('Job_Fill_Towers.getTask - ' + this.data.room + ' - energyNeeded: ' + energyNeeded);
        if (energyNeeded <= totalCapacity)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        //console.log('Job_Fill_Towers.getTask - ' + this.data.room + ' - storedEnergyAmount: ' + storedEnergyAmount);
        if (storedEnergyAmount <= totalCapacity)
            return null;

        let minHaveOrNeeded = Math.min(energyNeeded, storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        //console.log('Job_Fill_Towers.getTask - ' + this.data.room + ' - canEnergyNeeded: ' + canEnergyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'fill_towers', program: 'task_fill_towers', data: { r: this.roomName }};
    }

    getEnergyNeeded()
    {
        if (!this.room)
            return 0;

        let energyNeeded = 0;

        let towers = this.room.getStructures(STRUCTURE_TOWER);
        if (towers.length > 0)
            energyNeeded += _.sum(towers, t => t.store.getFreeCapacity(RESOURCE_ENERGY));
        let quickTower = this.room.quickTower;
        if (quickTower)
            energyNeeded -= quickTower.store.getFreeCapacity(RESOURCE_ENERGY);

        //console.log('Job_Fill_Towers.getEnergyNeeded - ' + this.roomName + ' - energyNeeded: ' + energyNeeded);

        return energyNeeded;
    }

    getStoredEnergy()
    {
        let energyAmount = Room.getStoredResourceAmount(this.roomName, RESOURCE_ENERGY);
        if (energyAmount <= 0 && this.room)
            energyAmount = this.room.totalBonfireAmount;

        //console.log('Job_Fill_Towers.getStoredEnergy - ' + this.roomName + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Job_Fill_Towers;
