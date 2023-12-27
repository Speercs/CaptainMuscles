'use strict'

class Watcher extends kernel.process
{
    constructor (...args)
    {
        super(...args);
        //console.log('Watcher.constructor - executing');
    }

    run()
    {
        super.run();
        //console.log('Watcher.run - executing');
    }
}

module.exports = Watcher
