'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Caravan_Search extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        if (this.memory.delay && this.memory.delay > 0)
        {
            this.memory.delay -= 1;
            return TASK_RESULT_BREAK;
        }

        if (!this.memory.currentTarget)
            this.memory.currentTarget = this.memory.r;

        if (this.moveToRoom(this.memory.currentTarget, 2))
            return TASK_RESULT_BREAK;

        this.memory.delay = 25;

        if (creep.room.name == this.memory.r)
            this.memory.currentTarget = this.memory.targetRoom;
        else
            this.memory.currentTarget = this.memory.r;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Caravan_Search
