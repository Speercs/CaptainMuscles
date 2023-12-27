'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Fill_Worker extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'fill_worker', room: this.data.room, target: this.data.target });

        //console.log('Mission_Fill_Worker.constructor - executing');

        this.frequency = 10;

        this.desiredSpawnType = 'carry';

        this.target = Game.getObjectById(this.data.target);
    }

    run()
    {
        super.run();

        //console.log('Mission_Fill_Worker.run - ' + this.data.room + ' - executing');

        if (!this.target)
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

        let nearestBase = Room.getNearestBase(this.target.room.name);

        let maxParts = 16;
        if (nearestBase.controller.level >= 7)
            maxParts = 20;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (!this.target)
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

        let targetEnergyNeeded = this.getTargetEnergyNeeded();
        if (targetEnergyNeeded <= 0)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        if (storedEnergyAmount <= 0)
            return null;

        if (targetEnergyNeeded <= totalCapacity)
            return null;

        if (storedEnergyAmount <= totalCapacity)
            return null;

        let minHaveOrNeeded = Math.min(targetEnergyNeeded, storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        //console.log('Mission_Fill_Worker.getTask - ' + this.data.room + ' - targetEnergyNeeded: ' + targetEnergyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, task: 'fill_worker', program: 'task_fill_worker', data: { t: this.target.id, x: this.target.pos.x, y: this.target.pos.y, r: this.target.pos.roomName }};
    }

    getTargetEnergyNeeded()
    {
        let energyNeeded = 0;
        let nearestBase = Room.getNearestBase(this.target.room.name);
        let energySource = Room.getResourceStorageTarget(nearestBase.name, RESOURCE_ENERGY, this.target);

        if (energySource)
            energyNeeded = this.target.memory.ept * (this.target.wpos.getManhattanDist(energySource.wpos));

        //console.log('Mission_Fill_Worker.getTargetEnergyNeeded - ' + this.data.room + ' - energyNeeded: ' + energyNeeded);

        return energyNeeded;
    }

    getStoredEnergy()
    {
        let nearestBase = Room.getNearestBase(this.target.room.name);
        let energyAmount = Room.getStoredResourceAmount(nearestBase.name, RESOURCE_ENERGY);
        if (energyAmount <= 0)
            energyAmount = nearestBase.totalBonfireAmount;

        //console.log('Mission_Fill_Worker.getStoredEnergy - ' + this.data.room + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Mission_Fill_Worker
