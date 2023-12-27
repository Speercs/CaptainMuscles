'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Ship extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Ship.constructor - executing');

        this.jobType = 'ship';
        this.desiredSpawnType = 'carry';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task };
    }

    getTask(creep, spawn)
    {
        if (!this.room || !this.room.isMyBase())
            return null;

        if (creep && this.desiredSpawnType != creep.memory.type)
            return null;

        if (this.room.terminal && this.room.terminal.my && this.room.controller.level >= 6)
            return null;
            
        if (!this.room.storage || !this.room.storage.my || this.room.controller.level < 4)
            return null;

        let fromRoom = (creep || spawn).room;
        if (!fromRoom.isMyBase())
            return null;

        if (!fromRoom.terminal || !fromRoom.terminal.my || fromRoom.controller.level < 6)
            return null;

        if (Room.getResourceAmountLevel(this.roomName, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_HIGH)
            return null;

        if (Room.getResourceAmountLevel(fromRoom.name, RESOURCE_ENERGY) <= constants.RESOURCE_LEVEL_LOW)
            return null;

        return { utility: 0.01, jobId: this.id, jobType: this.jobType, name: 'ship', program: 'task_ship', data: { r: this.roomName } };
    }
}

module.exports = Job_Ship;
