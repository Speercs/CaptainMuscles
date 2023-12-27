'use strict'

const constants = require('constants');
let Task = require('program_task');

class Task_Reactor_Fill extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        let thoriumCount = creep.store.getUsedCapacity(RESOURCE_THORIUM);
        if (!thoriumCount)
        {
            if (Room.getStoredResourceAmount(creep.room.name, RESOURCE_THORIUM) > 0)
                return this.getResourceNearest(RESOURCE_THORIUM, null, true, true, global.WORK_SEARCH_RANGE, '#00ff00');

            let nearbyResources = creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType == RESOURCE_THORIUM });
            nearbyResources = nearbyResources.concat(creep.room.find(FIND_RUINS, { filter: s => s.store.getUsedCapacity(RESOURCE_THORIUM) > 0 }));
            nearbyResources = nearbyResources.concat(creep.room.find(FIND_TOMBSTONES, { filter: s => s.store.getUsedCapacity(RESOURCE_THORIUM) > 0 }));
            nearbyResources = nearbyResources.concat(creep.room.find(FIND_STRUCTURES, { filter: s => s.store && s.store.getUsedCapacity(RESOURCE_THORIUM) > 0 }))
            
            if (!nearbyResources || nearbyResources.length <= 0)
                return TASK_RESULT_COMPLETE;

            return this.getResourceFromTarget(nearbyResources[0], RESOURCE_THORIUM, null, '#00ff00')
        }

        let targetPos = new RoomPosition(this.memory.x, this.memory.y, this.memory.r);

        if (creep.wpos.getRangeTo(targetPos.wpos) >= creep.ticksToLive / 4)
            return TASK_RESULT_COMPLETE;

        let offRoad = true;

        let targetRoom = Game.rooms[this.memory.r];

        if (!targetRoom && this.moveToRoom(this.memory.r, 0, { offRoad: offRoad }))
            return TASK_RESULT_BREAK;

        if (!targetRoom.reactor || !targetRoom.reactor.my)
            return TASK_RESULT_COMPLETE;

        return this.deliverResourceToTarget(targetRoom.reactor, RESOURCE_THORIUM, false, '#00ff00');
    }
}

module.exports = Task_Reactor_Fill
