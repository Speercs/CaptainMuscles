'use strict'

let Job = require('job');

class Job_Destroy extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Destroy.constructor - executing');

        this.jobType = 'destroy';
        this.desiredSpawnType = 'destroy';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task };
    }

    getTask(creep)
    {
        if (creep)
        {
            if (creep.memory.type != this.desiredSpawnType && creep.memory.type != 'attack')
                return null;

            let spawnedCreeps = this.getSpawnedCreeps();
            for (let spawnedCreep of spawnedCreeps)
            {
                if (creep.memory[ATTACK] <= spawnedCreep.memory[ATTACK])
                    return null;
            }
        }

        if (!creep && this.getCreeps().length > 0)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.hostiles || !roomMemory.hostiles.ic || roomMemory.hostiles.tc)
        {
            //console.log('Mission_Destroy.getTask - ' + this.roomName + ' - no roomMemory or hostile data found');
            return null;
        }


        if (roomMemory.hostiles.partCount && (roomMemory.hostiles.partCount[ATTACK] || roomMemory.hostiles.partCount[RANGED_ATTACK]))
        {
            //console.log('Mission_Destroy.getTask - ' + this.roomName + ' - enemies detected');
            return null;
        }

        //console.log('Mission_Destroy.getTask - ' + this.roomName + ' - returning task');

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'destroy', program: 'task_destroy', data: { r: this.roomName }};
    }
}

module.exports = Job_Destroy;
