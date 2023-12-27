'use strict'

let Task = require('program_task');

class Task_Fill_Worker extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        let creepCapacity = creep.store.getCapacity();
        if (creepCapacity <= 0)
            return TASK_RESULT_COMPLETE;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        if (creepEnergy <= 0)
        {
            if (this.getResourceFromStorage(RESOURCE_ENERGY, false, true))
                return TASK_RESULT_BREAK;
            else
                return TASK_RESULT_COMPLETE;
        }

        return this.deliverResourceToTarget(target, RESOURCE_ENERGY);
    }
}

module.exports = Task_Fill_Worker
