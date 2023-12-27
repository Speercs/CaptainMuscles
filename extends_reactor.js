'use strict'

const constants = require('constants');

Room.wantToClaimReactor = function(roomName)
{
    if (!constants.SEASON_FIVE_ACTIVE)
        return false;

    let memory = Room.getMemory(roomName);
    return (memory && memory.reactor && (!memory.reactor.o || memory.reactor.o != ME));
}

Room.hasReactor = function(roomName)
{
    if (!constants.SEASON_FIVE_ACTIVE)
        return false;
        
    let memory = Room.getMemory(roomName);
    return (memory && memory.reactor);
}

if (!constants.SEASON_FIVE_ACTIVE)
    return;

Reactor = Reactor || {};

FIND_REACTORS = FIND_REACTORS || -1;

Object.defineProperty(Room.prototype, 'reactor',
{
    get()
    {
        if (this._reactor)
            return this._reactor;

        let reactors = this.find(FIND_REACTORS);
        if (!reactors || reactors.length == 0)
            return null;

        this._reactor = reactors[0];
        return this._reactor;
    },
    enumerable: false,
    configurable: true
})

Reactor.availableSpace = function(roomName)
{
    let memory = Room.getMemory(roomName);
    if (!memory || !memory.reactor)
        return 0;

    let reactorMaxSpace = 1000;

    if (!memory.reactor.thorium)
        return reactorMaxSpace;

    let space = Math.min((reactorMaxSpace - memory.reactor.thorium) + (Game.time - memory.reactor.ct), reactorMaxSpace);
    //console.log('Reactor.availableSpace - ' + roomName + ' - available space: ' + space);
    return space;
}