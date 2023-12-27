'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Combat_Test extends Task
{
    constructor (...args)
    {
        super(...args);

        
    }

    doTask(creep)
    {
        this.memory.squad = 1;
        
        let missionInfo = { type: 'combat_test' };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        if (missionMemory.creeps.indexOf(creep.name) < 0)
            return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Combat_Test
