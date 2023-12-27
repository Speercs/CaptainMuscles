'use strict'

let Task = require('program_task');

class Task_Loot extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let creepSpace = creep.getFreeSpace();
        if (creepSpace <= 0)
            return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let nearestBase = Room.getNearestBase(this.memory.r);
        if (!nearestBase)
            return TASK_RESULT_COMPLETE;

        if (!nearestBase.storage || !nearestBase.storage.my || nearestBase.storage.store.getFreeCapacity() < 10000)
            return TASK_RESULT_COMPLETE;

        let energyOnly = false;
        if (!nearestBase.terminal || !nearestBase.terminal.my)
            energyOnly = true;

        let target = creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: st => st.isLootable() && (!energyOnly || st.store.getUsedCapacity(RESOURCE_ENERGY) > 0)});
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (energyOnly)
            this.getResourceFromTarget(target, RESOURCE_ENERGY);
        else
            this.getResourceFromTarget(target);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Loot
