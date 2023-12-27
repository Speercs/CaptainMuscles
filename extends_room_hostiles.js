'use strict'

const constants = require('constants');

let Mission_Creeps = require('program_mission_creeps');

RoomPosition.prototype.isSafe = function()
{
    if (!Room.inDanger(this.roomName))
        return true;

    if (!Room.isMyBase(this.roomName))
        return false;

    let defendMissionMemory = Mission_Creeps.getMemory({ type: 'defend', room: this.roomName });
    if (!defendMissionMemory)
        return false;

    if (!defendMissionMemory.pid)
        return false;

    return !!kernel.scheduler.callProcessFunction(defendMissionMemory.pid, 'isInsideBase', this);
}

RoomObject.prototype.isSafe = function()
{
    return this.pos.isSafe();
}