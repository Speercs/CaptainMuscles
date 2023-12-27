'use strict'

let Task = require('program_task');

class Task_Collect_Chain extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    resume()
    {
        super.resume();

        if (this.creep && this.creep.memory.n == this.creep.memory.mission.creeps.length - 1)
            return this.suicide();
    }

    doTask(creep)
    {
        super.doTask();

        let creepCarry = creep.getResourceAmount();
        if (creepCarry > 0)
        {
            if (creep.memory.n == creep.memory.mission.creeps.length - 1)
            {
                let nearestBase = Room.getNearestBase(creep.room.name);
                let dropOffPos = nearestBase.quickLinkPos;
                this.launchChildProcess('drop', 'task_drop',  { creep: creep.name, x: dropOffPos.x, y: dropOffPos.y, r: dropOffPos.roomName, res: RESOURCE_ENERGY }, true);
                return TASK_RESULT_CONTINUE_NEXT;
            }

            let nextCreepName = creep.memory.mission.creeps[creep.memory.n + 1];
            let nextCreep = Game.creeps[nextCreepName];
            if (nextCreep)
            {
                if (creep.wpos.getRangeTo(nextCreep.wpos) > 1)
                {
                    creep.moveTo(nextCreep);
                    return TASK_RESULT_BREAK;
                }
                else
                {
                    creep._transfer(nextCreep, RESOURCE_ENERGY);
                    // this continues on purpose
                }

            }
            else
            {
                return TASK_RESULT_BREAK;
            }
        }

        if (creep.memory.n == 0)
        {
            this.launchChildProcess('collect_near', 'task_collect_near',  { creep: creep.name, t: this.data.t, x: this.data.x, y: this.data.y, r: this.data.r, res: RESOURCE_ENERGY }, true);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        let prevCreepName = creep.memory.mission.creeps[creep.memory.n - 1];
        let prevCreep = Game.creeps[prevCreepName];
        if (prevCreep && creep.wpos.getRangeTo(prevCreep.wpos) > 1)
            creep.moveTo(prevCreep);
            //this.moveToTarget(prevCreep, 1);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Collect_Chain
