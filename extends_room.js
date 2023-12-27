'use strict'

// enrico 25 February 2017 at 23:38 -----------------------
Room.isAlleyRoom = function (roomName)
{
    return /^[WE]\d*0[NS]\d*0$/.test(roomName);
}

Room.isCoreRoom = function (roomName)
{
    return /(^[WE]\d*5[NS]\d*5$)|(^[WE]\d*5[NS]\d*5$)/.test(roomName);
}

Room.isCenterRoom = function (roomName)
{
    return /^[WE]\d*[4-6]+[NS]\d*[4-6]+$/.test(roomName); // = core room + sk rooms
}

Room.isHighwayRoom = function (roomName)
{
    return /(^[WE]\d*[0][NS]\d*[0-9]$)|(^[WE]\d*[0-9][NS]\d*[0]$)/.test(roomName);
}

Room.isSourceKeeperRoom = function (roomName)
{
    return /(^[WE]\d*[4-6][NS]\d*[4|6]$)|(^[WE]\d*[4|6][NS]\d*[4-6]$)/.test(roomName);
}

Room.isSourceKeeperAdjacentRoom = function (roomName)
{
    return Room.isControllerRoom(roomName) && /(^[WE]\d*[3-7][NS]\d*[3|7]$)|(^[WE]\d*[3|7][NS]\d*[3-7]$)/.test(roomName);
}

Room.isControllerRoom = function (roomName)
{
    return /(^[WE]\d*[1-9]+[NS]\d*[1-3|7-9]+$)|(^[WE]\d*[1-3|7-9]+[NS]\d*[1-9]+$)/.test(roomName);
}

Room.isNorthSouthHighwayRoom = function (roomName)
{
    return /(^[WE]\d*[0][NS]\d*[0-9]$)/.test(roomName);
}

Room.isEastWestHighwayRoom = function (roomName)
{
    return /(^[WE]\d*[0-9][NS]\d*[0]$)/.test(roomName);
}
//---------------------------------------------------------

Room.wantToClaim = function(roomName)
{
    if (Room.isMyBase(roomName))
        return false;
        
    if (Game.flags['claim'] && Game.flags['claim'].pos.roomName == roomName)
        return true;

    if (Game.flags['claim_' + roomName])
        return true;
        
    if (!Memory || !Memory.empire || !Memory.empire.nextClaim || Memory.empire.nextClaim != roomName)
        return false;

    return true;
}

Room.isUnclaiming = function(roomName)
{
    let unclaimFlag = Game.flags['unclaim'];
    if (unclaimFlag && unclaimFlag.pos.roomName == roomName)
        return true;

    unclaimFlag = Game.flags['unclaim_' + roomName];
    if (unclaimFlag)
        return true;

    return false;
}

Room.getRoomsInRange = function(roomName, range, civilian)
{
    return _.sortBy(_.filter(Game.rooms, object => global.distanceBetweenRooms(roomName, object.name, civilian) <= range), object => global.distanceBetweenRooms(roomName, object.name, civilian));
}

Room.getRoomNamesInRangeFloodFill = function(fromRoomName, maxDepth, includeDangerousRooms, continuePastDangerousRooms)
{
    let pastList = [];
    let presentList = [];
    let futureList = [fromRoomName];

    let depth = 0;

    let resultRoomNames = [fromRoomName];

    while (futureList.length > 0 && depth < maxDepth)
    {
        presentList = futureList;
        futureList = [];

        for (let nextRoom of presentList)
        {
            if (pastList.indexOf(nextRoom) >= 0)
                continue;

            pastList.push(nextRoom);
            

            let exits = Game.map.describeExits(nextRoom);
            if (!exits)
                continue;

            for (let exitDirection in exits)
            {
                let nextNextRoom = exits[exitDirection];
                if (pastList.indexOf(nextNextRoom) >= 0 || futureList.indexOf(nextNextRoom) >= 0)
                    continue;

                let inDanger = Room.inDanger(nextNextRoom);

                if (includeDangerousRooms || !inDanger)
                    resultRoomNames.push(nextNextRoom);

                if (!continuePastDangerousRooms && inDanger)
                    continue;

                futureList.push(nextNextRoom);
            }
        }
        depth += 1;
    }

    //console.log('Room.getRoomNamesInRangeFloodFill - ' + fromRoomName + ' - ' + maxDepth + ' - ' + includeDangerousRooms + ' - ' + continuePastDangerousRooms + ' - result: ' + resultRoomNames);
    return resultRoomNames;
}

Room.getRoomNamesInRangeFloodFillFiltered = function(fromRoomName, maxDepth, filter = null, includeLastFiltered = false, continuePastFiltered = false)
{
    let pastList = [];
    let presentList = [];
    let futureList = [fromRoomName];

    let depth = 0;

    let resultRoomNames = [];

    while (futureList.length > 0 && depth < maxDepth)
    {
        presentList = futureList;
        futureList = [];

        for (let nextRoom of presentList)
        {
            if (pastList.indexOf(nextRoom) >= 0)
                continue;

            pastList.push(nextRoom);

            if (filter)
            {
                let filterResult = filter(nextRoom);
                if (filterResult || includeLastFiltered)
                    resultRoomNames.push({ name: nextRoom, depth: depth });

                if (!filterResult && !continuePastFiltered)
                    continue;
            }
            else
            {
                resultRoomNames.push({ name: nextRoom, depth: depth });
            }

            let exits = Game.map.describeExits(nextRoom);
            if (!exits)
                continue;

            for (let exitDirection in exits)
            {
                //console.log(exitDirection)

                let nextNextRoom = exits[exitDirection];
                if (!nextNextRoom)
                    continue;

                futureList.push(nextNextRoom);
            }
        }
        depth += 1;
    }

    return resultRoomNames;
}

Room.getRoomNamesInRangeFloodFillGenerator = function*(fromRoomName, maxDepth, filter = null, includeLastFiltered = false, continuePastFiltered = false)
{
    let pastList = [];
    let presentList = [];
    let futureList = [fromRoomName];

    let depth = 0;

    yield fromRoomName;

    while (futureList.length > 0 && depth < maxDepth)
    {
        presentList = futureList;
        futureList = [];

        for (let nextRoom of presentList)
        {
            if (pastList.indexOf(nextRoom) >= 0)
                continue;

            pastList.push(nextRoom);

            let exits = Game.map.describeExits(nextRoom);
            if (!exits)
                continue;
                
            for (let exitDirection in exits)
            {
                let nextNextRoom = exits[exitDirection];
                if (pastList.indexOf(nextNextRoom) >= 0 || futureList.indexOf(nextNextRoom) >= 0)
                    continue;

                if (filter)
                {
                    let filterResult = filter(nextNextRoom);
                    if (filterResult || includeLastFiltered)
                        yield nextNextRoom;

                    if (!filterResult && !continuePastFiltered)
                        continue;
                }

                futureList.push(nextNextRoom);
            }
        }
        depth += 1;
    }
}

Room.getNearestBase = function(roomName)
{
    let memory = Room.getMemory(roomName);
    if (memory && memory.nearestBase)
        return Game.rooms[memory.nearestBase];

    let bases = Room.getMyBases();
    if (bases.length <= 0)
        return null;

    let nearestBase = _.min(bases, object => global.distanceBetweenRooms(object.name, roomName, true));
    if (memory && nearestBase)
        memory.nearestBase = nearestBase.name;

    return nearestBase;
}

Room.getNearestBaseByLinearDistance = function(roomName, continuous)
{
    let bases = Room.getMyBases();
    if (bases.length <= 0)
        return null;

    let nearestBase = _.min(bases, b => Game.map.getRoomLinearDistance(b.name, roomName, continuous));
    return nearestBase;
}

Room.updateNearestBase = function(roomName)
{
    let memory = Room.getMemory(roomName);
    if (!memory)
        return;

    delete memory.nearestBase;
    let bases = Room.getMyBases();
    if (bases.length <= 0)
        return;

    let basesInRange = bases.filter(b => global.realDistanceBetweenRooms(roomName, b.name) <= global.MAX_REMOTE_RANGE);
    if (basesInRange.length <= 0)
    {
        let nearestBase = _.min(bases, b => global.realDistanceBetweenRooms(b.name, roomName));
        memory.nearestBase = nearestBase.name;
        return;
    }

    let nearestBase = _.min(bases, b => global.civilianRouteLength(b.name, roomName));
    memory.nearestBase = nearestBase.name;
    return;
}

Room.getNearestBaseFiltered = function(roomName, filter)
{
    if (!filter)
        return Room.getNearestBase(roomName);

    //let memory = Room.getMemory(roomName);
    //if (!memory)
    //    return null;

    let bases = Room.getMyBases();
    if (bases.length <= 0)
        return null;

    let filteredBases = _.filter(bases, b => filter(b));
    if (filteredBases.length <= 0)
        return null;

    let nearestBase = _.min(filteredBases, b => global.distanceBetweenRooms(b.name, roomName));

    return nearestBase;
}

Room.getNearestBaseName = function(roomName)
{
    let nearestBase = this.getNearestBase(roomName);
    if (!nearestBase)
        return null;

    return nearestBase.name;
}

Room.getNearestBaseByCivilianRoute = function(roomName)
{
    let basesWithRoutes = _.filter(Room.getMyBases(), object => global.distanceBetweenRooms(roomName, object.name, true) != Infinity);
    return _.min(basesWithRoutes, object => global.distanceBetweenRooms(roomName, object.name, true));
}

Room.getNearestBaseByRoute = function(roomName)
{
    let basesWithRoutes = _.filter(Room.getMyBases(), object => global.routeLength(roomName, object.name) != Infinity);
    return _.min(basesWithRoutes, object => global.routeLength(roomName, object.name));
}

Room.getMyBases = function ()
{
    if (Game.myBases)
        return Game.myBases;

    Game.myBases = _.filter(Game.rooms, room => room.isMyBase())

    return Game.myBases;
}

Room.getMyBasesInRange = function(roomName, range, civilian)
{
    let bases = Room.getMyBases();
    return _.sortBy(_.filter(bases, object => global.distanceBetweenRooms(roomName, object.name, civilian) <= range), object => global.distanceBetweenRooms(roomName, object.name, civilian));
}

//---------------------------------------------------------

Room.getMemory = function(roomName, create)
{
    if (!Memory.rooms)
        Memory.rooms = {};
    if (create && !Memory.rooms[roomName])
        Memory.rooms[roomName] = {};

    return Memory.rooms[roomName];
}

Room.getBaseMemory = function(roomName)
{
    if (!Memory.empire || !Memory.empire.bases || !Memory.empire.bases[roomName])
        return null;

    return Memory.empire.bases[roomName];
}

Room.getBasePlanMemory = function(roomName)
{
    let baseMemory = Room.getBaseMemory(roomName);
    if (!baseMemory)
        return null;

    if (!baseMemory.plan)
        baseMemory.plan = {};

    return baseMemory.plan;
}

Room.getBasePlanMemoryStructuresSpots = function(roomName, structureType)
{
    let basePlanMemory = Room.getBasePlanMemory(roomName);
    if (!basePlanMemory || !basePlanMemory.structures || !basePlanMemory.structures[structureType])
        return [];

    let spots = [];

    for (let character of basePlanMemory.structures[structureType])
        spots.push(global.chineseToSpot(character));

    return spots;
}

Room.setBasePlanMemoryStructuresSpots = function(roomName, structureType, spotList)
{
    let basePlanMemory = Room.getBasePlanMemory(roomName);
    if (!basePlanMemory || !basePlanMemory.structures)
        return;

    basePlanMemory.structures[structureType] = '';

    for (let spot of spotList)
        basePlanMemory.structures[structureType] = basePlanMemory.structures[structureType].concat(global.spotToChinese(spot));

    return;
}

Room.getBaseLabsMemory = function(roomName)
{
    let baseMemory = Room.getBaseMemory(roomName);
    if (!baseMemory)
        return null;

    return baseMemory.labs;
}

Room.getBaseFactoryMemory = function(roomName)
{
    let baseMemory = Room.getBaseMemory(roomName);
    if (!baseMemory)
        return null;

    return baseMemory.factory;
}

//---------------------------------------------------------

Room.shouldAbandon = function(roomName)
{
    let roomMemory = Room.getMemory(roomName);
    if (roomMemory && roomMemory.demolish)
        return true;
    return (roomMemory && !Room.isSourceKeeperAdjacentRoom(roomName) && roomMemory.sources && Object.keys(roomMemory.sources).length < 2 && roomMemory.mineral && roomMemory.mineral.type != 'X' && roomMemory.mineral.type != 'H' && roomMemory.mineral.type != 'O');
}

Room.isReplanning = function(roomName)
{
    let baseMemory = Room.getBaseMemory(roomName);
    if (!baseMemory)
        return false;
    else
        return !_.isUndefined(baseMemory.replan);
}

Room.wantsReplan = function(roomName)
{
    return ((Game.flags['replan'] && Game.flags['replan'].pos.roomName == roomName) || Game.flags['replan_' + roomName]);
}

Room.makeTradeRequest = function(fromRoom, toRoom, resourceType, amount)
{
    if (Room.isMyBase(fromRoom))
    {
        let fromRoomBaseMemory = Room.getBaseMemory(fromRoom);
        if (fromRoomBaseMemory)
        {
            if (!fromRoomBaseMemory.terminal)
                fromRoomBaseMemory.terminal = { tradeRequests: [] };

            fromRoomBaseMemory.terminal.tradeRequests = _.filter(fromRoomBaseMemory.terminal.tradeRequests, r => r.room != toRoom   || r.res != resourceType);
            fromRoomBaseMemory.terminal.tradeRequests.push({ room: toRoom  , res: resourceType, amount: -amount });
        }
    }

    if (Room.isMyBase(toRoom))
    {
        let toRoomBaseMemory = Room.getBaseMemory(toRoom);
        if (toRoomBaseMemory)
        {
            if (!toRoomBaseMemory.terminal)
            toRoomBaseMemory.terminal = { tradeRequests: [] };
  
            toRoomBaseMemory.terminal.tradeRequests = _.filter(  toRoomBaseMemory.terminal.tradeRequests, r => r.room != fromRoom || r.res != resourceType);
            toRoomBaseMemory.terminal.tradeRequests.push({ room: fromRoom, res: resourceType, amount:  amount });
        }
    }
}

Object.defineProperty(Room.prototype, "quickCan1",
{
    configurable: true,
    get()
    {
        if (!this.quickCanPos1)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.qc1)
        {
            let can = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickCanPos1), object => object.structureType == STRUCTURE_CONTAINER);
            this.quickCan1 = can;
            return can;
        }

        let quickCan = Game.getObjectById(basePlanMemory.qc1);
        if (!quickCan)
        {
            let can = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickCanPos1), object => object.structureType == STRUCTURE_CONTAINER);
            this.quickCan1 = can;
            return can;
        }

        return quickCan;
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qc1;
        }
        else
        {
            basePlanMemory.qc1 = value.id;
        }
    }
});

Object.defineProperty(Room.prototype, "quickCan2",
{
    configurable: true,
    get()
    {
        if (!this.quickCanPos2)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.qc2)
        {
            let can = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickCanPos2), object => object.structureType == STRUCTURE_CONTAINER);
            this.quickCan2 = can;
            return can;
        }

        let quickCan = Game.getObjectById(basePlanMemory.qc2);
        if (!quickCan)
        {
            let can = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickCanPos2), object => object.structureType == STRUCTURE_CONTAINER);
            this.quickCan2 = can;
            return can;
        }

        return quickCan;
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qc2;
        }
        else
        {
            basePlanMemory.qc2 = value.id;
        }
    }
});

Object.defineProperty(Room.prototype, "quickCanPos1",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.qcx1)
            return null;

        return new RoomPosition(basePlanMemory.qcx1, basePlanMemory.qcy1, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qcx1;
            delete basePlanMemory.qcy1;
        }
        else
        {
            basePlanMemory.qcx1 = value.x;
            basePlanMemory.qcy1 = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "quickCanPos2",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.qcx2)
            return null;

        return new RoomPosition(basePlanMemory.qcx2, basePlanMemory.qcy2, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qcx2;
            delete basePlanMemory.qcy2;
        }
        else
        {
            basePlanMemory.qcx2 = value.x;
            basePlanMemory.qcy2 = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "quickCreepPos1",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.qfx1)
            return null;

        return new RoomPosition(basePlanMemory.qfx1, basePlanMemory.qfy1, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qfx1;
            delete basePlanMemory.qfy1;
        }
        else
        {
            basePlanMemory.qfx1 = value.x;
            basePlanMemory.qfy1 = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "quickCreepPos2",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.qfx2)
            return null;

        return new RoomPosition(basePlanMemory.qfx2, basePlanMemory.qfy2, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qfx2;
            delete basePlanMemory.qfy2;
        }
        else
        {
            basePlanMemory.qfx2 = value.x;
            basePlanMemory.qfy2 = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "quickCreepPos3",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.qfx3)
            return null;

        return new RoomPosition(basePlanMemory.qfx3, basePlanMemory.qfy3, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qfx3;
            delete basePlanMemory.qfy3;
        }
        else
        {
            basePlanMemory.qfx3 = value.x;
            basePlanMemory.qfy3 = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "quickCreepPos4",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.qfx4)
            return null;

        return new RoomPosition(basePlanMemory.qfx4, basePlanMemory.qfy4, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qfx4;
            delete basePlanMemory.qfy4;
        }
        else
        {
            basePlanMemory.qfx4 = value.x;
            basePlanMemory.qfy4 = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "stockerPos",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.stx)
            return null;

        return new RoomPosition(basePlanMemory.stx, basePlanMemory.sty, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.stx;
            delete basePlanMemory.sty;
        }
        else
        {
            basePlanMemory.stx = value.x;
            basePlanMemory.sty = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "towerFillPos",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.tfx)
        {
            let towerPlans = Room.getBasePlanMemoryStructuresSpots(this.name, STRUCTURE_TOWER);
            if (!towerPlans)
                return null;

            let minX = Infinity;
            let minY = Infinity;

            for (let spot of towerPlans)
            {
                minX = Math.min(spot.x, minX);
                minY = Math.min(spot.y, minY);
            }
            if (minX != Infinity && minY != Infinity)
            {
                let position = new RoomPosition(minX + 1, minY + 1, this.name);
                this.towerFillPos = position;
                console.log('Room.towerFillPos - setting towerFillPos to ' + position);
            }

        }

        return new RoomPosition(basePlanMemory.tfx, basePlanMemory.tfy, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.tfx;
            delete basePlanMemory.tfy;
        }
        else
        {
            basePlanMemory.tfx = value.x;
            basePlanMemory.tfy = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "controllerCan",
{
    configurable: true,
    get()
    {
        if (!this.controllerCanPos)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.cc)
        {
            let can = _.find(this.lookForAt(LOOK_STRUCTURES, this.controllerCanPos), object => object.structureType == STRUCTURE_CONTAINER);
            this.controllerCan = can;
            return can;
        }

        let cCan = Game.getObjectById(basePlanMemory.cc);
        if (!cCan)
        {
            cCan = _.find(this.lookForAt(LOOK_STRUCTURES, this.controllerCanPos), object => object.structureType == STRUCTURE_CONTAINER);
            this.controllerCan = cCan;
            return cCan;
        }

        return cCan;
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.cc;
        }
        else
        {
            basePlanMemory.cc = value.id;
        }
    }
});

Object.defineProperty(Room.prototype, "controllerCanPos",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.ccx)
            return null;

        return new RoomPosition(basePlanMemory.ccx, basePlanMemory.ccy, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.ccx;
            delete basePlanMemory.ccy;
        }
        else
        {
            basePlanMemory.ccx = value.x;
            basePlanMemory.ccy = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "quickLink",
{
    configurable: true,
    get()
    {
        if (!this.quickLinkPos)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.qlc)
        {
            let link = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickLinkPos), object => object.structureType == STRUCTURE_LINK);
            this.quickLink = link;
            return link;
        }

        let quickLink = Game.getObjectById(basePlanMemory.qlc);
        if (!quickLink)
        {
            let link = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickLinkPos), object => object.structureType == STRUCTURE_LINK);
            this.quickLink = link;
            return link;
        }

        return quickLink;
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qlc;
        }
        else
        {
            basePlanMemory.qlc = value.id;
        }
    }
});

Object.defineProperty(Room.prototype, "quickTower",
{
    configurable: true,
    get()
    {
        if (!this.quickLinkPos)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.qtc)
        {
            let tower = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickLinkPos), object => object.structureType == STRUCTURE_TOWER);
            this.quickTower = tower;
            return tower;
        }

        let quickTower = Game.getObjectById(basePlanMemory.qtc);
        if (!quickTower)
        {
            let tower = _.find(this.lookForAt(LOOK_STRUCTURES, this.quickLinkPos), object => object.structureType == STRUCTURE_TOWER);
            this.quickTower = tower;
            return tower;
        }

        return quickTower;
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qtc;
        }
        else
        {
            basePlanMemory.qtc = value.id;
        }
    }
});

Object.defineProperty(Room.prototype, "quickLinkPos",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.qlx)
            return null;

        return new RoomPosition(basePlanMemory.qlx, basePlanMemory.qly, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.qlx;
            delete basePlanMemory.qly;
        }
        else
        {
            basePlanMemory.qlx = value.x;
            basePlanMemory.qly = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "coreLink",
{
    configurable: true,
    get()
    {
        if (!this.coreLinkPos)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.clc)
        {
            let link = _.find(this.lookForAt(LOOK_STRUCTURES, this.coreLinkPos), object => object.structureType == STRUCTURE_LINK);
            this.coreLink = link;
            return link;
        }

        let coreLink = Game.getObjectById(basePlanMemory.clc);
        if (!coreLink)
        {
            let link = _.find(this.lookForAt(LOOK_STRUCTURES, this.coreLinkPos), object => object.structureType == STRUCTURE_LINK);
            this.coreLink = link;
            return link;
        }

        return coreLink;
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.clc;
        }
        else
        {
            basePlanMemory.clc = value.id;
        }
    }
});

Object.defineProperty(Room.prototype, "coreLinkPos",
{
    configurable: true,
    get()
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory || !basePlanMemory.clx)
            return null;

        return new RoomPosition(basePlanMemory.clx, basePlanMemory.cly, this.name);
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.clx;
            delete basePlanMemory.cly;
        }
        else
        {
            basePlanMemory.clx = value.x;
            basePlanMemory.cly = value.y;
        }
    }
});

Object.defineProperty(Room.prototype, "controllerLink",
{
    configurable: true,
    get()
    {
        if (!this.controllerCanPos)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        if (!basePlanMemory.cclc)
        {
            let link = _.find(this.lookForAt(LOOK_STRUCTURES, this.controllerCanPos), object => object.structureType == STRUCTURE_LINK);
            this.controllerLink = link;
            return link;
        }

        let link = Game.getObjectById(basePlanMemory.cclc);
        if (!link)
        {
            link = _.find(this.lookForAt(LOOK_STRUCTURES, this.controllerCanPos), object => object.structureType == STRUCTURE_LINK);
            this.controllerLink = link;
            return link;
        }

        return link;
    },
    set(value)
    {
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return;

        if (!value)
        {
            delete basePlanMemory.cclc;
        }
        else
        {
            basePlanMemory.cclc = value.id;
        }
    }
});

Object.defineProperty(Room.prototype, "bonfirePos",
{
    configurable: true,
    get()
    {
        if (!this.quickLinkPos)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        let pos = this.quickLinkPos;

        if (this.quickCan1 /*&& this.quickCan2*/ && !this.controllerCan && !this.controllerLink)
            pos = this.controllerCanPos

        return pos;
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "bonfire",
{
    configurable: true,
    get()
    {
        let pos = this.bonfirePos;
        if (!pos)
            return null;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return null;

        let fires = this.lookForAtArea(LOOK_RESOURCES, pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
        if (fires.length <= 0)
            return null;

        return _.first(fires).resource;

        //return _.first(this.lookForAt(LOOK_RESOURCES, this.quickLinkPos));
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "totalBonfireAmount",
{
    configurable: true,
    get()
    {
        let pos = this.bonfirePos;
        if (!pos)
            return 0;
        let basePlanMemory = Room.getBasePlanMemory(this.name);
        if (!basePlanMemory)
            return 0;

        let fires = this.lookForAtArea(LOOK_RESOURCES, pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
        //return _.sum(fires, f => f.resource.amount);
        return _.sum(fires, f => (f.resource.resourceType == RESOURCE_ENERGY) ? f.resource.amount : 0);
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "sources",
{
    configurable: true,
    get()
    {
        if (!this._sources)
            this._sources = this.find(FIND_SOURCES);
        return this._sources;
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "mineral",
{
    configurable: true,
    get()
    {
        if (!this._mineral)
            this._mineral = this.find(FIND_MINERALS).find(f => f.mineralType != RESOURCE_THORIUM);
        return this._mineral;
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "thorium",
{
    configurable: true,
    get()
    {
        if (!this._thorium)
            this._thorium = this.find(FIND_MINERALS).find(f => f.mineralType === RESOURCE_THORIUM);

        if (!this._thorium && this.memory.thorium)
            delete this.memory.thorium;
            
        return this._thorium;
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "constructionSites",
{
    configurable: true,
    get()
    {
        if (!this._constructionSites)
            this._constructionSites = this.find(FIND_CONSTRUCTION_SITES);
        return this._constructionSites;
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "nukes",
{
    configurable: true,
    get()
    {
        if (!this._nukes)
            this._nukes = this.find(FIND_NUKES);
        return this._nukes;
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, 'extensions',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_EXTENSION])
            return structures[STRUCTURE_EXTENSION];
        else
            return [];
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'quickExtensions',
{
    get()
    {
        if (!this.quickLinkPos || !this.stockerPos)
            return null;
        let extensions = this.extensions;
        if (!this.extensions)
            return null;

        let quickExtensions = _.filter(extensions, e => e.pos.getRangeTo(this.quickLinkPos) <= 2 || e.pos.getRangeTo(this.stockerPos) <= 1);
        return quickExtensions;
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'slowExtensions',
{
    get()
    {
        if (!this.quickLinkPos || !this.stockerPos)
            return null;
        let extensions = this.extensions;
        if (!this.extensions)
            return null;

        let slowExtensions = _.filter(extensions, e => e.pos.getRangeTo(this.quickLinkPos) > 2 && e.pos.getRangeTo(this.stockerPos) > 1);
        return slowExtensions;
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'factory',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_FACTORY] && structures[STRUCTURE_FACTORY].length > 0)
            return structures[STRUCTURE_FACTORY][0];
        else
            return null;
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'nuker',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_NUKER] && structures[STRUCTURE_NUKER].length > 0)
            return structures[STRUCTURE_NUKER][0];
        else
            return null;
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'observer',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_OBSERVER] && structures[STRUCTURE_OBSERVER].length > 0)
            return structures[STRUCTURE_OBSERVER][0];
        else
            return null;
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'powerSpawn',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_POWER_SPAWN] && structures[STRUCTURE_POWER_SPAWN].length > 0)
            return structures[STRUCTURE_POWER_SPAWN][0];
        else
            return null;
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'extractor',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_EXTRACTOR] && structures[STRUCTURE_EXTRACTOR].length > 0)
            return structures[STRUCTURE_EXTRACTOR][0];
        else
            return null;
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'spawns',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_SPAWN])
            return structures[STRUCTURE_SPAWN];
        else
            return [];
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'towers',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_TOWER])
            return structures[STRUCTURE_TOWER];
        else
            return [];
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'labs',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_LAB])
            return structures[STRUCTURE_LAB];
        else
            return [];
    },
    enumerable: false,
    configurable: true
})

Object.defineProperty(Room.prototype, 'ramparts',
{
    get()
    {
        let structures = this.structures;
        if (structures && structures[STRUCTURE_RAMPART])
            return structures[STRUCTURE_RAMPART];
        else
            return [];
    },
    enumerable: false,
    configurable: true
})


Object.defineProperty(Room.prototype, 'structures',
{
    get()
    {
        if (!this._structures || _.isEmpty(this._structures))
        {
            const allStructures = this.find(FIND_STRUCTURES);
            this._structures = _.groupBy(allStructures, 'structureType');
            this._structures.all = allStructures;
        }
        return this._structures;
    },
    enumerable: false,
    configurable: true
})

Room.prototype.getStructures = function(type)
{
    return (this.structures[type] || []);
}

Room.prototype.isBootstrapping = function ()
{
    return !this.quickCan1 || /*!this.quickCan2 ||*/ (!this.controllerCan && !this.controllerLink) || this.find(FIND_MY_SPAWNS).length < 1;
}

Room.isEnemyBase = function (roomName)
{
    let roomMemory = Room.getMemory(roomName);
    return (roomMemory && roomMemory.controller && roomMemory.controller.o && roomMemory.controller.o != ME);
}

Room.prototype.isMyBase = function ()
{
    return this.controller && this.controller.my && this.memory && !this.memory.demolish;
}

Room.isMyBase = function (roomName)
{
    let room = Game.rooms[roomName];
    let result = room && room.controller && room.controller.my && room.memory && !room.memory.demolish;
    return !!result;
}

Room.isReservedByMe = function (roomName)
{
    let roomMemory = Room.getMemory(roomName);
    let result = roomMemory && roomMemory.controller && roomMemory.controller.r == ME;
    return !!result;
}

Room.isReservedByEnemy = function (roomName)
{
    let roomMemory = Room.getMemory(roomName);
    let result = roomMemory && roomMemory.controller && roomMemory.controller.r && roomMemory.controller.r != ME;
    return !!result;
}

Room.inDanger = function(roomName)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.hostiles || (Room.isMyBase(roomName) && Game.rooms[roomName].controller.safeMode))
        return 0;

    let hostileInfo = roomMemory.hostiles;
    if (hostileInfo.etc || (hostileInfo.partCount && (hostileInfo.partCount[ATTACK] || hostileInfo.partCount[RANGED_ATTACK])))
        return 1;
    else
        return 0;
}

Room.hasStrongHold = function(roomName)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.hostiles || !roomMemory.hostiles.ic || !roomMemory.hostiles.tc)
        return 0;

    return 1;
}

Room.beingNuked = function(roomName)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return false;

    return !!roomMemory.nukes;
}

Room.prototype.isMyBase = function ()
{
    return this.controller && this.controller.my;
}

Room.prototype.tryProcessNextLinkRequest = function()
{
    let offeringLink = this.getNextOfferingLink();
    if (offeringLink && !offeringLink.coolDown && !offeringLink.sentEnergy)
    {
        let requestingLink = this.getNextRequestingLink();
        if (requestingLink && requestingLink.store.getFreeCapacity(RESOURCE_ENERGY) >= 100)
        {
            offeringLink.transferEnergy(requestingLink);
            offeringLink.sentEnergy = true;
            this.removeNextLinkOffer();
            this.removeNextLinkRequest();
        }
    }
}


Room.prototype.offerEnergyFromLink = function (link)
{
    let baseMemory = Room.getBaseMemory(this.name);
    if (!baseMemory)
        return null;

    if (!baseMemory.linkOffers)
        baseMemory.linkOffers = [];

    if (baseMemory.linkOffers.indexOf(link.id) > -1)
    {
        this.tryProcessNextLinkRequest();
        return;
    }

    if (!(link instanceof StructureLink))
    {
        console.log('Room.offerEnergyFromLink - non-link object offering energy at pos ' + link.pos);
        return;
    }

    if (baseMemory.linkOffers.length <= 0 && !link.coolDown && !link.sentEnergy)
    {
        let requestingLink = this.getNextRequestingLink();
        if (requestingLink)
        {
            link.transferEnergy(requestingLink);
            link.sentEnergy = true;
            this.removeNextLinkRequest();
            return;
        }
    }

    baseMemory.linkOffers.push(link.id);
}

Room.prototype.requestEnergyForLink = function (link)
{
    let baseMemory = Room.getBaseMemory(this.name);
    if (!baseMemory)
        return null;

    if (!baseMemory.linkRequests)
        baseMemory.linkRequests = [];

    if (baseMemory.linkRequests.indexOf(link.id) > -1)
    {
        this.tryProcessNextLinkRequest();
        return;
    }

    if (!(link instanceof StructureLink))
    {
        console.log('Room.requestEnergyForLink - non-link object requesting energy at pos ' + link.pos);
        return;
    }

    if (baseMemory.linkRequests.length <= 0)
    {
        let offeringLink = this.getNextOfferingLink();
        if (offeringLink && !offeringLink.coolDown && !offeringLink.sentEnergy)
        {
            offeringLink.transferEnergy(link);
            offeringLink.sentEnergy = true;
            this.removeNextLinkOffer();
            return;
        }
    
        let coreLink = this.coreLink;
        if (coreLink && !coreLink.coolDown && !coreLink.sentEnergy && coreLink.store.getUsedCapacity(RESOURCE_ENERGY) >= LINK_CAPACITY)
        {
            coreLink.transferEnergy(link);
            coreLink.sentEnergy = true;
            return;
        }
    }

    baseMemory.linkRequests.push(link.id);
}

Room.prototype.getNextOfferingLink = function ()
{
    let baseMemory = Room.getBaseMemory(this.name);
    if (!baseMemory || !baseMemory.linkOffers || baseMemory.linkOffers.length <= 0)
        return null;

    let link = null;
    while (!link && baseMemory.linkOffers.length > 0)
    {
        link = Game.getObjectById(baseMemory.linkOffers[0]);
        if (!link || link.store.getUsedCapacity(RESOURCE_ENERGY) <= 0)
        {
            baseMemory.linkOffers.splice(0, 1);
            link = null;
        }
    }

    return link;
}

Room.prototype.getNextRequestingLink = function ()
{
    let baseMemory = Room.getBaseMemory(this.name);
    if (!baseMemory || !baseMemory.linkRequests || baseMemory.linkRequests.length <= 0)
        return null;

    //console.log('Room.getNextRequestingLink - ' + this.name + ' - baseMemory.linkRequests: ' + baseMemory.linkRequests)

    let link = null;
    while (!link && baseMemory.linkRequests.length > 0)
    {
        link = Game.getObjectById(baseMemory.linkRequests[0]);
        if (!link || link.store.getFreeCapacity(RESOURCE_ENERGY) <= 0)
        {
            baseMemory.linkRequests.splice(0, 1);
            link = null;
        }
    }

    return link;
}

Room.prototype.removeNextLinkOffer = function ()
{
    let baseMemory = Room.getBaseMemory(this.name);
    if (!baseMemory || !baseMemory.linkOffers || baseMemory.linkOffers.length <= 0)
        return null;

    baseMemory.linkOffers.splice(0, 1);
}

Room.prototype.removeNextLinkRequest = function ()
{
    let baseMemory = Room.getBaseMemory(this.name);
    if (!baseMemory || !baseMemory.linkRequests || baseMemory.linkRequests.length <= 0)
        return null;

    baseMemory.linkRequests.splice(0, 1);
}

Room.prototype.hasMyStorageOrTerminal = function ()
{
    return (this.controller && this.controller.my && ((this.controller.level >= 4 && this.storage && this.storage.my) || (this.controller.level >= 6 && this.terminal && this.terminal.my)));
}

Object.defineProperty(Room.prototype, "quickFillableEnergy",
{
    configurable: true,
    get()
    {
        if (!this.controller || !this.controller.my)
            return 0;

        let amount = 0;
        let level = this.controller.level;
        if (level == 1)
            amount = 300;
        else if (level == 2)
            amount = 550;
        else if (level == 3)
            amount = 800;
        else if (level == 4)
            amount = 1300;
        else if (level == 5)
            amount = 1400;
        else if (level == 6)
            amount = 1350;
        else if (level == 7)
            amount = 2500;
        else if (level == 8)
            amount = 4100;

        return amount;
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "quickFillableEnergyAvailable",
{
    configurable: true,
    get()
    {
        return Math.min(this.quickFillableEnergy, this.energyAvailable);
    },
    set(value)
    {

    }
});

Object.defineProperty(Room.prototype, "quickFillableEnergyCapacityAvailable",
{
    configurable: true,
    get()
    {
        return Math.min(this.quickFillableEnergy, this.energyCapacityAvailable);
    },
    set(value)
    {

    }
});

Room.prototype.isPowerCreepActive = function(requiredPower, requiredPowerLevel, exact = false)
{
    let powerCreepFlags = this.find(FIND_FLAGS, { filter: f => f.name.startsWith('powerCreep')});
    if (!powerCreepFlags || powerCreepFlags.length <= 0)
        return false;

    for (let flag of powerCreepFlags)
    {
        let flagNameParts = flag.name.split("_");
        if (flagNameParts.length > 1)
        {
            let powerCreepName = flagNameParts[1];
            let powerCreep = Game.powerCreeps[powerCreepName];

            if (!powerCreep || !powerCreep.ticksToLive)
                return false;

            if (!requiredPower || !requiredPowerLevel)
                return true;

            return powerCreep.hasPowerLevel(requiredPower, requiredPowerLevel, exact);
        }
    }

    return false;
}

Room.shouldIgnore = function(roomName)
{
    if (Game.flags['ignore'] && Game.flags['ignore'].pos.roomName == roomName)
        return true;

    if (Game.flags['ignore_' + roomName])
        return true;

    return false;
}