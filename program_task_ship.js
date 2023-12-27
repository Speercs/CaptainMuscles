'use strict'

let Task = require('program_task');

class Task_Ship extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (!room)
            return TASK_RESULT_COMPLETE;

        let creepCapacity = creep.store.getCapacity();
        if (creepCapacity <= 0)
            return TASK_RESULT_COMPLETE;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        if (creep.room.name == this.memory.r && creepEnergy <= 0)
            return TASK_RESULT_COMPLETE;

        let roomCenter = new RoomPosition(25, 25, this.memory.r);
        Game.map.visual.line(creep.pos, roomCenter, {color: '#ffff00', lineStyle: 'dashed'});
        Game.map.visual.circle(roomCenter, {radius: 1, fill: '#ffff00', opacity: 1.0});

        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();

        if (creep.getFreeSpace(RESOURCE_ENERGY) > 0 && this.getResourceFromStorage(RESOURCE_ENERGY, false, true))
            return TASK_RESULT_BREAK;

        if (this.gotoRoom(this.memory.r, 1))
            return TASK_RESULT_BREAK;

        return this.deliverResourceToStorage(RESOURCE_ENERGY);
    }
}

module.exports = Task_Ship
