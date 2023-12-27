'use strict'

const constants = require('constants');

Room.cancelBoostRequest = function(roomName, creepName, boost)
{
    let labMemory = Room.getBaseLabsMemory(roomName);

    if (!labMemory)
    {
        console.log('**********Room.requestBoosts - ' + roomName + ' - ' + creepName + ' - could not cancel boost: ' + boost);
        return false;
    }

    if (!labMemory.boostRequests)
        return false;

    let indexOfRequest = _.findIndex(labMemory.boostRequests, br => br.creep == creepName && br.boost == boost);
    if (indexOfRequest < 0)
    {
        console.log('**********Room.requestBoosts - ' + roomName + ' - ' + creepName + ' - could not find request to cancel: ' + boost);
        return false;
    }

    console.log('**********Room.requestBoosts - ' + roomName + ' - ' + creepName + ' - cancelling request: ' + boost);

    labMemory.boostRequests.splice(indexOfRequest, 1);
    labMemory.boostRequestsUpdated = 1;

    return true;
}

Room.requestBoosts = function(roomName, boosts)
{
    // if (!Memory.empire || !Memory.empire.bases || !Memory.empire.bases[roomName] || !Memory.empire.bases[roomName].labs)
    //     return 0;

    let labMemory = Room.getBaseLabsMemory(roomName);

    if (!labMemory)
    {
        console.log('**********Room.requestBoosts - ' + roomName + ' - could not request boosts: ' + JSON.stringify(boosts));
        return false;
    }

    if (!labMemory.boostRequests)
        labMemory.boostRequests = [];

    labMemory.boostRequests = labMemory.boostRequests.concat(boosts);
    labMemory.boostRequestsUpdated = 1;

    return true;
}
