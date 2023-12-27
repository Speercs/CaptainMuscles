'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Collect extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'collect', room: this.data.room, source: this.data.source });

        this.desiredSpawnType = 'carry';

        //console.log('Mission_Collect.constructor - executing');
    }

    run()
    {
        super.run();

        return this.suicide();

        //console.log('Mission_Collect.run - ' + this.data.room + ' - executing');

        let source = Game.getObjectById(this.data.source);
        if (source && source.link)
            return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        let roomMemory = Room.getMemory(this.data.room);
        if (!roomMemory || !roomMemory.sources || !roomMemory.sources[this.data.source])
            return;

        let sourceMemory = roomMemory.sources[this.data.source];
        if (sourceMemory.l && !roomMemory.clear)
            this.layOffAllCreeps();
    }

    updateCreepInfo()
    {
        super.updateCreepInfo();

        let spawnedCreeps = this.getSpawnedCreeps();
        let spawnedCreepNames = spawnedCreeps.map(c => c.name);

        for (let creep of this.getSpawnedCreeps())
            creep.memory.mission.creeps = spawnedCreepNames;
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        let task = this.getTask(creep);
        if (!task)
            return null;

        let nearestBase = Room.getNearestBase(this.data.room);

        let maxParts = 20;
        if (nearestBase)
        {
            if (nearestBase.isBootstrapping())
                maxParts = 2;
            else if (nearestBase.controller.level < 7)
                maxParts = 16;
        }

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        let totalCapacity = 0;
        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            let creepSpace = creep.getFreeSpace();
            if (creepSpace <= 0)
                return null;

            totalCapacity = this.getTotalSpawnedCreepCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
        }

        let source = Game.getObjectById(this.data.source);
        if (!source)
            return null;

        let roomMemory = Room.getMemory(this.data.room);
        if (!roomMemory)
            return null;

        if (source.memory.l && !roomMemory.clear)
            return null;

        let nearbyResources = source.pos.findInRange(FIND_DROPPED_RESOURCES, 2);
        nearbyResources = nearbyResources.concat(source.pos.findInRange(FIND_STRUCTURES, 2, { filter: s => s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0 }));
        nearbyResources = nearbyResources.concat(source.pos.findInRange(FIND_TOMBSTONES, 2, { filter: s => s.store.getUsedCapacity() > 0 }));
        let resourceSum = _.sum(nearbyResources, nr => { if (nr.store) return nr.store.getUsedCapacity(); return nr.amount; } );
        if (resourceSum <= 0 || (creep && resourceSum < creep.store.getCapacity()))
            return null;

        if (totalCapacity >= resourceSum)
            return null;

        let utility = 1.0 - (totalCapacity / resourceSum);

        return { utility: utility, task: 'collect_near', program: 'task_collect_near', data: { t: source.id, x: source.pos.x, y: source.pos.y, r: source.room.name, res: RESOURCE_ENERGY }};
        //return { utility: utility, task: 'collect_chain', program: 'task_collect_chain', data: { t: source.id, x: source.pos.x, y: source.pos.y, r: source.room.name, res: RESOURCE_ENERGY }};
    }
}

module.exports = Mission_Collect
