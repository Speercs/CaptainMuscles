'use strict'

let Room_Program = require('program_room');

class Room_SourceKeeper extends Room_Program
{
    constructor (...args)
    {
        super(...args);

        //console.log('Room_SourceKeeper.constructor - ' + this.data.room + ' - executing');
    }

    run()
    {
        super.run();
        //console.log('Room_SourceKeeper.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }
}

module.exports = Room_SourceKeeper;
