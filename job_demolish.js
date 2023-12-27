'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Demolish extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Demolish.constructor - executing');

        this.jobType = 'demolish';
        this.desiredSpawnType = 'work';
        this.desiredSpawnType2 = 'worky';
        this.desiredSpawnType3 = 'fast_work';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;
            
        let desiredSpawnType = this.desiredSpawnType;
        if (Game.map.getRoomLinearDistance(spawn.room.name, this.roomName) > 1)
        {
            desiredSpawnType = this.desiredSpawnType3;
        }
        else
        {
            let roomMemory = Room.getMemory(this.roomName)
            if (roomMemory && roomMemory.controller && (!roomMemory.controller.sm || roomMemory.controller.sm <= Game.time) && !roomMemory.controller.o)
                desiredSpawnType = this.desiredSpawnType2;
        }


        let boosts = this.getDesiredBoosts(spawn);
            
        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: desiredSpawnType, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        //console.log('Job_Demolish.getTask - ' + this.roomName + ' - checking');

        if (creep)
        {
            if (Game.map.getRoomLinearDistance(creep.room.name, this.roomName) > 1)
            {
                if (creep.memory.type != this.desiredSpawnType3)
                    return null;
            }
            else if (creep.memory.type != this.desiredSpawnType && creep.memory.type != this.desiredSpawnType2)
            {
                return null;
            }
            
        }

        if (creep && creep.memory.boosts && !creep.memory.boosts.find(b => b == 'XZH2O'))
            return null;

        if (creep && creep.memory.boostRequests && !creep.memory.boostRequests.find(br => br.boost == 'XZH2O'))
            return null;

        let roomMemory = Room.getMemory(this.roomName)
        if (!roomMemory)
            return null;

        if (roomMemory.controller && roomMemory.controller.sm && roomMemory.controller.sm > Game.time && roomMemory.controller.o != ME)
            return null;

        if (!roomMemory.demolish && !Room.isUnclaiming(this.roomName))
            return null;

        let maxDemo = roomMemory.maxDemo || 1;

        //console.log('Job_Demolish.getTask - ' + this.roomName + ' - marked for demolish');

        let thisCreeps = this.getCreeps();

        if (thisCreeps.length >= maxDemo)
            return null;

        //console.log('Job_Demolish.getTask - ' + this.roomName + ' - no creeps assigned');

        let utility = 1.0 - (thisCreeps.length / 3);
        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'demolish', program: 'task_demolish', data: { r: this.roomName }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn)
            return null;

        let room = Game.rooms[this.roomName];
        if (!room)
            return null;

        {
            let resourceLevel = Room.getResourceAmountLevel(spawn.room.name, 'XZH2O');
            let minResourceLevel = constants.RESOURCE_LEVEL_MODERATE;
            if (resourceLevel < minResourceLevel)
                return null;
        }

        if (Game.map.getRoomLinearDistance(spawn.room.name, this.roomName) > 1)
        {
            let resourceLevel = Room.getResourceAmountLevel(spawn.room.name, 'XZHO2');
            let minResourceLevel = constants.RESOURCE_LEVEL_MODERATE;
            if (resourceLevel < minResourceLevel)
                return null;

            return [ { b: 'XZH2O', r: 0 }, { b: 'XZHO2', r: 0 } ];
        }

        return [ { b: 'XZH2O', r: 0 } ];
    }
}

module.exports = Job_Demolish;
