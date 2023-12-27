'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Fill_Spawn extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'fill_spawn', room: this.data.room });

        //console.log('Mission_Fill_Spawn.constructor - executing');
        this.frequency = 10;

        this.desiredSpawnType = 'carry';
    }

    run()
    {
        super.run();

        //console.log('Mission_Fill_Spawn.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        let task = this.getTask(creep);
        if (!task)
            return null;

        let room = Game.rooms[this.data.room];

        let maxParts = 16;
        if (room.isBootstrapping())
            maxParts = 2;
        else if (room.controller.level >= 7)
            maxParts = 20;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
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

        let spawnEnergyNeeded = this.getSpawnEnergyNeeded();
        //console.log('Mission_Fill_Spawn.getTask - ' + this.data.room + ' - spawnEnergyNeeded: ' + spawnEnergyNeeded);
        if (spawnEnergyNeeded <= totalCapacity)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        //console.log('Mission_Fill_Spawn.getTask - ' + this.data.room + ' - storedEnergyAmount: ' + storedEnergyAmount);
        if (storedEnergyAmount <= totalCapacity)
            return null;

        let minHaveOrNeeded = Math.min(spawnEnergyNeeded, storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        //console.log('Mission_Fill_Spawn.getTask - ' + this.data.room + ' - spawnEnergyNeeded: ' + spawnEnergyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, task: 'fill_spawn', program: 'task_fill_spawn', data: { r: this.data.room }};
    }

    getSpawnEnergyNeeded()
    {
        let energyNeeded = 0;
        let room = Game.rooms[this.data.room];
        if (room)
            energyNeeded = room.energyCapacityAvailable - room.energyAvailable;

        //console.log('Mission_Fill_Spawn.getSpawnEnergyNeeded - ' + this.data.room + ' - energyNeeded: ' + energyNeeded);

        return energyNeeded;
    }

    getStoredEnergy()
    {
        let energyAmount = Room.getStoredResourceAmount(this.data.room, RESOURCE_ENERGY);
        if (energyAmount <= 0)
        {
            let room = Game.rooms[this.data.room];
            if (room)
                energyAmount = room.totalBonfireAmount;
        }

        //console.log('Mission_Fill_Spawn.getStoredEnergy - ' + this.data.room + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Mission_Fill_Spawn
