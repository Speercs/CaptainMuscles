'use strict'

let Job = require('job');

class Job_Repair extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Repair.constructor - executing');

        this.jobType = 'repair';
        this.desiredSpawnType = 'worry';
    }

    getTotalEnergyOut()
    {
        return (_.sum(this.getCreeps().map(c => c.buildPower)) || 0);
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
        if (!this.room)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && creep.memory.boosts)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        let creepCount = this.getCreeps().length;

        if (!creep && creepCount > 0)
            return null;

        let target;
        if (this.room.quickCan1 && this.room.quickCan1.hitsPercent <= .5)
            target = this.room.quickCan1;
        else if (this.room.quickCan2 && this.room.quickCan2.hitsPercent <= .5)
            target = this.room.quickCan2;
        else if (this.room.controllerCan && this.room.controllerCan.hitsPercent <= .5)
            target = this.room.controllerCan;

        if (!target)
            return null;

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory)
            return null;

        let utility = 0.0;
        if (this.room.isBootstrapping() && creepCount <= 0)
        {
            utility = 1.0;
        }
        else if (baseMemory.spendable >= 1)
        {
            let thisSpending = (_.sum(this.getSpawnedCreeps(), c => c.memory.work) || 0);
            utility = 1.0 - (thisSpending / baseMemory.spendable);
        }

        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'repair', program: 'task_repair', data: { t: target.id, x: target.pos.x, y: target.pos.y, r: target.room.name }};
    }
}

module.exports = Job_Repair;
