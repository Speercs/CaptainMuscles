'use strict'

const constants = require('constants');
let Task = require('program_task');
const { fromRoomPosition } = require('./WorldPosition');

class Task_Claim extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        let roomMemory = Room.getMemory(this.memory.r);
        if (roomMemory && roomMemory.controller)
        {
            let targetPos = new RoomPosition(roomMemory.controller.x, roomMemory.controller.y, this.memory.r);
            Game.map.visual.line(creep.pos, targetPos, {color: constants.PART_COLORS[CLAIM], lineStyle: 'dashed'});
            Game.map.visual.circle(targetPos, {radius: 1, fill: constants.PART_COLORS[CLAIM], opacity: 0.5});
        }

        if (!Room.wantToClaim(this.memory.r))
            return TASK_RESULT_COMPLETE;

        let offRoad = true;
        if (creep.memory.type == 'reserve')
            offRoad = false;

        let targetRoom = Game.rooms[this.memory.r];
        if (!targetRoom && this.moveToRoom(this.memory.r, 0, { offRoad: offRoad }))
            return TASK_RESULT_BREAK;

        if (targetRoom && targetRoom.controller)
        {
            if (targetRoom.controller.my)
                return TASK_RESULT_COMPLETE;

            if (targetRoom.controller.upgradeBlocked && targetRoom.controller.upgradeBlocked >= creep.ticksToLive)
                return TASK_RESULT_COMPLETE;
        }

        if (this.moveToTarget(targetRoom.controller, 1, { offRoad: offRoad }))
            return TASK_RESULT_BREAK;

        if (targetRoom.controller.reservation && targetRoom.controller.reservation.username != ME && targetRoom.controller.reservation.ticksToEnd > 0)
            creep.attackController(targetRoom.controller);
        else if (targetRoom.controller.owner && !targetRoom.controller.my)
            creep.attackController(targetRoom.controller);
        else
        {
            if (targetRoom.controller.sign)
                creep.signController(targetRoom.controller, '');

            creep.claimController(targetRoom.controller);
        }


        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Claim
