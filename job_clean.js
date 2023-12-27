'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Clean extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Clean.constructor - executing');

        this.jobType = 'clean';
        this.desiredSpawnType = 'carry';
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

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory)
            return null;

        let isSourceKeeperRoom = Room.isSourceKeeperRoom(this.roomName);
        if (!isSourceKeeperRoom && !Room.isMyBase(this.roomName) && !roomMemory.demolish)
            return null;

        if (isSourceKeeperRoom && !roomMemory.clear)
            return null;

        // if (this.roomName == 'W49N31')
        //     console.log('Job_Clean.getTask - ' + this.roomName + ' - room is valid');

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && creep.getResourceAmount() > 0)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.getCreeps().length > 0)
            return null;

        // if (this.roomName == 'W49N31')
        //     console.log('Job_Clean.getTask - ' + this.roomName + ' - no existing creeps');

        let energyOnly = false;
        // if (!this.room.terminal || !this.room.terminal.my)
        //     energyOnly = true;

        // if (this.roomName == 'W49N31')
        //     console.log('Job_Clean.getTask - ' + this.roomName + ' - energyOnly: ' + energyOnly);

        let nearbyResources = this.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType == RESOURCE_ENERGY || (!energyOnly && Room.getResourceAmountLevel(this.roomName, r.resourceType) < constants.RESOURCE_LEVEL_EXCESS) });
        //if (nearbyResources.length <= 0)
            nearbyResources = nearbyResources.concat(this.room.find(FIND_RUINS, { filter: s => s.store.getUsedCapacity() > 0 && (!energyOnly || s.store.getUsedCapacity(RESOURCE_ENERGY) > 0) }));
        //if (nearbyResources.length <= 0)
            nearbyResources = nearbyResources.concat(this.room.find(FIND_TOMBSTONES, { filter: s => s.store.getUsedCapacity() > 0 && (!energyOnly || s.store.getUsedCapacity(RESOURCE_ENERGY) > 0) }));
        if (isSourceKeeperRoom)
            nearbyResources = nearbyResources.concat(this.room.find(FIND_STRUCTURES, { filter: s => s.store && s.effects && s.effects.length > 0 && s.effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER) && s.store.getUsedCapacity() > 0 && (!energyOnly || s.store.getUsedCapacity(RESOURCE_ENERGY) > 0) }))
        
        nearbyResources = nearbyResources.filter(r => r.isSafe());
        // if (this.roomName == 'W49N31')
        //     console.log('Job_Clean.getTask - ' + this.roomName + ' - nearbyResources found: ' + nearbyResources.length);

        let bonfirePos = this.room.bonfirePos;
        if (bonfirePos)
            nearbyResources = _.filter(nearbyResources, nr => nr.pos.getRangeTo(bonfirePos) > 1);

        // if (this.roomName == 'W49N31')
        //     console.log('Job_Clean.getTask - ' + this.roomName + ' - nearbyResources not next to bonfire: ' + nearbyResources.length);

        if (nearbyResources.length <= 0)
            return null

        let resourceType = null;
        if (energyOnly)
            resourceType = RESOURCE_ENERGY;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'clean', program: 'task_clean', data: { r: this.roomName, res: resourceType }};
    }
}

module.exports = Job_Clean;
