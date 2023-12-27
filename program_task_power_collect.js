'use strict'

let Task = require('program_task');

class Task_Power_Collect extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let target = this.getTarget();
        if (!target)
        {
            let creepSpace = creep.getFreeSpace();
            if (creepSpace <= 0)
                return TASK_RESULT_COMPLETE;

            let collectTarget = this.getPickupTarget(creep);
            if (!collectTarget)
                return TASK_RESULT_COMPLETE;

            return this.getResourceFromTarget(collectTarget);
        }

        let attackCreeps = Room.getJobCreeps(this.memory.r, 'power_attack_' + this.memory.t);
        if (!attackCreeps || attackCreeps.length <= 0)
            return TASK_RESULT_COMPLETE;

        let nearestBase = Room.getNearestBase(this.memory.r)
        if (!nearestBase || !nearestBase.controller)
            return TASK_RESULT_COMPLETE;

        let distanceHome = creep.wpos.getManhattanDist(nearestBase.controller.wpos);
        let ticksToDestroy = StructurePowerBank.getTicksToDestroy(this.memory.r, this.memory.t);
        if (ticksToDestroy + distanceHome + distanceHome > creep.ticksToLive)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(target, 4))
            return TASK_RESULT_BREAK;

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

module.exports = Task_Power_Collect
