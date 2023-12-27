'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Deposit_Harvest extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Deposit_Harvest.constructor - executing');

        this.jobType = 'deposit_harvest';
        this.desiredSpawnType = 'worky';
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
        if (!constants.USE_FACTORY)
            return null;
            
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.deposits || !roomMemory.deposits[this.data.source])
            return null;

        let depositMemory = roomMemory.deposits[this.data.source];
        if (depositMemory.lcd && depositMemory.lcd > 50)
            return null;

        let creeps = this.getCreeps();
        if (creeps.length <= 0 && depositMemory.ttd < CREEP_LIFE_TIME)
            return null;

        let base = Room.getNearestBaseFiltered(this.roomName, b => b.controller && b.terminal && b.controller.level >= 8);
        if (!base || global.distanceBetweenRooms(this.roomName, base.name) > global.WORK_SEARCH_RANGE)
            return null;

        let freeingSpots = 0;
        let openSpots = depositMemory.os - creeps.length;

        if (creeps.length > 0)
        {
            let depositWorldPos = new RoomPosition(depositMemory.x, depositMemory.y, this.roomName).toWorldPosition();
            let baseDistanceToDeposit = base.controller.wpos.getManhattanDist(depositWorldPos);

            for (let otherCreep of creeps)
            {
                let otherCreepLife = CREEP_LIFE_TIME;
                let creepDistanceToDeposit = otherCreep.wpos.getManhattanDist(depositWorldPos);
                if (otherCreep.ticksToLive)
                    otherCreep = otherCreep.ticksToLive;
                if (otherCreep.memory && otherCreepLife <= baseDistanceToDeposit + otherCreep.memory.parts * CREEP_SPAWN_TIME)
                    freeingSpots += 1;
            }
        }

        if (freeingSpots <= 0 && openSpots <= 0)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'deposit_harvest', program: 'task_deposit_harvest', data: { t: this.data.source, x: depositMemory.x, y: depositMemory.y, r: this.roomName }};
    }
}

module.exports = Job_Deposit_Harvest;
