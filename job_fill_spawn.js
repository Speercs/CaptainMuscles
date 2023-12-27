'use strict'

let Job = require('job');

class Job_Fill_Spawn extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Fill_Spawn.constructor - executing');

        this.jobType = 'fill_spawn';
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

        if (this.room.controller.level < 5)
            return null;

        let totalCapacity = 0;
        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            if (creep.room.name != this.roomName)
                return null;

            if (creep.getResourceAmount() > 0)
                return null;

            totalCapacity = this.getTotalSpawnedCreepCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
        }
        
    
        if (this.room.controller.level >= 8 && this.room.isPowerCreepActive(PWR_OPERATE_EXTENSION, 3))
            return null;

        //let spawnEnergyNeeded = _.sum(sinks, s => s.store.getFreeCapacity(RESOURCE_ENERGY));//this.getSpawnEnergyNeeded();
        let spawnEnergyNeeded = this.getSpawnEnergyNeeded();
        //console.log('Job_Fill_Spawn.getTask - ' + this.data.room + ' - spawnEnergyNeeded: ' + spawnEnergyNeeded);
        if (spawnEnergyNeeded <= totalCapacity)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        //console.log('Job_Fill_Spawn.getTask - ' + this.data.room + ' - storedEnergyAmount: ' + storedEnergyAmount);
        if (storedEnergyAmount <= totalCapacity)
            return null;

        let minHaveOrNeeded = Math.min(spawnEnergyNeeded, storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        //console.log('Job_Fill_Spawn.getTask - ' + this.data.room + ' - spawnEnergyNeeded: ' + spawnEnergyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'fill_spawn', program: 'task_fill_spawn', data: { r: this.roomName }};
    }

    getSpawnEnergyNeeded()
    {
        let energyNeeded = this.room.energyCapacityAvailable - this.room.energyAvailable;
        if (energyNeeded <= 0)
            return 0;

        let spawns = this.room.spawns;
        if (spawns.length > 0)
            energyNeeded -= _.sum(spawns, s => s.store.getFreeCapacity(RESOURCE_ENERGY))

        let quickExtensions = this.room.quickExtensions;
        if (!quickExtensions)
            return energyNeeded;

        energyNeeded -= _.sum(quickExtensions, e => e.store.getFreeCapacity(RESOURCE_ENERGY));

        //console.log('Job_Fill_Spawn.getSpawnEnergyNeeded - ' + this.roomName + ' - energyNeeded: ' + energyNeeded);

        return energyNeeded;
    }

    getStoredEnergy()
    {
        let energyAmount = Room.getStoredResourceAmount(this.roomName, RESOURCE_ENERGY);
        if (energyAmount <= 0 && this.room)
            energyAmount = this.room.totalBonfireAmount;

        //console.log('Job_Fill_Spawn.getStoredEnergy - ' + this.roomName + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Job_Fill_Spawn;
