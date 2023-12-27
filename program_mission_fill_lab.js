'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Fill_Lab extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'fill_lab', room: this.data.room, target: this.data.target });

        //console.log('Mission_Fill_Lab.constructor - executing');
        this.frequency = 10;

        this.desiredSpawnType = 'carry';
    }

    run()
    {
        super.run();

        //console.log('Mission_Fill_Lab.run - ' + this.data.room + ' - executing');

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

        let lab = Game.getObjectById(this.data.target);
        if (!lab)
            return null;

        if (lab.needsUnload())
            return null;

        if (!lab.needsLoad())
            return null;

        let labMemory = Room.getBaseLabsMemory(this.data.room);
        if (!labMemory)
            return null;

        let labStatus = labMemory.labStatus;
        if (!labStatus)
            return null;

        let thisLabStatus = _.find(labStatus, ls => ls.id == this.data.target);
        if (!thisLabStatus)
            return null;

        let mineralAmountDesired = thisLabStatus.amount;
        let energyAmountDesired = mineralAmountDesired * (LAB_BOOST_ENERGY / LAB_BOOST_MINERAL);

        let mineralTypeDesired = thisLabStatus.boost;
        if (!mineralTypeDesired)
        {
            mineralTypeDesired = thisLabStatus.resource;
            mineralAmountDesired = labMemory.rip.outputAmount;
        }

        if (!mineralTypeDesired)
            return null;

        if (energyAmountDesired)
        {
            let energyStored = lab.store.getUsedCapacity(RESOURCE_ENERGY);
            energyAmountDesired -= energyStored;
            if (energyAmountDesired < 0)
                energyAmountDesired = 0;
        }

        // wait for it to be emptied
        if (!energyAmountDesired && lab.mineralType && lab.mineralType != mineralTypeDesired)
            return null;

        if (mineralAmountDesired)
        {
            let mineralStored = lab.store.getUsedCapacity(mineralTypeDesired);
            mineralAmountDesired -= mineralStored;
            if (mineralAmountDesired < 0)
                mineralAmountDesired = 0;
        }

        if (mineralAmountDesired + energyAmountDesired <= totalCapacity)
            return null;

        let storedMineralAmount = Room.getStoredResourceAmount(this.data.room, mineralTypeDesired);
        if (storedMineralAmount <= 0)
            return null;

        let storedEnergyAmount = Room.getStoredResourceAmount(this.data.room, RESOURCE_ENERGY);
        if (storedEnergyAmount <= 0)
            return null;

        let minHaveOrNeeded = Math.min(mineralAmountDesired + energyAmountDesired, storedMineralAmount + storedEnergyAmount);
        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);

        //console.log('Mission_Fill_Lab.getTask - ' + this.data.room + ' - energyNeeded: ' + energyNeeded + ' - creepEnergy: ' + creepEnergy);

        if (energyAmountDesired > 0)
            mineralTypeDesired = RESOURCE_ENERGY;

        return { utility: utility, task: 'fill_lab', program: 'task_fill_lab', data: { t: lab.id, x: lab.pos.x, y: lab.pos.y, r: lab.room.name, res: mineralTypeDesired }};
    }
}

module.exports = Mission_Fill_Lab
