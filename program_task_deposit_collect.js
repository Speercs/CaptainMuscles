'use strict'

let Task = require('program_task');

class Task_Deposit_Collect extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        let creepSpace = creep.getFreeSpace();
        if (creepSpace <= 0)
            return TASK_RESULT_COMPLETE;

        let nearestBase = Room.getNearestBase(creep.room.name);
        if (!nearestBase || !nearestBase.controller || creep.ticksToLive <= creep.wpos.getManhattanDist(nearestBase.controller.wpos) * 2)
            return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let harvestCreeps = Room.getJobCreeps(this.memory.r, 'deposit_harvest_' + this.memory.t);
        if (!harvestCreeps || harvestCreeps.length <= 0)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();

        for (let harvestCreep of harvestCreeps)
        {
            if ((target && target.lastCooldown && harvestCreep.ticksToLive <= target.lastCooldown) || harvestCreep.store.getUsedCapacity() > harvestCreep.store.getFreeCapacity())
                return this.getResourceFromTarget(harvestCreep);
        }

        let collectTarget = this.getPickupTarget(creep);
        if (collectTarget)
            return this.getResourceFromTarget(collectTarget);

        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(target, 4))
            return TASK_RESULT_BREAK;

        if (creep.pos.getRangeTo(target) <= 1 && this.fleeTarget(target, 3))
            return TASK_RESULT_BREAK;

        if (target.lastCooldown)
            this.sleep(target.lastCooldown);

        return TASK_RESULT_BREAK;
    }

    getPickupTarget(creep)
    {
        let nearbyResources = creep.room.find(FIND_DROPPED_RESOURCES);
        nearbyResources = nearbyResources.concat(creep.room.find(FIND_RUINS, { filter: s => s.store.getUsedCapacity() > 0 }));
        nearbyResources = nearbyResources.concat(creep.room.find(FIND_TOMBSTONES, { filter: s => s.store.getUsedCapacity() > 0 }));

        if (nearbyResources.length <= 0)
            return null;

        return _.min(nearbyResources, nr => creep.pos.getRangeTo(nr));
    }
}

module.exports = Task_Deposit_Collect
