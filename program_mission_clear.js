'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Clear extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'clear', room: this.data.room });

        this.desiredSpawnType = 'attack';

        //console.log('Mission_Clear.constructor - executing ' + this.data.room);
    }

    end()
    {
        super.end();

        let roomMemory = Room.getMemory(this.data.room);
        if (roomMemory)
            delete roomMemory.clear;
    }

    run()
    {
        super.run();
        //console.log('Mission_Clear.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        //console.log('Mission_Clear.updateInfo - ' + this.data.room + ' - checking');

        let roomMemory = Room.getMemory(this.data.room);
        if (this.getSpawnedCreeps().length > 0)
        {
            roomMemory.clear = 1;
            //console.log('Mission_Clear.updateInfo - ' + this.data.room + ' - setting clear flag - ' + JSON.stringify(roomMemory));
        }
        else
        {
            delete roomMemory.clear;
        }
    }

    getDesiredSpawn(creep, spawn)
    {
        //console.log('Mission_Clear.getDesiredSpawn - ' + this.data.room + ' - checking');

        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep, spawn);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, minParts: 20, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep, spawn)
    {
        //console.log('Mission_Clear.getTask - ' + this.data.room + ' - checking');

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (this.memory.creeps.length > 0)
        {
            let firstCreep = Game.creeps[this.memory.creeps[0]];
            if (!firstCreep.spawning)
            {
                let buffer = firstCreep.memory.parts * CREEP_SPAWN_TIME;
                if (spawn)
                    buffer += spawn.wpos.getManhattanDist(firstCreep.wpos);
                if (creep)
                    buffer += creep.wpos.getManhattanDist(firstCreep.wpos);

                //console.log('Mission_Clear.getTask - ' + this.data.room + ' - buffer: ' + buffer + ', firstCreep.ticksToLive: ' + firstCreep.ticksToLive);

                if (firstCreep.ticksToLive > buffer)
                    return null;
            }
        }

        //console.log('Mission_Clear.getTask - ' + this.data.room + ' - returning task');

        return { utility: 1.0, task: 'clear', program: 'task_clear', data: { r: this.data.room }};
    }
}

module.exports = Mission_Clear
