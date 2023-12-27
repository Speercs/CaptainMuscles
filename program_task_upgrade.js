'use strict'

let Task = require('program_task');

class Task_Upgrade extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();

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
        if (this.creep)
            this.creep.memory.ept = this.creep.upgradePower;

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
        if (!target || !target.my)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(target, 3))
        {
            delete this.memory.gotClose;
            return TASK_RESULT_BREAK;
        }

        let rangeToTarget = creep.pos.getRangeTo(target);

        if (rangeToTarget > 2 && !this.memory.gotClose)
            creep.moveTo(target);

        if (rangeToTarget <= 2)
            this.memory.gotClose = 1;

        let upgradeThisTick = this.accumulate(creep);

        if (!upgradeThisTick)
            return TASK_RESULT_BREAK;

        creep.upgradeController(target);
        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Upgrade
