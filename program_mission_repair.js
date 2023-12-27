'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Repair extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'repair', room: this.data.room });

        this.desiredSpawnType = 'worry';

        //console.log('Mission_Repair.constructor - executing');
    }

    run()
    {
        super.run();
        //console.log('Mission_Repair.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        this.memory.out = (_.sum(this.getCreeps(), c => c.memory.work) || 0);
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;
        return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (!this.room)
            return null;

        if (creep && creep.memory.boosts)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.memory.creeps.length > 0)
            return null;

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory)
            return null;

        if (this.memory.siteCount <= 0)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let utility = 0.0;
        if (this.room.isBootstrapping() && this.memory.creeps.length <= 0)
        {
            utility = 1.0;
        }
        else if (baseMemory.spendable >= 1)
        {
            let thisSpending = (_.sum(this.getSpawnedCreeps(), c => c.memory.work) || 0);
            utility = 1.0 - (thisSpending / baseMemory.spendable);
        }

        let target;
        if (this.room.quickCan1 && this.room.quickCan1.hitsPercent <= .5)
            target = this.room.quickCan1;
        else if (this.room.quickCan2 && this.room.quickCan2.hitsPercent <= .5)
            target = this.room.quickCan2;
        else if (this.room.controllerCan && this.room.quickCan1.controllerCan <= .5)
            target = this.room.controllerCan;

        if (!target)
            return null;

        return { utility: utility, task: 'repair', program: 'task_repair', data: { t: target.id, x: target.pos.x, y: target.pos.y, r: target.room.name }};
    }
}

module.exports = Mission_Repair
