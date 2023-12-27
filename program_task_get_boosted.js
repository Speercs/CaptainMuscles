'use strict'

let Task = require('program_task');

class Task_Get_Boosted extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    end()
    {
        super.end();

        if (this.creep && this.creep.memory.boostRequests)
        {
            //console.log('----------Task_Get_Boosted.end - ' + this.creep.name + ' - removing ALL boost requests');
            for (let boostRequest of this.creep.memory.boostRequests)
                Room.cancelBoostRequest(this.creep.room.name, this.creep.name, boostRequest.boost);
            delete this.creep.memory.boostRequests;
        }
    }

    doTask(creep)
    {
        super.doTask();

        if (!creep.memory.boostRequests || creep.memory.boostRequests.length < 1)
        {
            //console.log('----------Task_Get_Boosted.doTask - ' + this.creep.name + ' - no boostRequests');
            return TASK_RESULT_COMPLETE;
        }

        let room = Game.rooms[this.memory.r];
        if (!room)
        {
            //console.log('----------Task_Get_Boosted.doTask - ' + this.creep.name + ' - no room');
            return TASK_RESULT_COMPLETE;
        }

        let labMemory = Room.getBaseLabsMemory(this.memory.r);
        if (!labMemory)
        {
            //console.log('----------Task_Get_Boosted.doTask - ' + this.creep.name + ' - no labMemory');
            return TASK_RESULT_COMPLETE;
        }

        let labStatus = labMemory.labStatus;
        if (!labStatus)
        {
            //console.log('----------Task_Get_Boosted.doTask - ' + this.creep.name + ' - no labStatus');
            return TASK_RESULT_COMPLETE;
        }

        for (let boostRequest of creep.memory.boostRequests)
        {
            let desiredBoost = boostRequest.boost;
            let boostingLabStatus = _.find(labStatus, ls => (Game.getObjectById(ls.id) && !Game.getObjectById(ls.id).boosted && Game.getObjectById(ls.id).mineralType == desiredBoost && Game.getObjectById(ls.id).store.getUsedCapacity(desiredBoost) >= boostRequest.amount && Game.getObjectById(ls.id).store.getUsedCapacity(RESOURCE_ENERGY) >= boostRequest.amount * (LAB_BOOST_ENERGY / LAB_BOOST_MINERAL)));
            if (boostingLabStatus)
            {
                //console.log('----------Task_Get_Boosted.doTask - ' + this.creep.pos + ' - boostingLabStatus: ' + JSON.stringify(boostingLabStatus));
                let lab = Game.getObjectById(boostingLabStatus.id);
                if (lab)
                    return this.getBoosted(creep, lab, desiredBoost, boostRequest.amount);
            }

            if (!boostRequest.r)
            {
                Room.cancelBoostRequest(creep.room.name, creep.name, desiredBoost);

                let boostRequestIndex = _.findIndex(creep.memory.boostRequests, br => br.boost == desiredBoost);
                if (boostRequestIndex >= 0)
                    creep.memory.boostRequests.splice(boostRequestIndex, 1);

                return TASK_RESULT_BREAK;
            }
        }

        return TASK_RESULT_COMPLETE;
    }

    getBoosted(creep, lab, boostType, boostAmount)
    {
        if (this.moveToTarget(lab, 1))
            return TASK_RESULT_BREAK;

        if (lab.mineralType != boostType || lab.store.getUsedCapacity(boostType) < boostAmount || lab.store.getUsedCapacity(RESOURCE_ENERGY) < boostAmount * (LAB_BOOST_ENERGY / LAB_BOOST_MINERAL))
            return TASK_RESULT_BREAK;

        let result = lab.boostCreep(creep);
        lab.boosted = true;
        //console.log('----------Task_Boost.doTask - ' + creep.name + ' - boost result: ' + result);
        if (result != OK)
            return TASK_RESULT_BREAK;

        if (!creep.memory.boosts)
            creep.memory.boosts = [];
        creep.memory.boosts.push(boostType);

        Room.cancelBoostRequest(creep.room.name, creep.name, boostType);

        //console.log('----------Task_Get_Boosted.getBoosted - ' + creep.name + ' - removing boost requests for ' + boostType);
        let boostRequestIndex = _.findIndex(creep.memory.boostRequests, br => br.boost == boostType);
        if (boostRequestIndex >= 0)
            creep.memory.boostRequests.splice(boostRequestIndex, 1);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Get_Boosted
