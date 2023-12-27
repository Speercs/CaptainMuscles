'use strict'

let Task = require('program_task');

class Task_Boost extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    end()
    {
        super.end();

        // if (this.creep && this.creep.memory.boostRequests)
        // {
        //     console.log('----------Task_Boost.end - ' + this.creep.name + ' - removing boost requests for ' + this.memory.res);
        //     let boostRequestIndex = _.findIndex(this.creep.memory.boostRequests, br => br.boost == this.memory.res);
        //     if (boostRequestIndex >= 0)
        //         this.creep.memory.boostRequests.splice(boostRequestIndex, 1);
        // }
    }

    doTask(creep)
    {
        super.doTask();

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(target, 1))
            return TASK_RESULT_BREAK;

        if (target.mineralType != this.memory.res || target.store.getUsedCapacity(this.memory.res) < this.memory.amount)
            return TASK_RESULT_BREAK;

        let result = target.boostCreep(creep);
        console.log('----------Task_Boost.doTask - ' + creep.name + ' - boost result: ' + result);
        if (result != OK)
            return TASK_RESULT_BREAK;

        if (!creep.memory.boosts)
            creep.memory.boosts = [];
        creep.memory.boosts.push(this.data.res);

        Room.cancelBoostRequest(creep.room.name, creep.name, this.data.res);

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Boost
