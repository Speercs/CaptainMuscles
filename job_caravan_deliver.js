'use strict'

const constants = require('constants');
let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');
const Room_Updater = require('./program_room_updater');

class Job_Caravan_Deliver extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Caravan_Deliver.constructor - executing');

        this.jobType = 'caravan_deliver';
        this.desiredSpawnType = 'carry';

        let missionInfo = { type: 'caravan_deliver', room: this.roomName };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (missionMemory)
            this.missionMemory = missionMemory;
    }

    getDesiredSpawn(spawn)
    {
        if (!this.missionMemory)
            return null;

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task };
    }

    getTask(creep, spawn)
    {
        if (!this.missionMemory)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let sourceRoomName;

        let remainingTime = this.missionMemory.expireTime - Game.time;
        let targetSpot = new RoomPosition(25, 25, this.roomName);

        if (creep)
        {
            sourceRoomName = creep.room.name;
            let distanceToTarget = targetSpot.toWorldPosition().getRangeTo(creep.wpos);
            let timeToReach = distanceToTarget * 2;

            if (creep.ticksToLive < timeToReach || remainingTime < timeToReach)
            {
                console.log('Job_Caravan_Deliver.getTask - ' + this.roomName + ' - not enough time for ' + sourceRoomName);
                return null;
            }
                
        }
        else if (spawn)
        {
            sourceRoomName = spawn.room.name
            let distanceToTarget = targetSpot.toWorldPosition().getRangeTo(spawn.wpos);
            let timeToReach = distanceToTarget * 2;

            if (remainingTime < timeToReach)
            {
                console.log('Job_Caravan_Deliver.getTask - ' + this.roomName + ' - not enough time for ' + sourceRoomName);
                return null;
            }
        }

        let totalNeededCapacity = 0;

        for (let resourceType in this.missionMemory.accepts)
        {
            console.log('Job_Caravan_Deliver.getTask - ' + this.roomName + ' - checking ' + resourceType + ' in ' + sourceRoomName);
            if (this.missionMemory.accepts[resourceType] > 0 && Room.getStoredResourceAmount(this.roomName, resourceType) > 0)
                totalNeededCapacity += this.missionMemory.accepts[resourceType];
        }

        if (totalNeededCapacity <= 0)
        {
            console.log('Job_Caravan_Deliver.getTask - ' + this.roomName + ' - not enough resources in ' + sourceRoomName);
            return null;
        }

        let totalCapacity = 0;
        if (creep)
        {
            let creepCarry = creep.getResourceAmount();
            if (creepCarry > 0)
            {
                let creepHasResource = false;
                for (let resourceType in this.missionMemory.accepts)
                {
                    creepHasResource = creep.getResourceAmount(resourceType) > 0;
                    if (creepHasResource)
                        break;
                }

                if (!creepHasResource)
                    return null;
            }

            totalCapacity = this.getTotalSpawnedCreepCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
        }

        console.log('Job_Caravan_Deliver.getTask - ' + this.roomName + ' - returning task for ' + sourceRoomName);

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'caravan_deliver', program: 'task_caravan_deliver', data: { r: this.roomName }};
    }
}

module.exports = Job_Caravan_Deliver;
