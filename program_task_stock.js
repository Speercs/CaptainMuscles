'use strict'

const constants = require('constants');
let Task = require('program_task');

class Task_Stock extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (room)
            this.room = room;

        if (!this.room || !this.room.stockerPos)
            return TASK_RESULT_COMPLETE;

        this.standPos = this.room.stockerPos;

        if (creep.ticksToLive < 50)
        {
            let creepCarry = creep.getResourceAmount();
            if (creepCarry > 0)
                return this.deliverResourceToStorage();

            return TASK_RESULT_COMPLETE;
        }

        let offeringLink = this.room.getNextOfferingLink();
        let requestingLink = this.room.getNextRequestingLink();
        let coreLink = this.room.coreLink;

        if (requestingLink && coreLink && !coreLink.sentEnergy && coreLink.store.getFreeCapacity(RESOURCE_ENERGY) <= 0)
        {
            //console.log('Task_Stock.doTask - ' + this.memory.r + ' - sending to link: ' + requestingLink.id + ' - ' + requestingLink.pos)
            coreLink.transferEnergy(requestingLink);
            coreLink.sentEnergy = true;
            this.room.removeNextLinkRequest();
        }
        else if (offeringLink && coreLink && !offeringLink.sentEnergy && coreLink.store.getUsedCapacity(RESOURCE_ENERGY) <= 0)
        {
            offeringLink.transferEnergy(coreLink);
            offeringLink.sentEnergy = true;
            this.room.removeNextLinkOffer();
        }

        if (this.moveToTarget(this.standPos, 0))
            return TASK_RESULT_BREAK;

        let creepCarry = creep.store.getUsedCapacity();
        let creepSpace = creep.store.getFreeCapacity();

        if (creepCarry > 0 && !creep.cantWithdraw && !creep.cantTransfer)
        {
            if (this.putAwaySomething(creep))
                return TASK_RESULT_BREAK;
        }

        if (creepSpace > 0 && !creep.cantWithdraw && !creep.cantTransfer)
        {
            if (this.pickUpSomething(creep, creepSpace))
                return TASK_RESULT_BREAK;
        }

        if (!creep.cantTransfer && !creep.cantWithdraw)
            this.sleep(CREEP_SPAWN_TIME * 2);

        return TASK_RESULT_BREAK;
    }

    putAwaySomething(creep)
    {
        // if (this.room.name == 'E25S17')
        //     console.log('Task_Stock.putAwaySomething - ' + this.room.name + ' - ' + creep.name + ' - putting away something, energy: ' + creep.store.getUsedCapacity(RESOURCE_ENERGY) + ' - carry: ' + creep.store.getUsedCapacity());

        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            return this.putAwayEnergy(creep);

        if (creep.store.getUsedCapacity(RESOURCE_POWER) > 0 && this.room.powerSpawn && this.room.powerSpawn.store.getFreeCapacity(RESOURCE_POWER) >= POWER_SPAWN_POWER_CAPACITY * 0.5)
            return this.deliverResourceToTarget(this.room.powerSpawn, RESOURCE_POWER);

        if (creep.store.getUsedCapacity(RESOURCE_GHODIUM) > 0 && this.room.nuker && this.room.nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0)
            return this.deliverResourceToTarget(this.room.nuker, RESOURCE_GHODIUM);
            
            
        return this.deliverResourceToStorage();
    }

    putAwayEnergy(creep)
    {
        // if (this.room.name == 'E25S17')
        //     console.log('Task_Stock.putAwayEnergy - ' + this.room.name + ' - ' + creep.name + ' - puttingAwayEnergy');



        //let sinks = this.standPos.findInRange(FIND_MY_STRUCTURES, 1, { filter: s => (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 });
        let sinks = creep.lookForInRange(LOOK_STRUCTURES, 1, s => s.my && (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        if (sinks.length > 0)
            return this.deliverResourceToTarget(_.first(sinks), RESOURCE_ENERGY);

        let requestingLink = this.room.getNextRequestingLink();
        let coreLink = this.room.coreLink;
        if (requestingLink && coreLink && coreLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        {
            // if (this.room.name == 'E25S17')
            //     console.log('Task_Stock.putAwayEnergy - ' + this.room.name + ' - ' + creep.name + ' - putting energy in coreLink');
            return this.deliverResourceToTarget(coreLink, RESOURCE_ENERGY);
        }

        if (this.room.powerSpawn && this.room.powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) >= POWER_SPAWN_ENERGY_CAPACITY * 0.5)
            return this.deliverResourceToTarget(this.room.powerSpawn, RESOURCE_ENERGY);

        let energyLevel = Room.getResourceAmountLevel(this.room.name, RESOURCE_ENERGY);
        if (energyLevel >= constants.RESOURCE_LEVEL_NORMAL && this.room.nuker && this.room.nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            return this.deliverResourceToTarget(this.room.nuker, RESOURCE_ENERGY);

        // if (this.room.name == 'W48N32')
        //     console.log('Task_Stock.putAwayEnergy - ' + this.room.name + ' - ' + creep.name + ' - storing energy');

        return this.deliverResourceToStorage();
    }

    pickUpSomething(creep, creepSpace)
    {
        let offeringLink = this.room.getNextOfferingLink();
        let requestingLink = this.room.getNextRequestingLink();
        let coreLink = this.room.coreLink;

        if (!requestingLink && offeringLink && coreLink && coreLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            return this.getResourceFromTarget(coreLink, RESOURCE_ENERGY);

        let pickedUpAmount = 0;

        let droppedResource = creep.lookForFirstInRange(LOOK_RESOURCES, 1);
        if (droppedResource && Room.getResourceAmountLevel(this.room.name, droppedResource.resourceType) < constants.RESOURCE_LEVEL_EXCESS)
        {
            creep.pickup(droppedResource);
            pickedUpAmount += droppedResource.amount;
            if (pickedUpAmount >= creepSpace)
                return true;
        }

        let ruin = creep.lookForFirstInRange(LOOK_RUINS, 1, o => o.store.getUsedCapacity() > 0);
        if (ruin)
        {
            for (let resourceType of RESOURCES_ALL)
            {
                let resourceAmount = ruin.store.getUsedCapacity(resourceType);
                if (resourceAmount > 0 && Room.getResourceAmountLevel(this.room.name, resourceType) < constants.RESOURCE_LEVEL_EXCESS)
                {
                    creep.withdraw(ruin, resourceType, Math.min(creepSpace - pickedUpAmount, resourceAmount));
                    pickedUpAmount += resourceAmount;
                    if (pickedUpAmount >= creepSpace)
                        return true;
                    break;
                }
            }
        }

        if (pickedUpAmount > 0)
            return true;

        //let sinks = this.standPos.findInRange(FIND_MY_STRUCTURES, 1, { filter: s => (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 });
        let sinks = creep.lookForInRange(LOOK_STRUCTURES, 1, s => s.my && (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        if (sinks.length > 0)
        {
            if (this.getResourceFromStorage(RESOURCE_ENERGY, false, false, sinks[0].store.getFreeCapacity(RESOURCE_ENERGY)))
                return true;
        }

        if (requestingLink && coreLink)
        {
            let linkCapacity = coreLink.store.getFreeCapacity(RESOURCE_ENERGY);
            if (linkCapacity > 0 && Room.getStoredResourceAmount(this.memory.r, RESOURCE_ENERGY) > 0)
            {
                if (this.getResourceFromStorage(RESOURCE_ENERGY, false, false, Math.min(linkCapacity, creepSpace)))
                    return true;
            }

        }

        let powerSpawn = this.room.powerSpawn;
        if (powerSpawn)
        {
            let powerSpawnEnergyCapacity = powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY);
            if (powerSpawnEnergyCapacity > POWER_SPAWN_ENERGY_CAPACITY * 0.5 && Room.getStoredResourceAmount(this.memory.r, RESOURCE_ENERGY) > 0)
            {
                // if (this.room.name == 'W51N31')
                //     console.log('Task_Stock.pickUpSomething - ' + creep.name + ' - ' + this.room.name + ' - trying to get energy for power spawn');
                if (this.getResourceFromStorage(RESOURCE_ENERGY, false, false, Math.min(powerSpawnEnergyCapacity, creepSpace)))
                    return true;
            }

            let powerSpawnPowerCapacity = powerSpawn.store.getFreeCapacity(RESOURCE_POWER);
            if (powerSpawnPowerCapacity > POWER_SPAWN_POWER_CAPACITY * 0.5 && Room.getStoredResourceAmount(this.memory.r, RESOURCE_POWER) > 0)
            {
                // if (this.room.name == 'W51N31')
                //     console.log('Task_Stock.pickUpSomething - ' + creep.name + ' - ' + this.room.name + ' - trying to get power for power spawn');
                if (this.getResourceFromStorage(RESOURCE_POWER, false, false, Math.min(powerSpawnPowerCapacity, creepSpace)))
                    return true;
            }
        }

        let energyLevel = Room.getResourceAmountLevel(this.room.name, RESOURCE_ENERGY);
        if (energyLevel >= constants.RESOURCE_LEVEL_NORMAL && this.room.nuker)
        {
            let nuker = this.room.nuker;
            if (nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && Room.getStoredResourceAmount(this.memory.r, RESOURCE_ENERGY) > 0 && this.getResourceFromStorage(RESOURCE_ENERGY, false, false, 0))
                return true;
            if (nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && Room.getStoredResourceAmount(this.memory.r, RESOURCE_GHODIUM) > 0 && this.getResourceFromStorage(RESOURCE_GHODIUM, false, false, 0))
                return true;
        }

        if (this.fillFactory(creep))
            return true;

        return this.removeExcessResource(creep);
    }

    fillFactory(creep, creepCarry, creepEnergy, creepSpace)
    {
        if (this.room.controller.level < 7 || Room.sendingAwayResources(this.room.name))
            return false;

        let factory = this.room.factory;
        if (!factory)
            return false;

        if (factory.level && !factory.room.isPowerCreepActive(PWR_OPERATE_FACTORY, factory.level, true))
            return false;

        let resourcesChecked = {};

        for (let productType in COMMODITIES)
        {
            let recipe = COMMODITIES[productType];
            if (!recipe.level || factory.level == recipe.level)
            {
                for (let inputType in recipe.components)
                {
                    if (resourcesChecked[inputType])
                        continue;
                        
                    resourcesChecked[inputType] = 1;
                    let factoryAmount = factory.store.getUsedCapacity(inputType)
                    if (factoryAmount < constants.FACTORY_MIN_INPUT && Room.getStoredResourceAmount(this.room.name, inputType) - factoryAmount > 0)
                        return this.getResourceFromStorage(inputType);
                }
            }
        }

        return null;
    }

    removeExcessResource(creep)
    {
        // if (this.room.name == 'W51N31')
        //     console.log('Task_Stock.removeExcessResource - ' + creep.name + ' - ' + this.room.name + ' - executing');

        if (this.room.terminal && this.room.terminal.my && this.room.storage && this.room.storage.my)
        {
            let sendingAway = Room.sendingAwayResources(this.room.name) && this.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) >= 1000;

            let creepCapacity = creep.store.getCapacity();
            let terminalFull = (this.room.terminal.store.getFreeCapacity() < creepCapacity);
            let storageFull = (this.room.storage.store.getFreeCapacity() < creepCapacity);

            let resourceList = RESOURCES_ALL;
            if (sendingAway)
                resourceList = constants.RESOURCES_ALL_REVERSED;
            if (resourceList)
            {
                let factory = null;
                if (this.room.factory && this.room.factory.my)
                    factory = this.room.factory;
                let factoryResources = {};
                let rebuildFactory = false;
                if (factory)
                {
                    if (factory.level && !factory.room.isPowerCreepActive(PWR_OPERATE_FACTORY, factory.level, true))
                    {
                        if (factory.store.getUsedCapacity() <= 0)
                        {
                            console.log('Task_Stock.removeExcessResource - ' + this.room.name + ' - rebuilding factory');
                            factory.destroy();
                            factory = null;
                        }
                        else
                        {
                            rebuildFactory = true;
                        }
                    }
                }

                if (factory)
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
                }

                for (let resourceType of resourceList)
                {
                    // if (this.room.name == 'W51N31')
                    //     console.log('Task_Stock.removeExcessResource - ' + creep.name + ' - ' + this.room.name + ' - checking ' + resourceType);

                    if (factory)
                    {
                        let factoryAmount = factory.store.getUsedCapacity(resourceType);
                        if ((sendingAway || rebuildFactory) && factoryAmount > 0)
                            return this.getResourceFromTarget(factory, resourceType);

                        //let factoryUses = (constants.RESOURCES_TO_COMPRESS.indexOf(resourceType) >= 0 || constants.RESOURCES_TO_DECOMPRESS.indexOf(resourceType) >= 0);
                        //let factoryUses = (constants.FACTORY_INPUT_RESOURCES.indexOf(resourceType) >= 0);
                        let factoryUses = factoryResources[resourceType];

                        if (factoryUses && factoryAmount > constants.FACTORY_MIN_INPUT + creepCapacity)
                            return this.getResourceFromTarget(factory, resourceType);

                        if (!factoryUses && factoryAmount > 0)
                        {
                            //console.log('Task_Stock.removeExcessResource - ' + creep.name + ' - ' + this.memory.r + ' - removing ' + resourceType + ' from factory');
                            return this.getResourceFromTarget(factory, resourceType);
                        }
                    }

                    let desiredTerminalAmount = 2000;
                    if (resourceType == RESOURCE_ENERGY)
                        desiredTerminalAmount = 50000;

                    let terminalAmount = this.room.terminal.store.getUsedCapacity(resourceType);
                    let storageAmount = this.room.storage.store.getUsedCapacity(resourceType);

                    if (!terminalFull && (sendingAway || terminalAmount < desiredTerminalAmount) && storageAmount > 0)
                    {
                        // if (this.room.name == 'W51N31')
                        //     console.log('Task_Stock.removeExcessResource - ' + creep.name + ' - ' + this.room.name + ' - taking ' + resourceType + ' from storage');
                        return this.getResourceFromTarget(this.room.storage, resourceType);
                    }

                    if (!sendingAway && !storageFull && terminalAmount > desiredTerminalAmount + creepCapacity)
                    {
                        // if (this.room.name == 'W51N31')
                        //     console.log('Task_Stock.removeExcessResource - ' + creep.name + ' - ' + this.room.name + ' - taking ' + resourceType + ' from terminal');
                        return this.getResourceFromTarget(this.room.terminal, resourceType);
                    }
                    
                    if (Room.getResourceAmountLevel(this.room.name, resourceType) >= constants.RESOURCE_LEVEL_EXCESS)
                    {
                        if (storageAmount > 0)
                            return this.getResourceFromTarget(this.room.storage, resourceType);
                        if (terminalAmount > 0)
                            return this.getResourceFromTarget(this.room.terminal, resourceType);
                    }
                }
            }
        }

        return false;
    }
}

module.exports = Task_Stock
