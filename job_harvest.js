'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Harvest extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Harvest.constructor - executing');

        this.jobType = 'harvest';
        this.desiredSpawnType = 'harvester';
        let nearestBase = Room.getNearestBase(this.roomName);
        if (nearestBase)
        {
            if (this.room && this.room.name == nearestBase.name && this.room.spawns.length <= 0)
                this.desiredSpawnType = 'worry';
            else if (nearestBase.energyCapacityAvailable < 800 && Room.getMemory(this.roomName).controller)
                this.desiredSpawnType = 'work';
            else if (nearestBase.energyCapacityAvailable == 800)
                this.desiredSpawnType = 'worky';
        }
    }

    getTotalEnergyIn()
    {
        return Source.getAverageEnergyInPerTick(this.roomName, this.data.source);
    }

    getDesiredSpawn(spawn)
    {
        //console.log('Job_Harvest.getDesiredSpawn - ' + this.roomName + ' - ' + this.data.source + ' - checking');

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        //console.log('Job_Harvest.getDesiredSpawn - ' + this.roomName + ' - ' + this.data.source + ' - got task - ' + JSON.stringify(task));

        let maxParts = this.getMaxWorkPartsPerCreep();

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task };
    }

    getTask(creep, spawn)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && creep.memory.boosts)
            return null;

        //console.log('Job_Harvest.getTask - ' + this.roomName + ' - ' + this.data.source + ' - checking - ' + JSON.stringify(this.data));

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.sources || !roomMemory.sources[this.data.source])
            return null;

        if (roomMemory.controller && roomMemory.controller.o && !Room.isMyBase(this.roomName))
            return null;

        let nearestBase = Room.getNearestBase(this.roomName);
        if (!nearestBase)
            return null;

        // Require the room to be reserved if we can afford it before harvesting
        // if (roomMemory.controller && nearestBase.energyCapacityAvailable >= (BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]) && roomMemory.controller.o != ME && roomMemory.controller.r != ME)
        //     return null;

        //console.log('Job_Harvest.getTask - ' + this.roomName + ' - ' + this.data.source + ' - found roomMemory');

        let sourceMemory = roomMemory.sources[this.data.source];
        if (sourceMemory.l && !roomMemory.clear)
            return null;

        //console.log('Job_Harvest.getTask - ' + this.roomName + ' - ' + this.data.source + ' - no source keeper');

        let creeps = this.getCreeps();
        let creepCount = 0;
        let workPartCount = 0;
        for (let existingCreep of creeps)
        {
            if (existingCreep.spawning)
            {
                creepCount += 1;
                workPartCount += existingCreep.memory.work;
                continue;
            }

            let buffer = existingCreep.memory.parts * CREEP_SPAWN_TIME;
            if (spawn)
                buffer += spawn.wpos.getManhattanDist(existingCreep.wpos);
            if (creep)
                buffer += creep.wpos.getManhattanDist(existingCreep.wpos);

            if (existingCreep.ticksToLive > buffer)
            {
                creepCount += 1;
                workPartCount += existingCreep.memory.work;
                continue;
            }
        }

        if (creepCount >= sourceMemory.os)
            return null;

        //console.log('Job_Harvest.getTask - ' + this.roomName + ' - ' + this.data.source + ' - spots available');

        let maxWorkParts = this.getMaxWorkPartsForSource();

        if (workPartCount >= maxWorkParts)
            return null;

        // Only allow oversized workers if the bucket is not full
        // *** Disabled because we won't spawn a creep of this type if we have idle creeps of that type
        //     Would need to have harvesters and upgraders be different types if we want this
        // if (creep && Game.cpu.bucket >= constants.CPU_BUCKET_SIZE)
        // {
        //     let maxWorkPartsPerCreep = this.getMaxWorkPartsPerCreep();
        //     if (creep.memory.work > maxWorkPartsPerCreep)
        //         return null;
        // }

        //console.log('Job_Harvest.getTask - ' + this.roomName + ' - ' + this.data.source + ' - work parts allowed');

        let source = Game.getObjectById(this.data.source);
        if (source && !source.isSafe())
            return null;

        let utility = 1.0 - (workPartCount / maxWorkParts);
        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'harvest', program: 'task_harvester', source: this.data.source, data: { t: this.data.source, x: sourceMemory.x, y: sourceMemory.y, r: this.roomName }};
    }

    getMaxWorkPartsForSource()
    {
        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.sources || !roomMemory.sources[this.data.source])
            return 0;

        let sourceMemory = roomMemory.sources[this.data.source];
        let nearestBase = Room.getNearestBase(this.roomName);

        let sourceMaxEnergy = SOURCE_ENERGY_CAPACITY;
        let rechargeTime = ENERGY_REGEN_TIME;
        if (!roomMemory.controller)
        {
            sourceMaxEnergy = SOURCE_ENERGY_KEEPER_CAPACITY;
            rechargeTime *= 0.85;
        }
        else if (!roomMemory.controller.o && !roomMemory.controller.r && (!nearestBase || nearestBase.controller.level < 3))
        {
            sourceMaxEnergy = SOURCE_ENERGY_NEUTRAL_CAPACITY;
        }

        let sourceEnergyPerTick = sourceMaxEnergy / rechargeTime;
        let source = Game.getObjectById(this.data.source);
        if (source)
            sourceEnergyPerTick += source.getRegenPowerExtraEnergyPerTick();
            
        let maxParts = Math.ceil(sourceEnergyPerTick / HARVEST_POWER) + 1;

        return maxParts;
    }

    getMaxWorkPartsPerCreep()
    {
        let rechargeTime = ENERGY_REGEN_TIME;
        let energyAmount = SOURCE_ENERGY_CAPACITY
        if (Room.isCenterRoom(this.roomName))
        {
            energyAmount = SOURCE_ENERGY_KEEPER_CAPACITY;
            rechargeTime *= 0.85;
        }

        let sourceEnergyPerTick = (energyAmount / rechargeTime);

        let source = Game.getObjectById(this.data.source);
        if (source)
            sourceEnergyPerTick += source.getRegenPowerExtraEnergyPerTick();

        let bucketMultiplier = 1;
        if (Game.cpu.bucket < constants.CPU_BUCKET_SIZE)
        {
            if (Game.cpu.bucket < constants.CPU_BUCKET_SIZE * 0.85)
                bucketMultiplier = 3;
            else
                bucketMultiplier = 2;
        }
        else
        {
            let myBaseCount = Room.getMyBases().length;
            if (Game.cpu.limit / (myBaseCount + 1) < 10)
                bucketMultiplier = 3;
        }

        let maxParts = Math.ceil(sourceEnergyPerTick / HARVEST_POWER) + 1;
        maxParts = maxParts * bucketMultiplier;
        return maxParts;
    }
}

module.exports = Job_Harvest;
