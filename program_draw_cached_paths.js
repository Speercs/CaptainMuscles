'use strict'

const constants = require('constants');

class Program_Draw_Cached_Paths extends kernel.process
{
    constructor (...args)
    {
        super(...args);
    }

    run()
    {
        super.run();

        if (!Game.flags.draw)
            return this.suicide();

        if (global.cachedPaths)
        {
            for (let pathRoom in global.cachedPaths)
            {
                let visual = new RoomVisual(pathRoom);
                for (let creepName in global.cachedPaths[pathRoom])
                {
                    visual.poly(global.cachedPaths[pathRoom][creepName], { opacity: 0.25 });
                }
            }
        }
    }

    end()
    {
        console.log('Program_Draw_Cached_Paths.end - complete');
        super.end();
    }
}

module.exports = Program_Draw_Cached_Paths;
