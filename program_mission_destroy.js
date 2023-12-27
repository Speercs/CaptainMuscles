'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Destroy extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'destroy', room: this.data.room });

        this.desiredSpawnType = 'destroy';

        //console.log('Mission_Destroy.constructor - executing ' + this.data.room);
    }

    updateInfo()
    {
        super.updateInfo();

        return this.suicide();

        this.memory.remote = 1;
    }

    getDesiredSpawn(creep)
    {
        //console.log('Mission_Destroy.getDesiredSpawn - ' + this.data.room + ' - checking');

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
        //console.log('Mission_Destroy.getTask - ' + this.data.room + ' - checking');

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep)
        {
            let spawnedCreeps = this.getSpawnedCreeps();
            for (let spawnedCreep of spawnedCreeps)
            {
                if (creep.memory[ATTACK] <= spawnedCreep.memory[ATTACK])
                    return null;
            }
        }

        if (!creep && this.memory.creeps.length > 0)
            return null;

        let roomMemory = Room.getMemory(this.data.room);
        if (!roomMemory || !roomMemory.hostiles || !roomMemory.hostiles.ic)
        {
            //console.log('Mission_Destroy.getTask - ' + this.data.room + ' - no roomMemory or hostile data found');
            return null;
        }


        if (roomMemory.hostiles.partCount && (roomMemory.hostiles.partCount[ATTACK] || roomMemory.hostiles.partCount[RANGED_ATTACK]))
        {
            //console.log('Mission_Destroy.getTask - ' + this.data.room + ' - enemies detected');
            return null;
        }

        //console.log('Mission_Destroy.getTask - ' + this.data.room + ' - returning task');

        return { utility: 1.0, task: 'destroy', program: 'task_destroy', data: { r: this.data.room }};
    }
}

module.exports = Mission_Destroy
