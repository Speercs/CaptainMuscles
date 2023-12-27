'use strict'

const constants = require('constants');

class Program_Clean_Room_Memory extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 1000;
        this.priority = global.PROCESS_PRIORITY_CLEANUP_EARLY;
    }

    run()
    {
        super.run();
        if (!Memory.rooms)
            return;

        let memoryKeyCount = Object.keys(Memory.rooms).length;
        console.log('Program_Clean_Room_Memory.run - checking ' + memoryKeyCount + ' entries');

        let now = Game.time;

        for (let roomName in Memory.rooms)
        {
            let roomMemory = Memory.rooms[roomName];

            if (!roomMemory.seen || now - roomMemory.seen > 10000)
                delete Memory.rooms[roomName];
        }

        let newMemoryKeyCount = Object.keys(Memory.rooms).length;

        console.log('Program_Clean_Room_Memory.run - removed ' + (memoryKeyCount - newMemoryKeyCount) + ' entries');
    }
}

module.exports = Program_Clean_Room_Memory;
