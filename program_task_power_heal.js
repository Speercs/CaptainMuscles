'use strict'

let Mission_Creeps = require('program_mission_creeps');
let Task = require('program_task');

class Task_Power_Heal extends Task
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
            Game.map.visual.line(creep.pos, targetPos, {color: '#00ff00', lineStyle: 'dashed', opacity: 0.5});
            Game.map.visual.circle(targetPos, {radius: 1, fill: '#00ff00', opacity: 0.5});
        }

        let missionInfo = { type: 'powerBank', room: this.memory.r, target: this.memory.t };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;




        let canHeal = true;
        if (creep.hits < creep.hitsMax)
        {
            creep.heal(creep);
            canHeal = false;
        }

        let creepsNeedingHealing = _.filter(Room.getJobCreeps(this.memory.r, 'power_attack_' + this.memory.t), c => c.room.name == creep.room.name);
        if (!target && (!creepsNeedingHealing || creepsNeedingHealing.length <= 0))
            creepsNeedingHealing = creep.room.find(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax });

        if (creepsNeedingHealing.length > 0)
        {
            let healCreeps = _.filter(Room.getJobCreeps(this.memory.r, 'power_heal_' + this.memory.t), c => c.room.name == creep.room.name);
            if (!healCreeps)
                return TASK_RESULT_BREAK;

            let thisIndex = healCreeps.indexOf(creep);
            if (thisIndex < 0)
                return TASK_RESULT_BREAK;

            thisIndex = thisIndex % creepsNeedingHealing.length;
            if (thisIndex < creepsNeedingHealing.length)
            {
                let healTarget = creepsNeedingHealing[thisIndex];

                if (this.moveToTarget(healTarget, 1))
                    return TASK_RESULT_BREAK;

                if (canHeal && healTarget.hits < healTarget.hitsMax)
                    creep.heal(healTarget);

                return TASK_RESULT_BREAK;
            }
        }

        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Power_Heal
