'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Empty_Labs extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'empty_labs', room: this.data.room });

        //console.log('Mission_Empty_Labs.constructor - executing');
        this.frequency = 10;

        this.desiredSpawnType = 'carry';
    }

    run()
    {
        super.run();

        //console.log('Mission_Empty_Labs.run - ' + this.data.room + ' - executing');

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

            if (creep.getResourceAmount() > 0)
                return null;

            totalCapacity = this.getTotalSpawnedCreepCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
        }

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory || !baseMemory.labs || !baseMemory.labs.rip)
            return null;

        let labs = this.room.structures[STRUCTURE_LAB];
        if (!labs || labs.length <= 0)
            return null;

        let carryNeeded = 0;
        for (let lab of labs)
        {
            if (lab.needsUnload())
                carryNeeded += lab.store.getUsedCapacity(lab.mineralType);
        }

        if (carryNeeded <= totalCapacity)
            return null;

        let utility = 1.0 - (totalCapacity / carryNeeded);

        //console.log('Mission_Empty_Labs.getTask - ' + this.data.room + ' - energyNeeded: ' + energyNeeded + ' - creepEnergy: ' + creepEnergy);

        return { utility: utility, task: 'empty_labs', program: 'task_empty_labs', data: { r: this.data.room }};
    }
}

module.exports = Mission_Empty_Labs
