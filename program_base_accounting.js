'use strict'

const constants = require('constants');

class Base_Accounting extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base_Accounting.constructor - ' + this.data.room + ' - executing');

        this.frequency = 10;
    }

    refresh()
    {
        super.refresh();

        this.room = Game.rooms[this.data.room];

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory.accounting)
            baseMemory.accounting = {};

        this.baseMemory = baseMemory;
        this.memory = baseMemory.accounting;

        this.baseMemory.totalIn = (this.baseMemory.totalIn || 0);
        this.baseMemory.totalOut = (this.baseMemory.totalOut || 0);
        this.baseMemory.totalCostPerTick = (this.baseMemory.totalCostPerTick || 0);

        if (!this.memory.mineralType && this.room.mineral)
            this.memory.mineralType = this.room.mineral.mineralType;
    }

    run()
    {
        super.run();

        if (!this.room)
            return;

        //console.log('Base_Accounting.run - ' + this.data.room + ' - executing');

        this.updateStorageCount();

        this.baseMemory.totalHarvest     = 0;
        this.baseMemory.totalIn          = 0;
        this.baseMemory.totalOut         = 0;
        this.baseMemory.totalCostPerTick = 0;
        this.baseMemory.spawnedParts     = 0;
        this.baseMemory.spawnTimeUsed    = 0;
        this.baseMemory.carryCapacity    = 0;
        this.baseMemory.carryCapacityNeeded = 0;
        this.baseMemory.carryPercent     = 0;

        let creepCounts = {};

        let roomsWorkingForThisBase = Room.getRoomNamesInRangeFloodFillGenerator(this.data.room, global.WORK_SEARCH_RANGE, rn => Room.getNearestBaseName(rn) == this.data.room, true);

        let nextRoomYielded = roomsWorkingForThisBase.next();
        while (nextRoomYielded.value)
        {
            let nextRoomName = nextRoomYielded.value;

            if (Room.getNearestBaseName(nextRoomName) != this.data.room)
            {
                nextRoomYielded = roomsWorkingForThisBase.next();
                continue;
            }
                
            let nextRoom = Game.rooms[nextRoomName];
            let nextRoomMemory = Room.getMemory(nextRoomName);

            if (nextRoomMemory && nextRoomMemory.sources)
            {
                for (let sourceId in nextRoomMemory.sources)
                {
                    let sourceIncome = Source.getAverageEnergyInPerTick(nextRoomName, sourceId);
                    let carryNeeded = Source.getAverageCarryNeeded(nextRoomName, sourceId);
                    this.baseMemory.totalHarvest += sourceIncome;
                    this.baseMemory.carryCapacityNeeded += carryNeeded;
                }
            }

            if (nextRoom)
            {
                let creeps = nextRoom.find(FIND_MY_CREEPS);
                for (let creep of creeps)
                {
                    if (creep.memory.type == 'carry')
                        this.baseMemory.carryCapacity += creep.store.getCapacity();

                    if (creep.memory.job && creep.memory.job.type)
                    {
                        if (!creepCounts[creep.memory.job.type])
                            creepCounts[creep.memory.job.type] = 0;

                        creepCounts[creep.memory.job.type] += 1;
                    }
                    
                    if (creep.memory.ept)
                        this.baseMemory.totalOut += creep.memory.ept;

                    this.baseMemory.spawnedParts += creep.body.length;
                    let spawnTimeUsed = (creep.body.length * CREEP_SPAWN_TIME);
                    if (creep.memory[CLAIM])
                        spawnTimeUsed *= (CREEP_LIFE_TIME / CREEP_CLAIM_LIFE_TIME)
                    this.baseMemory.spawnTimeUsed += spawnTimeUsed;
                    this.baseMemory.totalCostPerTick += parseFloat(creep.memory.costPerTick);
                }
            }

            // if (nextRoomMemory && Room.getNearestBaseName(nextRoomName) == this.data.room)
            // {
            //     let jobList = Room.getJobListAll(nextRoomName, nextRoomMemory);
            //     let nextJob = jobList.next();

            //     while (nextJob.value)
            //     {
            //         this.baseMemory.totalIn             += nextJob.value.getTotalEnergyIn();
            //         this.baseMemory.totalOut            += nextJob.value.getTotalEnergyOut();
            //         //this.baseMemory.totalCostPerTick    += nextJob.value.getTotalCostPerTick();

            //         if (!creepCounts[nextJob.value.jobType])
            //             creepCounts[nextJob.value.jobType] = 0;

            //         let jobCreepCount = nextJob.value.getCreepCount();

            //         creepCounts[nextJob.value.jobType] += jobCreepCount;

            //         nextJob = jobList.next();
            //     }

            //     jobList.return();
            // }

            nextRoomYielded = roomsWorkingForThisBase.next();
        }

        // let missionsForThisBase = _.filter(Object.values(Memory.missions), mission => Room.getNearestBase(mission.room) == this.room);
        // let missionCreepNameLists = missionsForThisBase.map(mission => mission.creeps);
        // let missionCreepNames = [].concat.apply([], missionCreepNameLists);
        // let missionCreeps = _.filter(missionCreepNames.map(cn => Game.creeps[cn]), c => c && c.memory.mission);
        //
        // let missionCreepCounts = _.countBy(missionCreeps, c => c.memory.mission.type);
        //
        // this.baseMemory.creepCounts = { ...creepCounts, ...missionCreepCounts };

        // this.baseMemory.totalIn          += _.sum(missionsForThisBase.map(missionMemory => missionMemory.in)) || 0;
        // this.baseMemory.totalOut         += _.sum(missionsForThisBase.map(missionMemory => missionMemory.out)) || 0;
        // this.baseMemory.totalCostPerTick += _.sum(missionCreeps, creep => creep.memory.costPerTick) || 0;

        this.baseMemory.creepCounts = creepCounts;

        // let baseMemories = Memory.empire.bases;
        // for (let otherBaseName in baseMemories)
        // {
        //     let otherBaseMemory = baseMemories[otherBaseName];
        //     if (otherBaseMemory.shipTarget == this.data.room && otherBaseMemory.spendable > 0 && Room.hasPlentyOfEnergy(otherBaseName))
        //         this.baseMemory.totalIn += otherBaseMemory.spendable;
        // }

        // let creepCount = Object.keys(Game.creeps).length;
        // let creepCountChanged = (!this.baseMemory.creepCount || creepCount != this.baseMemory.creepCount);
        // if (creepCountChanged)
        // {
        //     this.baseMemory.creepCount = creepCount;

        //     let spawnedCreeps = _.filter(Game.creeps, c => c.memory.spawnRoom == this.data.room);

        //     this.baseMemory.spawnedParts = _.sum(spawnedCreeps, c => c.body.length);
        //     this.baseMemory.totalCostPerTick = _.sum(spawnedCreeps, c => c.memory.costPerTick);
        // }

        this.baseMemory.spawnTimeUsed /= CREEP_LIFE_TIME;

        this.baseMemory.carryPercent = 1;
        if (this.baseMemory.carryCapacityNeeded > 0)
            this.baseMemory.carryPercent = Math.min(1, this.baseMemory.carryCapacity / this.baseMemory.carryCapacityNeeded);

        this.baseMemory.totalIn = this.baseMemory.totalHarvest * this.baseMemory.carryPercent;

        this.baseMemory.totalOutPlusCost = this.baseMemory.totalOut + this.baseMemory.totalCostPerTick;

        let profit = this.baseMemory.totalIn - (this.baseMemory.totalOutPlusCost);
        let storedEnergy = 0;

        this.baseMemory.storedEnergy = Room.getStoredResourceAmount(this.data.room, RESOURCE_ENERGY);

        this.baseMemory.profit = profit;

        if (!this.room.hasMyStorageOrTerminal())
        {
            let canEnergy = 1;
            let canCapacity = 1;
            if (this.room.quickCan1)
            {
                canEnergy += this.room.quickCan1.store.getUsedCapacity(RESOURCE_ENERGY);
                canCapacity += CONTAINER_CAPACITY;
            }

            if (this.room.quickCan2)
            {
                canEnergy += this.room.quickCan2.store.getUsedCapacity(RESOURCE_ENERGY);
                canCapacity += CONTAINER_CAPACITY;
            }

            if (this.room.controllerCan)
            {
                canEnergy += this.room.controllerCan.store.getUsedCapacity(RESOURCE_ENERGY);
                canCapacity += CONTAINER_CAPACITY;
            }

            let canFullness = canEnergy / (canCapacity * 0.75);
            //profit *= canFullness;

            //if (canFullness < 1.0)
            //    this.baseMemory.profitQuotient *= canFullness;

            this.baseMemory.storedEnergyPerTick = this.baseMemory.storedEnergy / CREEP_LIFE_TIME;
            this.baseMemory.profitQuotient = canFullness;
            //this.baseMemory.spendable = ((this.baseMemory.totalIn * this.baseMemory.profitQuotient) - (this.baseMemory.totalOutPlusCost) + this.baseMemory.storedEnergyPerTick);
            this.baseMemory.spendable = (this.baseMemory.profit + this.baseMemory.storedEnergyPerTick);
        }
        else
        {
            let spendableMultiplier = 0.5;
            let energyLevel = Room.getResourceAmountLevel(this.room.name, RESOURCE_ENERGY);
            if (energyLevel > constants.RESOURCE_LEVEL_CRITICAL)
                spendableMultiplier = constants.SPENDABLE_MULTIPLIER;


                
            this.baseMemory.storedEnergyPerTick = this.baseMemory.storedEnergy / CREEP_LIFE_TIME;
            // this.baseMemory.profitQuotient = this.baseMemory.storedEnergyPerTick / (this.baseMemory.totalOut + this.baseMemory.totalCostPerTick + 1);
            // this.baseMemory.spendable = (this.baseMemory.storedEnergyPerTick * spendableMultiplier) - this.baseMemory.totalOutPlusCost;
            this.baseMemory.profitQuotient = ((this.baseMemory.totalIn + this.baseMemory.storedEnergyPerTick) * spendableMultiplier) / (this.baseMemory.totalOutPlusCost || 1);
            //this.baseMemory.spendable = ((this.baseMemory.totalIn * this.baseMemory.profitQuotient) - (this.baseMemory.totalOutPlusCost) + this.baseMemory.storedEnergyPerTick);
            this.baseMemory.spendable = ((this.baseMemory.profit + this.baseMemory.storedEnergyPerTick) * spendableMultiplier);
        }



    }

    updateStorageCount()
    {
        let storageTotals = {};

        let hasStorage = (this.room.storage && this.room.storage.my);
        let hasTerminal = (this.room.terminal && this.room.terminal.my);

        if (this.room.storage)
        {
            for (let resourceType in this.room.storage.store)
            {
                storageTotals[resourceType] = (storageTotals[resourceType] || 0) + this.room.storage.store.getUsedCapacity(resourceType);
            }
        }

        if (this.room.terminal)
        {
            for (let resourceType in this.room.terminal.store)
            {
                storageTotals[resourceType] = (storageTotals[resourceType] || 0) + this.room.terminal.store.getUsedCapacity(resourceType);
            }
        }

        if (this.room.factory && this.room.factory.my)
        {
            for (let resourceType in this.room.factory.store)
            {
                storageTotals[resourceType] = (storageTotals[resourceType] || 0) + this.room.factory.store.getUsedCapacity(resourceType);
            }
        }

        for (let lab of this.room.labs)
        {
            if (lab.mineralType)
                storageTotals[lab.mineralType] += lab.store.getUsedCapacity(lab.mineralType);
        }

        if (!hasStorage && !hasTerminal)
        {
            storageTotals[RESOURCE_ENERGY] = (storageTotals[RESOURCE_ENERGY] || 0) + this.room.totalBonfireAmount;

            // if (this.room.quickCan1)
            // {
            //     for (let resourceType in this.room.quickCan1.store)
            //         storageTotals[resourceType] = (storageTotals[resourceType] || 0) + this.room.quickCan1.store.getUsedCapacity(resourceType);
            // }
            //
            // if (this.room.quickCan2)
            // {
            //     for (let resourceType in this.room.quickCan2.store)
            //         storageTotals[resourceType] = (storageTotals[resourceType] || 0) + this.room.quickCan2.store.getUsedCapacity(resourceType);
            // }
        }

        // if (this.room.quickCan1)
        //     storageTotals[RESOURCE_ENERGY] = (storageTotals[RESOURCE_ENERGY] || 0) + this.room.quickCan1.store.getUsedCapacity(RESOURCE_ENERGY);

        // if (this.room.quickCan2)
        //     storageTotals[RESOURCE_ENERGY] = (storageTotals[RESOURCE_ENERGY] || 0) + this.room.quickCan2.store.getUsedCapacity(RESOURCE_ENERGY);

        // if (this.room.controllerCan)
        //     storageTotals[RESOURCE_ENERGY] = (storageTotals[RESOURCE_ENERGY] || 0) + this.room.controllerCan.store.getUsedCapacity(RESOURCE_ENERGY);

        this.memory.resources = storageTotals;
    }
}

module.exports = Base_Accounting;
