'use strict'

const constants = require('constants');
let Mission_Creeps = require('program_mission_creeps');
let Job = require('job');

class Job_Power_Attack extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Power_Attack.constructor - executing');

        this.jobType = 'power_attack';
        this.desiredSpawnType = 'destroy';

        let missionInfo = { type: 'powerBank', room: this.roomName, target: this.data.source };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (missionMemory)
            this.missionMemory = missionMemory;

        this.isMilitary = true;
    }

    getDesiredSpawn(spawn)
    {
        if (!this.missionMemory)
            return null;

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let boosts = this.getDesiredBoosts(spawn);
        if (this.missionMemory.wantBoosts && !boosts)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, minParts: 20, maxParts: 20, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        if (!constants.USE_POWER)
            return null;
            
        if (spawn && spawn.room.controller.level < 8)
            return null;
        // if (creep && creep.name == 'shard1_Spawn22_destroy_38712483')
        //console.log('Job_Power_Attack.getTask - ' + (creep || spawn).name + ' - checking');

        if (!this.missionMemory)
            return null;

        // if (creep && creep.name == 'shard1_Spawn22_destroy_38712483')
        //console.log('Job_Power_Attack.getTask - ' + (creep || spawn).name + ' - found missionMemory, wantBoosts: ' + this.missionMemory.wantBoosts);

        if (creep && this.missionMemory.wantBoosts && !creep.memory.boosts)
            return null;

        // if (creep && creep.name == 'shard1_Spawn22_destroy_38712483')
        //console.log('Job_Power_Attack.getTask - ' + (creep || spawn).name + ' - found boosts');

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && creep.memory[ATTACK] < 20)
            return null;

        // if (creep && creep.name == 'shard1_Spawn22_destroy_38712483')
        //console.log('Job_Power_Attack.getTask - ' + (creep || spawn).name + ' - right type');

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.powerBanks || !roomMemory.powerBanks[this.data.source])
            return null;

        let powerBankMemory = roomMemory.powerBanks[this.data.source];

        let creeps = this.getCreeps();
        // if (creeps.length <= 0 && powerBankMemory.ttd < CREEP_LIFE_TIME)
        //     return null;

        // if (creep && creep.name == 'shard1_Spawn22_destroy_38712483')
        //console.log('Job_Power_Attack.getTask - ' + (creep || spawn).name + ' - found powerBankMemory');


        let base = Room.getNearestBaseFiltered(this.roomName, b => b.controller && b.terminal && b.controller.level >= 8);
        if (!base || global.distanceBetweenRooms(this.roomName, base.name) > global.REMOTE_SEARCH_RANGE)
            return null;

        let ticksToDestroy = StructurePowerBank.getTicksToDestroy(this.roomName, this.data.source);
        let freeingSpots = 0;
        let openSpots = powerBankMemory.os - creeps.length;

        if (creeps.length > 0)
        {
            let powerBankWorldPos = new RoomPosition(powerBankMemory.x, powerBankMemory.y, this.roomName).toWorldPosition();
            let baseDistanceToPowerBank = base.controller.wpos.getManhattanDist(powerBankWorldPos);

            for (let otherCreep of creeps)
            {
                let otherCreepLife = CREEP_LIFE_TIME;
                let creepDistanceToPowerBank = otherCreep.wpos.getManhattanDist(powerBankWorldPos);
                if (otherCreep.ticksToLive)
                    otherCreep = otherCreep.ticksToLive;
                if (otherCreepLife < ticksToDestroy + creepDistanceToPowerBank && otherCreep.memory && otherCreepLife <= baseDistanceToPowerBank + otherCreep.memory.parts * CREEP_SPAWN_TIME)
                    freeingSpots += 1;
            }
        }

        // if (creep && creep.name == 'shard1_Spawn22_destroy_38712483')
        //console.log('Job_Power_Attack.getTask - ' + (creep || spawn).name + ' - getting here. freeingSpots: ' + freeingSpots + ', openSpots: ' + openSpots);

        if (freeingSpots <= 0 && openSpots <= 0)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'power_attack', program: 'task_power_attack', data: { t: this.data.source, x: powerBankMemory.x, y: powerBankMemory.y, r: this.roomName }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn)
            return null;

        if (!this.missionMemory || !this.missionMemory.wantBoosts)
            return null;

        if (Room.getResourceAmountLevel(spawn.room.name, 'XLHO2') < constants.RESOURCE_LEVEL_LOW)
            return null;

        let boosts = [];

        if (Room.getResourceAmountLevel(spawn.room.name, 'XUH2O') >= constants.RESOURCE_LEVEL_LOW)
            boosts.push({ b: 'XUH2O', r: 0 });

        if (boosts.length <= 0)
            return null;

        return boosts;
    }
}

module.exports = Job_Power_Attack;
