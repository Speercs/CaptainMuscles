'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Fill_Cans extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'fill_cans', room: this.data.room });

        //console.log('Mission_Fill_Cans.constructor - executing');
        this.frequency = 10;

        this.desiredSpawnType = 'carry';
    }

    run()
    {
        super.run();

        //console.log('Mission_Fill_Cans.run - ' + this.data.room + ' - executing');

        return this.suicide();

        let totalCapacity = this.getTotalSpawnedCreepCapacity();
        let canEnergyNeeded = this.getCanEnergyNeeded();

        let lastCreep = _.last(this.getSpawnedCreeps());
        if (lastCreep && totalCapacity - lastCreep.store.getCapacity() >= canEnergyNeeded)
            this.layOffCreep(lastCreep);
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

        let canEnergyNeeded = this.getCanEnergyNeeded();
        if (canEnergyNeeded <= 0)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        if (storedEnergyAmount <= 0)
            return null;

        if (canEnergyNeeded <= totalCapacity)
            return null;

        if (storedEnergyAmount <= totalCapacity)
            return null;

        let minHaveOrNeeded = Math.min(canEnergyNeeded, storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        //console.log('Mission_Fill_Cans.getTask - ' + this.data.room + ' - canEnergyNeeded: ' + canEnergyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, task: 'fill_cans', program: 'task_fill_cans', data: { r: this.data.room }};
    }

    getCanEnergyNeeded()
    {
        let energyNeeded = 0;
        let room = Game.rooms[this.data.room];
        if (room)
        {
            if (room.quickCan1 && (!room.quickLink || !room.coreLink))
                energyNeeded += room.quickCan1.store.getFreeCapacity(RESOURCE_ENERGY);
            if (room.quickCan2 && (!room.quickLink || !room.coreLink))
                energyNeeded += room.quickCan2.store.getFreeCapacity(RESOURCE_ENERGY);
            if (room.controllerCan && (!room.controllerLink || !room.coreLink))
                energyNeeded += room.controllerCan.store.getFreeCapacity(RESOURCE_ENERGY);
        }

        //console.log('Mission_Fill_Cans.getCanEnergyNeeded - ' + this.data.room + ' - energyNeeded: ' + energyNeeded);

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

        //console.log('Mission_Fill_Cans.getStoredEnergy - ' + this.data.room + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Mission_Fill_Cans
