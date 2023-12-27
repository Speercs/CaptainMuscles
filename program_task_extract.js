'use strict'

let Task = require('program_task');

class Task_Extract extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (!room)
            return TASK_RESULT_COMPLETE;

        let mineral = this.getTarget();
        if (!mineral || mineral.ticksToRegeneration || !mineral.mineralAmount)
        {
            let container = creep.lookForFirstInRange(LOOK_STRUCTURES, 1, s => s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0);
            if (container)
            {
                let nearbyResources = [container].concat(container.lookForInRange(LOOK_RESOURCES, 1));
                nearbyResources = nearbyResources.concat(container.lookForInRange(LOOK_TOMBSTONES, 1, s => s.store.getUsedCapacity() > 0 ));
    
                let resourceSum = _.sum(nearbyResources, nr => { if (nr.store) return nr.store.getUsedCapacity(); return nr.amount; } );
    
                creep.room.requestResourcePickup(container, resourceSum, 0, 0);
            }

            if ((!mineral || !mineral.mineralType) && Room.isMyBase(room.name))
            {
                if (room.extractor)
                    room.extractor.destroy();
            }
            
            return TASK_RESULT_COMPLETE;
        }
            
        let container = mineral.container;
        let extractor = mineral.extractor;

        if (!extractor || !container || !container.store)
            return TASK_RESULT_COMPLETE;

        if (this.avoidLair())
            TASK_RESULT_BREAK;

        if (this.moveToTarget(container, 0))
            return TASK_RESULT_BREAK;

        if (extractor.coolDown)
        {
            this.sleep(extractor.coolDown);
            return TASK_RESULT_BREAK;
        }

        let containerSpace = container.store.getFreeCapacity();
        if (containerSpace >= creep.harvestPower)
            creep.harvest(mineral);

        
        if (creep.memory.n == 0 && (!this.memory.rpu || Game.time - this.memory.rpu >= 20))
        {
            this.requestPickup(creep, mineral);
        }

        this.sleep(EXTRACTOR_COOLDOWN);
        return TASK_RESULT_BREAK;
    }

    requestPickup(creep, mineral)
    {
        this.memory.rpu = Game.time;
        let additionalPerTick = 0;
        if (mineral.mineralAmount > 0)
            additionalPerTick = Mineral.getMaxResourceInPerTick(mineral.room.name, mineral.id);
        creep.room.requestResourcePickup(mineral, mineral.getNearbyResourceCount(), additionalPerTick, mineral.mineralAmount);
    }
}

module.exports = Task_Extract
