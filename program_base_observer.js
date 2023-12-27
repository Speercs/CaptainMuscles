'use strict'

const constants = require('constants');

class Base_Observer extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base_Observer.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        this.room = Game.rooms[this.data.room];
    }

    run()
    {
        //console.log('Base_Observer.run - ' + this.data.room + ' - executing');

        if (this.room.controller.level < 8)
            return this.suicide();

        let observer = this.room.observer;

        if (!observer || !observer.my)
        {
            this.sleep(100);
            return;
        }

        let bases = Room.getMyBases();
        let baseCount = bases.length;
        let thisBaseNumber = bases.indexOf(this.room);
        if (Game.time % (baseCount * 2) != (thisBaseNumber * 2))
            return;

        this.observe(observer);
        this.sleep(baseCount * 2);

        return;
    }

    observe(observer)
    {
        let thisRoomStatus = Game.map.getRoomStatus(this.data.room).status;

        let availableRoomNames = _.filter(Room.getRoomNamesInRangeFloodFill(this.data.room, global.REMOTE_SEARCH_RANGE, true), rn => Game.map.getRoomStatus(rn).status == thisRoomStatus);

        let nextUnseenRoom = _.find(availableRoomNames, rn => (!Room.getMemory(rn) || !Room.getMemory(rn).seen));
        if (nextUnseenRoom)
        {
            //console.log('Base_Observer.observe - ' + this.data.room + ' - observing unseen room - ' + nextUnseenRoom);
            this.observeRoom(observer, nextUnseenRoom);
            return;
        }

        let nextSeenRoom = _.min(availableRoomNames, rn => Room.getMemory(rn).seen);
        if (nextSeenRoom)
        {
            //console.log('Base_Observer.observe - ' + this.data.room + ' - observing seen room - ' + nextSeenRoom);
            this.observeRoom(observer, nextSeenRoom);
            return;
        }
    }

    observeRoom(observer, roomName)
    {
        observer.observeRoom(roomName);
        //Room.updateNearestBase(roomName);
    }
}

module.exports = Base_Observer;
