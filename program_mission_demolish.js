'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Demolish extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'demolish', room: this.data.room });

        this.desiredSpawnType = 'work';

        //console.log('Mission_Demolish.constructor - executing ' + this.data.room);
    }

    updateInfo()
    {
        super.updateInfo();

        return this.suicide();

        //console.log('Mission_Demolish.updateInfo - ' + this.data.room + ' - checking');

        let roomMemory = Room.getMemory(this.data.room);
        roomMemory.demolish = 1;

        this.memory.remote = 1;
    }

    getDesiredSpawn(creep)
    {
        //console.log('Mission_Demolish.getDesiredSpawn - ' + this.data.room + ' - checking');

        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        //console.log('Mission_Demolish.getTask - ' + this.data.room + ' - checking');

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (this.memory.creeps.length >= 1)
            return null;

        //console.log('Mission_Demolish.getTask - ' + this.data.room + ' - returning task');

        let utility = 1.0 - (this.memory.creeps.length / 3);
        return { utility: utility, task: 'demolish', program: 'task_demolish', data: { r: this.data.room }};
    }
}

module.exports = Mission_Demolish
