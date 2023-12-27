'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Fill_Towers extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'fill_towers', room: this.data.room });

        //console.log('Mission_Fill_Towers.constructor - executing');
        this.frequency = 10;

        this.desiredSpawnType = 'carry';
    }

    run()
    {
        super.run();

        //console.log('Mission_Fill_Cans.run - ' + this.data.room + ' - executing');

        return this.suicide();
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

        let energyNeeded = this.getEnergyNeeded();
        if (energyNeeded <= 0)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        if (storedEnergyAmount <= 0)
            return null;

        if (energyNeeded <= totalCapacity)
            return null;

        if (storedEnergyAmount <= totalCapacity)
            return null;

        let minHaveOrNeeded = Math.min(energyNeeded, storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        //console.log('Mission_Fill_Towers.getTask - ' + this.data.room + ' - energyNeeded: ' + energyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, task: 'fill_towers', program: 'task_fill_towers', data: { r: this.data.room }};
    }

    getEnergyNeeded()
    {
        if (!this.room)
            return 0;

        let energyNeeded = 0;
        let quickTower = this.room.quickTower;
        let towers = this.room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType == STRUCTURE_TOWER && (!quickTower || quickTower.id != s.id) });
        if (towers.length > 0)
            energyNeeded += _.sum(towers, t => t.store.getFreeCapacity(RESOURCE_ENERGY));

        //console.log('Mission_Fill_Towers.getEnergyNeeded - ' + this.data.room + ' - energyNeeded: ' + energyNeeded);

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

        //console.log('Mission_Fill_Towers.getStoredEnergy - ' + this.data.room + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Mission_Fill_Towers
