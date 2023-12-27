'use strict'

const constants = require('constants');

class Program_Clean_Flag_Memory extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 100;
        this.priority = global.PROCESS_PRIORITY_CLEANUP_EARLY;
    }

    run()
    {
        super.run();
        if (!Memory.flags)
            return;

        let memoryKeyCount = Object.keys(Memory.flags).length;
        console.log('Program_Clean_Flag_Memory.run - checking ' + memoryKeyCount + ' entries');

        let now = Game.time;

        for (let flagName in Memory.flags)
        {
            let flag = Game.flags[flagName];

            if (!flag)
                delete Memory.flags[flagName];
        }

        let newMemoryKeyCount = Object.keys(Memory.flags).length;

        console.log('Program_Clean_Flag_Memory.run - removed ' + (memoryKeyCount - newMemoryKeyCount) + ' entries');
    }
}

module.exports = Program_Clean_Flag_Memory;
