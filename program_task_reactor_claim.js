'use strict'

const constants = require('constants');
let Task = require('program_task');

class Task_Reactor_Claim extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        if (!Room.wantToClaimReactor(this.memory.r))
            return TASK_RESULT_COMPLETE;

        let roomMemory = Room.getMemory(this.memory.r);

        let targetPos = new RoomPosition(roomMemory.reactor.x, roomMemory.reactor.y, this.memory.r);
        Game.map.visual.line(creep.pos, targetPos, {color: constants.PART_COLORS[CLAIM], lineStyle: 'dashed'});
        Game.map.visual.circle(targetPos, {radius: 1, fill: constants.PART_COLORS[CLAIM], opacity: 0.5});

        let offRoad = true;

        let targetRoom = Game.rooms[this.memory.r];
        if (!targetRoom && this.moveToRoom(this.memory.r, 0, { offRoad: offRoad }))
            return TASK_RESULT_BREAK;

        if (targetRoom.reactor.my)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(targetRoom.reactor, 1, { offRoad: offRoad }))
            return TASK_RESULT_BREAK;

        creep.claimReactor(targetRoom.reactor);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Reactor_Claim
