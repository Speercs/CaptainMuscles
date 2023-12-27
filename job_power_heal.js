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

        this.jobType = 'power_heal';
        this.desiredSpawnType = 'heal';

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

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, minParts: 25, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        if (!constants.USE_POWER)
            return null;
            
        if (!this.missionMemory)
            return null;

        if (creep && this.missionMemory.wantBoosts && !creep.memory.boosts)
            return null

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let roomMemory = Room.getMemory(this.roomName);
        if (!roomMemory || !roomMemory.powerBanks || !roomMemory.powerBanks[this.data.source])
            return null;

        let base = Room.getNearestBaseFiltered(this.roomName, b => b.controller && b.terminal && b.controller.level >= 8);
        if (!base)
            return null;

        let powerBankMemory = roomMemory.powerBanks[this.data.source];
        let powerBankWorldPos = new RoomPosition(powerBankMemory.x, powerBankMemory.y, this.roomName).toWorldPosition();
        let baseDistanceToPowerBank = base.controller.wpos.getManhattanDist(powerBankWorldPos);
        let creeps = this.getCreeps();
        let freeingSpots = 0;

        for (let otherCreep of creeps)
        {
            let otherCreepLife = CREEP_LIFE_TIME;
            if (otherCreep.ticksToLive)
                otherCreep = otherCreep.ticksToLive;
            if (otherCreep.memory && otherCreepLife <= baseDistanceToPowerBank + otherCreep.memory.parts * CREEP_SPAWN_TIME)
                freeingSpots += 1;
        }

        let attackCreeps = Room.getJobCreeps(this.roomName, 'power_attack_' + this.data.source);
        if (!attackCreeps || attackCreeps.length + freeingSpots <= creeps.length)
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'power_heal', program: 'task_power_heal', data: { t: this.data.source, x: powerBankMemory.x, y: powerBankMemory.y, r: this.roomName }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn)
            return null;

        if (!this.missionMemory || !this.missionMemory.wantBoosts)
            return null;

        if (Room.getResourceAmountLevel(spawn.room.name, 'XUH2O') < constants.RESOURCE_LEVEL_LOW)
            return null;

        let boosts = [];

        if (Room.getResourceAmountLevel(spawn.room.name, 'XLHO2') >= constants.RESOURCE_LEVEL_LOW)
            boosts.push({ b: 'XLHO2', r: 0 });

        if (boosts.length <= 0)
            return null;

        return boosts;
    }
}

module.exports = Job_Power_Attack;
