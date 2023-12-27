'use strict'

let Job = require('job');

class Job_Reactor_Fill extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Reactor_Fill.constructor - executing');

        this.jobType = 'reactor_fill';
        this.desiredSpawnType = 'reactor_fill';

        this.isMilitary = true;
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let desiredType = this.desiredSpawnType;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: desiredType, task: task };
    }

    getTask(creep, spawn)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (spawn && Room.getStoredResourceAmount(spawn.room.name, RESOURCE_THORIUM) <= 0)
            return null;

        if (creep && Room.getStoredResourceAmount(creep.room.name, RESOURCE_THORIUM) <= 0)
            return null;

        let fromPosition;
        let ticksToLive;
        let fromObject;

        if (creep)
        {
            fromPosition = creep.wpos;
            ticksToLive = creep.ticksToLive;
            fromObject = creep;
        }
        else if (spawn)
        {
            fromPosition = spawn.wpos;
            ticksToLive = CREEP_LIFE_TIME;
            fromObject = spawn;
        }
        else
        {
            return null;
        }

        let roomMemory = Room.getMemory(this.roomName);
        let reactorPosition = new RoomPosition(roomMemory.reactor.x, roomMemory.reactor.y, this.roomName).wpos;
        let distanceToReactor = fromPosition.getRangeTo(reactorPosition);

        if (distanceToReactor >= ticksToLive / 3)
            return null;

        let creepCapacity = 400;
        let spawnTime = 0;
        if (spawn)
        {
            let repeatCount = Math.max(Math.min(Math.floor(spawn.room.energyCapacityAvailable / 300), 8), 1);
            creepCapacity = repeatCount * CARRY_CAPACITY;
            spawnTime = Math.max(Math.min(Math.floor(spawn.room.energyCapacityAvailable / 300), 8), 1) * 6 * CREEP_SPAWN_TIME;
        }

        if (creep && creep.store)
        {
            creepCapacity = creep.store.getCapacity(RESOURCE_THORIUM);
        }
            

        let reactorSpace = Reactor.availableSpace(this.roomName) + 200;
        let effectiveReactorSpace = reactorSpace + distanceToReactor + spawnTime;
        let carryTotal = this.getTotalCreepCapacity();

        console.log('Job_Reactor_Fill.getTask - ' + fromObject.room.name + ' - reactorSpace: ' + reactorSpace + ', effectiveReactorSpace: ' + effectiveReactorSpace + ', carryTotal: ' + carryTotal + ', distanceToReactor: ' + distanceToReactor + ', spawnTime: ' + spawnTime + ', creepCapacity: ' + creepCapacity);
        if (effectiveReactorSpace < creepCapacity)
            return null;

        if ((carryTotal + creepCapacity) > effectiveReactorSpace)
            return null;


        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'reactor_fill', program: 'task_reactor_fill', data: { x: roomMemory.reactor.x, y: roomMemory.reactor.y, r: this.roomName }};
    }
}

module.exports = Job_Reactor_Fill;
