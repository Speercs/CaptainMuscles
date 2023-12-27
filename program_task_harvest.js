'use strict'

let Task = require('program_task');

class Task_Harvest extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        if (this.creep.room.controller && ((this.creep.room.controller.owner && !this.creep.room.controller.my) || (this.creep.room.controller.reservation && this.creep.room.controller.reservation.username != ME)))
            return TASK_RESULT_COMPLETE;
            
        let creepSpace = creep.getFreeSpace();

        if (creepSpace <= 0)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (Game.rooms[this.memory.r] && !target.energy)
            return TASK_RESULT_COMPLETE;

        if (this.gotoTarget(target, 1))
            return TASK_RESULT_BREAK;

        creep.harvest(target);

        if (creepSpace <= creep.harvestPower)
            return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Harvest
