'use strict'

const constants = require('constants');
let Task = require('program_task');

class Task_Send_Out extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (room)
            this.room = room;

        if (!Room.sendingAwayResources(this.memory.r))
            return TASK_RESULT_COMPLETE;

        if (!this.room              ||
            !this.room.isMyBase()   ||
            !this.room.storage      ||
            !this.room.terminal     ||
            !this.room.terminal.my  ||
            this.room.terminal.store.getFreeCapacity() <= 0 ||
            this.room.storage.store.getUsedCapacity() <= 0)
            return TASK_RESULT_COMPLETE;

        let creepCarry = creep.getResourceAmount();
        let creepSpace = creep.store.getFreeCapacity();
        if (creepCarry > 0)
            return this.deliverResourceToTarget(this.room.terminal);

        if (creepSpace <= 0)
            return TASK_RESULT_COMPLETE;

        for (let resourceType of constants.RESOURCES_ALL_REVERSED)
        {
            if (this.room.storage.store.getUsedCapacity(resourceType) > 0)
                return this.getResourceFromTarget(this.room.storage, resourceType);
        }

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Send_Out
