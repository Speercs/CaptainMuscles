'use strict'

let util_logging = require('util_logging');
let Job = require('job');

class Job_Collect extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Collect.constructor - executing');

        this.jobType = 'collect';
        this.desiredSpawnType = 'carry';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task };
    }

    getTask(creep, spawn)
    {
        if (!this.memory)
            return null;

        let source = Game.getObjectById(this.data.source);
        if (!source)
            return null;

        if (source.memory.l && !this.memory.clear)
            return null;

        if (source.link)
            return null;

        let totalCapacity = 0;
        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            let creepCarry = creep.getResourceAmount();
            if (creepCarry > 0)
                return null;
        }

        // let nearbyResources = source.lookForInRange(LOOK_RESOURCES, 1);
        // nearbyResources = nearbyResources.concat(source.lookForInRange(LOOK_STRUCTURES, 1, s => s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0));
        // nearbyResources = nearbyResources.concat(source.lookForInRange(LOOK_TOMBSTONES, 1, s => s.store.getUsedCapacity() > 0 ));

        // let resourceSum = _.sum(nearbyResources, nr => { if (nr.store) return nr.store.getUsedCapacity(); return nr.amount; } );

        let resourceSum = source.getNearbyResourceCount();
        
        // let resourceSum = 0;
        // if (source.container)
        //     resourceSum = source.container.store.getUsedCapacity();
        // else
        //     resourceSum = source.getNearbyResourceCount();

        let fromPos = null;
        if (creep)
            fromPos = creep.pos;
        else
            fromPos = spawn.pos;

        let sourceAdditionalEnergy = 0;
        if (source.energy > 0)
        {
            let distanceToSource = fromPos.wpos.getRangeTo(source.wpos);
            let sourceEnergyPerTick = Source.getMaxEnergyInPerTick(this.roomName, this.data.source);
            sourceAdditionalEnergy = Math.min(distanceToSource * sourceEnergyPerTick, source.energy);
            //console.log('Job_Collect.getTask - ' + this.roomName + ' - ' + this.data.source + ' - resourceSum: ' + resourceSum + ', sourceAdditionalEnergy: ' + sourceAdditionalEnergy);
            resourceSum += sourceAdditionalEnergy;
        }

        if (resourceSum <= 0)
            return null;

        if (creep)
        {
            totalCapacity = this.getTotalSpawnedCreepFreeCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepFreeCapacity();
        }

        // if (this.roomName == 'W34N24')
        //     console.log('Job_Collect.getTask - ' + util_logging.roomLink(this.roomName) + ' - ' + this.data.source + ' - resourceSum: ' + (resourceSum - sourceAdditionalEnergy) + ', sourceAdditionalEnergy: ' + sourceAdditionalEnergy + ', totalCapacity: ' + totalCapacity);

        if (totalCapacity >= resourceSum)
            return null;

        let utility = 1.0 - (totalCapacity / resourceSum);
        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'collect_near', program: 'task_collect_near', source: source.id, data: { t: source.id, x: source.pos.x, y: source.pos.y, r: source.room.name }};
    }
}

module.exports = Job_Collect;
