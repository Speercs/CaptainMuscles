'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Loot extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'loot', room: this.data.room });

        this.desiredSpawnType = 'carry';

        //console.log('Mission_Loot.constructor - executing ' + this.data.room);
    }

    updateInfo()
    {
        super.updateInfo();

        //console.log('Mission_Loot.updateInfo - ' + this.data.room + ' - checking');

        //this.memory.remote = 1;
    }

    getDesiredSpawn(creep)
    {
        //console.log('Mission_Loot.getDesiredSpawn - ' + this.data.room + ' - checking');

        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        let nearestBase = Room.getNearestBase(this.data.room);

        let maxParts = 20;
        if (nearestBase)
        {
            if (nearestBase.isBootstrapping())
                maxParts = 2;
            else if (nearestBase.controller.level < 7)
                maxParts = 16;
        }

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        //console.log('*****************Mission_Loot.getTask - ' + this.data.room + ' - checking');

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let nearestBase = Room.getNearestBase(this.data.room);
        if (!nearestBase || !nearestBase.hasMyStorageOrTerminal())
            return null;

        let distanceToBase = global.distanceBetweenRooms(this.data.room, nearestBase.name);
        let desiredCreepCount = (distanceToBase + 1) * 2;
        if (this.memory.creeps.length >= desiredCreepCount)
            return null;

        //console.log('Mission_Loot.getTask - ' + this.data.room + ' - returning task');

        let utility = 1.0 - (this.memory.creeps.length / desiredCreepCount);
        return { utility: utility, task: 'loot', program: 'task_loot', data: { r: this.data.room }};
    }
}

module.exports = Mission_Loot
