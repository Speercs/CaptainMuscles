'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Smash extends Task
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 0;
    }

    doTask(creep)
    {
        let missionInfo = { type: 'smash', room: this.memory.r };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        // if (missionMemory.creeps.indexOf(creep.name) < 0)
        //     return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Smash
