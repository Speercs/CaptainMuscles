'use strict'

let Room_Program = require('program_room');

class Room_Neutral extends Room_Program
{
    constructor (...args)
    {
        super(...args);

        //console.log('Room_Neutral.constructor - ' + this.data.room + ' - executing');
    }

    run()
    {
        super.run();

        return this.suicide();

        // if (this.data.room == 'W46N37')
        //     console.log('Room_Neutral.run - ' + this.data.room + ' - executing');

        if (!this.room)
            return;

        if (this.room && this.room.isMyBase())
        {
            console.log('Room_Neutral.run - ' + this.data.room + ' - is now a base. Ending process.');
            return this.suicide();
        }

        if (this.room && this.room.controller && this.room.controller.owner && !this.room.controller.my)
        {
            console.log('Room_Neutral.run - ' + this.data.room + ' - is now an enemy base. Ending process.');
            return this.suicide();
        }

        let inDanger = Room.inDanger(this.data.room);
        //let inDanger = this.memory.hostiles;
        let update = (this.memory.danger != inDanger || !this.memory.updated || this.memory.updated + 10 < Game.time);

        if (!update)
            return;

        this.memory.danger = inDanger;
        this.memory.updated = Game.time;

        let demolish = false;

        if (inDanger)
        {
            this.launchChildProcess('repel', 'mission_repel', { room: this.data.room });
        }
        else
        {
            this.endChildProcess('repel');

            let demolishableStructures = this.room.find(FIND_STRUCTURES, { filter: st => st.isDemolishable() && st.hits && st.attackInCombat() });
            if (demolishableStructures.length > 0)
                demolish = true;
        }

        if (demolish)
        {
            this.memory.demolish = 1;
        }
        else
        {
            delete this.memory.demolish;
        }
    }
}

module.exports = Room_Neutral;
