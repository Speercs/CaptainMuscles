'use strict'

let Task = require('program_task');

class Task_Destroy_Target extends Task
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
            
        creep.attack(target);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Destroy_Target
