'use strict'

const constants = require('constants');

class Program_Clean_Creep_Memory extends kernel.process
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
        if (!Memory.creeps)
            return;

        let memoryKeyCount = Object.keys(Memory.creeps).length;
        //console.log('Program_Clean_Creep_Memory.run - checking ' + memoryKeyCount + ' entries');

        let now = Game.time;

        for (let creepName in Memory.creeps)
        {
            let creep = Game.creeps[creepName];

            if (!creep)
                delete Memory.creeps[creepName];
        }

        let newMemoryKeyCount = Object.keys(Memory.creeps).length;

        //console.log('Program_Clean_Creep_Memory.run - removed ' + (memoryKeyCount - newMemoryKeyCount) + ' entries');
    }
}

module.exports = Program_Clean_Creep_Memory;
