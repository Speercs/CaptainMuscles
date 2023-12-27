'use strict'

let Room_Program = require('program_room');

class Room_Enemy extends Room_Program
{
    constructor (...args)
    {
        super(...args);
    }

    run()
    {
        super.run();

        return this.suicide();
    }
}

module.exports = Room_Enemy;
