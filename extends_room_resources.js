'use strict'

const constants = require('constants');

Room.sendingAwayResources = function(roomName)
{
    if (Room.isReplanning(roomName) || Room.isUnclaiming(roomName))
        return true;

    return false;
}

Room.getDesiredResourceAmount = function(roomName, resourceType)
{
    let desiredAmount = constants.DESIRED_RESOURCE_AMOUNT[resourceType];
    if (!desiredAmount)
        desiredAmount = 2000;

    return desiredAmount;
}

Room.getStoredResourceAmount = function(roomName, resourceType)
{
    if (!Memory.empire || !Memory.empire.bases || !Memory.empire.bases[roomName] || !Memory.empire.bases[roomName].accounting || !Memory.empire.bases[roomName].accounting.resources)
        return 0;

    return Memory.empire.bases[roomName].accounting.resources[resourceType] || 0;
}

Room.getStoredResourceAmounts = function(roomName)
{
    if (!Memory.empire || !Memory.empire.bases || !Memory.empire.bases[roomName] || !Memory.empire.bases[roomName].accounting || !Memory.empire.bases[roomName].accounting.resources)
        return null;

    return Memory.empire.bases[roomName].accounting.resources;
}

Room.getPracticalResourceAmount = function(roomName, resourceType)
{
    let room = Game.rooms[roomName];
    let resourceAmount = Room.getStoredResourceAmount(roomName, resourceType);
    if (resourceType == RESOURCE_ENERGY && room && room.factory && room.factory.my)
        resourceAmount += (Room.getStoredResourceAmount(roomName, RESOURCE_BATTERY) * 10);
    return resourceAmount
}

Room.getPracticalResourceAmountLevel = function(roomName, resourceType)
{
    let resourceTotal = Room.getPracticalResourceAmount(roomName, resourceType);
    return Room.getLevelForResourceAmount(roomName, resourceTotal, resourceType);
}

Room.getResourceAmountLevel = function(roomName, resourceType, modifier = 0)
{
    let resourceTotal = Room.getStoredResourceAmount(roomName, resourceType) + modifier;
    return Room.getLevelForResourceAmount(roomName, resourceTotal, resourceType);
}

Room.hasPlentyOfEnergy = function(roomName)
{
    let roomPracticalEnergyLevel = Room.getPracticalResourceAmountLevel(roomName, RESOURCE_ENERGY);
    let roomEnergyLevel = Room.getResourceAmountLevel(roomName, RESOURCE_ENERGY);
    return (roomPracticalEnergyLevel >= constants.RESOURCE_LEVEL_NORMAL && roomEnergyLevel >= constants.RESOURCE_LEVEL_LOW);
}

Room.getLevelForResourceAmount = function(roomName, amount, resourceType)
{
    let desiredAmount = Room.getDesiredResourceAmount(roomName, resourceType);
    let level = constants.RESOURCE_LEVEL_NONE;
    if (resourceType != RESOURCE_THORIUM && amount > desiredAmount * constants.EXCESS_RESOURCE_THRESHOLD)
        level = constants.RESOURCE_LEVEL_EXCESS;
    else if (amount > desiredAmount * constants.HIGH_RESOURCE_THRESHOLD)
        level = constants.RESOURCE_LEVEL_HIGH;
    else if (amount > desiredAmount * constants.NORMAL_RESOURCE_THRESHOLD)
        level = constants.RESOURCE_LEVEL_NORMAL;
    else if (amount > desiredAmount * constants.MODERATE_RESOURCE_THRESHOLD)
        level = constants.RESOURCE_LEVEL_MODERATE;
    else if (amount > desiredAmount * constants.LOW_RESOURCE_THRESHOLD)
        level = constants.RESOURCE_LEVEL_LOW;
    else if (amount > 0)
        level = constants.RESOURCE_LEVEL_CRITICAL;

    return level;
}

Room.wantToCompress = function(roomName, input)
{
    let desiredAmount = Room.getDesiredResourceAmount(roomName, input);
    if (!desiredAmount)
        return false;

    let output = constants.RESOURCE_COMPRESSES_TO[input];
    if (!output)
        return false;

    if (constants.RESOURCES_TO_COMPRESS.indexOf(input) < 0)
        return false;

    let energyLevel = Room.getResourceAmountLevel(roomName, RESOURCE_ENERGY);
    if (energyLevel < constants.RESOURCE_LEVEL_LOW)
        return false;

    let inputAmount = COMMODITIES[output].components[input];
    let outputAmount = COMMODITIES[output].amount;

    let inputLevel = Room.getResourceAmountLevel(roomName, input, -inputAmount);
    let outputLevel = Room.getResourceAmountLevel(roomName, output, outputAmount);

    let result = (inputLevel > outputLevel);
    console.log('Room.wantToCompress - ' + roomName + ' - input: ' + input + ', amount: ' + inputAmount + ', level: ' + inputLevel + ' - output: ' + output + ', amount: ' + outputAmount + ', level: ' + outputLevel + ' - result: ' + result);

    return result;
}

Room.wantToDecompress = function(roomName, input)
{
    let output = constants.RESOURCE_DECOMPRESSES_TO[input];
    if (!output)
        return false;

    let inputAmount = COMMODITIES[output].components[input];
    let outputAmount = COMMODITIES[output].amount;

    let inputLevel = Room.getResourceAmountLevel(roomName, input, -inputAmount);
    let outputLevel = Room.getResourceAmountLevel(roomName, output, outputAmount);

    return (inputLevel >= outputLevel)
}

Room.selectTerminalAction = function(roomName, resourceType)
{
    let resourceLevel = Room.getResourceAmountLevel(roomName, resourceType);

    let choice = TERMINAL_ACTION_HOLD;
    if (!Room.isMyBase(roomName) || !Game.rooms[roomName] || (resourceType == RESOURCE_POWER && !Game.rooms[roomName].powerSpawn))
        return choice;

    if (Room.wantToBuyNowResource(roomName, resourceType, resourceLevel))
        choice = TERMINAL_ACTION_BUY_NOW;
    else if (Room.wantToBuyResource(roomName, resourceType, resourceLevel))
        choice = TERMINAL_ACTION_BUY;
    else if (Room.wantToSellNowResource (roomName, resourceType, resourceLevel))
        choice = TERMINAL_ACTION_DUMP;
    else if (Room.wantToSellResource (roomName, resourceType, resourceLevel))
        choice = TERMINAL_ACTION_SELL;
    else if (resourceLevel >= constants.RESOURCE_LEVEL_LOW)
        choice = TERMINAL_ACTION_DISTRIBUTE;

    return choice;
}

Room.wantToBuyNowResource = function(roomName, resourceType, resourceLevel)
{
    if (!constants.ALLOW_BUY_NOW)
        return false;

    if (constants.RESOURCES_TO_BUY_NOW.indexOf(resourceType) < 0)
        return false;

    if (Game.market.credits < constants.MIN_CREDITS_FOR_BUY_NOW)
        return false;

    if (constants.USE_FACTORY)
    {
        let compressedResource      = constants.RESOURCE_COMPRESSES_TO[resourceType];
        if (compressedResource && Room.getResourceAmountLevel(roomName, compressedResource) > constants.RESOURCE_LEVEL_CRITICAL)
            return false;

        let decompressedResource    = constants.RESOURCE_DECOMPRESSES_TO[resourceType];
        if (decompressedResource && Room.getResourceAmountLevel(roomName, decompressedResource) > constants.RESOURCE_LEVEL_CRITICAL)
            return false;
    }
        
    return (resourceLevel <= constants.RESOURCE_LEVEL_CRITICAL);
}

Room.wantToBuyResource = function(roomName, resourceType, resourceLevel)
{
    if (!constants.ALLOW_BUY)
        return false;

    if (constants.RESOURCES_TO_BUY.indexOf(resourceType) < 0)
        return false;

    if (Game.market.credits < constants.MIN_CREDITS_FOR_BUY)
        return false;

    if (constants.USE_FACTORY)
    {
        let compressedResource      = constants.RESOURCE_COMPRESSES_TO[resourceType];
        if (compressedResource && Room.getResourceAmountLevel(roomName, compressedResource) > constants.RESOURCE_LEVEL_LOW)
            return false;

        let decompressedResource    = constants.RESOURCE_DECOMPRESSES_TO[resourceType];
        if (decompressedResource && Room.getResourceAmountLevel(roomName, decompressedResource) > constants.RESOURCE_LEVEL_LOW)
            return false;
    }
        
    return (resourceLevel <= constants.RESOURCE_LEVEL_LOW);
}

Room.wantToSellResource = function(roomName, resourceType, resourceLevel)
{
    if (!constants.ALLOW_SELL)
        return false;

    if (constants.RESOURCES_TO_SELL.indexOf(resourceType) < 0)
        return false;

    if (constants.USE_FACTORY)
    {
        let decompressedResource    = constants.RESOURCE_DECOMPRESSES_TO[resourceType];
        if (decompressedResource && Room.getResourceAmountLevel(roomName, decompressedResource) < constants.RESOURCE_LEVEL_HIGH)
            return false;
    }

    return (resourceLevel >= constants.RESOURCE_LEVEL_HIGH);
}

Room.wantToSellNowResource = function(roomName, resourceType, resourceLevel)
{
    if (roomName == 'E13N5' && resourceLevel >= constants.RESOURCE_LEVEL_HIGH)
        console.log('Room.wantToSellNowResource - ' + roomName + ' - considering ' + resourceType + '. resourceLevel: ' + resourceLevel);

    if (!constants.ALLOW_DUMP)
    {
        if (roomName == 'E13N5' && resourceLevel >= constants.RESOURCE_LEVEL_HIGH)
            console.log('Room.wantToSellNowResource - ' + roomName + ' - dump not allowed');
        return false;
    }
        

    if (Game.market.credits > constants.MAX_CREDITS_FOR_SELL)
    {
        if (roomName == 'E13N5' && resourceLevel >= constants.RESOURCE_LEVEL_HIGH)
            console.log('Room.wantToSellNowResource - ' + roomName + ' - too many credits');
        return false;
    }

    if (constants.RESOURCES_TO_DUMP.indexOf(resourceType) < 0)
    {
        if (roomName == 'E13N5' && resourceLevel >= constants.RESOURCE_LEVEL_HIGH)
            console.log('Room.wantToSellNowResource - ' + roomName + ' - dumping ' + resourceType + ' not allowed');
        return false;
    }

    if (constants.USE_FACTORY)
    {
        let decompressedResource    = constants.RESOURCE_DECOMPRESSES_TO[resourceType];
        if (decompressedResource && Room.getResourceAmountLevel(roomName, decompressedResource) < constants.RESOURCE_LEVEL_EXCESS)
            return false;
    }

    {
        if (roomName == 'E13N5' && resourceLevel >= constants.RESOURCE_LEVEL_HIGH)
            console.log('Room.wantToSellNowResource - ' + roomName + ' - dump resource level: ' + constants.DUMP_RESOURCE_LEVEL);
    }
    
    return (resourceLevel >= constants.DUMP_RESOURCE_LEVEL);
}

Room.getResourceStorageTarget = function (roomName, resourceType, creep, amount, includeCans = true, includeBonfire = true)
{
    let room = Game.rooms[roomName];
    if (!room || !Room.isMyBase(roomName))
        room = Room.getNearestBase(roomName);
    if (!room)
        return null;

    if (includeBonfire && resourceType == RESOURCE_ENERGY)
    {
        let bonfire = room.bonfire;
        if (bonfire)
            return bonfire;
    }

    if (amount <= 0)
        amount = 1;

    let sources = [];
    if (room.storage && room.storage.store.getUsedCapacity(resourceType) > 0)
        sources.push(room.storage);
    if (room.terminal && room.terminal.store.getUsedCapacity(resourceType) > 0)
        sources.push(room.terminal);
    if (room.factory && room.factory.store.getUsedCapacity(resourceType) > 0)
        sources.push(room.factory);

    if (includeCans)
    {
        if (room.quickCan1 && room.quickCan1.store.getUsedCapacity(resourceType) > 0)
            sources.push(room.quickCan1);
        if (room.quickCan2 && room.quickCan2.store.getUsedCapacity(resourceType) > 0)
            sources.push(room.quickCan2);
        if (room.controllerCan && room.controllerCan.store.getUsedCapacity(resourceType) > 0)
            sources.push(room.controllerCan);
    }

    if (sources.length <= 0)
        return null;
    if (sources.length == 1)
        return sources[0];

    return _.min(sources, s => creep.wpos.getManhattanDist(s.wpos));
}

Room.getResourceDeliveryTarget = function (roomName, resourceType, creep, closest)
{
    let room = Game.rooms[roomName];
    if (!room || !Room.isMyBase(roomName))
        room = Room.getNearestBase(roomName);
    if (!room)
        return null;

    let sendingAway = Room.sendingAwayResources(roomName);

    // if (resourceType == RESOURCE_BATTERY && room.factory && room.factory.my && room.factory.store.getUsedCapacity() < FACTORY_CAPACITY * 0.5)
    // {
    //     return room.factory;
    // }

    let baseMemory = Room.getBaseMemory(room.name);
    // if (!sendingAway && baseMemory && baseMemory.labs && baseMemory.labs.rip)
    // {
    //     let inputLab1 = Game.getObjectById(baseMemory.labs.inputLab1);
    //     let inputLab2 = Game.getObjectById(baseMemory.labs.inputLab2);

    //     if (inputLab1 && inputLab1.needsLoad() && resourceType == inputLab1.desiredMineralType())
    //         return inputLab1;
    //     if (inputLab2 && inputLab2.needsLoad() && resourceType == inputLab2.desiredMineralType())
    //         return inputLab2;
    // }

    let factory = room.factory;

    let hasFactory = (!sendingAway && factory && factory.my && factory.store.getFreeCapacity() > 0);
    if (hasFactory && (factory.level && !factory.room.isPowerCreepActive(PWR_OPERATE_FACTORY, factory.level, true)))
        hasFactory = false;

    if (hasFactory)
    {
        let factoryResources = {};

        if (constants.FACTORY_INPUT_RESOURCES.indexOf(resourceType) >= 0 && factory.store.getUsedCapacity(resourceType) < constants.FACTORY_MIN_INPUT)
        {
            for (let productType in COMMODITIES)
            {
                let recipe = COMMODITIES[productType];
                if (!recipe.level || factory.level == recipe.level)
                {
                    for (let inputType in recipe.components)
                        factoryResources[inputType] = 1;
                }
            }

            if (factoryResources[resourceType])
                return factory;
        }


        // if (constants.RESOURCES_TO_COMPRESS.indexOf(resourceType) >= 0 && factory.store.getUsedCapacity(resourceType) < constants.FACTORY_MIN_INPUT)
        //     return factory;
        //
        // if (constants.RESOURCES_TO_DECOMPRESS.indexOf(resourceType) >= 0 && factory.store.getUsedCapacity(resourceType) < constants.FACTORY_MIN_INPUT)
        //     return factory;
    }

    let hasTerminal = (room.terminal && room.terminal.my);
    let terminalFull = false;
    let terminalAmount = 0;
    if (hasTerminal)
    {
        terminalFull = room.terminal.store.getFreeCapacity() <= 0;
        terminalAmount = room.terminal.store.getUsedCapacity(resourceType);
    }

    if (hasTerminal && !terminalFull && sendingAway && (resourceType == RESOURCE_ENERGY || room.terminal.store.getFreeCapacity() > 10000))
        return room.terminal;

    let hasStorage = (room.storage && room.storage.my);
    let storageFull = false;
    if (hasStorage)
        storageFull = room.storage.store.getFreeCapacity() <= 0;

    if (closest && creep)
    {
        if (hasTerminal && hasStorage && !terminalFull && !storageFull && (resourceType == RESOURCE_ENERGY || room.terminal.store.getFreeCapacity() > 10000))
        {
            //console.log('Room.getResourceDeliveryTarget - ' + creep.name + ' being sent to nearest target in ' + room.name);
            if (creep.wpos.getManhattanDist(room.terminal.wpos) < creep.wpos.getManhattanDist(room.storage.wpos))
                return room.terminal;
            else
                return room.storage;
        }
        else if (hasTerminal && !terminalFull && (resourceType == RESOURCE_ENERGY || room.terminal.store.getFreeCapacity() > 10000))
        {
            return room.terminal;
        }
        else if (hasStorage && !storageFull)
        {
            return room.storage;
        }
        else if (hasTerminal && !terminalFull)
        {
            return room.terminal;
        }
        else
        {
            return null;
        }
    }

    // if (room.name == 'W11S6' && creep)
    //     console.log('Room.getResourceDeliveryTarget - ' + creep.name + ' looking for target in ' + roomName);

    let desiredTerminalAmount = 2000;
    if (resourceType == RESOURCE_ENERGY)
        desiredTerminalAmount = 50000;

    // if (creep && room.name == 'W48N32')
    // {
    //     console.log('Room.getResourceDeliveryTarget - ' + creep.name + ' - ' + resourceType + ' - ' + desiredTerminalAmount) ;
    //     console.log('Room.getResourceDeliveryTarget - ' + creep.name + ' - ' + resourceType + ' - ' + hasTerminal + ' - ' + terminalFull + ' - ' + hasStorage + ' - ' + storageFull) ;
    // }

    if (hasTerminal && !terminalFull && (!hasStorage || terminalAmount < desiredTerminalAmount))
    {
        // if (creep && room.name == 'W48N32')
        //     console.log('Room.getResourceDeliveryTarget - ' + creep.name + ' - ' + resourceType + ' - target is terminal ' + room.terminal.pos);
        return room.terminal;
    }
    else if (hasStorage && !storageFull)
    {
        // if (creep && room.name == 'W48N32')
        //     console.log('Room.getResourceDeliveryTarget - ' + creep.name + ' - ' + resourceType + ' - target is storage ' + room.storage.pos);
        return room.storage;
    }
    else if (hasTerminal && !terminalFull)
    {
        return room.terminal;
    }

    return null;
}

Room.getEnergyDeliveryTarget = function(roomName, creep, range, minAmount, deliverToTowers, deliverToStructures, deliverToCreeps, deliverToStorage, deliverToMinorStorage, deliverToSites, deliverToRoads, deliverToWalls)
{
    //console.log('Room.getEnergyDeliveryTarget -------------------------' );

    // if (roomName == 'W5N3' && creep && creep.currentTask && creep.currentTask.n == 'Filler')
    //     console.log('Room.getEnergyDeliveryTarget - ' + creep.name + ' - deliverToTowers: ' + deliverToTowers  + ' - deliverToStructures: ' + deliverToStructures  + ' - deliverToMinorStorage: ' + deliverToMinorStorage );

    let nearbyRoomNames = Room.getRoomNamesInRangeFloodFill(roomName, range, true, false);
    let nearbyRooms = nearbyRoomNames.map(rn => Game.rooms[rn]).filter(r => r);

    // if (range == 0)
         //console.log('Room.getEnergyDeliveryTarget - ' + roomName + ' - rooms in range ' + range + ': ' + nearbyRooms.length);

    for (let room of nearbyRooms)
    {
        let potentialTargets = [];

        if (deliverToTowers)
        {
            potentialTargets = potentialTargets.concat(room.getStructures(STRUCTURE_TOWER));
        }

        if (deliverToStructures)
        {
            //console.log('Room.getEnergyDeliveryTarget - ' + room.name + ' - ' + creep.name + ' - look for structures ');
            potentialTargets = potentialTargets.concat(room.getStructures(STRUCTURE_SPAWN));
            potentialTargets = potentialTargets.concat(room.getStructures(STRUCTURE_EXTENSION));
        }

        if (deliverToStorage)
        {
            let usedStorage = false;
            if (room.storage && room.storage.my && room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            {
                usedStorage = true;
                potentialTargets.push(room.storage);
            }

            if (room.terminal && room.terminal.my && room.terminal.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            {
                usedStorage = true;
                potentialTargets.push(room.terminal);
            }

            if (!usedStorage)
            {
                deliverToMinorStorage = true;
            }
        }

        if (deliverToMinorStorage)
        {
            let allowQuickCans = true;
            if (room.quickLink && room.coreLink && room.storage && Room.getStoredResourceAmount(room.name, RESOURCE_ENERGY) > 0)
                allowQuickCans = false;

            if (allowQuickCans && room.quickCan1 && room.quickCan1.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                potentialTargets.push(room.quickCan1);
            if (allowQuickCans && room.quickCan2 && room.quickCan2.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                potentialTargets.push(room.quickCan2);
            if (room.controllerCan && room.controllerCan.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                potentialTargets.push(room.controllerCan);
        }

        if (deliverToCreeps)
            potentialTargets = potentialTargets.concat(_.filter(Game.creeps, object => object.room.name == room.name && object.memory && object.memory.getFed));

        if (creep && deliverToSites)
        {
            potentialTargets = potentialTargets.concat(_.filter(room.find(FIND_MY_CONSTRUCTION_SITES), site => (deliverToRoads || site.structureType != STRUCTURE_ROAD) && (deliverToWalls || (site.structureType != STRUCTURE_RAMPART && site.structureType != STRUCTURE_WALL))));
            if (potentialTargets.length == 1)
                return potentialTargets[0];
        }

        if (creep)
        {
            potentialTargets = _.sortBy(potentialTargets, function(object)
            {
                let result = creep.wpos.getManhattanDist(object.wpos);
                if (object.progressTotal)
                // need to make sure we can see this site even if its been hacked on the private server for testing
                    result += Math.max(object.progressTotal - object.progress, 1);
                else
                    result += object.store.getUsedCapacity(RESOURCE_ENERGY);
                return result;
            });

            //console.log('Room.getEnergyDeliveryTarget - ' + room.name + ' - ' + creep.name + ' - potentialTarget count: ' + potentialTargets.length);
        }
            //potentialTargets = _.sortBy(potentialTargets, (object) => (creep.wpos.getManhattanDist(object.wpos)));


        for (let potentialTarget of potentialTargets)
        {
            if (potentialTarget.store.getFreeCapacity(RESOURCE_ENERGY) <= 0)
                continue;
            // if (creep && creep.giveTarget && potentialTarget.id == creep.giveTarget)
            //     continue;

            let targetType = null;
            if (potentialTarget instanceof Creep)
                targetType = potentialTarget.name;
            else
                targetType = potentialTarget.structureType;

            let energyNeeded = 0;
            if (potentialTarget instanceof Creep)
            {
                energyNeeded = potentialTarget.store.getCapacity();
                if (creep && potentialTarget.memory.ept)
                {
                    let creepRange = creep.wpos.getManhattanDist(potentialTarget.wpos);
                    energyNeeded += creepRange * potentialTarget.memory.ept;
                }
            }
            else if (potentialTarget instanceof ConstructionSite)
            {
                // need to make sure we can see this site even if its been hacked on the private server for testing
                energyNeeded = Math.max(potentialTarget.progressTotal - potentialTarget.progress, 1);
            }
            else
            {
                energyNeeded = potentialTarget.store.getFreeCapacity(RESOURCE_ENERGY);
                if (creep && potentialTarget instanceof StructureSpawn && potentialTarget.room.isBootstrapping())
                {
                    let spawnBaseMemory = Room.getBaseMemory(potentialTarget.room.name);
                    if (spawnBaseMemory)
                    {
                        let creepRange = creep.wpos.getManhattanDist(potentialTarget.wpos);
                        energyNeeded += creepRange * spawnBaseMemory.totalCostPerTick;
                    }

                }
            }

            //console.log('Room.getEnergyDeliveryTarget - ' + room.name + ' - ' + creep.name + ' - target: ' + potentialTarget + ', energy needed: ' + energyNeeded + ', minAmount: ' + minAmount);

            if (minAmount && energyNeeded < minAmount)
                continue;

            // let otherDeliverers = _.filter(Game.creeps, object => object.hasTask({ n: 'task_deliver', t: potentialTarget.id }));
            //
            // let promisedEnergyCount = _.sum(otherDeliverers.map(object => object.store.getUsedCapacity(RESOURCE_ENERGY)));
            // if (promisedEnergyCount < energyNeeded)
            {
                //console.log('missionUtilities.getEnergyDeliveryTarget - add ' + creep.name + ' on to target: ' + targetType);
                return potentialTarget;
            }
        }
    }
}

Room.prototype.getEnergyDeliverySum = function(deliverToStructures, deliverToCreeps, deliverToStorage, deliverToMinorStorage, deliverToSites, deliverToRoads)
{
    let potentialTargets = [];

    if (deliverToStructures)
        potentialTargets = potentialTargets.concat(_.filter(this.find(FIND_MY_STRUCTURES),
                                                    (object) => ((object.structureType == STRUCTURE_SPAWN ||
                                                                  object.structureType == STRUCTURE_EXTENSION ||
                                                                  object.structureType == STRUCTURE_TOWER) &&
                                                                  object.store.getFreeCapacity(RESOURCE_ENERGY) > 0)));

    if (deliverToStorage)
    {
        if (this.storage && this.storage.my)
        {
            potentialTargets.push(this.storage);
        }
        if (this.terminal && this.terminal.my)
        {
            potentialTargets.push(this.terminal);
        }
    }

    if (deliverToMinorStorage)
    {
        if (this.quickCan1)
            potentialTargets.push(this.quickCan1);
        if (this.quickCan2)
            potentialTargets.push(this.quickCan2);
        if (this.controllerCan)
            potentialTargets.push(this.controllerCan);
    }

    if (deliverToCreeps)
        potentialTargets = potentialTargets.concat(_.filter(Game.creeps, object => object.memory.getFed));

    if (deliverToSites)
        potentialTargets = potentialTargets.concat(_.filter(this.find(FIND_MY_CONSTRUCTION_SITES), site => deliverToRoads || site.structureType != STRUCTURE_ROAD));


    let totalEnergyNeeded = 0
    for (let potentialTarget of potentialTargets)
    {
        let energyNeeded = 0;
        if (potentialTarget instanceof Creep)
        {
            energyNeeded = potentialTarget.store.getCapacity();
        }
        else if (potentialTarget instanceof ConstructionSite)
        {
            energyNeeded = potentialTarget.progressTotal - potentialTarget.progress;
        }
        else
        {
            energyNeeded = potentialTarget.store.getFreeCapacity(RESOURCE_ENERGY);
        }

        // let otherDeliverers = _.filter(Game.creeps, object => object.hasTask({ n: 'Deliver', t: potentialTarget.id }));
        // let promisedEnergyCount = _.sum(otherDeliverers.map(object => object.store.getUsedCapacity(RESOURCE_ENERGY)));
        //
        // totalEnergyNeeded += energyNeeded - promisedEnergyCount;

        totalEnergyNeeded += energyNeeded;
    }



    return totalEnergyNeeded;
}

Room.getResourcePickupTarget = function(roomName, creep, resourceType, range, minAmount, takeFromStorage, takeFromMinorStorage, takeFromBonFire, takeFromCarrier, loot, exclude)
{
    // if (creep.hasTask({ n: 'Collector' }))
    //     console.log('Room.getResourcePickupTarget - ' + roomName + ' - ' + creep.name + ' - ' + minAmount + ' - ' + creep.store.getFreeCapacity());

    if (!minAmount)
        minAmount = 1;

    //let nearbyRooms = Room.getRoomsInRange(roomName, range, true);
    let roomNamesInRange = Room.getRoomNamesInRangeFloodFill(roomName, range);
    let nearbyRooms = _.filter(roomNamesInRange.map(n => Game.rooms[n]), r => r);


    for (let room of nearbyRooms)
    {
        if (Room.inDanger(room.name) && !Room.isMyBase(room.name))
            continue;

        let potentialTargets = [];

        if (takeFromCarrier)
            potentialTargets = potentialTargets.concat(room.find(FIND_MY_CREEPS, { filter: c => c.memory.type == 'carry' && (!c.memory.job || c.memory.job.type != 'stock') && c.store.getUsedCapacity(resourceType) > 0}));

        if (room.sources)
        {
            for (let source of room.sources)
            {
                let sourceInfo = source.memory;
                let container = source.container;
                if (container && container.store && container.store.getUsedCapacity(resourceType) >= minAmount)
                {
                    if (creep && sourceInfo.l)
                    {
                        let distanceToContainer = creep.wpos.getManhattanDist(container.wpos);
                        let lair = Game.getObjectById(sourceInfo.l);
                        if (lair && lair.ticksToSpawn && lair.ticksToSpawn > distanceToContainer + 20 && ENERGY_REGEN_TIME - lair.ticksToSpawn > distanceToContainer + 10)
                        {
                            potentialTargets.push(container);
                        }
                        else
                        {
                            //console.log('Room.getResourcePickupTarget - ' + room.name + ' - skipping container near active lair');
                        }
                    }
                    else
                    {
                        potentialTargets.push(container);
                    }
                }

            }
        }

        if (room.memory.mineral && room.memory.mineral.c)
        {
            let container = Game.getObjectById(room.memory.mineral.c);
            if (container && container.store && container.store.getUsedCapacity(resourceType) >= minAmount)
                potentialTargets.push(container);
        }

        let labs = room.getStructures(STRUCTURE_LAB);

        let labsToUnload = _.filter(labs, lab => (!resourceType || lab.mineralType == resourceType) && lab.needsUnload());
        potentialTargets = potentialTargets.concat(labsToUnload);
        // if (room.name == 'W11S6')
        //     console.log('Room.getResourcePickupTarget - ' + room.name + ' - ' + creep.name + ' - ' + resourceType + ' checking labs, found ' + labsToUnload.length);

        if (loot && room.storage && !room.storage.my && room.storage.store.getUsedCapacity(resourceType) > 0)
        {
            potentialTargets.push(room.storage);
        }

        if (loot && room.terminal && !room.terminal.my && room.terminal.store.getUsedCapacity(resourceType) > 0)
        {
            potentialTargets.push(room.terminal);
        }

        potentialTargets = potentialTargets.concat(room.find(FIND_DROPPED_RESOURCES, { filter: (object) => ((resourceType == null || object.resourceType == resourceType) && object.amount >= minAmount) }));
        potentialTargets = potentialTargets.concat(room.find(FIND_TOMBSTONES, { filter: (object) => (object.store.getUsedCapacity(resourceType) >= minAmount) }));
        if (loot)
            potentialTargets = potentialTargets.concat(room.find(FIND_RUINS, { filter: (object) => (object.store.getUsedCapacity(resourceType) >= minAmount) }));


        //potentialTargets = potentialTargets.concat(_.filter(room.find(FIND_DROPPED_RESOURCES), (object) => (resourceType == null || object.resourceType == resourceType)));
        //potentialTargets = potentialTargets.concat(_.filter(room.find(FIND_TOMBSTONES), (object) => (object.store.getUsedCapacity(resourceType) > 0)));
        //potentialTargets = potentialTargets.concat(_.filter(room.find(FIND_RUINS), (object) => (object.store.getUsedCapacity(resourceType) > 0)));

        if (takeFromMinorStorage)
        {
            if (room.quickCan1)
                potentialTargets.push(room.quickCan1);
            if (room.quickCan2)
                potentialTargets.push(room.quickCan2);
            if (room.controllerCan)
                potentialTargets.push(room.controllerCan);
        }

        if (takeFromStorage)
        {
            if (room.storage)
                potentialTargets.push(room.storage);
            if (room.terminal)
                potentialTargets.push(room.terminal);
            if (room.factory)
                potentialTargets.push(room.factory);

            if (resourceType == RESOURCE_ENERGY)
                potentialTargets = potentialTargets.concat(room.getStructures(STRUCTURE_LINK));
            // if (room.quickLink && (resourceType == RESOURCE_ENERGY))
            //     potentialTargets.push(room.quickLink);
            // if (room.coreLink && (resourceType == RESOURCE_ENERGY))
            //     potentialTargets.push(room.coreLink);
            // if (room.controllerLink && (resourceType == RESOURCE_ENERGY))
            //     potentialTargets.push(room.controllerLink);
        }

        potentialTargets = potentialTargets.filter(pt => pt.pos && (pt.pos.isSafe() || (pt.pos.roomName == creep.pos.roomName && pt.pos.getRangeTo(creep.pos) <= 1)));

        if (creep && creep.pos)
            potentialTargets = _.sortBy(potentialTargets, (object) => (object.wpos.getManhattanDist(creep.wpos)));

        let bonfirePos = room.quickLinkPos;
        for (let potentialTarget of potentialTargets)
        {
            if (exclude && potentialTarget.id == exclude.id)
                continue;

            if (Room.isEnemyBase(roomName) && potentialTarget.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART))
                continue;

            let ignoreMinAmount = false;

            if (potentialTarget instanceof StructureLab)
                ignoreMinAmount = true;
            else if (potentialTarget instanceof StructureLink)
                ignoreMinAmount = true;
            else if (potentialTarget instanceof Creep)
                    ignoreMinAmount = true;

            let type = 'unknown';
            if (potentialTarget instanceof Structure)
                type = potentialTarget.structureType;
            else if (potentialTarget instanceof Ruin)
                type = 'ruin';
            else if  (potentialTarget instanceof Tombstone)
                type = 'tombstone';
            else if  (potentialTarget instanceof Creep)
                type = 'creep';
            else if (potentialTarget instanceof Resource)
            {
                if (!takeFromBonFire && bonfirePos && bonfirePos.getRangeTo(potentialTarget.pos) <= 1)
                    continue;

                type = potentialTarget.resourceType;
            }


            let resourcesAvailable = 0;
            if (potentialTarget.mineralType && potentialTarget.store)
                resourcesAvailable = potentialTarget.store.getUsedCapacity(potentialTarget.mineralType);
            else if (potentialTarget.store)
                resourcesAvailable = potentialTarget.store.getUsedCapacity(resourceType);
            else if (potentialTarget.amount)
                resourcesAvailable = potentialTarget.amount;

            //console.log('missionUtilities.getResourcePickupTarget - checking ' + type + ' in ' + potentialTarget.pos.roomName + ' with ' + resourcesAvailable + ' resourcesAvailable');
            let otherTakers = _.filter(Game.creeps, object => object.hasTask({ n: 'Collect', t: potentialTarget.id }));

            let take = true;
            let claimedResourceCount = _.sum(otherTakers.map(object => object.store.getFreeCapacity(resourceType)));
            let remainingResources = resourcesAvailable - claimedResourceCount;

            if (remainingResources >= minAmount || (ignoreMinAmount && remainingResources > 0))
            {
                return potentialTarget;
            }
        }
    }
}

Room.prototype.getResourcePickupSumInRange = function(range, resourceType, minAmount, skipOtherBases, takeFromBonFire)
{
    let resourceTotal = 0;
    //let nearbyRooms = Room.getRoomsInRange(this.name, range, true);
    let roomNamesInRange = Room.getRoomNamesInRangeFloodFill(this.name, range);
    let nearbyRooms = _.filter(roomNamesInRange.map(n => Game.rooms[n]), r => r);
    for (let room of nearbyRooms)
    {
        if (room == this || !skipOtherBases || !Room.isMyBase(room.name))
            resourceTotal += room.getResourcePickupSum(resourceType, minAmount, takeFromBonFire);
    }

    return resourceTotal;
}

Room.prototype.getResourcePickupSum = function(resourceType, minAmount, takeFromBonFire)
{
    if (Room.inDanger(this.name))
        return 0;

    let potentialTargets = [];

    if (this.sources)
    {
        for (let source of this.sources)
        {
            let sourceInfo = source.memory;
            let container = source.container;
            // if (Game.shard.name == 'shard3')
            //     console.log('Room.getResourcePickupSum - ' + this.name + ' - source: ' + source + ', container: ' + container);

            if (container && container.store && container.store.getUsedCapacity(resourceType) >= minAmount)
            {
                if (sourceInfo.l)
                {
                    let lair = Game.getObjectById(sourceInfo.l);
                    if (lair && lair.ticksToSpawn && lair.ticksToSpawn > 20 && ENERGY_REGEN_TIME - lair.ticksToSpawn > 10)
                    {
                        potentialTargets.push(container);
                    }
                }
                else
                {
                    potentialTargets.push(container);
                }
            }
        }
    }

    potentialTargets = potentialTargets.concat(this.find(FIND_DROPPED_RESOURCES, { filter: (object) => (resourceType == null || object.resourceType == resourceType) }));
    potentialTargets = potentialTargets.concat(this.find(FIND_TOMBSTONES, { filter: (object) => (object.store.getUsedCapacity(resourceType) > 0) }));
    potentialTargets = potentialTargets.concat(this.find(FIND_RUINS, { filter: (object) => (object.store.getUsedCapacity(resourceType) > 0) }));

    // potentialTargets = potentialTargets.concat(_.filter(this.find(FIND_DROPPED_RESOURCES), (object) => (resourceType == null || object.resourceType == resourceType)));
    // potentialTargets = potentialTargets.concat(_.filter(this.find(FIND_TOMBSTONES), (object) => (object.store.getUsedCapacity(resourceType) > 0)));
    // potentialTargets = potentialTargets.concat(_.filter(this.find(FIND_RUINS), (object) => (object.store.getUsedCapacity(resourceType) > 0)));

    let totalCarryNeeded = 0;
    let bonfirePos = this.quickLinkPos;
    for (let potentialTarget of potentialTargets)
    {

        let resourcesAvailable = 0;
        if (potentialTarget.store)
        {
            resourcesAvailable = potentialTarget.store.getUsedCapacity(resourceType);
        }
        else if (potentialTarget.amount)
        {
            if (!takeFromBonFire && bonfirePos && bonfirePos.getRangeTo(potentialTarget.pos) <= 1)
                continue;

            resourcesAvailable = potentialTarget.amount;
        }

        let otherTakers = _.filter(Game.creeps, object => object.hasTask({ n: 'Collect', t: potentialTarget.id }));
        let claimedResourceCount = _.sum(otherTakers.map(object => object.store.getFreeCapacity(resourceType)));

        // if (Game.shard.name == 'shard3')
        //     console.log('Room.getResourcePickupSum - ' + this.name + ' - potentialTarget: ' + potentialTarget + ', resourcesAvailable: ' + resourcesAvailable + ', claimedResourceCount: ' + claimedResourceCount);

        resourcesAvailable -= claimedResourceCount;

        if (!minAmount || resourcesAvailable >= minAmount)
            totalCarryNeeded += resourcesAvailable;
    }

    return totalCarryNeeded;
}

Room.prototype.requestResourceDropoff = function(sink, amount, resourceType)
{
    let memory = Room.getMemory(this.name);
    if (!memory)
        return;

    if (!memory.haul)
        memory.haul = {};

    if (!memory.haul.in)
        memory.haul.in = {};

    memory.haul.in[sink.id] = { x: sink.pos.x, y: sink.pos.y, a: amount, res: resourceType };
}

Room.prototype.requestResourcePickup = function(source, baseAmount, additionalPerTick, additionalMax)
{
    let memory = Room.getMemory(this.name);
    if (!memory)
        return;

    if (!memory.haul)
        memory.haul = {};

    if (!memory.haul.out)
        memory.haul.out = {};

    memory.haul.out[source.id] = { x: source.pos.x, y: source.pos.y, a: baseAmount, pt: additionalPerTick, m: additionalMax };
}

Room.prototype.cancelResourceDropoff = function(sink)
{
    let memory = Room.getMemory(this.name);
    if (!memory || !memory.haul || !memory.haul.in || !memory.haul.in[sink.id])
        return;

    delete memory.haul.in[sink.id];

    if (Object.keys(memory.haul.in).length <= 0)
        delete memory.haul.in;

    if (Object.keys(memory.haul).length <= 0)
        delete memory.haul;
}

Room.requestResourcePickup = function(roomName, sourceId, sourceX, sourceY, baseAmount, additionalPerTick, additionalMax)
{
    let memory = Room.getMemory(roomName);
    if (!memory)
        return;

    if (!memory.haul)
        memory.haul = {};

    if (!memory.haul.out)
        memory.haul.out = {};

    memory.haul.out[sourceId] = { x: sourceX, y: sourceY, a: baseAmount, pt: additionalPerTick, m: additionalMax };
}

Room.cancelResourcePickup = function(roomName, sourceId)
{
    let memory = Room.getMemory(roomName);
    if (!memory || !memory.haul || !memory.haul.out || !memory.haul.out[sourceId])
        return;

    let jobCreeps = Room.getJobSpawnedCreeps(roomName, 'haul');
    for (let creep of jobCreeps)
    {
        if (creep.hasTask({ n: 'task_collect_near', t: sourceId }))
            kernel.scheduler.callProcessFunction(creep.memory.pid, 'laidOff');
    }
        
        
    delete memory.haul.out[sourceId];

    if (Object.keys(memory.haul.out).length <= 0)
        delete memory.haul.out;

    if (Object.keys(memory.haul).length <= 0)
        delete memory.haul;
}

Room.needsResource = function(roomName, resourceType)
{
    if (!Room.isMyBase(roomName))
        return false;

    let room = Game.rooms[roomName];

    let baseLabMemory = Room.getBaseLabsMemory(roomName);
    if (baseLabMemory && baseLabMemory.boostRequests && baseLabMemory.boostRequests.some(b => b.b == resourceType))
        return true;

    switch (resourceType)
    {
        case RESOURCE_ENERGY:
            return (Room.inDanger(roomName) || Room.beingNuked(roomName) || (Room.sendingAwayResources() && Room.getStoredResourceAmount(romName, resourceType) < 10000));// || room.constructionSites.length > 0 || (room.controller.level < 8 && !Room.getBaseMemory(roomName).shipTarget));
            
        case RESOURCE_CATALYZED_GHODIUM_ACID:
            return (room.controller.level < 8 && !Room.getBaseMemory(roomName).shipTarget);

        case RESOURCE_CATALYZED_GHODIUM_ALKALIDE:
        case RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE:
        case RESOURCE_CATALYZED_ZYNTHIUM_ACID:
        case RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE:
        

        case RESOURCE_GHODIUM_ALKALIDE:
        case RESOURCE_ZYNTHIUM_ALKALIDE:
        case RESOURCE_ZYNTHIUM_ACID:
        case RESOURCE_LEMERGIUM_ALKALIDE:
        

        case RESOURCE_GHODIUM_OXIDE:
        case RESOURCE_ZYNTHIUM_OXIDE:
        case RESOURCE_ZYNTHIUM_HYDRIDE:
        case RESOURCE_LEMERGIUM_OXIDE:
            return (Memory.empire && Memory.empire.warfare && Memory.empire.warfare.attackingBases && Memory.empire.warfare.attackingBases.some(rn => rn == roomName));

        case RESOURCE_CATALYZED_KEANIUM_ALKALIDE:
        case RESOURCE_KEANIUM_ALKALIDE:
        case RESOURCE_KEANIUM_OXIDE:
            return (Room.inDanger(roomName) || (Memory.empire && Memory.empire.warfare && Memory.empire.warfare.attackingBases && Memory.empire.warfare.attackingBases.some(rn => rn == roomName)));

        case RESOURCE_CATALYZED_LEMERGIUM_ACID:
        case RESOURCE_LEMERGIUM_ACID:
        case RESOURCE_LEMERGIUM_HYDRIDE:
            return (Room.inDanger(roomName) || Room.beingNuked(roomName));
    }

    return false;
}