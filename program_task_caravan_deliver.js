'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Caravan_Deliver extends Task
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

        let missionInfo = { type: 'caravan_deliver', room: this.memory.r };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        let neededResources = { ...missionMemory.accepts };

        let deliverCreeps = Room.getJobCreeps(this.memory.r, 'caravan_deliver');
        for (let otherCreep of deliverCreeps)
        {
            if (otherCreep.name == creep.name)
                continue;

            for (let resourceType of Object.keys(otherCreep.store))
            {
                if (neededResources[resourceType])
                    neededResources[resourceType] -= otherCreep.store.getResourceAmount(resourceType);
            }
        }

        let selectedResource;

        for (let resourceType in neededResources)
        {
            if (neededResources[resourceType] > 0)
            {
                selectedResource = resourceType;
                break;
            }
        }

        let creepResource = creep.getResourceAmount(selectedResource);

        if (creepResource <= 0)
        {
            if (this.getResourceFromStorage(selectedResource, true, true))
                return TASK_RESULT_BREAK;

            return TASK_RESULT_COMPLETE;
        }

        this.launchChildProcess('caravan_deliver_deliver', 'task_caravan_deliver_deliver',  { creep: creep.name, r: this.memory.r }, true);
        return TASK_RESULT_CONTINUE_NEXT;
    }
}

module.exports = Task_Caravan_Deliver
