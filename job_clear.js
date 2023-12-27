'use strict'

let Job = require('job');

class Job_Clear extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Clear.constructor - executing');

        this.jobType = 'clear';
        this.desiredSpawnType = 'attack';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, minParts: 20, task: task };
    }

    getTask(creep, spawn)
    {
        if (Room.inDanger(this.roomName))
            return null;
            
        if (spawn && spawn.room.controller.level < 7)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && (!creep.memory[ATTACK] || !creep.memory[HEAL] || creep.memory[ATTACK] < 20 || creep.memory[HEAL] < 5))
            return null;

        let thisCreeps = this.getCreeps();
        if (thisCreeps.length > 1)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || (roomMemory.allies && roomMemory.allies.partCount && (roomMemory.allies.partCount[ATTACK] || roomMemory.allies.partCount[RANGED_ATTACK])))
            return null;

        if (thisCreeps.length > 0)
        {
            let firstCreep = thisCreeps[0];
            if (firstCreep.spawning)
                return null;

            let buffer = firstCreep.memory.parts * CREEP_SPAWN_TIME;
            if (spawn)
                buffer += spawn.wpos.getManhattanDist(firstCreep.wpos);
            if (creep)
                buffer += creep.wpos.getManhattanDist(firstCreep.wpos);

            if (firstCreep.ticksToLive > buffer)
                return null;
        }

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'clear', program: 'task_clear', data: { r: this.roomName }};
    }
}

module.exports = Job_Clear;
