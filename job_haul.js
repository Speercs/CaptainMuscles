'use strict'

let util_logging = require('util_logging');
let Job = require('job');

class Job_Haul extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Haul.constructor - executing');

        this.jobType = 'haul';
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
        let room = this.room;
        if (!room)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.haul)
            return null;
        
        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            let creepCarry = creep.getResourceAmount();
            if (creepCarry > 0)
                return null;
        }

        let fromThing = creep || spawn;
        
        let creeps = this.getCreeps();
            
        let task = this.getDropoffTask(fromThing, room, roomMemory, creeps);
        if (task)
            return task;

        task = this.getPickupTask(fromThing, room, roomMemory, creeps, creep);
        if (task)
            return task;
            
        return null;
    }

    getPickupTask(fromThing, room, roomMemory, creeps, creep)
    {
        if (!roomMemory.haul || !roomMemory.haul.out)
            return null;

        let requests = roomMemory.haul.out;
        let requestorIds = Object.keys(requests);

        let requestorCount = requestorIds.length;
        let removedRequestorCount = 0;

        for (let requestorId of requestorIds)
        {
            let requestor = Game.getObjectById(requestorId);
            if (!requestor || (requestor.lair && (!roomMemory.clear || !requestor.container)))
            {
                removedRequestorCount += 1;
                delete requests[requestorId];
                continue;
            }

            let request = requests[requestorId];
            let requestTotal = request.a;
            
            if (request.pt)
            {
                let distanceToRequestor = Source.getHarvesterDistanceToArrive(roomMemory.name, requestorId);
                if (distanceToRequestor <= 0)
                    distanceToRequestor = fromThing.wpos.getRangeTo(requestor.wpos);
                let additionalAmount = request.pt * distanceToRequestor;

                if (request.m)
                {
                    additionalAmount = Math.min(additionalAmount, request.m);
                }

                requestTotal += additionalAmount;
            }

            
            let existingHaulers = _.filter(creeps, c => c.hasTask({ n: 'task_collect_near', t: requestorId }));
            let existingFreeSpace = _.sum(existingHaulers, c => c.getFreeSpace());

            if (creep)
            {
                existingFreeSpace += creep.getFreeSpace();
            }
            else
            {
                let additionalSpace = Math.min(32, Math.ceil((fromThing.room.energyCapacityAvailable / 50) * (2 / 3))) * CARRY_CAPACITY;
                existingFreeSpace += additionalSpace;
            }
            
            if (existingFreeSpace == 0)
            {
                console.log('Job_Haul.getPickupTask - ' + this.roomName + ' - ' + requestorId + ' - requestTotal: ' + requestTotal + ', existingFreeSpace: ' + existingFreeSpace);
                console.log('Job_Haul.getPickupTask - ' + JSON.stringify(fromThing));
            }
            
            if (existingFreeSpace < requestTotal || (requestor.mineralType && !request.pt))
            {
                return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'collect_near', program: 'task_collect_near', source: requestorId, data: { t: requestorId, x: request.x, y: request.y, r: this.roomName } };
            }
        }

        if (removedRequestorCount >= requestorCount)
        {
            delete roomMemory.haul.out;
            if (!roomMemory.haul.in)
                delete roomMemory.haul;
        }

        return null;
    }

    getDropoffTask(fromThing, room, roomMemory, creeps)
    {
        if (!roomMemory.haul || !roomMemory.haul.in)
            return null;

        let requests = roomMemory.haul.in;
        let requestorIds = Object.keys(requests);

        let requestorCount = requestorIds.length;
        let removedRequestorCount = 0;

        for (let requestorId of requestorIds)
        {
            let requestor = Game.getObjectById(requestorId);
            if (!requestor)
            {
                removedRequestorCount += 1;
                delete requests[requestorId];
                continue;
            }

            let request = requests[requestorId];
            if (requestor.getFreeSpace(request.res) <= 0)
            {
                removedRequestorCount += 1;
                delete requests[requestorId];
                continue;
            }

            let existingHaulers = _.filter(creeps, c => c.hasTask({ n: 'task_supply', t: requestorId }));
            let existingCapacity = _.sum(existingHaulers, c => c.store.getFreeCapacity() + c.store.getUsedCapacity(request.res));
            let existingSupply = requestor.store.getUsedCapacity(request.res);

            //console.log('Job_Haul.getDropoffTask - ' + this.roomName + ' - request.a: ' + request.a + ', existingFreeSpace: ' + existingFreeSpace);
            
            if (existingCapacity + existingSupply < request.a)
            {
                return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'supply', program: 'task_supply', source: requestorId, data: { t: requestorId, x: request.x, y: request.y, r: this.roomName, res: request.res, amount: request.a } };
            }
        }

        if (removedRequestorCount >= requestorCount)
        {
            delete roomMemory.haul.in;
            if (!roomMemory.haul.out)
                delete roomMemory.haul;
        }

        return null;
    }
}

module.exports = Job_Haul;
