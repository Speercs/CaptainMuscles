'use strict'

global.DIRECTIONS = [ 1, 2, 3, 4, 5, 6, 7, 8 ];

RoomPosition.prototype.createConstructionSiteOneAtATime = function (type)
{
    if (!Memory.empire || !Memory.empire.construction)
        return this.createConstructionSite(type);

    if (Memory.empire.construction.lastCreateTick == Game.time)
        return 'wait';

    Memory.empire.construction.lastCreateTick = Game.time;
    return this.createConstructionSite(type);
}

RoomPosition.prototype.getOpenSpotCount = function ()
{
    let terrain = Game.map.getRoomTerrain(this.roomName);

    let openSpotCount = 0;
    for (let direction of DIRECTIONS)
    {
        let position = this.getPositionAtDirection(direction);
        if (position.roomName == this.roomName && terrain.get(position.x, position.y) != TERRAIN_MASK_WALL)
            openSpotCount += 1;
    }

    return openSpotCount;
}

RoomPosition.prototype.getOpenSpots = function ()
{
    let terrain = Game.map.getRoomTerrain(this.roomName);

    let openSpots = [];
    for (let direction of DIRECTIONS)
    {
        let position = this.getPositionAtDirection(direction);
        if (position.roomName == this.roomName && terrain.get(position.x, position.y) != TERRAIN_MASK_WALL)
            openSpots.push(position);
    }

    return openSpots;
}

RoomPosition.prototype.getPositionAtDirection = function(direction)
{
    if (direction <= 0)
        return this;

    if (direction > 8)
    {
        let remainder = direction % 9;
        let newDirection = Math.floor(direction / 9);

        //console.log('RoomPosition.getPositionAtDirection - ' + direction + ' - ' + newDirection + ' - ' + remainder);

        return this.getPositionAtDirection(newDirection).getPositionAtDirection(remainder);
    }

    let parsedRoomName = /^([WE])([0-9]+)([NS])([0-9]+)$/.exec(this.roomName);
    //console.log(parsed);

    var roomName = this.roomName;
    var roomX = parseInt(parsedRoomName[2]);
    var roomY = parseInt(parsedRoomName[4]);
    var EW = parsedRoomName[1];
    var NS = parsedRoomName[3];

    var changedRooms = false;

    let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
    let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
    let x = this.x + offsetX[direction];
    let y = this.y + offsetY[direction];

    if (x < 0)
    {
        changedRooms = true;

        x += 50;
        if (EW == 'E')
        {
            if (roomX == 0)
                EW = 'W';
            else
                roomX -= 1;
        }
        else
        {
            roomX += 1;
        }
    }
    else if (x > 49)
    {
        changedRooms = true;

        x -= 50;
        if (EW == 'W')
        {
            if (roomX == 0)
                EW = 'E';
            else
                roomX -= 1;
        }
        else
        {
            roomX += 1;
        }
    }

    if (y < 0)
    {
        changedRooms = true;

        y += 50;
        if (NS == 'S')
        {
            if (roomY == 0)
                NS = 'N';
            else
                roomY -= 1;
        }
        else
        {
            roomY += 1;
        }
    }
    else if (y > 49)
    {
        changedRooms = true;

        y -= 50;
        if (NS == 'N')
        {
            if (roomY == 0)
                NS = 'S';
            else
                roomY -= 1;
        }
        else
        {
            roomY += 1;
        }
    }

    if (changedRooms)
        roomName = EW + roomX + NS + roomY;

    // if (x < 0 || x > 49 || y < 0 || y > 49 || changedRooms)
    //     console.log('RoomPosition.prototype.positionAtDirection - ' + this + ' + ' + direction + ' -> ' + x + ', ' + y + ', ' + roomName);

    let result;

    try
    {
        result = new RoomPosition(x, y, roomName);
    }
    catch(error)
    {
        result = this;
        console.log('RoomPosition.prototype.positionAtDirection - ' + this + ' + ' + direction + ' -> ' + x + ', ' + y + ', ' + roomName);
    }
    //if (changedRooms)
    //    console.log('RoomPosition.prototype.positionAtDirection - ' + this + ' + ' + direction + ' -> ' + result);

    return result;
};

RoomPosition.prototype.getOpenPositionsInRange = function (range, includeSelf = false, ignoreStructures = false, minimumDistanceFromEdge = 2)
{
    let terrain = Game.map.getRoomTerrain(this.roomName);
    let positions = [];
    for (let i = -range; i <= range; ++i)
    {
        let ex = this.x + i;
        if (ex < minimumDistanceFromEdge || ex > 49 - minimumDistanceFromEdge)
            continue;

        for (let j = -range; j <= range; ++j)
        {
            if (!includeSelf && i == 0 && j == 0)
                continue;

            let wy = this.y + j;
            if (wy < minimumDistanceFromEdge || wy > 49 - minimumDistanceFromEdge)
                continue;

            if (terrain.get(ex, wy) == TERRAIN_MASK_WALL)
                continue;

            let openPos = new RoomPosition(ex, wy, this.roomName);
            if (!ignoreStructures && _.find(openPos.lookFor(LOOK_STRUCTURES), object => OBSTACLE_OBJECT_TYPES.indexOf(object.structureType) >= 0 ))
                continue;

            positions.push(openPos);
        }
    }

    return positions;
}

RoomPosition.prototype.getOpenPositionsAtRange = function (range, minimumDistanceFromEdge = 2)
{
    let terrain = Game.map.getRoomTerrain(this.roomName);
    let positions = [];
    for (let i = -range; i <= range; ++i)
    {
        let ex = this.x + i;
        if (ex < minimumDistanceFromEdge || ex > 49 - minimumDistanceFromEdge)
            continue;

        for (let j = -range; j <= range; ++j)
        {
            if (Math.abs(i) != range && Math.abs(j) != range)
                continue;

            let wy = this.y + j;
            if (wy < minimumDistanceFromEdge || wy > 49 - minimumDistanceFromEdge)
                continue;

            if (terrain.get(ex, wy) == TERRAIN_MASK_WALL)
                continue;

            positions.push(new RoomPosition(ex, wy, this.roomName));
        }
    }

    return positions;
}

RoomPosition.prototype.isObstructed = function(ignoreThings, checkTerrain = true, checkStructures = true, checkCreeps = true, checkPowerCreeps = true)
{
    if (!Game.rooms[this.roomName])
        return false;
        
    if (checkTerrain && _.find(this.lookFor(LOOK_TERRAIN), st => st == 'wall'))
        return true;

    if (checkStructures && _.find(this.lookFor(LOOK_STRUCTURES), st => (!ignoreThings || ignoreThings.indexOf(st) < 0) && st.blocksMovement()))
        return true;

    if (checkCreeps && _.find(this.lookFor(LOOK_CREEPS), st => (!ignoreThings || ignoreThings.indexOf(st) < 0)))
        return true;

    if (checkPowerCreeps && _.find(this.lookFor(LOOK_POWER_CREEPS), st => (!ignoreThings || ignoreThings.indexOf(st) < 0)))
        return true;

    return false;
};

RoomPosition.prototype.lookForAt = function(lookType, filter)
{
    let room = Game.rooms[this.roomName];
    if (!room)
        return [];

    let results = this.lookFor(lookType);
    if (filter)
        results = _.filter(results, o => filter(o));
    //this.log('RoomPosition.prototype.lookForInRange', 'found ' + results.length + ' ' + lookType);

    return results;
}

RoomPosition.prototype.lookForFirstAt = function(lookType, filter)
{
    let room = Game.rooms[this.roomName];
    if (!room)
        return [];

    let results = this.lookFor(lookType);
    if (filter)
        results = _.filter(results, o => filter(o));

    if (results.length <= 0)
        return null;
    //this.log('RoomPosition.prototype.lookForInRange', 'found ' + results.length + ' ' + lookType);

    return results[0];
}

RoomPosition.prototype.lookForFirstInRange = function(lookType, range, filter)
{
    let room = Game.rooms[this.roomName];
    if (!room)
        return null;

    let minX = Math.max( 0, this.x - range);
    let minY = Math.max( 0, this.y - range);
    let maxX = Math.min(49, this.x + range);
    let maxY = Math.min(49, this.y + range);

    let results = room.lookForAtArea(lookType, minY, minX, maxY, maxX, true);
    //this.log('RoomPosition.prototype.lookForFirstInRange', 'found ' + results.length + ' ' + lookType);

    let firstResult = _.find(results, o => o[lookType] && (!filter || filter(o[lookType])));
    if (firstResult)
        firstResult = firstResult[lookType];

    //this.log('RoomPosition.prototype.lookForFirstInRange', 'found ' + JSON.stringify(firstResult));
    return firstResult;
}

RoomPosition.prototype.lookForInRange = function(lookType, range, filter)
{
    let room = Game.rooms[this.roomName];
    if (!room)
        return [];

    let minX = Math.max( 0, this.x - range);
    let minY = Math.max( 0, this.y - range);
    let maxX = Math.min(49, this.x + range);
    let maxY = Math.min(49, this.y + range);

    let results = room.lookForAtArea(lookType, minY, minX, maxY, maxX, true);
    if (filter)
        results = _.filter(results, o => filter(o[lookType]));
    //this.log('RoomPosition.prototype.lookForInRange', 'found ' + results.length + ' ' + lookType);

    results = results.map(r => r[lookType]);
    return results;
}

RoomPosition.prototype.nearEdge = function(distance)
{
    return (this.x <= distance || this.x >= 49 - distance || this.y <= distance || this.y >= 49 - distance);
};

RoomPosition.prototype.distanceFromEdge = function()
{
    return Math.min(this.x - 0, 49 - this.x, this.y - 0, 49 - this.y);
};