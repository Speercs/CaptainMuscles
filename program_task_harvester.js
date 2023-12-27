'use strict'

let Task = require('program_task');

class Task_Harvester extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();

        this.memory.seenRoom = false;

        let target = this.getTarget();
        this.roomCheck(target);

        if (this.creep && this.creep.memory && this.creep.memory.n == 0)
        {
            let resourceCount = 0;
            let additionalEnergyPerTick = Source.getMaxEnergyInPerTick(this.memory.r, this.memory.t);
            let additionalEnergy = SOURCE_ENERGY_CAPACITY;
            if (target && target.getNearbyResourceCount)
            {
                resourceCount = target.getNearbyResourceCount();
                additionalEnergy = target.energy;
            }
    
            Room.requestResourcePickup(this.memory.r, this.memory.t, this.memory.x, this.memory.y, resourceCount, additionalEnergyPerTick, additionalEnergy);
        }
    }

    end()
    {
        if (this.memory)
        {
            let jobCreeps = Room.getJobSpawnedCreeps(this.memory.r, 'harvest_' + this.memory.t);
            if (!jobCreeps.some(c => this.creep && c.id == this.creep.id))
                Room.cancelResourcePickup(this.memory.r, this.memory.t);
        }

        super.end();
    }

    doTask(creep)
    {
        super.doTask();

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        // if (creep.memory.type == 'work')
        // {
        //     let nearestBase = Room.getNearestBase(this.memory.r);
        //     if (nearestBase && !nearestBase.isBootstrapping())
        //         return TASK_RESULT_COMPLETE;
        // }

        if (!this.memory.seenRoom)
            this.roomCheck(target);

        let roomMemory = Room.getMemory(this.memory.r);

        // if (this.memory.r == 'W4N9')
        //     console.log('Task_Harvester.doTask - ' + this.memory.r + ' - ' + creep.name + ' found target');

        if (target.lair)
        {
            if (roomMemory && !roomMemory.clear)
                return TASK_RESULT_COMPLETE;

            let dismantleTarget = this.creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: s => s.hits && s.effects && s.effects.length > 0 && s.effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER) && (!s.store || s.store.getUsedCapacity() <= 0) });
            if (dismantleTarget)
            {
                Room.cancelResourcePickup(this.memory.r, this.memory.t);
                return this.dismantleTarget(dismantleTarget);
            }
                
            if (this.avoidLair())
            {
                if (creep.getResourceAmount(RESOURCE_ENERGY) > 0)
                    creep._drop(RESOURCE_ENERGY);
                return TASK_RESULT_BREAK;
            }
        }

        if (roomMemory && roomMemory.controller && roomMemory.controller.r && roomMemory.controller.r != ME)
            return TASK_RESULT_COMPLETE;

        if (roomMemory && roomMemory.controller && roomMemory.controller.o && roomMemory.controller.o != ME)
            return TASK_RESULT_COMPLETE;

        // if (this.memory.r == 'W4N9')
        //     console.log('Task_Harvester.doTask - ' + this.memory.r + ' - ' + creep.name + ' avoided lair');

        let creepCarry = creep.getResourceAmount();
        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        if (creepCarry > creepEnergy)
        {
            this.dropOtherResources(creep);
            return TASK_RESULT_BREAK;
        }

        let creepCapacity = creep.store.getCapacity();
        let creepFull = creepCapacity > 0 && (creepCarry >= creepCapacity - creep.harvestPower);
        let isFirstCreep = (creep.memory.n == 0);

        let link = this.getLink();
        let container = this.getContainer();

        if (link && creepFull)
        {
            let linkEnergy = link.store.getUsedCapacity(RESOURCE_ENERGY);
            let linkSpace = LINK_CAPACITY - linkEnergy;

            if (linkEnergy >= 100)
                link.sendEnergy();

            if (this.moveToTarget(link, 1))
                return TASK_RESULT_BREAK;

            if (linkSpace > 0 && !creep.cantTransfer)
                creep._transfer(link, RESOURCE_ENERGY);

            if (linkSpace <= 0)
                return TASK_RESULT_BREAK;
        }

        if (!link && creepFull && container && container.store)
        {
            if (this.moveToTarget(container, 1))
                return TASK_RESULT_BREAK;

            if (creep.pos.getRangeTo(container) > 0)
                creep._transfer(container, RESOURCE_ENERGY);
        }

        if (creep.wpos.getRangeTo(target.wpos) > 1)
        {
            let containerPos = target.containerPos;
            let movedToSpot = false;
            if (!isFirstCreep && target.pos)
            {
                let positionsAroundTarget = target.pos.getOpenPositionsInRange(1);
                
                if (containerPos)
                {
                    let indexOfContainerPos = positionsAroundTarget.findIndex(p => p.x == containerPos.x && p.y == containerPos.y);
                    if (indexOfContainerPos > -1)
                    {
                        let removedPos = positionsAroundTarget.splice(indexOfContainerPos, 1);
                        positionsAroundTarget = removedPos.concat(positionsAroundTarget);
                    }
                }
    
                let moveTarget = target;
                if (positionsAroundTarget.length > creep.memory.n)
                {
                    movedToSpot = true;
                    moveTarget = positionsAroundTarget[creep.memory.n];
                    if (this.moveToTarget(moveTarget, 0))
                    {
                        if (!this.memory.dta && (creep.memory._trav && creep.memory._trav.path && creep.memory._trav.path.length > 0))
                            this.memory.dta = creep.memory._trav.path.length;
                        return TASK_RESULT_BREAK;
                    }
                }
            }

            if (!movedToSpot)
            {
                if (isFirstCreep && containerPos)
                {
                    if (this.moveToTarget(containerPos, 0))
                    {
                        if (!this.memory.dta && (creep.memory._trav && creep.memory._trav.path && creep.memory._trav.path.length > 0))
                            this.memory.dta = creep.memory._trav.path.length;
                        return TASK_RESULT_BREAK;
                    }
                }
                else
                {
                    if (this.moveToTarget(target, 1))
                    {
                        if (!this.memory.dta && (creep.memory._trav && creep.memory._trav.path && creep.memory._trav.path.length > 0))
                            this.memory.dta = creep.memory._trav.path.length;
                        return TASK_RESULT_BREAK;
                    } 
                }
            }
        }

        // if (this.memory.r == 'W4N9')
        //     console.log('Task_Harvester.doTask - ' + this.memory.r + ' - ' + creep.name + ' approached target');

        // let buildContainer = (creep.room.isMyBase() && !creep.room.isBootstrapping());
        // if (!buildContainer)
        //     buildContainer = (!creep.room.controller || creep.room.controller.reservedByMe());
        let buildContainer = !creep.room.controller;

        if (!link && creepFull)
        {
            //if (buildContainer)
            {
                let result = this.workOnContainer(creep, target, container, buildContainer);
                if (result)
                    return result;
            }
        }

        // if (this.memory.r == 'W4N9')
        //     console.log('Task_Harvester.doTask - ' + this.memory.r + ' - ' + creep.name + ' worked on container');

        if (isFirstCreep && (!this.memory.rpu || Game.time - this.memory.rpu >= 20))
        {
            if (link )
            {
                Room.cancelResourcePickup(this.memory.r, this.memory.t);
            }
            else
            {
                let nearbyResourceCount = target.getNearbyResourceCount();
                if (!nearbyResourceCount && buildContainer && container && ((container.hits && container.hits < container.hitsMax - creep.repairPower) || (container.progressTotal)))
                {
                    Room.cancelResourcePickup(this.memory.r, this.memory.t);
                }
                else
                {
                    this.memory.rpu = Game.time;
                    let additionalEnergyPerTick = 0;
                    if (target.energy > 0)
                        additionalEnergyPerTick = Source.getMaxEnergyInPerTick(target.room.name, target.id);

                    creep.room.requestResourcePickup(target, nearbyResourceCount, additionalEnergyPerTick, target.energy);
                }

            }

        }

        if (target.energy > 0)
        {
            creep.harvest(target);
        }
        // If the source is regenerating
        else if (target.ticksToRegeneration)
        {
            // Sleep until it is replenished
            let sleepTime = target.ticksToRegeneration;
            // Unless its under the effect of a power, if so, sleep until one cycle has surely completed
            if (target.getRegenPowerTicksRemaining())
                sleepTime = 15;

            // If there is a lair nearby, make sure we'll be safe when sleeping
            if (this.avoidLair(sleepTime))
            {
                if (creep.getResourceAmount(RESOURCE_ENERGY) > 0)
                    creep._drop(RESOURCE_ENERGY);
                return TASK_RESULT_BREAK;
            }

            // Go the fuck to sleep already
            this.sleep(sleepTime);
            //console.log('Task_Harvester.doTask - ' + this.memory.r + ' - ' + creep.name + ' sleeping for ' + target.ticksToRegeneration + ' ticks');
        }


        return TASK_RESULT_BREAK;
    }

    dropOtherResources(creep)
    {
        for (let resourceType of RESOURCES_ALL)
        {
            if (resourceType == RESOURCE_ENERGY)
                continue;

            let creepResource = creep.store.getUsedCapacity(resourceType);
            if (creepResource > 0)
            {
                creep._drop(resourceType);
                return;
            }
        }
    }

    roomCheck(target)
    {
        if (!target)
            return null;

        let room = Game.rooms[this.memory.r];
        if (room)
        {
            this.memory.seenRoom = true;

            //let link = _.find(target.pos.findInRange(FIND_MY_STRUCTURES, 2, { filter: s => s.structureType == STRUCTURE_LINK }));
            let link = target.pos.lookForFirstInRange(LOOK_STRUCTURES, 2, s => s.my && s.structureType == STRUCTURE_LINK );
            if (link)
            {
                this.memory.linkId = link.id;
                target.link = link;
            }

            let container = target.pos.lookForFirstInRange(LOOK_STRUCTURES, 1, s => s.structureType == STRUCTURE_CONTAINER );
            if (!container)
                container = target.pos.lookForFirstInRange(LOOK_CONSTRUCTION_SITES, 1, s => s.structureType == STRUCTURE_CONTAINER );

            if (container)
            {
                if (link)
                {
                    container.destroy();
                    target.container = null;
                }
                else
                {
                    target.container = container;
                    this.memory.containerId = container.id;
                }
            }
        }
    }

    workOnContainer(creep, target, container, buildContainer)
    {
        if (!container)
        {
            //container = _.find(target.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType == STRUCTURE_CONTAINER }));
            container = target.pos.lookForFirstInRange(LOOK_STRUCTURES, 1, s => s.structureType == STRUCTURE_CONTAINER );
            if (container)
            {
                target.container = container;
                this.memory.containerId = container.id;
                return null;
            }
        }

        if (!buildContainer && (!container || container.progressTotal))
            return null;

        if (!container)
        {
            //container = _.find(target.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: s => s.structureType == STRUCTURE_CONTAINER }));
            container = target.pos.lookForFirstInRange(LOOK_CONSTRUCTION_SITES, 1, s => s.structureType == STRUCTURE_CONTAINER );
            if (!container && creep.memory.n == 0)
            {
                creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
                return TASK_RESULT_BREAK;
            }

            if (container)
                this.memory.containerId = container.id;
        }

        if (container && container.progressTotal)
        {
            let energyOnGround = _.find(creep.pos.lookFor(LOOK_RESOURCES), r => r.resourceType == RESOURCE_ENERGY);
            if (energyOnGround)
                creep.pickup(energyOnGround);
            creep.build(container);
            return TASK_RESULT_BREAK;
        }

        if (container && container.hits && container.hits < container.hitsMax - creep.repairPower)
        {
            creep.repair(container);
            return TASK_RESULT_BREAK;
        }

        return null;
    }

    getContainer()
    {
        if (!this.memory.containerId)
            return null;

        return Game.getObjectById(this.memory.containerId);
    }

    getLink()
    {
        if (!this.memory.linkId)
            return null;

        return Game.getObjectById(this.memory.linkId);
    }
}

module.exports = Task_Harvester
