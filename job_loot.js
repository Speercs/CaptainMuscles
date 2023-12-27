'use strict'

let Job = require('job');

class Job_Loot extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Loot.constructor - executing');

        this.jobType = 'loot';
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
        if (!this.room || !this.room.memory || this.room.memory.demolish || !this.room.memory.loot)
            return null;

        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            let creepSpace = creep.getFreeSpace();
            if (creepSpace <= 0)
                return null;
        }

        let nearestBase = Room.getNearestBase(this.roomName);
        if (!nearestBase)
            return null;

        if (!nearestBase.storage || !nearestBase.storage.my || nearestBase.storage.store.getFreeCapacity() < 10000)
            return null;

        let energyOnly = false;
        if (!nearestBase.terminal || !nearestBase.terminal.my)
            energyOnly = true;

        let lootableStructures = [];
        if (this.room.storage && !this.room.storage.my)
            lootableStructures.push(this.room.storage);
        if (this.room.terminal && !this.room.terminal.my)
            lootableStructures.push(this.room.terminal);
        if (this.room.factory && !this.room.factory.my)
            lootableStructures.push(this.room.factory);
            
        //lootableStructures = this.room.find(FIND_STRUCTURES);
        lootableStructures = lootableStructures.concat(this.room.find(FIND_RUINS));

        // let lootableStructures = this.room.find(FIND_STRUCTURES, { filter: st => st.isLootable() && (!energyOnly || st.store.getUsedCapacity(RESOURCE_ENERGY) > 1000) });
        // if (lootableStructures.length <= 0)
        //     return null;


        // let distanceToBase = global.distanceBetweenRooms(this.roomName, nearestBase.name);
        // let desiredCreepCount = (distanceToBase + 1) * 2;
        // let creepCount = this.getCreeps().length
        // if (creepCount >= desiredCreepCount)
        //     return null;
        //
        // //console.log('Job_Loot.getTask - ' + this.data.room + ' - returning task');
        //
        // let utility = 1.0 - (creepCount.length / desiredCreepCount);

        let lootCount = 0;
        for (let lootable of lootableStructures)
        {
            if (lootable.my || !lootable.store)
                continue;
                
            if (energyOnly)
                lootCount += lootable.store.getUsedCapacity(RESOURCE_ENERGY);
            else
                lootCount += lootable.store.getUsedCapacity();
        }

        if (lootCount <= 0)
            return null;

        let utility = 1.0 - (this.getTotalCreepCapacity() / lootCount);
        if (utility <= 0)
            return null;

        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'loot', program: 'task_loot', data: { r: this.roomName }};
    }
}

module.exports = Job_Loot;
