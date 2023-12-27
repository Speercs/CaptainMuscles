'use strict'

let Room_Program = require('program_room');
let Mission_Creeps = require('program_mission_creeps');

class Room_Demolish extends Room_Program
{
    constructor (...args)
    {
        super(...args);

        //console.log('Room_Demolish.constructor - ' + this.data.room + ' - executing');
    }

    start()
    {
        super.start();
        console.log('Room_Demolish.start - DEMOLISHING ROOM ' + this.data.room);
    }

    run()
    {
        super.run();

        //console.log('Room_Demolish.run - ' + this.data.room + ' - executing');

        if (!this.room)
            return;

        let roomMemory = Room.getMemory(this.data.room);
        if (roomMemory && roomMemory.demolish)
        {
            this.demolishRoom(roomMemory);
            return;
        }

        let missionMemory = Mission_Creeps.getMemory({ type: 'claim', room: this.data.room });
        if (missionMemory)
            return;

        console.log('Room_Demolish.start - DEMOLISHING COMPLETE - ' + this.data.room);

        if (this.room.controller.my)
            this.room.controller.unclaim();
        else
            return this.suicide();
    }

    demolishRoom(roomMemory)
    {
        let demolishableStructures = this.room.find(FIND_STRUCTURES, { filter: st => st.isDemolishable() && st.hits && st.attackInCombat() });
        if (demolishableStructures.length <= 0)
        {
            delete roomMemory.demolish;
            this.room.controller.unclaim();
            return;
        }

        _.each(demolishableStructures, st => st.destroy());
    }
}

module.exports = Room_Demolish;
