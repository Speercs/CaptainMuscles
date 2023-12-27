'use strict'

let Task = require('program_task');

class Task_Deposit_Harvest extends Task
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

        if (target.lastCooldown && target.lastCooldown > 50)
        {
            if (this.dropResources())
                return TASK_RESULT_BREAK;
            return TASK_RESULT_COMPLETE;
        }


        if (this.moveToTarget(target, 1))
            return TASK_RESULT_BREAK;

        if (target.coolDown)
        {
            if (creep.ticksToLive <= target.coolDown)
            {
                creep.suicide();
                return TASK_RESULT_BREAK;
            }

            if (target.coolDown > 1)
                this.sleep(target.coolDown - 1);
            return TASK_RESULT_BREAK;
        }

        let creepSpace = creep.getFreeSpace();
        if (creepSpace <= 0)
        {
            if (target.lastCooldown && target.lastCooldown > 1)
                this.sleep(target.lastCooldown - 1);

            return TASK_RESULT_BREAK;
        }

        creep.harvest(target);

        // if (target.lastCooldown && target.lastCooldown > 1)
        //     this.sleep(target.lastCooldown - 1);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Deposit_Harvest
