'use strict'

let Task = require('program_task');

class Task_Fill_Lab extends Task
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
        {
            console.log('Task_Fill_Lab.doTask - ' + creep.name + ' - ' + this.memory.r + ' - could not find target');
            return TASK_RESULT_COMPLETE;
        }
            
        let creepCapacity = creep.store.getCapacity();
        if (creepCapacity <= 0)
        {
            console.log('Task_Fill_Lab.doTask - ' + creep.name + ' - ' + this.memory.r + ' - no capacity');
            return TASK_RESULT_COMPLETE;
        }

        if (this.memory.res == RESOURCE_ENERGY && target.store.getFreeCapacity(RESOURCE_ENERGY) <= 0)
            return TASK_RESULT_COMPLETE;

        let creepCarry = creep.getResourceAmount();

        if (this.memory.res != RESOURCE_ENERGY)
        {
            if (target.mineralType)
            {
                if (target.mineralType != this.memory.res)
                {
                    console.log('Task_Fill_Lab.doTask - ' + creep.name + ' - ' + this.memory.r + ' - lab has another mineral');
                    return TASK_RESULT_COMPLETE;
                }

                if (target.store.getUsedCapacity(this.memory.res) >= this.memory.amount)
                    return TASK_RESULT_COMPLETE;

                let targetSpace = target.store.getFreeCapacity(this.memory.res);
                if (targetSpace <= 0)
                {
                    if (creepCarry > 0)
                        return this.deliverResourceToStorage();

                    console.log('Task_Fill_Lab.doTask - ' + creep.name + ' - ' + this.memory.r + ' - lab has no free space');
                    return TASK_RESULT_COMPLETE;
                }
            }
        }

        let targetDesiredAmount = target.desiredResourceLoadAmount();
        if (targetDesiredAmount <= 0)
        {
            if (creepCarry > 0)
                return this.deliverResourceToStorage();

            console.log('Task_Fill_Lab.doTask - ' + creep.name + ' - ' + this.memory.r + ' - lab desires no mineral');
            return TASK_RESULT_COMPLETE;
        }

        let creepResource = creep.getResourceAmount(this.memory.res);
        if (creepResource <= 0)
        {
            if (creepCarry > 0)
                return this.deliverResourceToStorage();

            if (this.getResourceFromStorage(this.memory.res, false, false, this.memory.amount))
                return TASK_RESULT_BREAK;

            //return TASK_RESULT_COMPLETE;
            return TASK_RESULT_BREAK;
        }

        return this.deliverResourceToTarget(target, this.memory.res);
    }
}

module.exports = Task_Fill_Lab
