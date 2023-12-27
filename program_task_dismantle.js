'use strict'

const constants = require('constants');

let Task = require('program_task');

class Task_Dismantle extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        if (this.memory.forEnergy && creep.getFreeSpace(RESOURCE_ENERGY) <= 0)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        let isUnclaiming = Room.isUnclaiming(this.memory.r);

        let roomMemory = Room.getMemory(this.memory.r);
        if (!roomMemory)
            return TASK_RESULT_COMPLETE;

        if (!this.memory.forEnergy && !roomMemory.demolish && !isUnclaiming && (!target.effects || target.effects.length <= 0 || !target.effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER)))
            return TASK_RESULT_COMPLETE;

        let room = Game.rooms[this.memory.r];
        if (room && room.controller && room.controller.my && !this.memory.forEnergy && !isUnclaiming)
            target.destroy();

        if (this.moveToTarget(target, 1, { c: constants.PART_COLORS.WORK }))
        {
            if (!this.memory.forEnergy && creep.store.getUsedCapacity() > 0)
                this.dropResources();
            return TASK_RESULT_BREAK;
        }
            
        creep.dismantle(target);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Dismantle
