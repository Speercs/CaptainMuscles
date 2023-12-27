'use strict'

let Task = require('program_task');

class Task_Fill_Can extends Task
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

        let target = this.getTarget();
        if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) <= 0)
            return TASK_RESULT_COMPLETE;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();

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

module.exports = Task_Fill_Can
