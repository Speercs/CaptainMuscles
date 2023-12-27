'use strict'

let Task = require('program_task');

class Task_Block_Controller extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let controller = creep.room.controller;
        let openPositions = controller.pos.getOpenPositionsInRange(2);
        //console.log('Task_Block_Controller - ' + creep.name + ' - openPositions.length: ' + openPositions.length);
        if (openPositions.length <= creep.memory.n)
            return TASK_RESULT_COMPLETE;

        let myPosition = openPositions[creep.memory.n];

        if (this.moveToTarget(myPosition, 0))
            return TASK_RESULT_BREAK;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Block_Controller
