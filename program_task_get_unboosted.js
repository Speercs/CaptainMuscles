'use strict'

let Task = require('program_task');

class Task_Get_Unboosted extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(target, 1))
            return TASK_RESULT_BREAK;

        if (target.cooldown && target.cooldown > creep.ticksToLive)
            return TASK_RESULT_COMPLETE;

        if (target.cooldown)
            return TASK_RESULT_BREAK;

        let result = target.unboostCreep(creep);

        console.log('Task_Get_Unboosted.doTask - ' + creep.name + ' - ' + this.memory.r + ' - getting unboosted, result: ' + result);

        target.busy = true;
        
        if (result == OK)
        {
            delete creep.memory.boosts;
            return TASK_RESULT_COMPLETE;
        }

        return TASK_RESULT_BREAK;
    }
    
}

module.exports = Task_Get_Unboosted
