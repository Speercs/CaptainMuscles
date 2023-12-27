'use strict'

let Job = require('job');

class Job_Reactor_Claim extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Reactor_Claim.constructor - executing');

        this.jobType = 'reactor_claim';
        this.desiredSpawnType = 'claim';

        this.isMilitary = true;
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let desiredType = this.desiredSpawnType;

        let maxParts = 1;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: desiredType, maxParts: maxParts, task: task };
    }

    getTask(creep, spawn)
    {
        if (!Room.wantToClaimReactor(this.roomName))
            return null;

        if (this.getCreepMemories().length > 0)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let roomMemory = Room.getMemory(this.roomName);

        if (creep && creep.wpos.getRangeTo(new RoomPosition(roomMemory.reactor.x, roomMemory.reactor.y, this.roomName).wpos) > creep.ticksToLive)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'reactor_claim', program: 'task_reactor_claim', data: { r: this.roomName }};
    }
}

module.exports = Job_Reactor_Claim;
