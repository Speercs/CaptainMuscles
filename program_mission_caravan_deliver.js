'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Caravan_Deliver extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.desiredSpawnType = 'carry';

        this.frequency = 1;
        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    start()
    {
        super.start();
        this.setMemory({ type: 'caravan_deliver', room: this.data.room });

        this.memory.accepts = {};
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'caravan_deliver', room: this.data.room });
    }

    run()
    {
        super.run();

        if (!this.memory.expireTime || this.memory.expireTime && Game.time > this.memory.expireTime)
            return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();
    }
}

module.exports = Mission_Caravan_Deliver
