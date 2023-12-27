'use strict'

let Task = require('program_task');

class Task_Scout extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        this.sayTheThing(creep);

        let homeBase = Game.rooms[this.memory.r];
        if (homeBase && homeBase.isMyBase() && homeBase.controller.level >= 8)
        {
            console.log('Task_Scout.doTask - ' + creep.name + ' - ' + this.memory.r + ' - room is level 8, cancelling scouting');
            creep.suicide();
            return TASK_RESULT_BREAK;
        }

        let targetRoom = creep.memory.targetRoom;
        //console.log('Task_Scout.doTask - ' + creep.name + ' - ' + this.memory.r + ' - targetRoom: ' + targetRoom);
        if (!targetRoom)
        {
            let availableRoomNames = _.filter(Room.getRoomNamesInRangeFloodFill(this.memory.r, global.REMOTE_SEARCH_RANGE, true), rn => Game.map.getRoomStatus(rn).status == Game.map.getRoomStatus(creep.room.name).status);

            //console.log('Task_Scout.doTask - ' + creep.name + ' - ' + this.memory.r + ' - availableRoomNames: ' + availableRoomNames);
            let unseenRoomNames = _.filter(availableRoomNames, rn => !Room.getMemory(rn) || (!Room.getMemory(rn).seen && (!Room.getMemory(rn).scout || Room.getMemory(rn).scout == creep.name || !Game.creeps[Room.getMemory(rn).scout])));
            let seenRoomNames = _.filter(availableRoomNames, rn => Room.getMemory(rn) && Room.getMemory(rn).seen && (!Room.getMemory(rn).scout || Room.getMemory(rn).scout == creep.name || !Game.creeps[Room.getMemory(rn).scout]));
            if (unseenRoomNames.length > creep.memory.n)
            {
                unseenRoomNames = _.sortBy(unseenRoomNames, rn => global.realDistanceBetweenRooms(rn, this.memory.r) + global.realDistanceBetweenRooms(rn, creep.room.name));
                //console.log('Task_Scout.doTask - ' + creep.name + ' - ' + this.memory.r + ' - unseenRoomNames: ' + unseenRoomNames);
                targetRoom = unseenRoomNames[creep.memory.n];
            }
            else if (seenRoomNames.length > creep.memory.n)
            {
                seenRoomNames = _.sortBy(seenRoomNames, rn => Room.getMemory(rn).seen);
                // seenRoomNames = _.sortByOrder(seenRoomNames, rn => ((Game.time - Room.getMemory(rn).seen) / (global.realDistanceBetweenRooms(rn, this.memory.r) + global.realDistanceBetweenRooms(rn, creep.room.name) + 1)), 'desc');
                //console.log('Task_Scout.doTask - ' + creep.name + ' - ' + this.memory.r + ' - seenRoomNames: ' + seenRoomNames);
                targetRoom = seenRoomNames[creep.memory.n];
            }
            else
            {
                return TASK_RESULT_COMPLETE;
            }

            // console.log('Task_Scout.doTask - ' + creep.name + ' - ' + this.memory.r + ' - targetRoom: ' + targetRoom);
            creep.memory.targetRoom = targetRoom;
            let roomMemory = Room.getMemory(targetRoom);
            if (roomMemory)
                roomMemory.scout = creep.name;
        }

        if (this.moveToRoom(targetRoom, 2))
            return TASK_RESULT_BREAK;

        let roomMemory = Room.getMemory(targetRoom);
        if (roomMemory)
            delete roomMemory.scout;
        delete creep.memory.targetRoom;

        //Room.updateNearestBase(targetRoom);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Scout
