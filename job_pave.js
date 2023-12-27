'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Pave extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Pave.constructor - executing');

        this.jobType = 'pave';
        this.desiredSpawnType = 'worry';
    }

    getTotalEnergyOut()
    {
        let paveKey = (this.data.source || this.data.targetRoom || this.roomName);
        let paveTime = Room.getPaveTime(this.roomName, paveKey);
        if (paveTime)
            return (_.sum(this.getCreepMemories().map(c => c.work)) || 0);

        //console.log('Job_Pave.getTotalEnergyOut - ' + this.roomName + ' - ' + paveKey + ' - no pave time found');
        return (_.sum(this.getCreepMemories().map(c => c.work)) || 0) * BUILD_POWER;
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task };
    }

    getTask(creep)
    {
        if (!this.room)
            return null;

        if (this.room.controller && !this.room.controller.my && (!this.room.controller.reservation || !this.room.controller.reservation.username == global.ME))
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        // if (creep)
        //     console.log('Job_Pave.getTask - ' + this.roomName + ' - ' + this.data.source + ' - creep correct bodytype');

        // if (creep && creep.memory.boosts)
        //     return null;

        // if (creep)
        //     console.log('Job_Pave.getTask - ' + this.roomName + ' - ' + this.data.source + ' - no creep boosts');

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return null;

        //console.log('Job_Pave.getTask - ' + this.roomName + ' - ' + this.data.source + ' - found roomMemory');

        let paveKey = (this.data.source || this.data.targetRoom || this.roomName);
        let paveTime = Room.getPaveTime(this.roomName, paveKey);

        if (paveTime)
        {
            let decayTime = ((ROAD_HITS / ROAD_DECAY_AMOUNT) * ROAD_DECAY_TIME) / 5;
            if (!Room.isMyBase(this.roomName) && roomMemory.mineral && roomMemory.mineral.id == this.data.source)
                decayTime = ((CONTAINER_HITS / CONTAINER_DECAY) * CONTAINER_DECAY_TIME) / 2;

            if (roomMemory.thorium && roomMemory.thorium.id == this.data.source)
                decayTime = ((CONTAINER_HITS / CONTAINER_DECAY) * CONTAINER_DECAY_TIME) / 5;
            // if (Room.isMyBase(this.roomName))
            //     decayTime = ((CONTAINER_HITS / CONTAINER_DECAY) * CONTAINER_DECAY_TIME_OWNED) / 2;

            // let decayTime = (CONTAINER_HITS / CONTAINER_DECAY);
            // if (!this.room || !this.room.isMyBase())
            //     decayTime *= CONTAINER_DECAY_TIME;
            // else
            //     decayTime *= CONTAINER_DECAY_TIME_OWNED;
            // decayTime /= 3;

            let remainingWaitTIme = Math.floor((paveTime + decayTime) - Game.time);
            //console.log('Job_Pave.getTask - ' + this.roomName + ' - remainingWaitTIme: ' + remainingWaitTIme);
            if (remainingWaitTIme > 0)
            {
                //console.log('Job_Pave.getTask - ' + this.roomName + ' - remainingWaitTIme');
                return null;
            }
        }

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.getCreeps().length > 0)
            return null;

        let nearestBase = Room.getNearestBase(this.roomName);
        if (!nearestBase)
            return null;

        if (nearestBase.towers.length <= 0)
            return null;

        if (nearestBase.controller.level < 3 && (!creep || !creep.memory.boosts))
            return null;

        if (!nearestBase.coreLinkPos || nearestBase.isBootstrapping())// || _.filter(nearestBase.find(FIND_MY_CONSTRUCTION_SITES), site => site.structureType != STRUCTURE_ROAD).length > 0)
            return null;

        // if (Room.getStoredResourceAmount(nearestBase.name, RESOURCE_ENERGY) < 10000)
        //     return null;

        let baseMemory = Room.getBaseMemory(nearestBase.name);
        if (!baseMemory)
            return null;

        //console.log('Job_Pave.getTask - ' + this.roomName + ' - ' + this.data.source + ' - found baseMemory');

        let alreadyHaveOne = (baseMemory.creepCounts && baseMemory.creepCounts[this.jobType] && baseMemory.creepCounts[this.jobType] >= 1);
        if (!alreadyHaveOne)
            alreadyHaveOne = nearestBase.find(FIND_MY_CREEPS).some(c => c.memory.type == this.desiredSpawnType);

        let canAffordAnother = (baseMemory.spendable > 0 && baseMemory.profitQuotient >= 1);

        if (alreadyHaveOne && !canAffordAnother)
            return null;

        //console.log('Job_Pave.getTask - ' + this.roomName + ' - ' + this.data.source + ' - has sufficient profit');

        let pathEnd;

        if (this.data.source)
        {
            if (!roomMemory.sources && !roomMemory.mineral && !roomMemory.thorium)
                return null;

            let sourceMemory = null;
            if (roomMemory.sources && roomMemory.sources[this.data.source])
            {
                sourceMemory = roomMemory.sources[this.data.source];
                if (Room.getJobCreepCount(this.roomName, 'harvest_' + this.data.source) <= 0)
                    return null;
            }

            if (roomMemory.thorium && roomMemory.thorium.id == this.data.source)
            {
                sourceMemory = roomMemory.mineral;
            }
            else if (roomMemory.mineral && roomMemory.mineral.id == this.data.source)
            {
                sourceMemory = roomMemory.mineral;
            }   

            if (!sourceMemory || (sourceMemory.l && !roomMemory.clear))
                return null;

            pathEnd = new RoomPosition(sourceMemory.x, sourceMemory.y, this.roomName);
        }

        //console.log('Job_Pave.getTask - ' + this.roomName + ' - ' + this.data.source + ' - nearestBase valid');

        if (this.data.targetRoom)
        {
            let sisterMissionKey = this.data.targetRoom + '_pave_' + this.roomName;
            let sisterMission = Memory.missions[sisterMissionKey];
            if (sisterMission)
            {
                //console.log('Mission_Pave.updateInfo - ' + this.roomName + ' - found sister mission');
                if (sisterMission.creeps.length > 0)
                {
                    console.log('Job_Pave.getTask - ' + this.roomName + ' - sister mission has creeps, no spawn desired');
                    Room.setPaveTime(this.roomName, paveKey, Game.time);
                    return null;
                }
            }

            let targetRoom = Game.rooms[this.data.targetRoom];
            pathEnd = targetRoom.coreLinkPos;
        }

        if (!this.data.source && !this.data.targetRoom)
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'pave_base', program: 'task_pave_base', data: { r: this.roomName }};

        if (!pathEnd)
            return null;

        //console.log('Job_Pave.getTask - ' + this.roomName + ' - ' + this.data.source + ' - pathEnd valid');

        let pathStart = nearestBase.coreLinkPos;
        return { utility: 1.0, jobId: this.id, jobType: this.jobType,
                 name: 'pave', program: 'task_pave', source: this.data.source,
                 data: { x1: pathStart.x, y1: pathStart.y, r1: pathStart.roomName,
                         x2:   pathEnd.x, y2:   pathEnd.y, r2:   pathEnd.roomName,
                         targetRoom: this.data.targetRoom, source: this.data.source }};
    }
}

module.exports = Job_Pave;
