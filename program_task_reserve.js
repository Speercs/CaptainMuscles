'use strict'

const constants = require('constants');
let Task = require('program_task');

class Task_Reserve extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        if (!Game.flags['reserve_' + this.memory.r] && !Room.isReservedByMe(this.memory.r) && !Room.wantToClaim(this.memory.r) && Room.friendly(this.memory.r))
            return TASK_RESULT_COMPLETE;
            
        let roomMemory = Room.getMemory(this.memory.r);
        if (roomMemory && roomMemory.controller && ((roomMemory.controller.o && roomMemory.controller.o != ME) || (roomMemory.controller.r && roomMemory.controller.r != ME)))
        {
            let targetPos = new RoomPosition(roomMemory.controller.x, roomMemory.controller.y, this.memory.r);
            Game.map.visual.line(creep.pos, targetPos, {color: constants.PART_COLORS[CLAIM], lineStyle: 'dashed'});
            Game.map.visual.circle(targetPos, {radius: 1, fill: constants.PART_COLORS[CLAIM], opacity: 0.5});
        }

        let targetRoom = Game.rooms[this.memory.r];

        if (targetRoom && targetRoom.controller)
        {
            if (targetRoom.controller.my)
                return TASK_RESULT_COMPLETE;

            if (targetRoom.controller.upgradeBlocked && targetRoom.controller.upgradeBlocked >= creep.ticksToLive)
                return TASK_RESULT_COMPLETE;
        }

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(target, 1))
            return TASK_RESULT_BREAK;

        let nearestBase = Room.getNearestBase(this.memory.r);
        let baseCount = Room.getMyBases().length;

        if (creep.memory.n != 0 && targetRoom.controller.reservation && targetRoom.controller.reservation.username == ME && targetRoom.controller.reservation.ticksToEnd > CONTROLLER_RESERVE_MAX * .95)
            return TASK_RESULT_COMPLETE;

        if (targetRoom.controller.reservation && targetRoom.controller.reservation.username != ME && targetRoom.controller.reservation.ticksToEnd > 0)
        {
            creep.attackController(targetRoom.controller);
            //this.memory.attacked = 1;
        }
        else if (targetRoom.controller.owner && !targetRoom.controller.my)
        {
            creep.attackController(targetRoom.controller);
            //this.memory.attacked = 1;
        }
        else
        {
            if (targetRoom.controller.sign)
                creep.signController(targetRoom.controller, '');

            if (Room.wantToClaim(this.memory.r))
            {
                if (baseCount < Game.gcl.level)
                {
                    console.log('Task_Reserve.doTask - ' + this.memory.r + ' - reserver claiming room');
                    creep.claimController(targetRoom.controller);
                    return TASK_RESULT_BREAK;
                }

                creep.reserveController(targetRoom.controller);
                return TASK_RESULT_BREAK;
            }

            creep.reserveController(targetRoom.controller);
            // If we were fighting over the controller last tick, reserve & attack in case the other beats us to it
            if (this.memory.attacked)
            {
                creep.attackController(targetRoom.controller);
                delete this.memory.attacked;
            }
        }

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Reserve
