'use strict'

let Task = require('program_task');

class Task_Repair extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();

        if (this.creep)
            this.creep.memory.ept = this.creep.memory.work;
        //this.launchChildProcess(`fill_worker_${this.memory.target}`, 'mission_fill_worker', { room: this.memory.r, target: this.creep.id });
    }

    end()
    {
        super.end();

        if (this.creep && this.creep.memory)
            delete this.creep.memory.ept;
    }

    doTask(creep)
    {
        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();
        if (creepEnergy <= 0)
        {
            if (!this.memory.getEnergy)
                return TASK_RESULT_COMPLETE;

            return this.getResourceNearest(RESOURCE_ENERGY);
        }
            
        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        // if (this.moveToRoom(this.memory.r, 0))
        //     return TASK_RESULT_BREAK;

        if (this.moveToTarget(target, 3))
        {
            delete this.memory.gotClose;
            return TASK_RESULT_BREAK;
        }

        let rangeToTarget = creep.pos.getRangeTo(target);

        if (target.hits >= target.hitsMax)
            return TASK_RESULT_COMPLETE;

        if (!this.memory.toFull && target.hits > target.hitsMax - creep.repairPower)
            return TASK_RESULT_COMPLETE;

        if (rangeToTarget == 0)
        {
            creep.moveRandom();
            return TASK_RESULT_BREAK;
        }

        if (rangeToTarget > 2 && !this.memory.gotClose)
            creep.moveTo(target);

        if (rangeToTarget <= 2)
            this.memory.gotClose = 1;

        let nearestBase = Room.getNearestBase(creep.room.name);

        let baseMemory = Room.getBaseMemory(nearestBase.name);

        let repairThisTick = this.data.ignorePq || Room.inDanger(creep.room.name) || this.accumulate(creep);

        if (creep.cantRepair || !repairThisTick)
            return TASK_RESULT_BREAK;

        creep.repair(target);
        if (creepEnergy <= creep.memory.work)
            return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Repair
