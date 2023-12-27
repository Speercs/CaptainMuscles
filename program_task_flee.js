'use strict'

let Task = require('program_task');

class Task_Flee extends Task
{
    constructor (...args)
    {
        super(...args);

        this.autoBoost = 0;
    }

    start()
    {
        super.start();

        if (!this.memory.options)
            this.memory.options = {};

        if (_.isUndefined(this.memory.range))
            this.memory.range = 5;

        if (!this.memory.options.range)
            this.memory.options.range = this.memory.range;

        this.memory.options.flee = true;

        //console.log('Task_Flee.start - ' + this.creep.name + ' - ' + this.creep.pos + ' - fleeing from ' + this.getTarget());
    }

    doTask(creep)
    {
        super.doTask();

        if (creep.fatigue)
            TASK_RESULT_BREAK;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (((target.roomName && target.roomName == creep.room.name) ||
             (target.pos && target.pos.roomName == creep.room.name)) &&
              creep.pos.getRangeTo(target) < this.memory.range)
        {
            creep.moveTo(target, { ...this.memory.options });

            return TASK_RESULT_BREAK;
        }

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Flee
