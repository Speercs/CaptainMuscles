'use strict'

let Job = require('job');

class Job_Send_Out extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Send_Out.constructor - executing');
        this.desiredSpawnType = 'carry';
        this.jobType = 'send_out';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task };
    }

    getTask(creep)
    {
        return null;
        
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (!Room.sendingAwayResources(this.roomName))
            return null;

        if (!this.room              ||
            !this.room.isMyBase()   ||
            !this.room.storage      ||
            !this.room.terminal     ||
            !this.room.terminal.my  ||
            this.room.terminal.store.getFreeCapacity() <= 0 ||
            this.room.storage.store.getUsedCapacity() <= 0)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.getCreeps().length > 0)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'send_out', program: 'task_send_out', data: { r: this.roomName }};
    }
}

module.exports = Job_Send_Out;
