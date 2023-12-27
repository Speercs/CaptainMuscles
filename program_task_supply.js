'use strict'

let Task = require('program_task');

class Task_Supply extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (!room)
            return TASK_RESULT_COMPLETE;

        let creepCapacity = creep.store.getCapacity();
        if (creepCapacity <= 0)
            return TASK_RESULT_COMPLETE;

        let resourceType = (this.memory.res || RESOURCE_ENERGY);

        let target = this.getTarget();
        if (!target || target.store.getFreeCapacity(resourceType) <= 0 || target.store.getUsedCapacity(resourceType) >= this.memory.amount)
            return TASK_RESULT_COMPLETE;

        let creepResource = creep.getResourceAmount(resourceType);
        if (creepResource <= 0)
        {
            if (this.getResourceFromStorage(resourceType, false, true))
                return TASK_RESULT_BREAK;
            else
                return TASK_RESULT_COMPLETE;
        }

        return this.deliverResourceToTarget(target, resourceType);
    }
}

module.exports = Task_Supply
