'use strict'

const constants = require('constants');

let Mission_Creeps = require('program_mission_creeps');

class Mission_Portal extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        //console.log('Mission_Portal.constructor - executing ' + this.data.room);
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'portal', room: this.data.room, id: this.data.id, targetShard: this.data.targetShard, targetRoom: this.data.targetRoom });
    }

    end()
    {
        super.end();

        // Just flush it and let it be rebuild by remaining portals
        let thisShardMemory = global.shardMemory[Game.shard.name];
        if (thisShardMemory && thisShardMemory.portalInfo)
            thisShardMemory.portalInfo = {};
    }

    run()
    {
        super.run();
        //console.log('Mission_Portal.run - ' + this.data.room + ' - executing');
    }

    updateInfo()
    {
        super.updateInfo();

        //console.log('Mission_Portal.updateInfo - ' + this.data.room + ' - executing');
        this.memory.remote = 1;

        this.prepNewArrivals();
        this.requestHelp();
    }

    getDesiredSpawn()
    {
        delete this.memory.desiredSpawn;
        delete this.memory.targetDesiredSpawns;
        return null;

        let targetShardStatus = global.shardStatus(this.data.targetShard);
        //console.log('Mission_Portal.updateInfo - ' + this.data.room + ' - shard: ' + this.data.targetShard + ', status: ' + targetShardStatus);
        if (targetShardStatus == 'dead' && this.memory.creeps.length < 1)
        {
            this.memory.desiredSpawn = { utility: 0.0001, type: 'move', maxParts: 1, maxCreeps: 1 };
            return this.memory.desiredSpawn;
        }
        else if (targetShardStatus == 'alive')
        {
            let targetShardMemory = global.shardMemory[this.data.targetShard];

            if (!targetShardMemory.portalInfo)
                targetShardMemory.portalInfo = {};
            if (!targetShardMemory.portalInfo[this.data.room])
                targetShardMemory.portalInfo[this.data.room] = {};
            if (!targetShardMemory.portalInfo[this.data.room][Game.shard.name])
                targetShardMemory.portalInfo[this.data.room][Game.shard.name] = {};

            let desiredSpawns = targetShardMemory.portalInfo[this.data.room][Game.shard.name].desiredSpawns;
            this.memory.targetDesiredSpawns = desiredSpawns;
            if (!desiredSpawns || desiredSpawns.length <= 0)
                return null;

            desiredSpawns = _.sortByOrder(desiredSpawns, ds => ds.utility, 'desc');
            let creepNames = [...this.memory.creeps];
            for (let desiredSpawn of desiredSpawns)
            {
                //console.log('Mission_Portal.getDesiredSpawn - ' + this.missionKey + ' - checking desiredSpawn: ' + JSON.stringify(desiredSpawn));

                if (creepNames.length <= 0)
                {
                    //console.log('Mission_Portal.getDesiredSpawn - ' + this.missionKey + ' - selecting desiredSpawn: ' + JSON.stringify(desiredSpawn));
                    this.memory.desiredSpawn = desiredSpawn;
                    return this.memory.desiredSpawn;
                }

                let matchingCreep = _.first(creepNames, cn => Memory.creeps[cn].type == desiredSpawn.type);
                if (!matchingCreep)
                {
                    //console.log('Mission_Portal.getDesiredSpawn - ' + this.missionKey + ' - selecting desiredSpawn: ' + JSON.stringify(desiredSpawn));
                    this.memory.desiredSpawn = desiredSpawn;
                    return this.memory.desiredSpawn;
                }
                else
                {
                    creepNames.splice(creepNames.indexOf(matchingCreep), 1);
                }
            }
        }

        return null;
    }

    prepNewArrivals()
    {
        let room = Game.rooms[this.data.room];
        if (!room)
            return;

        let newArrivals = _.filter(room.find(FIND_MY_CREEPS), c => Object.keys(c.memory).length <= 0);

        for (let newCreep of newArrivals)
        {
            let partList = newCreep.body.map(p => p.type);

            let creepNameParts = newCreep.name.split("_");
            let creepMemory = { type: creepNameParts[2] };
            if (creepMemory.type == 'ranged')
                creepMemory.type = 'ranged_attack';

            creepMemory = { ...creepMemory, ..._.countBy(partList) };

            creepMemory.parts = partList.length;
            let cost = global.calculatePartListCost(partList);

            creepMemory.spawnRoom = room.name;
            creepMemory.spawnShard = creepNameParts[0];

            if (creepMemory.claim)
                creepMemory.costPerTick = cost / CREEP_CLAIM_LIFE_TIME;
            else
                creepMemory.costPerTick = cost / CREEP_LIFE_TIME;

            creepMemory.costPerTick = creepMemory.costPerTick.toFixed(2);

            creepMemory.unemployed = 1;

            newCreep.memory = creepMemory;

            //console.log(JSON.stringify(creepMemory))
        }
    }

    requestHelp()
    {
        return null;
        let thisShardMemory = global.shardMemory[Game.shard.name];

        if (!thisShardMemory.portalInfo)
            thisShardMemory.portalInfo = {};
        if (!thisShardMemory.portalInfo[this.data.targetRoom])
            thisShardMemory.portalInfo[this.data.targetRoom] = {};
        if (!thisShardMemory.portalInfo[this.data.targetRoom][this.data.targetShard])
            thisShardMemory.portalInfo[this.data.targetRoom][this.data.targetShard] = {};

        let searchRange = global.MAX_SEARCH_RANGE;
        let missionList = Object.values(Memory.missions);
        let roomNamesInRange = Room.getRoomNamesInRangeFloodFill(this.data.room, searchRange, true);

        let remoteMissionsInRange = _.filter(missionList, mission => mission.remote && mission.pid != this.memory.pid && roomNamesInRange.indexOf(mission.room) >= 0);
        let availableMissions = [];

        for (let roomName of roomNamesInRange)
        {
            let missionsInRoom = _.filter(remoteMissionsInRange, mission => mission.room == roomName);
            availableMissions = availableMissions.concat(missionsInRoom);
        }


        // if (Game.shard.name == 'shard2')
        // {
        //     let missionInfos = availableMissions.map(m => ({ r: m.room, t: m.type }));
        //     console.log('Mission_Portal.requestHelp - ' + Game.shard.name + ' - ' + this.missionKey + ' - ' + JSON.stringify(missionInfos));
        // }

        if (availableMissions.length > 0)
        {
            let desiredSpawns = [];
            for (let mission of availableMissions)
            {
                if (mission.pid == this.memory.pid)
                    continue;

                let missionProcess = kernel.scheduler.getProcessFromId(mission.pid);
                if (!missionProcess)
                {
                    console.log('Mission_Portal.requestHelp - could not get process for mission: ' + mission.type + ' - ' + mission.room);
                    continue;
                }

                if (!missionProcess.getDesiredSpawn)
                {
                    console.log('Mission_Portal.requestHelp - could not find getDesiredSpawn function for mission: ' + mission.type + ' - ' + mission.room);
                    continue;
                }

                try
                {
                    missionProcess.getDesiredSpawn();
                }
                catch (error)
                {
                    console.log('Mission_Portal.requestHelp - error calling getDesiredSpawn function for mission: ' + mission.type + ' - ' + mission.room + ' - ' + error);
                }

                if (mission.desiredSpawn)
                {
                    let desiredSpawn = { missionType: mission.type, missionRoom: mission.room, missionShard: Game.shard.name, ...mission.desiredSpawn };
                    desiredSpawns.push(desiredSpawn);
                }
            }

            thisShardMemory.portalInfo[this.data.targetRoom][this.data.targetShard].desiredSpawns = desiredSpawns;

            // if (Game.shard.name == 'shard2')
            //console.log('Mission_Portal.requestHelp - ' + Game.shard.name + ' - ' + this.missionKey + ' - ' + JSON.stringify(desiredSpawns));

            //console.log('Mission_Portal.requestHelp - ' + JSON.stringify(thisShardMemory));
        }
        else
        {
            delete thisShardMemory.portalInfo[this.data.targetRoom][this.data.targetShard].desiredSpawns;
        }
    }
}

module.exports = Mission_Portal
