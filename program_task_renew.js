'use strict'

let Task = require('program_task');

class Task_Renew extends Task
{
    constructor (...args)
    {
        super(...args);

        this.autoBoost = 0;
    }

    start()
    {
        super.start();

        let target = this.getTarget();
        if (!target)
            return;

        if (target.memory.renew && target.memory.renew.indexOf(this.data.creep) >= 0)
            return;

        if (!target.memory.renew)
            target.memory.renew = [];

        target.memory.renew.push(this.data.creep);
    }

    end()
    {
        let target = this.getTarget();
        if (target && target.memory.renew)
        {
            let indexOfCreep = target.memory.renew.indexOf(this.data.creep);
            if (indexOfCreep >= 0)
                target.memory.renew.splice(indexOfCreep, 1);
        }

        super.end();
    }

    doTask(creep)
    {
        super.doTask();

        if (CREEP_LIFE_TIME - creep.ticksToLive < 600 / creep.body.length)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.gotoTarget(target, 1))
            return TASK_RESULT_BREAK;

        if (target.spawning)
            return TASK_RESULT_BREAK;

        if (!target.memory.renew)
            return TASK_RESULT_COMPLETE;

        // let indexOfCreep = target.memory.renew.indexOf(creep.name);
        // if (indexOfCreep > 0)
        // {
        //     this.sleep(indexOfCreep);
        //     return TASK_RESULT_BREAK;
        // }
            
        let result = target.renewCreep(creep);
        if (result == OK)
        {
            // target.memory.renew.splice(indexOfCreep, 1);
            // target.memory.renew.push(creep.name);
            delete creep.memory.boosts;
            //this.sleep(target.memory.renew.length);            
        }
            
        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Renew
