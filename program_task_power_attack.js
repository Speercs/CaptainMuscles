'use strict'

let Mission_Creeps = require('program_mission_creeps');
let Task = require('program_task');

class Task_Power_Attack extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (creep.room.name != this.memory.r)
        {
            let targetPos = target;
            if (target.pos)
                targetPos = target.pos;
            Game.map.visual.line(creep.pos, targetPos, {color: '#ff0000', lineStyle: 'dashed', opacity: 0.5});
            Game.map.visual.circle(targetPos, {radius: 1, fill: '#ff0000', opacity: 0.5});
        }

        let missionInfo = { type: 'powerBank', room: this.memory.r, target: this.memory.t };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;



        if (this.moveToTarget(target, 1))
            return TASK_RESULT_BREAK;

        if (creep.hitsPercent >= 0.5)
            creep.attack(target);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Power_Attack
