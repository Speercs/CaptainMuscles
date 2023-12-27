'use strict'

let Mission_Creeps = require('program_mission_creeps');
const Process = require('os_process');
const WorldPosition = require('./WorldPosition');
const constants = require('constants');

class Room_Updater extends Process
{
    constructor (...args)
    {
        super(...args);
    }

    end()
    {
        super.end();
    }

    run()
    {
        super.run();

        for (let roomName in Game.rooms)
        {
            let room = Game.rooms[roomName];
            let roomMemory = Room.getMemory(roomName, true);

            if (!roomMemory.seen || Game.time - roomMemory.seen > 10)
                this.updateRoom(roomName, room, roomMemory);

            if (constants.SEASON_FOUR_ACTIVE && Room.isHighwayRoom(roomName) && !Room.isAlleyRoom(roomName))
                this.updateCaravansSeason4(room, roomMemory);
        }

        for (let roomName in Memory.rooms)
        {
            let room = Game.rooms[roomName];
            let roomMemory = Room.getMemory(roomName);

            if (roomMemory.seen && roomMemory.hostiles && (!roomMemory.controller || !roomMemory.controller.o) && roomMemory.hostiles.ttl && Game.time - roomMemory.seen > roomMemory.hostiles.ttl)
                delete roomMemory.hostiles;

            this.updateMapVisuals(roomName, room, roomMemory);
        }

        if (Memory && Memory.empire && Memory.empire.warfare && Memory.empire.warfare.targets)
        {
            for (let roomName of Memory.empire.warfare.targets)
                Game.map.visual.circle(new RoomPosition(25, 25, roomName), {fill: 'transparent', radius: 25, stroke: '#ff0000'});
        }
    }

    updateRoom(roomName, room, roomMemory)
    {
        if (roomMemory.scout && !Game.creeps[roomMemory.scout])
            delete roomMemory.scout;

        if (room)
        {
            roomMemory.seen = Game.time;
            roomMemory.name = roomName;

            let isHighwayRoom = Room.isHighwayRoom(roomName);
            let isAlleyRoom = Room.isAlleyRoom(roomName);
            let isControllerRoom = Room.isControllerRoom(roomName);

            this.updateController(room, roomMemory);
            this.updateSources(room, roomMemory);
            this.updateMineral(room, roomMemory);

            delete roomMemory.maxWallHits;
            delete roomMemory.minWallHits;
    
            let walls = room.find(FIND_STRUCTURES).filter(s => (s.hits && (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART)));
            if (walls.length > 0)
            {
                roomMemory.maxWallHits = _.max(walls, s => s.hits).hits;
                roomMemory.minWallHits = _.min(walls, s => s.hits).hits;
            }

            this.updateHostiles(room, roomMemory);

            this.updateFlags(room, roomMemory);

            if (isControllerRoom)
            {
                this.updateTerrain(room, roomMemory);
            }
                

            if (isAlleyRoom)
            {
                this.updatePortals(room, roomMemory);
            }

            if (isHighwayRoom)
            {
                this.updatePowerBanks(room, roomMemory);
                this.updateDeposits(room, roomMemory);
            }

            if (constants.SEASON_FIVE_ACTIVE)
            {
                if (Room.isCoreRoom(roomName))
                    this.updateReactorsSeason5(room, roomMemory);
                else if (!Room.isCenterRoom(roomName))
                    this.updateThoriumSeason5(room, roomMemory);
            }
        }
    }

    updateController(room, roomMemory)
    {
        if (!room.controller)
            return;

        if (!roomMemory.controller)
        {
            roomMemory.controller = {};
            roomMemory.controller.x = room.controller.pos.x;
            roomMemory.controller.y = room.controller.pos.y;
        }

        if (room.controller.owner)
            roomMemory.controller.o = room.controller.owner.username;
        else
            delete roomMemory.controller.o;

        if (room.controller.reservation)
        {
            roomMemory.controller.r = room.controller.reservation.username;
            roomMemory.controller.rt = room.controller.reservation.ticksToEnd;
        }
        else
        {
            delete roomMemory.controller.r;
            delete roomMemory.controller.rt;
        }

        if (room.controller.level)
            roomMemory.controller.l = room.controller.level;
        else
            delete roomMemory.controller.l;

        if (room.controller.safeMode)
            roomMemory.controller.sm = Game.time + room.controller.safeMode;
        else
            delete roomMemory.controller.sm;

        if (!roomMemory.controller.os)
            roomMemory.controller.os = room.controller.pos.getOpenSpotCount();
    }

    updateSources(room, roomMemory)
    {
        if (!roomMemory.sources)
        {
            let sources = room.find(FIND_SOURCES);
            for (let source of sources)
            {
                // Force creation of source memory data
                let sourceMemory = source.memory;
            }
        }
    }

    updateMineral(room, roomMemory)
    {
        let mineral = room.mineral;
        if (mineral)
        {
            mineral.memory.amount = mineral.mineralAmount;
        }
    }

    updateHostiles(room, roomMemory)
    {
        if (roomMemory.defendUntil && roomMemory.defendUntil < Game.time)
            delete roomMemory.defendUntil;
            
        let wasInDanger = Room.inDanger(room.name);

        let allyInfo = {};
        let hostileInfo = {};

        let foundHostile = false;

        let otherCreeps = room.find(FIND_HOSTILE_CREEPS);

        let allyCreeps = _.filter(otherCreeps, c => c.healInCombat());
        if (allyCreeps.length > 0)
        {
            let totalPartCount = {};
            let maxPartCount = {};

            for (let creep of allyCreeps)
            {
                let partCount = _.countBy(creep.body, part => part.type);

                for (let part of creep.body)
                {
                    let additionalPartValue = 0;
                    if (part.boost)
                    {
                        let boostNameLength = part.boost.length;
                        if (boostNameLength == 2)
                            additionalPartValue = 1;
                        else if (boostNameLength == 4)
                            additionalPartValue = 2;
                        else if (boostNameLength == 5)
                            additionalPartValue = 3;
                    }
                    partCount[part.type] = (partCount[part.type] || 0) + additionalPartValue;
                }

                for (let part in partCount)
                {
                    let thisPartCount = partCount[part];
                    totalPartCount[part] = (totalPartCount[part] || 0) + thisPartCount;

                    if (!maxPartCount[part] || thisPartCount > maxPartCount[part])
                        maxPartCount[part] = thisPartCount;
                }
            }

            allyInfo.ac = allyCreeps.length;

            allyInfo.partCount = totalPartCount;
            allyInfo.maxPartCount = maxPartCount;

            allyInfo.ttl = _.max(allyCreeps, h => h.ticksToLive).ticksToLive;
            
            roomMemory.allies = allyInfo;
        }
        else
        {
            delete roomMemory.allies;
        }

        let hostiles = _.filter(otherCreeps, c => c.killOnSight());
        if (hostiles.length > 0)
        {
            foundHostile = true;

            let totalPartCount = {};
            let maxPartCount = {};

            for (let hostile of hostiles)
            {
                let partCount = _.countBy(hostile.body, part => part.type);

                let hostileBody = hostile.body;
                for (let part of hostile.body)
                {
                    let additionalPartValue = 0;
                    if (part.boost)
                    {
                        let boostNameLength = part.boost.length;
                        if (boostNameLength == 2)
                            additionalPartValue = 1;
                        else if (boostNameLength == 4)
                            additionalPartValue = 2;
                        else if (boostNameLength == 5)
                            additionalPartValue = 3;
                    }
                    partCount[part.type] = (partCount[part.type] || 0) + additionalPartValue;
                }

                for (let part in partCount)
                {
                    let thisPartCount = partCount[part];
                    totalPartCount[part] = (totalPartCount[part] || 0) + thisPartCount;

                    if (!maxPartCount[part] || thisPartCount > maxPartCount[part])
                        maxPartCount[part] = thisPartCount;
                }
            }

            hostileInfo.hc = hostiles.length;

            hostileInfo.partCount = totalPartCount;
            hostileInfo.maxPartCount = maxPartCount;

            hostileInfo.ttl = _.max(hostiles, h => h.ticksToLive).ticksToLive;
        }

        let hostileStructures = _.filter(room.find(FIND_HOSTILE_STRUCTURES), c => c.killOnSight());
        if (hostileStructures.length > 0)
        {
            let invaderCore = _.find(hostileStructures, object => object.structureType == STRUCTURE_INVADER_CORE);

            if (invaderCore && !invaderCore.ticksToDeploy)
            {
                foundHostile = true;
                hostileInfo.ic = invaderCore.id;
            }
        }

        let nukes = room.find(FIND_NUKES);

        if (nukes.length > 0)
        {
            roomMemory.nukes = nukes.length;
            Game.map.visual.rect(new RoomPosition(3, 3, room.name), 46, 46, {fill: 'transparent', stroke: '#ffffff', strokeWidth: 5});
            if (room.isMyBase())
                console.log('*****************Room_Updater.updateHostiles - ' + room.name + ' - is being nuked x' + nukes.length + '! *****************');

            let nukesLandingSoon = nukes.filter(n => n.timeToLand < 100);
            
            if (nukesLandingSoon.length > 0)
            {
                let leastSoonNuke = _.max(nukesLandingSoon, n => n.timeToLand);
                let endTime = Game.time + leastSoonNuke.timeToLand + 5;
                let creeps = room.find(FIND_MY_CREEPS).filter(c => !c.hasTask({ n: 'task_avoid_nuke', leaveRoom: room.name }));
                console.log('*****************Room_Updater.updateHostiles - ' + room.name + ' - evacuating ' + creeps.length + ' creeps! *****************');
                for (let creep of creeps)
                    creep.pushTaskProgram('avoid_nuke', 'task_avoid_nuke',  { creep: creep.name, leaveRoom: room.name, endTime: endTime }, true);
            }
        }
        else
        {
            delete roomMemory.nukes;
        }

        if ((!room.controller || room.controller.owner) && hostileStructures.length > 0)
        {
            let alltowers = _.filter(hostileStructures, object => object.structureType == STRUCTURE_TOWER );
            let activeTowers = _.filter(alltowers, object => (!room.controller && hostileInfo.ic) || object.isActive());
            let towersWithEnergy = _.filter(activeTowers, object => object.store.getUsedCapacity(RESOURCE_ENERGY) >= TOWER_ENERGY_COST * 3 );

            let totalTowerEnergy = _.sum(towersWithEnergy, t => t.store.getUsedCapacity(RESOURCE_ENERGY));
            let towerCount = Math.ceil(totalTowerEnergy / TOWER_CAPACITY);
            // if (towerCount <= 0 && alltowers.length > 0)
            //     towerCount = 1;

            if (activeTowers.length > 0)
            {
                hostileInfo.tc = activeTowers.length;
                hostileInfo.etc = towerCount;

                foundHostile = (foundHostile || !!hostileInfo.tc);
            }

            if (room.controller && room.controller.owner)
            {
                let spawns = _.filter(hostileStructures, object => object.structureType == STRUCTURE_SPAWN );
                hostileInfo.sc = spawns.length;
                foundHostile = (foundHostile || !!hostileInfo.sc);
            }
        }

        if (foundHostile)
        {
            roomMemory.hostiles = hostileInfo;
        }
        else
        {
            delete roomMemory.hostiles;
        }

        let isInDanger = Room.inDanger(room.name);
        let foundRedListers = hostiles.some(c => c.killRemotely());
        
        if (!hostileInfo.etc && 
            (Room.isMyBase(room.name) || !roomMemory.controller || !roomMemory.controller.sm) && 
            (isInDanger ||
             roomMemory.defendUntil ||
             foundRedListers ||
             Room.wantToClaim(room.name) ||
             (Room.isEnemyBase(room.name) && Room.killOnSight(room.name)) || 
             (Room.isEnemyBase(room.name) && Room.trusted(room.name) && (room.spawns.length <= 0 || room.towers.length <= 0)) ||
             (hostiles.length > 0 && (Room.isMyBase(room.name) || Room.isReservedByMe(room.name))) ||
             Room.isMyBase(room.name) && room.isBootstrapping() && !room.controller.safeMode))
            this.launchChildProcess(`repel_${room.name}`, 'mission_repel', { room: room.name });
        else if (constants.SEASON_FIVE_ACTIVE && Room.isCoreRoom(room.name))
            this.launchChildProcess(`repel_${room.name}`, 'mission_repel', { room: room.name });

        // if (!roomMemory.controller && hostileInfo.tc && hostileInfo.tc == 4)
        //     this.launchChildProcess(`attack_${room.name}`, 'mission_attack', { room: room.name })

        if (isInDanger && !wasInDanger && !Room.isMyBase(room.name))
            Room.cancelCivilianJobs(room.name);

        delete roomMemory.loot;

        if (!room.controller || room.controller.my || !room.controller.owner)
            delete roomMemory.noDrain;

        if (room.controller && room.controller.my)
            return;

        delete roomMemory.demolish;

        if (!isInDanger && room.controller)
        {
            let demolishable = _.find(room.structures.all, st => st.isDemolishable() && st.killOnSight());
            let demolish = !!demolishable;

            if (demolish)
            {
                console.log('*****************Room_Updater.updateHostiles - ' + room.name + ' - want to demolish ' + JSON.stringify(demolishable) + ' ! *****************');
                roomMemory.demolish = 1;
            }
            else
            {
                delete roomMemory.controllerBlocked;
                delete roomMemory.maxDemo;
                let loot = !!_.find(room.structures.all, st => st.isLootable());
                //let loot = !!_.find(room.structures.all, o => o.store && o.store.getUsedCapacity() > 0);
                if (!loot)
                    loot = !!_.find(room.find(FIND_RUINS), o => o.store.getUsedCapacity() > 0);

                if (loot)
                    roomMemory.loot = 1;
            }
        }
    }

    updateFlags(room, roomMemory)
    {
        if (!room)
            return;

        if (this.wantToRescue(room, roomMemory))
            room.controller.pos.createFlag('rescue_' + room.name);
        else if (Game.flags['rescue_' + room.name])
            Game.flags['rescue_' + room.name].remove();
    }

    wantToRescue(room, roomMemory)
    {
        if (!room.controller || !room.controller.owner || room.controller.my)
            return false;

        if (!Room.trusted(room.name) && !Room.friendly(room.name))
            return false;

        if (room.spawns.length > 0 && (room.controller.level < 3 || room.towers.length > 0))
            return false;

        if (!room.constructionSites.some(s => s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_TOWER))
            return false;

        return true;
    }

    updateTerrain(room, roomMemory)
    {
        if (roomMemory.plains === undefined)
        {
            let totalSpots = 48 * 48;
            let plains = 0;
            let terrain = Game.map.getRoomTerrain(room.name);
            for (let i = 1; i < 49; ++i)
            {
                for (let j = 1; j < 49; ++j)
                {
                    if (!terrain.get(i, j))
                        plains += 1;
                }
            }

            roomMemory.plains = (plains / totalSpots).toFixed(2);
        }
    }

    updatePortals(room, roomMemory)
    {
        let portals = room.find(FIND_STRUCTURES, { filter: st => st.structureType == STRUCTURE_PORTAL });
        // if (portals.length > 0)
        //     console.log(JSON.stringify(portals))

        let interShardPortals = _.filter(portals, p => p.destination.shard);
        //let interRoomPortals = _.filter(portals, p => p.roomName);

        if (interShardPortals.length > 0)
        {
            //this.launchChildProcess('scout', 'mission_scout', { room: room.name });
            this.launchChildProcess('watch', 'mission_watch', { room: room.name });
        }
        else
        {
            this.endChildProcess('watch');
            if (!Room.isMyBase(room.name) && !Room.inDanger(room.name))
            {
                this.endChildProcess('scout');
            }
        }

        for (let portal of interShardPortals)
        {
            this.launchChildProcess(`portal_${portal.destination.shard}_${portal.destination.room}`, 'mission_portal', { room: room.name, id: portal.id, targetShard: portal.destination.shard, targetRoom: portal.destination.room });
        }
    }

    updatePowerBanks(room, roomMemory)
    {
        if (!constants.USE_POWER)
        {
            delete roomMemory.powerBanks;
            return;
        }

        let powerBanks = room.find(FIND_STRUCTURES, { filter: st => st.structureType == STRUCTURE_POWER_BANK });
        if (powerBanks.length > 0)
        {
            for (let powerBank of powerBanks)
            {
                this.launchChildProcess(`powerBank_${powerBank.id}`, 'mission_powerBank', { room: room.name, t: powerBank.id, x: powerBank.pos.x, y: powerBank.pos.y, r: powerBank.pos.roomName });
                // Force creation of powerBank memory data
                let powerBankMemory = powerBank.memory;
                powerBankMemory.hits = powerBank.hits;
                powerBankMemory.ttd = powerBank.ticksToDecay;

                let ticksToDestroy = powerBank.ticksToDestroy.toFixed(0);
                room.visual.text(ticksToDestroy, powerBank.pos.x, powerBank.pos.y + .2, {opacity: 0.5});
            }
        }
        else
        {
            delete roomMemory.powerBanks;
        }
    }

    updateDeposits(room, roomMemory)
    {
        if (!constants.USE_FACTORY)
        {
            delete roomMemory.powerBanks;
            return;
        }

        let deposits = room.find(FIND_DEPOSITS);
        if (deposits.length > 0)
        {
            //console.log('Room_Highway.run - ' + room.name + ' - found ' + deposits.length + ' deposits');
            for (let deposit of deposits)
            {
                // Force creation of deposit memory data
                let depositMemory = deposit.memory;
                depositMemory.ttd = deposit.ticksToDecay;
                depositMemory.lcd = deposit.lastCooldown;
            }
        }
        else
        {
            delete roomMemory.deposits;
        }
    }

    updateCaravansSeason4(room, roomMemory)
    {
        let caravanCreeps = room.find(FIND_HOSTILE_CREEPS, { filter: c => c.owner.username == 'Screeps' });
        if (caravanCreeps.length > 0)
        {
            console.log('Room_Updater.updateCaravansSeason4 - ' + room.name + ' - found caravan of ' + caravanCreeps.length);

            let caravanPositions = caravanCreeps.map(c => c.pos);
            let caravanX = caravanPositions.map(p => p.x);
            let caravanY = caravanPositions.map(p => p.y);
            let minX = _.min(caravanX);
            let minY = _.min(caravanY);
            let maxX = _.max(caravanX);
            let maxY = _.max(caravanY);
            let goingNorth = false;
            let goingEast = false;
            let goingSouth = false;
            let goingWest = false;
            let caravanMemory = roomMemory.caravan4;

            if (caravanMemory)
            {
                if (minX < caravanMemory.minX)
                    goingWest = true;
                if (minY < caravanMemory.minY)
                    goingNorth = true;
                if (maxX > caravanMemory.maxX)
                    goingEast = true;
                if (maxY > caravanMemory.maxY)
                    goingSouth = true;

                let nsIndex = room.name.indexOf('N');
                if (nsIndex < 0)
                    nsIndex = room.name.indexOf('S');

                let ewPart = room.name.substring(0, nsIndex);
                let nsPart = room.name.substring(nsIndex);

                let ewNumber = parseInt(ewPart.match(/\d+/g));
                let nsNumber = parseInt(nsPart.match(/\d+/g));

                let ewTarget = ewNumber;
                let nsTarget = nsNumber;

                let ew = ewPart[0];
                let ns = nsPart[0];

                if (Room.isEastWestHighwayRoom(room.name))
                {
                    if (goingEast)
                    {
                        if (ew == 'E')
                            ewTarget = Math.ceil(ewNumber / 10) * 10;
                        if (ew == 'W')
                            ewTarget = Math.floor(ewNumber / 10) * 10;
                    }
                    if (goingWest)
                    {
                        if (ew == 'E')
                            ewTarget = Math.floor(ewNumber / 10) * 10;
                        if (ew == 'W')
                            ewTarget = Math.ceil(ewNumber / 10) * 10;
                    }
                }

                if (Room.isNorthSouthHighwayRoom(room.name))
                {
                    if (goingNorth)
                    {
                        if (ns == 'N')
                            nsTarget = Math.ceil(nsNumber / 10) * 10;
                        if (ns == 'S')
                            nsTarget = Math.floor(nsNumber / 10) * 10;
                    }
                    if (goingSouth)
                    {
                        if (ns == 'N')
                            nsTarget = Math.floor(nsNumber / 10) * 10;
                        if (ns == 'S')
                            nsTarget = Math.ceil(nsNumber / 10) * 10;
                    }
                }

                let targetRoom = ew + ewTarget + ns + nsTarget;
                if (targetRoom != room.name)
                {
                    let source = new RoomPosition(25, 25, room.name).toWorldPosition();
                    let destination = new RoomPosition(25, 25, targetRoom).toWorldPosition();

                    let distance = source.getManhattanDist(destination);
                    let time = distance * 2;

                    let message = 'Room_Updater.updateCaravansSeason4 - ' + room.name + ' - caravan projected target: ' + targetRoom + ' in ' + time + ' ticks';

                    console.log(message);
                    Game.notify(message, 0);

                    this.launchChildProcess(`caravan_deliver_${targetRoom}`, 'mission_caravan_deliver', { room: targetRoom });

                    let missionInfo = { type: 'caravan_deliver', room: targetRoom };
                    let missionMemory = Mission_Creeps.getMemory(missionInfo);
                    missionMemory.expireTime = Game.time + time + 100;

                    let acceptedResources = {};

                    for (let creep of caravanCreeps)
                    {
                        let acceptedResource = _.first(Object.keys(creep.store));
                        let acceptedAmount = creep.store.getFreeCapacity();

                        acceptedResources[acceptedResource] = (acceptedResources[acceptedResource] || 0) + acceptedAmount;
                    }

                    missionMemory.accepts = acceptedResources;
                }

                
            }

            roomMemory.caravan4 = { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
        }
        else
        {
            delete roomMemory.caravan4;
        }
    }

    updateReactorsSeason5(room, roomMemory)
    {
        if (!room.reactor)
        {
            delete roomMemory.reactor;
            return;
        }
        
        if (!roomMemory.reactor)
        {
            roomMemory.reactor = {};
            roomMemory.reactor.x = room.reactor.pos.x;
            roomMemory.reactor.y = room.reactor.pos.y;
        }

        if (room.reactor.owner)
            roomMemory.reactor.o = room.reactor.owner.username;
        else
            delete roomMemory.reactor.o;

        roomMemory.reactor.thorium = room.reactor.store.getUsedCapacity(RESOURCE_THORIUM);

        roomMemory.reactor.ct = Game.time;
    }

    updateThoriumSeason5(room, roomMemory)
    {
        if (!room.thorium || !room.thorium.memory)
            return;

        room.thorium.memory.amount = room.thorium.mineralAmount;
    }

    updateMapVisuals(roomName, room, roomMemory)
    {
        if (Room.shouldIgnore(roomName))
        {
            Game.map.visual.line(new RoomPosition(0,  0, roomName), new RoomPosition(49, 49, roomName), {opacity: 0.5, color: '#ffffff', width: 1});
            Game.map.visual.line(new RoomPosition(0, 49, roomName), new RoomPosition(49,  0, roomName), {opacity: 0.5, color: '#ffffff', width: 1});
        }
        if (Room.wantToClaim(roomName))
        {
            Game.map.visual.circle(new RoomPosition(25, 25, roomName), {fill: 'transparent', radius: 25, stroke: constants.PART_COLORS[CLAIM]});
        }

        if (roomMemory.sources)
        {
            Game.map.visual.text(Object.keys(roomMemory.sources).length, new RoomPosition(5, 5, roomName), {stroke: '#000000', color: '#FFFF00', fontSize: 8});
        }

        if (roomMemory.mineral)
        {
            Game.map.visual.text(roomMemory.mineral.type, new RoomPosition(10, 5, roomName), {stroke: '#000000', color: '#c0c0c0', fontSize: 8});
        }

        if (roomMemory.demolish)
        {
            Game.map.visual.rect(new RoomPosition(2, 2, roomName), 46, 46, {fill: 'transparent', stroke: '#ffe56d', strokeWidth: 1});
        }

        if (roomMemory.score)
        {
            let valueDisplayX = 49;
            let valueDisplayY = 45;

            let totalSize = 8;
            let partSize = 3;

            if (roomMemory.score.total)
            {
                Game.map.visual.text(roomMemory.score.total.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffffff', fontSize: totalSize, align: 'right'});
                valueDisplayY -= (totalSize + 1);
            }

            if (Game.flags.draw)
            {
                if (roomMemory.score.s)
                {
                    Game.map.visual.text(roomMemory.score.s.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffe56d', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
                
                if (roomMemory.score.m)
                {
                    Game.map.visual.text(roomMemory.score.m.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffffff', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
    
                if (roomMemory.score.ns)
                {
                    Game.map.visual.text(roomMemory.score.ns.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffe56d', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
                
                if (roomMemory.score.nm)
                {
                    Game.map.visual.text(roomMemory.score.nm.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffffff', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
                
                if (roomMemory.score.hw)
                {
                    Game.map.visual.text(roomMemory.score.hw.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ff7f7f', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
    
                if (roomMemory.score.t)
                {
                    Game.map.visual.text(roomMemory.score.t.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#7fff7f', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
    
                if (roomMemory.score.pl)
                {
                    Game.map.visual.text(roomMemory.score.pl.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffffff', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
    
                if (roomMemory.score.pb)
                {
                    Game.map.visual.text(roomMemory.score.pb.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffffff', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
    
                if (roomMemory.score.pf)
                {
                    Game.map.visual.text(roomMemory.score.pf.toFixed(2),  new RoomPosition(valueDisplayX, valueDisplayY, roomName), {stroke: '#000000', color: '#ffffff', fontSize: partSize, align: 'right'});
                    valueDisplayY -= (partSize + 1);
                }
            }
        }

        if (roomMemory.attackScore)
        {
            let valueDisplayPos = new RoomPosition(49, 5, roomName);
            Game.map.visual.text(roomMemory.attackScore.toFixed(2), valueDisplayPos, {stroke: '#000000', color: '#ff0000', fontSize: 8, align: 'right'});
        }

        if (room)
        {
            let baseMemory = Room.getBaseMemory(roomName)
            if (baseMemory)
            {
                Game.map.visual.text((baseMemory.spawnTimeUsed * 100).toFixed(0) + '%', new RoomPosition(0, 45, roomName), { color: '#00ff00', fontSize: 8, align: 'left' });

                let desiredEnergyAmount = Room.getDesiredResourceAmount(roomName, RESOURCE_ENERGY);
                let energyAmount = Room.getStoredResourceAmount(roomName, RESOURCE_ENERGY);
                let energyPercent = (energyAmount / (desiredEnergyAmount || 1) * 100).toFixed(0);
                Game.map.visual.text(energyPercent + '%', new RoomPosition(0, 38, roomName), {stroke: '#000000', color: '#FFFF00', fontSize: 8, align: 'left' });

                if (baseMemory.combatBoostAmount)
                {
                    let combatBoostAmountDisplayValue = (baseMemory.combatBoostAmount * 100).toFixed(0) + '%'
                    if (baseMemory.canAttack)
                        combatBoostAmountDisplayValue += ' 🗡️';

                    Game.map.visual.text(combatBoostAmountDisplayValue, new RoomPosition(0, 31, roomName), {stroke: '#000000', color: '#FF0000', fontSize: 8, align: 'left' });
                }

                let controller = room.controller;
                let controllerLevel = controller.level;
                if (controller.progressTotal)
                    controllerLevel = (controllerLevel + (controller.progress / controller.progressTotal)).toFixed(2);
                Game.map.visual.text(controllerLevel, new RoomPosition(49, 5, roomName), {stroke: '#000000', color: '#ffffff', fontSize: 8, align: 'right'});
                if (baseMemory.shipTarget)
                {
                    let shipTargetCenter = new RoomPosition(25, 25, baseMemory.shipTarget);
                    Game.map.visual.line(new RoomPosition(25, 25, roomName), shipTargetCenter, {color: '#ffff00', lineStyle: 'dashed'});
                    Game.map.visual.circle(shipTargetCenter, {radius: 5, fill: '#ffff00', opacity: 0.25});
                }

                if (baseMemory.terminal && baseMemory.terminal.sent)
                {
                    let sentInfo = baseMemory.terminal.sent;
                    let targetCenter = new RoomPosition(25, 25, sentInfo.to);
                    let startCenter = new RoomPosition(25, 25, roomName);
                    let midPoint = WorldPosition.midPointRoomPosition(startCenter, targetCenter, 0.9);

                    Game.map.visual.line(startCenter, targetCenter, {color: '#ffffff', lineStyle: 'dashed'});
                    Game.map.visual.circle(targetCenter, {radius: 5, fill: '#ffffff', opacity: 0.25});

                    Game.map.visual.text(sentInfo.r, midPoint, {stroke: '#000000', color: '#ffffff', fontSize: 4});
                }
            }
        }
    }
}

module.exports = Room_Updater;
