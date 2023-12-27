'use strict'

let Room_Program = require('program_room');

class Room_Highway extends Room_Program
{
    constructor (...args)
    {
        super(...args);

        //console.log('Room_Highway.constructor - ' + this.data.room + ' - executing');
    }

    run()
    {
        super.run();

        //console.log('Room_Highway.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }
}

module.exports = Room_Highway;
