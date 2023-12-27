'use strict'

const constants = require('constants');

class Program_Abandon_Bad_Rooms extends kernel.process
{
    constructor (...args)
    {
        super(...args);
    }

    refresh()
    {
        super.refresh();
    }

    run()
    {
        super.run();

        let bases = Room.getMyBases();

        let badRoomCount = 0;

        for (let base of bases)
        {
            if (Room.shouldAbandon(base.name))
            {
                badRoomCount += 1;
                Game.map.visual.line(new RoomPosition(0,  0, base.name), new RoomPosition(49, 49, base.name), {color: '#ff0000', width: 1});
                Game.map.visual.line(new RoomPosition(0, 49, base.name), new RoomPosition(49,  0, base.name), {color: '#ff0000', width: 1});

                let roomMemory = Room.getMemory(base.name);
                // if (!base.storage && !base.terminal && !roomMemory.hostiles)
                if (!roomMemory.hostiles)
                {
                    let destructible = _.filter(base.structures.all, st => st.structureType != STRUCTURE_CONTROLLER && st.hits);
                    if (destructible.length > 0)
                    {
                        console.log('Program_Abandon_Bad_Rooms.run - ' + base.name + ' - destroying ' + destructible.length + ' structures');
                        _.forEach(destructible, st => st.destroy());
                    }

                    let sites = base.find(FIND_MY_CONSTRUCTION_SITES);
                    if (sites.length > 0)
                    {
                        console.log('Program_Abandon_Bad_Rooms.run - ' + base.name + ' - removing ' + sites.length + ' sites');
                        _.forEach(sites, st => st.remove());
                    }

                    if (destructible.length <= 0 && sites.length <= 0)
                    {
                        console.log('Program_Abandon_Bad_Rooms.run - ' + base.name + ' - abandoning');
                        base.controller.unclaim();
                    }
                }
            }
        }

        if (badRoomCount == 0)
            return this.suicide();
    }

    end()
    {
        console.log('Program_Abandon_Bad_Rooms.end - complete');
        super.end();
    }
}

module.exports = Program_Abandon_Bad_Rooms;
