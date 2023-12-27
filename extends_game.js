'use strict'

global.letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

global.chineseify = function(number)
{
    // 0x4e00 = first chinese unicode character, there are 0x5200 characters from 0x4e00 - 0x9fff
    return String.fromCharCode((number % 0x5200) + 0x4e00);
}

global.dechineseify = function(character)
{
    return character.charCodeAt(0) - 0x4e00;
}


global.spotToChinese = function(spot)
{
    let combinedSpot = (spot.x * 50) + spot.y;
    return global.chineseify(combinedSpot);
}

global.spotListToChinese = function(spotList)
{
    let str = '';
    for (let spot of spotList)
        str = str.concat(global.spotToChinese(spot));
    return str;
}

global.chineseToSpot = function(character)
{
    let combinedSpot = global.dechineseify(character);
    let spot = {};
    spot.x = Math.floor(combinedSpot / 50);
    spot.y = combinedSpot % 50;
    return spot;
}

global.shardStatus = function(shardName)
{
    if (shardName == Game.shard.name)
        return 'alive';

    if (Memory.empire && Memory.empire.shards && Memory.empire.shards.status && Memory.empire.shards.status[shardName] && Memory.empire.shards.status[shardName].status)
        return Memory.empire.shards.status[shardName].status;

    return 'unknown';
}

global.distanceBetweenRooms = function(roomName1, roomName2, civilian, diagonal)
{
    if (roomName1 == roomName2)
        return 0;

    if (civilian && (Game.cpu.bucket < 1000 || Game.cpu.getUsed() > Game.cpu.tickLimit * 0.8))
        civilian = false;

    if (civilian)
        return global.civilianRouteLength(roomName1, roomName2);
    else
        return global.realDistanceBetweenRooms(roomName1, roomName2, diagonal);
}

// realDistanceBetweenRooms From Cyberblast
// https://screeps.com/forum/topic/710/how-do-you-calculate-room-distance-across-regions-e-w-n-s/2
global.realDistanceBetweenRooms = function(roomName1, roomName2, diagonal)
{
    if( roomName1 == roomName2 ) return 0;
    let posA = roomName1.split(/([N,E,S,W])/);
    let posB = roomName2.split(/([N,E,S,W])/);
    let xDif = posA[1] == posB[1] ? Math.abs(posA[2]-posB[2]) : posA[2]+posB[2]+1;
    let yDif = posA[3] == posB[3] ? Math.abs(posA[4]-posB[4]) : posA[4]+posB[4]+1;
    if( diagonal ) return Math.max(xDif, yDif); // count diagonal as 1
    return xDif + yDif; // count diagonal as 2
}

global.civilianRouteLength = function(fromRoom, toRoom)
{
    if (fromRoom == toRoom)
        return 0;
        
    //console.log('global.civilianRouteLength - from: ' + fromRoom + ' - to: ' + toRoom);

    let route = null;
    if (!global.civilianRouteCaches)
        global.civilianRouteCaches = {};
    if (!global.civilianRouteCaches[fromRoom])
        global.civilianRouteCaches[fromRoom] = {};
    if (!global.civilianRouteCaches[fromRoom][toRoom])
        global.civilianRouteCaches[fromRoom][toRoom] = {};

    if (!global.civilianRouteCaches[fromRoom][toRoom].time || Game.time - global.civilianRouteCaches[fromRoom][toRoom].time > 1000 || !global.civilianRouteCaches[fromRoom][toRoom].route)
    {
        route = Game.map.findRoute(fromRoom, toRoom, { routeCallback: global.civilianRouteCallback });
        global.civilianRouteCaches[fromRoom][toRoom].time = Game.time;
        global.civilianRouteCaches[fromRoom][toRoom].route = route;
    }
    else
    {
        route = global.civilianRouteCaches[fromRoom][toRoom].route;
    }

    if (route == ERR_NO_PATH)
    {
        //console.log('global.civilianRouteLength - ERR_NO_PATH');
        return Infinity;
    }
    else
    {
        return route.length;
    }
}

global.routeLength = function(fromRoom, toRoom)
{
    let route = null;
    if (!global.routeCaches)
        global.routeCaches = {};
    if (!global.routeCaches[fromRoom])
        global.routeCaches[fromRoom] = {};
    if (!global.routeCaches[fromRoom][toRoom])
        global.routeCaches[fromRoom][toRoom] = {};

    if (!global.routeCaches[fromRoom][toRoom].time || Game.time - global.routeCaches[fromRoom][toRoom].time > 20000 || !global.routeCaches[fromRoom][toRoom].route)
    {
        route = Game.map.findRoute(fromRoom, toRoom, { routeCallback: global.soldierRouteCallback });
        global.routeCaches[fromRoom][toRoom].time = Game.time;
        global.routeCaches[fromRoom][toRoom].route = route;
    }
    else
    {
        route = global.routeCaches[fromRoom][toRoom].route;
    }

    if (route == ERR_NO_PATH)
    {
        //console.log('global.civilianRouteLength - ERR_NO_PATH');
        return Infinity;
    }
    else
    {
        return route.length;
    }
}

global.civilianRouteCallback = function(roomName, fromRoomName)
{
    // if (Game.shard.name == 'shard2')
    //     console.log('global.civilianRouteCallback - executing');

    // if (roomName == 'W46N28')
    // return 20;

    let roomStatus = Game.map.getRoomStatus(roomName);
    let fromRoomStatus = Game.map.getRoomStatus(fromRoomName);

    if (roomStatus && fromRoomStatus && fromRoomStatus.status != roomStatus.status)
    {
        //console.log('global.civilianRouteCallback - avoiding unreachable room: ' + roomName);
        return 20;
    }
    else if (Room.hasStrongHold(roomName) || (Room.isEnemyBase(roomName) && !Room.trusted(roomName)))
    {
        return 10;
    }
    else if (Room.inDanger(roomName))
    {
        // if (Game.shard.name == 'shard2')
        //     console.log('global.civilianRouteCallback - avoiding dangerous room ' + roomName);
        return 5;
    }
    else if (Room.isSourceKeeperRoom(roomName))
    {
        return 2;
    }
    else
    {
        return 1;
    }
};

global.soldierRouteCallback = function(roomName, fromRoomName)
{
    //console.log('global.soldierRouteCallback - executing');
    let roomStatus = Game.map.getRoomStatus(roomName);
    let fromRoomStatus = Game.map.getRoomStatus(fromRoomName);

    if (roomStatus && fromRoomStatus && fromRoomStatus.status != roomStatus.status)
    {
        //console.log('global.soldierRouteCallback - avoiding unreachable room: ' + roomName);
        return 20;
    }
    else if (Room.hasStrongHold(roomName) || (Room.isEnemyBase(roomName) && !Room.trusted(roomName)))
    {
        return 10;
    }
    else if (Room.isSourceKeeperRoom(roomName))
    {
        return 2;
    }
    else
    {
        return 1;
    }
};

/* Posted March 31st, 2018 by @semperrabbit*/

// /**
//  * global.hasRespawned()
//  *
//  * @author:  SemperRabbit
//  * @version: 1.1
//  * @date:    180331
//  * @return:  boolean whether this is the first tick after a respawn or not
//  *
//  * The checks are set as early returns in case of failure, and are ordered
//  * from the least CPU intensive checks to the most. The checks are as follows:
//  *
//  *      If it has returned true previously during this tick, return true again
//  *      Check Game.time === 0 (returns true for sim room "respawns")
//  *      There are no creeps
//  *      There is only 1 room in Game.rooms
//  *      The 1 room has a controller
//  *      The controller is RCL 1 with no progress
//  *      The controller is in safemode with the initial value
//  *      There is only 1 StructureSpawn
//  *
//  * The only time that all of these cases are true, is the first tick of a respawn.
//  * If all of these are true, you have respawned.
//  *
//  * v1.1 (by qnz): - fixed a condition where room.controller.safeMode can be SAFE_MODE_DURATION too
//  *                - improved performance of creep number check (https://jsperf.com/isempty-vs-isemptyobject/23)

global.hasRespawned = function()
{
    // check for multiple calls on same tick
    if(Memory.respawnTick && Memory.respawnTick === Game.time) {
        return true;
    }

    // server reset or sim
    if(Game.time === 0) {
        Memory.respawnTick = Game.time;
        return true;
    }

    // check for 0 creeps
    for(const creepName in Game.creeps) {
        return false;
    }

    // check for only 1 room
    const rNames = Object.keys(Game.rooms);
    if(rNames.length !== 1) {
        return false;
    }

    // check for controller, progress and safe mode
    const room = Game.rooms[rNames[0]];
    if(!room.controller || !room.controller.my || room.controller.level !== 1 || room.controller.progress ||
       !room.controller.safeMode || room.controller.safeMode <= SAFE_MODE_DURATION-1) {
        return false;
    }

    // check for 1 spawn
    if(Object.keys(Game.spawns).length !== 1) {
        return false;
    }

    // if all cases point to a respawn, you've respawned
    Memory.respawnTick = Game.time;
    return true;
}

global.calculatePartListCost = function(partList)
{
    var partListCost = 0;
    for (var partIndex in partList)
    {
        var part = partList[partIndex];
        partListCost += BODYPART_COST[part];
    }
    return partListCost;
}