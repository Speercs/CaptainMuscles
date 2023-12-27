'use strict'

let Task = require('program_task');

class Task_Clean extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let creepSpace = creep.getFreeSpace();
        if (creepSpace <= 0)
            return TASK_RESULT_COMPLETE;

        let room = Game.rooms[this.memory.r];
        if (!room)
            return TASK_RESULT_COMPLETE;

        let isSourceKeeperRoom = Room.isSourceKeeperRoom(this.memory.r);
        if (isSourceKeeperRoom)
        {
            let roomMemory = Room.getMemory(this.memory.r);
            if (!roomMemory || !roomMemory.clear)
                return TASK_RESULT_COMPLETE;
        }

        let nearbyResources = room.find(FIND_DROPPED_RESOURCES, { filter: r => !this.memory.res || r.resourceType == this.memory.res });
        nearbyResources = nearbyResources.concat(room.find(FIND_RUINS, { filter: s => s.store.getUsedCapacity(this.memory.res) > 0 }));
        nearbyResources = nearbyResources.concat(room.find(FIND_TOMBSTONES, { filter: s => s.store.getUsedCapacity(this.memory.res) > 0 }));
        if (isSourceKeeperRoom)
            nearbyResources = nearbyResources.concat(room.find(FIND_STRUCTURES, { filter: s => s.store && s.effects && s.effects.length > 0 && s.effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER) && s.store.getUsedCapacity(this.memory.res) > 0 }))

        nearbyResources = nearbyResources.filter(r => r.isSafe());
        // if (this.memory.r == 'W49N31')
        //     console.log('Task_Clean.doTask - ' + creep.name + ' - ' + creep.room.name + ' - found ' + nearbyResources.length + ' cleanable resources with ' + this.memory.res);

        let bonfirePos = room.bonfirePos;
        if (bonfirePos)
            nearbyResources = _.filter(nearbyResources, nr => nr.pos.getRangeTo(bonfirePos) > 1);

        // if (this.memory.r == 'W49N31')
        //     console.log('Task_Clean.doTask - ' + creep.name + ' - ' + creep.room.name + ' - found ' + nearbyResources.length + ' after ignoring bonfire with ' + this.memory.res);

        if (nearbyResources.length <= 0)
            return TASK_RESULT_COMPLETE;

        let adjacentResources = nearbyResources.filter(o => creep.pos.getRangeTo(o) <= 1);
        if (adjacentResources.length > 0)
        {
            let taken = 0;
            for (let adjacentResource of adjacentResources)
            {
                if (adjacentResource.amount)
                {
                    creep.pickup(adjacentResource, Math.min(creepSpace - taken, adjacentResource.amount))
                    taken += adjacentResource.amount;
                    if (taken >= creepSpace)
                        return TASK_RESULT_COMPLETE;
                    continue;
                }

                for (let resourceType of RESOURCES_ALL)
                {
                    let resourceAmount = adjacentResource.store.getUsedCapacity(resourceType);
                    creep.withdraw(adjacentResource, resourceType, Math.min(creepSpace - taken, resourceAmount));
                    taken += resourceAmount;
                    if (taken >= creepSpace)
                        return TASK_RESULT_COMPLETE;
                }
            }
        }

        let collectTarget = _.min(nearbyResources, nr => creep.pos.getRangeTo(nr));

        //console.log('Task_Clean.doTask - ' + creep.name + ' - ' + creep.room.name + ' - taking ' + this.memory.res + ' from ' + collectTarget + ' - ' + collectTarget.pos);
        return this.getResourceFromTarget(collectTarget, this.memory.res);
    }
}

module.exports = Task_Clean
