'use strict'

let Task = require('program_task');

class Task_Empty_Labs extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (!room)
            return TASK_RESULT_COMPLETE;

        let creepSpace = creep.getFreeSpace();
        if (creepSpace <= 0)
            return TASK_RESULT_COMPLETE;

        let labs = room.structures[STRUCTURE_LAB];
        if (!labs || labs.length <= 0)
            return TASK_RESULT_COMPLETE;

        let maxOutputAmount = LAB_MINERAL_CAPACITY * 0.75;

        let carryNeeded = 0;
        for (let lab of labs)
        {
            if (lab.id != this.memory.lastLab && lab.needsUnload())
            {
                this.memory.lastLab = lab.id;
                return this.getResourceFromTarget(lab, lab.mineralType);
            }
        }

        if (this.memory.lastLab)
        {
            delete this.memory.lastLab;
            return TASK_RESULT_BREAK;
        }

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Empty_Labs
