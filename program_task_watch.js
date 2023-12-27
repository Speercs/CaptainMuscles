'use strict'

let Task = require('program_task');
const { fromRoomPosition } = require('./WorldPosition');

class Task_Watch extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let roomCenter = new RoomPosition(25, 25, this.memory.r);
        Game.map.visual.line(creep.pos, roomCenter, {color: '#808080', lineStyle: 'dashed'});
        Game.map.visual.circle(roomCenter, {radius: 1, fill: '#808080', opacity: 1.0});

        if (creep.pos.nearEdge(0) && creep.room.name != this.memory.r && creep.wpos.getRangeTo(roomCenter.wpos) < 27)
            return TASK_RESULT_BREAK;

        this.moveToRoom(this.memory.r, -1);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Watch
