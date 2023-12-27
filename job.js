'use strict'

class Job
{
    constructor (roomName, id, data)
    {
        //console.log('Job.constructor - executing');
        this.roomName = roomName;

        this.id = id;
        this.data = data;
    }

    get room()
    {
        return Game.rooms[this.roomName];
    }

    get memory()
    {
        return Room.getMemory(this.roomName);
    }

    getCreepCount()
    {
        return this.getCreeps().length;
    }

    getCreeps()
    {
        return Room.getJobCreeps(this.roomName, this.id);

        if (!this.creeps)
            this.creeps = Room.getJobCreeps(this.roomName, this.id);
        return this.creeps;
    }

    getCreepMemories()
    {
        return Room.getJobCreepMemories(this.roomName, this.id);

        if (!this.creepMemories)
            this.creepMemories = Room.getJobCreepMemories(this.roomName, this.id);
        return this.creepMemories;
    }

    getSpawnedCreeps()
    {
        return Room.getJobSpawnedCreeps(this.roomName, this.id);

        if (!this.spawnedCreeps)
            this.spawnedCreeps = Room.getJobSpawnedCreeps(this.roomName, this.id);
        return this.spawnedCreeps;
    }

    getTotalCreepCapacity()
    {
        return (_.sum(this.getCreeps().map(c => c.store.getCapacity())) || 0);
    }

    getTotalCreepFreeCapacity()
    {
        return (_.sum(this.getCreeps().map(c => c.store.getFreeCapacity())) || 0);
    }

    getTotalSpawnedCreepCapacity()
    {
        return (_.sum(this.getSpawnedCreeps().map(c => c.store.getCapacity())) || 0);
    }

    getTotalSpawnedCreepFreeCapacity()
    {
        return (_.sum(this.getSpawnedCreeps().map(c => c.store.getFreeCapacity())) || 0);
    }

    getTotalEnergyIn()
    {
        return 0;
    }

    getTotalEnergyOut()
    {
        return 0;
    }

    getTotalCostPerTick()
    {
        return (_.sum(this.getCreeps().map(c => c.memory.costPerTick)) || 0);
    }

    creepAdded(creepName, jobMemory)
    {

    }

    creepRemoved(creepName)
    {

    }

    getDesiredSpawn(spawn)
    {

    }

    getTask(creep)
    {
    }

    getTaskDirect()
    {
        return null;
    }

    layOffCreep(creep)
    {
        if (creep.memory.pid)
            kernel.scheduler.callProcessFunction(creep.memory.pid, 'laidOff');
    }

    layOffAllCreeps()
    {
        let creeps = this.getCreeps();

        for (let creep of creeps)
        {
            if (creep.memory.pid)
                kernel.scheduler.callProcessFunction(creep.memory.pid, 'laidOff');
        }
    }
}

module.exports = Job;
