'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Watch extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        //console.log('Mission_Watch.constructor - executing ' + this.data.room);
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'watch', room: this.data.room });
    }

    run()
    {
        super.run();
        //console.log('Mission_Watch.run - ' + this.data.room + ' - executing');
    }

    updateInfo()
    {
        super.updateInfo();

        if (this.memory.creeps.length < 1)
            this.memory.desiredSpawn = { utility: 0.0001, type: 'move', maxParts: 1, maxCreeps: 1 };
        else
            delete this.memory.desiredSpawn;

        this.memory.remote = 1;
    }

    getDesiredSpawn()
    {
        delete this.memory.desiredSpawn;
        return null;
        // This mission updates desired spawn even when not requested to ensure its filled by nearby shards
        return this.memory.desiredSpawn;
    }
}

module.exports = Mission_Watch
