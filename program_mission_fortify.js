'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Fortify extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'fortify', room: this.data.room });

        //console.log('Mission_Fortify.constructor - executing');

        this.desiredSpawnType = 'worry';
    }

    run()
    {
        super.run();
        //console.log('Mission_Fortify.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        this.memory.out = 0;

        let firstCreepOut = 0;
        let creepCount = 0;
        while (creepCount < this.memory.creeps.length)
        {
            let creepName = this.memory.creeps[creepCount];
            let creep = Game.creeps[creepName];
            if (!creep)
            {
                this.endChildProcess(creepName);
                this.memory.creeps.splice(creepCount, 1);
            }
            else
            {
                let creepOut = creep.memory.work;
                if (firstCreepOut == 0)
                    firstCreepOut = creepOut;
                this.memory.out += creepOut;
                ++creepCount;
            }
        }
    }

    getDesiredSpawn(creep, spawn)
    {
        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        let boosts = this.getDesiredBoosts(creep, spawn);

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, task: task, boosts: boosts };
        return this.memory.desiredSpawn;
    }

    getTask(creep, spawn)
    {
        if (creep && !creep.memory.boosts && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.memory.creeps.length > 0)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (!this.room)
            return null;

        if (Room.getStoredResourceAmount(this.data.room, RESOURCE_ENERGY) < 10000)
            return null;

        return { utility: 1.0, task: 'fortify', program: 'task_fortify', data: { r: this.data.room } };
    }

    getDesiredBoosts(creep, spawn)
    {
        if (!spawn)
            return null;

        return [ { b: 'XLH2O', r: 0 } ];
    }
}

module.exports = Mission_Fortify
