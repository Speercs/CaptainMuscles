'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Stock extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'stock', room: this.data.room });

        //console.log('Mission_Stock.constructor - executing');
        this.frequency = 10;

        this.desiredSpawnType = 'transfer';
        if (this.room && this.room.coreLink)
            this.desiredSpawnType = 'carry';
    }

    run()
    {
        super.run();

        return this.suicide();
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        let task = this.getTask(creep);
        if (!task)
            return null;

        let maxParts = 20;

        if (this.desiredSpawnType == 'transfer')
        {
            maxParts = 4;
            if (this.room.controller.level >= 8)
                maxParts = 16;
            else if (this.room.controller.level >= 7)
                maxParts = 8;
        }
        else if (this.room.controller.level < 7)
        {
            maxParts = 16;
        }

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.memory.creeps.length > 0)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (!this.room)
            return null;

        if (this.room.controller.level < 4 || !this.room.hasMyStorageOrTerminal())
            return null;

        return { utility: 1.0, task: 'stock', program: 'task_stock', data: { r: this.data.room }};
    }
}

module.exports = Mission_Stock
