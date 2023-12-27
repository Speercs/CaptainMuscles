'use strict'

const constants = require('constants');

class Empire extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        global.empire = this;
        //console.log('Empire.constructor - executing');
    }

    refresh()
    {
        super.refresh();

        if (!Memory.empire)
        {
            Memory.empire = { startTick: Game.time };
        }

        this.memory = Memory.empire;
    }

    start()
    {
        super.start();

        this.launchChildProcess(`construction`, 'empire_construction');
        this.launchChildProcess(`accounting`,   'empire_accounting');
        this.launchChildProcess(`market`,       'empire_market');
        this.launchChildProcess(`flags`,        'empire_flags');
        this.launchChildProcess(`diplomacy`,    'empire_diplomacy');
        this.launchChildProcess(`warfare`,      'empire_warfare');
        this.launchChildProcess(`powerCreeps`,  'empire_powerCreeps');

        this.launchChildProcess(`swc_allies`,   'empire_swc_allies');

        this.launchChildProcess(`clean_creep_memory`, 'clean_creep_memory');
        this.launchChildProcess(`clean_flag_memory`, 'clean_flag_memory');
        this.launchChildProcess(`clean_room_memory`, 'clean_room_memory');
        this.launchChildProcess('room_updater', 'room_updater');

        this.launchChildProcess(`stats`,       'empire_stats');

        const bases = Room.getMyBases();

        for (let base of bases)
            this.launchChildProcess(`base_${base.name}`, 'base', { room: base.name });
    }

    run()
    {
        super.run();
        //console.log('Empire.run - executing');

        this.countTicks();

        this.launchChildProcess(`diplomacy`,    'empire_diplomacy');
        this.launchChildProcess(`warfare`,      'empire_warfare');
        this.launchChildProcess(`swc_allies`,   'empire_swc_allies');
        this.launchChildProcess(`powerCreeps`,  'empire_powerCreeps');

        this.launchChildProcess('room_updater', 'room_updater');
        this.launchChildProcess(`stats`,        'empire_stats');

        this.launchChildProcess(`clean_flag_memory`, 'clean_flag_memory');

        //this.checkShards();
        if (constants.AUTO_CLAIM && Game.time % 10 == 1)
            this.manageClaims();

        const bases = Room.getMyBases();
        let memoryBaseCount = (this.memory.baseCount || 0);
        let baseCountChanged = (memoryBaseCount != bases.length);

        //console.log('Empire.run - base count changed: ' + baseCountChanged + ', base.length: ' + bases.length + ', memory.bases.length: ' + memoryBaseCount);

        for (let baseName in this.memory.bases)
        {
            let baseMemory = this.memory.bases[baseName];
            if (baseCountChanged)
                baseMemory.baseCountChanged = 1;
        }

        if (baseCountChanged)
        {
            for (let base of bases)
                this.launchChildProcess(`base_${base.name}`, 'base', { room: base.name });

            for (let roomName in Memory.rooms)
            {
                delete Memory.rooms[roomName].nearestBase;
                Room.getNearestBase(roomName);
            }

            this.memory.baseCount = bases.length;
        }
    }

    countTicks()
    {
        //if (!this.memory.ticksToLevel)
            this.memory.ticksToLevel = {};

        if (!this.memory.ticksToLevel[Game.gcl.level])
        {
            let ticksToLevelInfo = { time: Game.time, age: 0 };
            let prevLevel = Game.gcl.level - 1;
            if (prevLevel > 0 && this.memory.ticksToLevel[prevLevel] && this.memory.ticksToLevel[prevLevel].time)
                ticksToLevelInfo.age = Game.time - this.memory.ticksToLevel[prevLevel].time;

            this.memory.ticksToLevel[Game.gcl.level] = ticksToLevelInfo;
        }
    }

    checkShards()
    {
        let thisShard = Game.shard.name;

        global.shardMemory[thisShard].heartbeat = Game.time;

        if (!this.memory.shards)
        {
            this.memory.shards = {};
            this.memory.shards.status = {};
        }

        this.checkShardStatus('shard0');
        this.checkShardStatus('shard1');
        this.checkShardStatus('shard2');
        this.checkShardStatus('shard3');
    }

    checkShardStatus(shardName)
    {
        if (!global.shardMemory[shardName])
            return;

        if (shardName != Game.shard.name)
        {
            let now = Game.time;
            let otherShardMemory = global.shardMemory[shardName];

            if (!otherShardMemory.heartbeat)
            {
                this.memory.shards.status[shardName] = { status: 'dead', hbh: now };
            }
            else if (this.memory.shards.status[shardName] && this.memory.shards.status[shardName].hbt == otherShardMemory.heartbeat)
            {
                if (now - this.memory.shards.status[shardName].hbh >= 100)
                    this.memory.shards.status[shardName].status = 'dead';
                else
                    this.memory.shards.status[shardName].status = 'alive';
            }
            else
            {
                this.memory.shards.status[shardName] = { status: 'alive', hbh: now, hbt: otherShardMemory.heartbeat };
            }
        }


        // else
        // {
        //     let thisShardMemory = global.shardMemory[shardName];
        //     let shardCpuLimit = Game.cpu.shardLimits[Game.shard.name];
        //     let totalCpuLimit = _.sum(Game.cpu.shardLimits);
        //
        //     thisShardMemory.name = shardName;
        //
        //     thisShardMemory.baseCount = Room.getMyBases().length;
        //     thisShardMemory.desiredBaseCount = Game.gcl.level * (shardCpuLimit / totalCpuLimit);
        //
        //     let shardsAvailable = _.filter(global.shardMemory, mem => mem.name && /*mem.name != 'shard1' &&*/ mem.name != 'shard2' && (mem.name == shardName || (this.memory.shards.status[mem.name] && this.memory.shards.status[mem.name].status == 'alive')) && !_.isUndefined(mem.baseCount));
        //     if (shardsAvailable.length > 0)
        //     {
        //         for (let availableShardName in shardsAvailable)
        //         {
        //             let availableShardMemory = shardsAvailable[availableShardName];
        //             console.log(availableShardMemory.name + ' - ' + (availableShardMemory.baseCount / availableShardMemory.desiredBaseCount));
        //         }
        //
        //
        //         let nextBaseShard = _.min(shardsAvailable, mem => (mem.baseCount / mem.desiredBaseCount));
        //         if (/*Game.shard.name != 'shard1' &&*/ Game.shard.name != 'shard2' && (thisShardMemory.baseCount / thisShardMemory.desiredBaseCount) == (nextBaseShard.baseCount / nextBaseShard.desiredBaseCount))
        //         {
        //             console.log('Empire.checkShardStatus - ' + nextBaseShard.name + ' - getting checked by ' + Game.shard.name);
        //             this.pickNextClaim();
        //         }
        //         else if (this.memory.nextClaim)
        //         {
        //             this.endChildProcess(`claim_${this.memory.nextClaim}`);
        //             delete this.memory.nextClaim;
        //         }
        //     }
        //     // let nextBaseShard = _.min(global.shardMemory, mem => mem.)
        // }
    }

    manageClaims()
    {
        let oldNextClaim = this.memory.nextClaim;

        for (let roomName in Memory.rooms)
            Memory.rooms[roomName].name = roomName;

        let bases = Room.getMyBases();
        let gclFull = (bases.length >= Game.gcl.level);
        
        let basesUnder6 = _.filter(bases, b => b.controller.level < 6 || !b.terminal || !b.terminal.my);
        let haveBasesUnder6 = (basesUnder6.length > 0);

        let basesUnclaiming = _.filter(bases, b => Room.isUnclaiming(b.name));
        let haveBasesUnclaiming = (basesUnclaiming.length > 0);

        let basesUnder6PlusExtraGcl = basesUnder6.length + Game.gcl.level - bases.length;
        let desiredStripMines = Math.floor(Game.gcl.level / 3);

        let wantToUnclaim = ((constants.SEASON_FIVE_ACTIVE && Game.gcl.level > 5 && basesUnder6PlusExtraGcl < desiredStripMines) ||
                             (Game.gcl.level >= 10 && gclFull && !haveBasesUnder6 && !haveBasesUnclaiming));

        let wantToClaim = (bases.length < Game.gcl.level);

        if (constants.SEASON_FIVE_ACTIVE)
        {
            console.log('Program_Empire.manageClaims - gcl: ' + Game.gcl.level + ', basesUnder6PlusExtraGcl: ' + basesUnder6PlusExtraGcl + ', desiredStripMines: ' + desiredStripMines);
        }

        if (wantToUnclaim)
        {
            if (constants.AUTO_UNCLAIM)
            {
                let unclaimableBases = _.filter(bases, b => b.controller.level >= 6 && b.terminal && Room.getMemory(b.name));
                console.log('Program_Empire.manageClaims - base count: ' + bases.length + ', unclaimable base count: ' + unclaimableBases.length);
                if (constants.SEASON_FIVE_ACTIVE)
                    unclaimableBases = _.filter(unclaimableBases, b => !b.thorium || this.getProximityToCoreRoom(b.name) > 3 || b.sources.length < 2);

                if (unclaimableBases.length > 0)
                {
                    let unclaimableBaseNames = unclaimableBases.map(b => b.name);
                    console.log('Program_Empire.manageClaims - unclaimable bases: ' + unclaimableBaseNames);
                    let unclaimableBaseScores = unclaimableBases.map(b => Room.getMemory(b.name).score.total);
                    console.log('Program_Empire.manageClaims - unclaimable base scores: ' + unclaimableBaseScores);

                    let worstBase = _.min(unclaimableBases, b => Room.getMemory(b.name).score.total);

                    console.log('Program_Empire.manageClaims - want to unclaim: ' + worstBase.name);
                    console.log('Program_Empire.manageClaims - want to unclaim: ' + worstBase.name + ' - ' +  Room.getMemory(worstBase.name).score);
                    if (constants.AUTO_UNCLAIM_REALLY && (!worstBase.mineral.mineralAmount || Room.getResourceAmountLevel(worstBase.name, worstBase.mineral.mineralType) > constants.RESOURCE_LEVEL_NORMAL))
                        this.abandonWorstBase(worstBase);
                }
            }
        }

        this.memory.desiredRoom = this.selectNextClaim();

        if (!wantToClaim)
            return;
        
        if (!this.memory.desiredRoom)
            return;

        if (gclFull)
            return;
    
        if (!constants.SEASON_FIVE_ACTIVE)
        {
            let immatureBase = _.find(bases, b => b.controller.level < 3 || b.energyCapacityAvailable < (BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]));
            if (immatureBase)
                return;
        }

        if (!constants.AUTO_CLAIM_REALLY)
            return;

        if (this.memory.nextClaim)
        {
            let claimSame = this.memory.nextClaim == this.memory.desiredRoom;
            let oldClaimFlag = Game.flags['claim_' + this.memory.nextClaim];
            if (claimSame && oldClaimFlag)
                return;

            if (!claimSame && oldClaimFlag)
                return;
        }

        this.memory.nextClaim = this.memory.desiredRoom;

        //console.log('Empire.pickNextClaim - ' + Game.shard.name + ' picking ' + nextClaim);

        // if (Game.rooms[nextClaim])
        // {
        //     let nextClaimMemory = Room.getMemory(nextClaim);
        //     let flagPos = new RoomPosition(nextClaimMemory.controller.x, nextClaimMemory.controller.y, nextClaim);
        //     flagPos.createFlag('claim_' + nextClaim);
        // }
    }

    selectNextClaim()
    {
        let centerPos = new RoomPosition(0, 0, 'E0S0').wpos;

        let claimableRoomScores = this.scoreRooms(centerPos, []);

        this.memory.claimPriorities = [];

        if (claimableRoomScores.length <= 0)
        {
            console.log('Empire.selectNextClaim - ' + Game.shard.name + ' no claimable rooms found');
            return;
        }

        let bestClaimable = _.max(claimableRoomScores, o => o.s);
        this.memory.claimPriorities.push(bestClaimable.rm.name);

        console.log('Empire.selectNextClaim - ' + Game.shard.name + ' want to claim ' + bestClaimable.rm.name + ' - score: ' + bestClaimable.s);

        while (bestClaimable.rm.controller.o && claimableRoomScores.length > 0)
        {
            claimableRoomScores = this.scoreRooms(centerPos, this.memory.claimPriorities);
            if (claimableRoomScores.length <= 0)
            {
                console.log('Empire.selectNextClaim - ' + Game.shard.name + ' no claimable rooms found');
                return;
            }

            bestClaimable = _.max(claimableRoomScores, o => o.s);
            this.memory.claimPriorities.push(bestClaimable.rm.name);

            console.log('Empire.selectNextClaim - ' + Game.shard.name + ' want to claim ' + bestClaimable.rm.name + ' - score: ' + bestClaimable.s);
        }

        return bestClaimable.rm.name;
    }

    scoreRooms(focalPoint, ignoreList)
    {
        let availableRoomMemories = _.filter(Memory.rooms, mem => mem.controller && !ignoreList.includes(mem.name));
        let claimableRoomScores = [];

        for (let roomMemory of availableRoomMemories)
        {
            let roomName = roomMemory.name;
            let score = this.scoreRoom(roomName, roomMemory, focalPoint);
            roomMemory.score = score;

            if (!Room.isMyBase(roomName))// && !Room.isEnemyBase(roomName) && !Room.isReservedByEnemy(roomName))
                claimableRoomScores.push({ rm: roomMemory, s: score.total });
        }

        return claimableRoomScores;
    }

    abandonWorstBase(worstBase)
    {
        let unclaimFlagName = 'unclaim_' + worstBase.name;
        let unclaimFlag = Game.flags[unclaimFlagName];
        if (unclaimFlag)
            return;

        worstBase.controller.pos.createFlag(unclaimFlagName);
    }

    pickNextClaim()
    {

    }

    scoreRoom(roomName, roomMemory, focalPoint)
    {
        if (constants.SEASON_FIVE_ACTIVE)
            return this.scoreRoomSeason5(roomName, roomMemory, focalPoint);
        
        return this.scoreRoomMMO(roomName, roomMemory, focalPoint);
    }

    scoreRoomMMO(roomName, roomMemory, focalPoint)
    {
        let score = { total: 0.0 };
        if (!roomMemory.plains)
            return score;

        //if (roomMemory.controller.o && roomMemory.controller.o != ME)
        //    return score;

        let bases = Room.getMyBases();
        let farthestBase = null;
        let nearestBase = null;
        let farthestBaseDistance = -Infinity;
        let nearestBaseDistance = Infinity;
        let proximityToBases = 0;

        for (let base of bases)
        {
            let distance = global.realDistanceBetweenRooms(roomName, base.name) + 1;
            if (distance > farthestBaseDistance)
                farthestBaseDistance = distance;
            if (distance < nearestBaseDistance)
                nearestBaseDistance = distance;
        }

        // if (nearestBaseDistance > global.MAX_REMOTE_RANGE)
        //     return score;
        
        for (let base of bases)
        {
            let distance = global.realDistanceBetweenRooms(roomName, base.name);
            proximityToBases += 1 - (distance / farthestBaseDistance);
        }

        let sourceCount = 0;
        let mineralValue = 0;
        let neighborSourceCount = 0;
        let neighbourMineralValue = 0;
        let highwayCount = 0;
        let proximityToCenter = 0;
        

        if (roomMemory.sources)
            sourceCount = Object.keys(roomMemory.sources).length;

        if (sourceCount <= 1)
            return score;

        if (roomMemory.mineral && roomMemory.mineral.type)
            mineralValue += this.getMineralValue(roomMemory.mineral.type);

        let roomStatus = Game.map.getRoomStatus(roomName);
        //let potentialRemotes = Room.getRoomNamesInRangeFloodFillFiltered(roomName, 2, o => Memory.rooms[o.name] && (!Memory.rooms[o.name].controller || !Memory.rooms[o.name].controller.o || Memory.rooms[o.name].controller.o == ME), false, false);
        //let potentialRemotes = Room.getRoomNamesInRangeFloodFillFiltered(roomName, 1, o => true, true, true);
        let potentialRemotes = Room.getRoomNamesInRangeFloodFillFiltered(roomName, 2, o => true, true, true);

        for (let nextEntry of potentialRemotes)
        {
            let remoteRoomName = nextEntry.name;

            // if (Room.trusted(remoteRoomName))
            //     return 0;

            if (roomName == remoteRoomName)
                continue;

            //let remoteRoomName = roomExits[direction];
            let neighborRoomMemory = Room.getMemory(remoteRoomName);

            if (!neighborRoomMemory)
                continue;

            let multiplier = 1;
            if (neighborRoomMemory.controller && neighborRoomMemory.controller.o && neighborRoomMemory.controller.o != ME)
                multiplier = 0.5;
            if (neighborRoomMemory.controller && neighborRoomMemory.controller.r && neighborRoomMemory.controller.r != ME)
                multiplier = 0.75;

            let roomDistance = global.realDistanceBetweenRooms(roomName, remoteRoomName);

            if (Room.isHighwayRoom(remoteRoomName))
            {
                if (constants.USE_POWER || constants.USE_FACTORY)
                    highwayCount += (1 / roomDistance) * multiplier;
            }
            else if (Room.isCenterRoom(remoteRoomName))
            {
                neighborSourceCount += (2 / roomDistance) * multiplier;
                if (neighborRoomMemory.mineral && neighborRoomMemory.mineral.type)
                    neighbourMineralValue += (this.getMineralValue(neighborRoomMemory.mineral.type) / roomDistance) * multiplier;

            }
            else if (neighborRoomMemory.sources)
            {
                neighborSourceCount += (Object.keys(neighborRoomMemory.sources).length / roomDistance) * multiplier;
            }
        }

        //console.log('Empire.scoreRoom - score.total: ' + score.total + ', sourceCount: ' + sourceCount + ', mineralValue: ' + mineralValue + ', neighborSourceCount: ' + neighborSourceCount + ', neighbourMineralValue: ' + neighbourMineralValue + ', highwayCount: ' + highwayCount + ', roomMemory.plains: ' + roomMemory.plains);

        let farthestPos = new RoomPosition(0, 0, 'W60N60').wpos;
        let centerPos = new RoomPosition(0, 0, 'E0S0').wpos;
        let farthestDistance = farthestPos.getRangeTo(centerPos);

        let thisRoomDistance = new RoomPosition(25, 25, roomName).wpos.getRangeTo(focalPoint);
        proximityToCenter = 1 - (thisRoomDistance / farthestDistance);
        //console.log('Empire.scoreRoom - farthestDistance: ' + farthestDistance + ', thisRoomDistance: ' + thisRoomDistance + ', proximityToCenter: ' + proximityToCenter);

        score.s = (sourceCount * 2);
        score.m = (mineralValue * 4);
        score.ns = (neighborSourceCount);
        score.nm = (neighbourMineralValue * 2);
        score.hw = (highwayCount);
        score.pl = parseFloat(roomMemory.plains);
        score.pb = parseFloat(((proximityToBases / bases.length) * 4).toFixed(2));
        score.pf = parseFloat((proximityToCenter * 4).toFixed(2));

        score.total = score.s + score.m + score.ns + score.nm + score.hw + score.pl + score.pb + score.pf;
        score.total = parseFloat(score.total.toFixed(2));

        // if (roomMemory.plains)
        //     score.total *= roomMemory.plains;
            
        //if (roomMemory.controller && roomMemory.controller.r && roomMemory.controller.r != ME)
        //    score.total *= 0.5;

        return score;
    }

    scoreRoomSeason5(roomName, roomMemory, focalPoint)
    {
        let score = { total: 0.0 };
        if (!roomMemory.plains)
            return score;

        let bases = Room.getMyBases();
        let farthestBase = null;
        let nearestBase = null;
        let farthestBaseDistance = -Infinity;
        let nearestBaseDistance = Infinity;
        let proximityToBases = 0;

        for (let base of bases)
        {
            let distance = global.realDistanceBetweenRooms(roomName, base.name) + 1;
            if (distance > farthestBaseDistance)
                farthestBaseDistance = distance;
            if (distance < nearestBaseDistance)
                nearestBaseDistance = distance;
        }

        // if (nearestBaseDistance > global.MAX_REMOTE_RANGE)
        //     return score;
        
        for (let base of bases)
        {
            let distance = global.realDistanceBetweenRooms(roomName, base.name);
            proximityToBases += 1 - (distance / farthestBaseDistance);
        }

        let sourceCount = 0;
        let mineralValue = 0;
        let neighborSourceCount = 0;
        let neighbourMineralValue = 0;
        let thoriumValue = 1;

        if (roomMemory.sources)
            sourceCount = Object.keys(roomMemory.sources).length;

        if (sourceCount <= 1)
            return score;

        if (roomMemory.mineral && roomMemory.mineral.type)
            mineralValue += this.getMineralValue(roomMemory.mineral.type) * ((roomMemory.mineral.amount || 0) / 100000);

        if (roomMemory.thorium && roomMemory.thorium.amount)
            thoriumValue += (roomMemory.thorium.amount / 100000) * 4;

        let roomStatus = Game.map.getRoomStatus(roomName);
        let potentialRemotes = Room.getRoomNamesInRangeFloodFillFiltered(roomName, 2, o => true, true, true);

        for (let nextEntry of potentialRemotes)
        {
            let remoteRoomName = nextEntry.name;

            if (roomName == remoteRoomName)
                continue;

            let neighborRoomMemory = Room.getMemory(remoteRoomName);

            if (!neighborRoomMemory)
                continue;

            let multiplier = 1;
            if (neighborRoomMemory.controller && neighborRoomMemory.controller.o && neighborRoomMemory.controller.o != ME)
                multiplier = 0.5;
            if (neighborRoomMemory.controller && neighborRoomMemory.controller.r && neighborRoomMemory.controller.r != ME)
                multiplier = 0.75;

            let roomDistance = global.realDistanceBetweenRooms(roomName, remoteRoomName);

            if (Room.isCenterRoom(remoteRoomName))
            {
                neighborSourceCount += (2 / roomDistance) * multiplier;
                if (neighborRoomMemory.mineral && neighborRoomMemory.mineral.type)
                    neighbourMineralValue += (this.getMineralValue(neighborRoomMemory.mineral.type) / roomDistance) * multiplier;

            }
            else if (neighborRoomMemory.sources)
            {
                neighborSourceCount += (Object.keys(neighborRoomMemory.sources).length / roomDistance) * multiplier;
            }
        }

        //console.log('Program_Empire.scoreRoomSeason5 - ' + roomName + ' - sourceCount: ' + sourceCount + ', mineralValue: ' + mineralValue + ', neighborSourceCount: ' + neighborSourceCount + ', thoriumValue: ' + thoriumValue);

        score.s = (sourceCount * 2);
        score.m = (mineralValue * 32);
        score.ns = (neighborSourceCount);
        score.nm = (neighbourMineralValue * 8);
        score.pl = parseFloat(roomMemory.plains);
        score.t = (thoriumValue * 2);

        score.total = score.s + score.m + score.ns + score.nm + score.pl + score.t;// + proximityToBases;
        score.total = parseFloat(score.total.toFixed(2));

        //if (roomMemory.controller && roomMemory.controller.r && roomMemory.controller.r != ME)
        //    score.total *= 0.5;

        return score;
    }

    getMineralValue(resourceType)
    {
        //if (!constants.MARKET_EXISTS)
        {
            if (this.memory.accounting && this.memory.accounting.mineralValues && this.memory.accounting.mineralValues[resourceType])
                return this.memory.accounting.mineralValues[resourceType];
        }
        //else
        //{
            // if (this.memory.market && this.memory.market.sellValues && this.memory.market.sellValues[resourceType])
            //     return this.memory.market.sellValues[resourceType];
        //}
        
        if (resourceType == RESOURCE_ENERGY)
            return 1;

        return 0;
    }

    getProximityToCoreRoom(roomName)
    {
        let parsedRoomName = /^([WE])([0-9]+)([NS])([0-9]+)$/.exec(roomName);
    
        var roomX = parseInt(parsedRoomName[2]);
        var roomY = parseInt(parsedRoomName[4]);
        var EW = parsedRoomName[1];
        var NS = parsedRoomName[3];

        return Math.abs((roomX % 10) - 5) + Math.abs((roomY % 10) - 5);
    }
}

module.exports = Empire
