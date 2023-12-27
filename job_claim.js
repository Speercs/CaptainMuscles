'use strict'

let Job = require('job');

class Job_Claim extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Claim.constructor - executing');

        this.jobType = 'claim';
        this.desiredSpawnType = 'claim';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let desiredType = this.desiredSpawnType;

        let maxParts = 1;
        let roomMemory = Room.getMemory(this.roomName);
        if (roomMemory && roomMemory.controller && roomMemory.controller.o)
        {
            maxParts = null;
            let controllerPos = new RoomPosition(roomMemory.controller.x, roomMemory.controller.y, this.roomName);
            let distance = spawn.wpos.getRangeTo(controllerPos.wpos);
            if (distance < CREEP_CLAIM_LIFE_TIME / 2)
                desiredType = 'reserve';
        }

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: desiredType, maxParts: maxParts, task: task };
    }

    getTask(creep, spawn)
    {
        if (!Room.wantToClaim(this.roomName))
            return null;

        if (this.getCreepMemories().length > 0)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType && creep.memory.type != 'reserve')
            return null;

        let room = Game.rooms[this.roomName];
        if (room && room.controller && room.controller.upgradeBlocked)
        {
            let maxLifeTime = CREEP_CLAIM_LIFE_TIME;
            if (creep)
            {
                let distance = creep.wpos.getRangeTo(room.controller.wpos);
                maxLifeTime = creep.ticksToLive - distance;
            }
            
            if (room.controller.upgradeBlocked >= maxLifeTime)
                return null;
                
            console.log('Job_Claim.getTask - ' + this.roomName + ' - upgrade blocked for ' + room.controller.upgradeBlocked + ' ticks, maxLifeTime: ' + maxLifeTime);
        }

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'claim', program: 'task_claim', data: { r: this.roomName }};
    }
}

module.exports = Job_Claim;
