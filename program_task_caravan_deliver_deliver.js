'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Caravan_Deliver_Deliver extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        let creepCarry = creep.getResourceAmount();
        if (creepCarry <= 0)
            return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let missionInfo = { type: 'caravan_deliver', room: this.memory.r };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        let caravanCreeps = room.find(FIND_HOSTILE_CREEPS, { filter: c => c.owner.username == 'Screeps' });
        for (let otherCreep of caravanCreeps)
        {
            if (otherCreep.store.getFreeCapacity() <= 0)
                continue;

            for (let resourceType in Object.keys(otherCreep.store))
            {
                if (creep.getResourceAmount(resourceType) > 0)
                    return this.deliverResourceToTarget(otherCreep, resourceType);
            }
        }

        let portals = creep.room.structures[STRUCTURE_PORTAL];
        if (portals && portals.length > 0)
        {
            let portal = _.first(portals);
            if (this.gotoTarget(portal, 1))
                return TASK_RESULT_BREAK;
        }

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Caravan_Deliver_Deliver
