'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Attack extends Task
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 0;
        this.autoBoost = 0;
    }

    doTask(creep)
    {
        let missionInfo = { type: 'attack', room: this.memory.r };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        // if (missionMemory.creeps.indexOf(creep.name) < 0)
        //     return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Attack
