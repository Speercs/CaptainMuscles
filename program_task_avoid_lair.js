'use strict'

let Task = require('program_task');

class Task_Avoid_Lair extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let target = this.getTarget();
        if (!target || !target.room)
            return TASK_RESULT_COMPLETE;

        let wakeTime = this.memory.wake;
        if (!wakeTime)
            return TASK_RESULT_COMPLETE;

        if (target.ticksToSpawn && target.ticksToSpawn > 20 && ENERGY_REGEN_TIME - target.ticksToSpawn > 5 && Game.time >= wakeTime)
            return TASK_RESULT_COMPLETE;

        let rangeToLair = creep.wpos.getRangeTo(target.wpos);

        if (rangeToLair > 10 && this.moveToTarget(target, 10))
            return TASK_RESULT_BREAK;

        if (rangeToLair < 10)
        {
            let nearestBase = Room.getNearestBase(creep.room.name);
            if (nearestBase && this.moveToTarget(nearestBase.controller))
                return TASK_RESULT_BREAK;
            return this.fleeTarget(target, 10, { ignoreCreeps: false });
        }
            

        if (!target.ticksToSpawn || target.ticksToSpawn > 20)
        {
            this.sleep(Math.max(10, wakeTime - Game.time));
            return TASK_RESULT_BREAK;
        }

        this.sleep(Math.max(target.ticksToSpawn + 10, wakeTime - Game.time));
        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Avoid_Lair
