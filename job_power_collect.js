'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Power_Collect extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Power_Collect.constructor - executing');

        this.jobType = 'power_collect';
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
        if (!constants.USE_POWER)
            return null;
            
        if (creep)
        {
            if (creep.memory.type != this.desiredSpawnType)
                return null;

            let creepCarry = creep.getResourceAmount();
            if (creepCarry > 0)
                return null;
        }

        let powerBank = Game.getObjectById(this.data.source);
        if (!powerBank)
            return null;

        let nearestBase = Room.getNearestBase(this.roomName)
        if (!nearestBase || !nearestBase.controller)
            return null;

        let totalCapacity = this.getTotalCreepCapacity();
        if (totalCapacity >= powerBank.power)
            return null;

        let attackCreeps = Room.getJobCreeps(this.roomName, 'power_attack_' + this.data.source);
        if (!attackCreeps || attackCreeps.length <= 0)
            return null;

        let distanceToPowerBank = powerBank.wpos.getManhattanDist(nearestBase.controller.wpos);

        let ticksToDestroy = powerBank.ticksToDestroy;
        if (ticksToDestroy > 300 + distanceToPowerBank)
            return null;
        // if (ticksToDestroy < distanceToPowerBank)
        //     return null;

        if (creep && creep.ticksToLive < ticksToDestroy + (distanceToPowerBank * 3) + 150)
            return null;

        //console.log('_________________Job_Power_Collect.findTask - ' + powerBank.pos.roomName + ' - ticksToDestroy: ' + ticksToDestroy + ', distanceToPowerBank: ' + distanceToPowerBank);

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'power_collect', program: 'task_power_collect', data: { t: powerBank.id, x: powerBank.pos.x, y: powerBank.pos.y, r: powerBank.pos.roomName }};
    }
}

module.exports = Job_Power_Collect;
