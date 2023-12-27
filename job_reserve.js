'use strict'

let Job = require('job');

class Job_Reserve extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Reserve.constructor - executing');

        this.jobType = 'reserve';
        this.desiredSpawnType = 'reserve';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        var ticksToReserve = CONTROLLER_RESERVE_MAX;

        if (roomMemory.controller.r == ME)
            ticksToReserve -= roomMemory.controller.rt;
        else if (roomMemory.controller.r)
            ticksToReserve += roomMemory.controller.rt;

        let maxParts = ticksToReserve / CREEP_CLAIM_LIFE_TIME;
        if (roomMemory && roomMemory.controller && roomMemory.controller.o)
            maxParts = null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task };
    }

    getTask(creep, spawn)
    {
        if (!Game.flags['reserve_' + this.roomName] && !Room.isReservedByMe(this.roomName) && !Room.wantToClaim(this.roomName) && Room.friendly(this.roomName))
            return null;

        // if (this.roomName == 'E16N13' && creep)
        //     console.log('Job_Reserve.getTask - ' + this.roomName + ' - checking - ' + creep.name);

        if (creep && creep.memory.type != this.desiredSpawnType)
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - creep not desired spawn type - ' + creep.name + ' - ' + creep.memory.type);
            return null;
        }

        if (this.room && this.room.controller && this.room.controller.upgradeBlocked)
        {
            if (creep && this.room.controller.upgradeBlocked >= creep.ticksToLive)
            {
                //console.log('Job_Reserve.getTask - ' + this.roomName + ' - upgrade blocked too long - ' + creep.name);
                return null;
            }
                
            
            if (!creep && this.room.controller.upgradeBlocked >= CREEP_CLAIM_LIFE_TIME)
            {
                //console.log('Job_Reserve.getTask - ' + this.roomName + ' - (no creep) upgrade blocked too long');
                return null;
            }
        }

        if (this.room && (!this.room.controller || this.room.controller.my))
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - controller is mine or no controller');
            return null;
        }

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.controller || roomMemory.controller.sm || roomMemory.controllerBlocked)
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - no roomMemory or no roomMemory.controller');
            return null;
        }

        if (roomMemory.controller.o && !Room.killOnSight(this.roomName))
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - room not kill on sight');
            return null;
        }

        let controllerPos = new RoomPosition(roomMemory.controller.x, roomMemory.controller.y, this.roomName);

        if ((creep || spawn).wpos.getManhattanDist(controllerPos.wpos) >= ((creep) ? creep.ticksToLive : CREEP_CLAIM_LIFE_TIME) * .5)
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - ' + creep.name + ' - could not reach controller');
            return null;
        }

        var ticksToReserve = CONTROLLER_RESERVE_MAX;

        if (roomMemory.controller.r == ME)
            ticksToReserve -= roomMemory.controller.rt;
        else if (roomMemory.controller.r)
            ticksToReserve += roomMemory.controller.rt;

        if (ticksToReserve < CONTROLLER_RESERVE_MAX * (4 / 5))
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - ticks to reserve too short');
            return null;
        }

        let nearestBase = Room.getNearestBase(this.roomName);
        if (!nearestBase)
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - no nearest base');
            return null;
        }

        if (spawn && spawn.room.energyCapacityAvailable < (BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]))
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - not enough spawn energy');
            return null;
        }

        let spawnRoom;
        if (spawn)
            spawnRoom = spawn.room;
        else if (creep)
            spawnRoom = Game.rooms[creep.memory.spawnRoom];

        let maxClaimSpawnable = 1;
        if (spawnRoom)
            maxClaimSpawnable = Math.floor(spawnRoom.energyCapacityAvailable / (BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]));

        let creeps = this.getCreeps();

        let claimSum = _.sum(creeps, c => c.memory[CLAIM]);
        // ticksToReserve -= claimSum * _.sum(creeps, c => c.ticksToLive || CREEP_CLAIM_LIFE_TIME);
        // if (ticksToReserve < 0)
        //     return null;

        
        // if (claimSum >= 2)
        // {
        //     //console.log('Job_Reserve.getTask - ' + this.roomName + ' - too many claim parts');
        //     return null;
        // }
        
        let maxCreeps = 1
        if (!roomMemory.controller.o && !Room.wantToClaim(this.roomName))
            maxCreeps = Math.ceil(ticksToReserve / (maxClaimSpawnable * CREEP_CLAIM_LIFE_TIME));

        let neededCreeps = Math.min(controllerPos.getOpenSpotCount(), maxCreeps) - creeps.length;

        //console.log('Job_Reserve.getTask - ' + this.roomName + ' - ticksToReserve: ' + ticksToReserve + ', maxClaimSpawnable: ' + maxClaimSpawnable + ', maxCreeps: ' + maxCreeps + ', neededCreeps: ' + neededCreeps);

        if (neededCreeps <= 0)
        {
            //console.log('Job_Reserve.getTask - ' + this.roomName + ' - dont need creeps');
            return null;
        }

        // if (this.roomName == 'E16N13')
        //     console.log('Job_Reserve.getTask - ' + this.roomName + ' - checking - ' + (creep || spawn).name);

        let utility = (ticksToReserve / CONTROLLER_RESERVE_MAX);
        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'reserve', program: 'task_reserve', data: { x: controllerPos.x, y: controllerPos.y, r: this.roomName }};
    }
}

module.exports = Job_Reserve;
