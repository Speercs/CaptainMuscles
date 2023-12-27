'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Deposit_Collect extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Deposit_Collect.constructor - executing');

        this.jobType = 'deposit_collect';
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
        if (!constants.USE_FACTORY)
            return null;

        let totalFreeCapacity = 0;
        if (creep)
        {
            if (creep.memory.type != this.desiredSpawnType)
                return null;

            if (this.getCreepCount() > 0)
                return null;

            let creepCarry = creep.getResourceAmount();
            if (creepCarry > 0)
                return null;

            totalFreeCapacity = this.getTotalSpawnedCreepFreeCapacity();
        }
        else
        {
            totalFreeCapacity = this.getTotalCreepFreeCapacity();
        }

        let deposit = Game.getObjectById(this.data.source);
        if (!deposit)
            return null;

        let nearestBase = Room.getNearestBase(this.roomName)
        if (!nearestBase || !nearestBase.controller)
            return null;

        let harvestCreeps = Room.getJobCreeps(this.roomName, 'deposit_harvest_' + this.data.source);
        if (!harvestCreeps || harvestCreeps.length <= 0)
            return null;

        let totalHarvesterCapacity = _.sum(harvestCreeps.map(c => c.store.getCapacity()));
        if (totalFreeCapacity > totalHarvesterCapacity)
            return null;

        let distanceToDeposit = deposit.wpos.getManhattanDist(nearestBase.controller.wpos);

        if (deposit.ticksToDecay < distanceToDeposit + 150)
            return null;

        if (creep && creep.ticksToLive < (distanceToDeposit * 3))
            return null;

        //console.log('_________________Job_Deposit_Collect.findTask - ' + deposit.pos.roomName + ' - ticksToDestroy: ' + ticksToDestroy + ', distanceToDeposit: ' + distanceToDeposit);

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'deposit_collect', program: 'task_deposit_collect', data: { t: deposit.id, x: deposit.pos.x, y: deposit.pos.y, r: deposit.pos.roomName }};
    }
}

module.exports = Job_Deposit_Collect;
