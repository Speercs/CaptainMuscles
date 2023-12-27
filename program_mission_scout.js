'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Scout extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'scout', room: this.data.room });

        //console.log('Mission_Scout.constructor - executing ' + this.data.room);

        this.desiredSpawnType = 'move';
    }

    updateInfo()
    {
        super.updateInfo();

        this.memory.remote = 1;

        return this.suicide();
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: 1, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (this.memory.creeps.length >= 1)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        return { utility: 0.001, task: 'scout', program: 'task_scout', data: { r: this.data.room }};
    }
}

module.exports = Mission_Scout
