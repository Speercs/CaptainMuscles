'use strict'

const constants = require('constants');
let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');


class Job_Squad extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Squad.constructor - executing');

        this.jobType = 'squad';
        this.desiredSpawnType = 'ranged';

        this.isMilitary = true;

        let missionInfo = { type: 'squad', room: this.roomName };
        this.missionMemory = Mission_Creeps.getMemory(missionInfo);
    }

    creepAdded(creepName, jobMemory)
    {
        if (!this.missionMemory)
            return false;

        let missionProcess = kernel.scheduler.getProcessFromId(this.missionMemory.pid);
        if (!missionProcess)
            return false;

        missionProcess.creepAdded(creepName);
    }

    creepRemoved(creepName)
    {
        if (!this.missionMemory)
            return false;

        let missionProcess = kernel.scheduler.getProcessFromId(this.missionMemory.pid);
        if (!missionProcess)
            return false;

        missionProcess.creepRemoved(creepName);
    }

    getDesiredSpawn(spawn)
    {
        if (!this.missionMemory)
            return null;

        if (!this.missionMemory.wantSpawn)
            return null;

        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        //let boosts = null;
        let boosts = this.getDesiredBoosts(spawn);
        if (!boosts)
        {
            console.log('XXXXXXXXXXXXXXXX Job_Squad.getDesiredSpawn - ' + this.roomName + ' - boosts not available to ' + spawn.room.name );
            return null;
        }

        //let partList = null;
        let partList = this.getDesiredPartList(spawn);
        if (!partList || partList.length <= 0)
        {
            console.log('XXXXXXXXXXXXXXXX Job_Squad.getDesiredSpawn - ' + this.roomName + ' - invalid part list for ' + this.desiredSpawnType + ' in ' + spawn.room.name );
            return null;
        }

        console.log('XXXXXXXXXXXXXXXX Job_Squad.getDesiredSpawn - ' + this.roomName + ' - want to build squad creep ');
        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, partList: partList, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        if (!this.missionMemory)
            return null;

        if (spawn && !this.missionMemory.wantSpawn)
            return null;
        
        if (creep && !this.missionMemory.wantCreep)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && creep.memory.spawnRoom != this.roomName)
            return null;

        if (creep && !this.creepHasAppropriateBoosts(creep))
        {
            console.log('XXXXXXXXXXXXXXXX Job_Squad.getTask - ' + this.roomName + ' - ' + creep.name + ' - does not have appropriate boosts' );
            return null;
        }

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'squad', program: 'task_squad', data: { r: this.roomName, squad: 1 }};
    }

    getDesiredBoosts(spawn)
    {
        //return [];

        if (!spawn)
            return null;

        return [{ b: 'KO', r: 1 }, { b: 'LO', r: 1 }];

        return [{ b: 'XZHO2', r: 1 }, /*{ b: 'XZH2O', r: 1 },*/ { b: 'XGHO2', r: 1 }, { b: 'XKHO2', r: 1 }, { b: 'XLHO2', r: 1 }];

        return [{ b: 'XKHO2', r: 1 }, { b: 'XLHO2', r: 1 }];

        return [{ b: 'KO', r: 1 }, { b: 'XLHO2', r: 1 }];

        return [{ b: 'XZHO2', r: 1 }, /*{ b: 'XZH2O', r: 1 },*/ { b: 'XGHO2', r: 1 }, { b: 'XKHO2', r: 1 }, { b: 'XLHO2', r: 1 }];

        return null;
    }

    getDesiredPartList(spawn)
    {
        if (spawn.room.energyCapacityAvailable <= 5600)
        {
            return [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                    HEAL, HEAL, HEAL, HEAL, HEAL,

                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE,

                    HEAL, HEAL, HEAL, HEAL, HEAL];
        }

        return [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,

                HEAL, HEAL, HEAL, HEAL, HEAL,

                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,

                HEAL, HEAL, HEAL, HEAL, HEAL];
                
        return [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                HEAL, HEAL, HEAL, HEAL, HEAL,

                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE,

                HEAL, HEAL, HEAL, HEAL, HEAL];

        return [TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,

                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK, 
                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,

                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,

                TOUGH, RANGED_ATTACK,
                TOUGH, RANGED_ATTACK,

                HEAL, HEAL, HEAL, HEAL, HEAL,

                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,

                HEAL, HEAL, HEAL, HEAL, HEAL];

        return [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            
                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE,

                MOVE, MOVE, MOVE,

                MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE,

                HEAL, HEAL, HEAL, HEAL, HEAL,
                HEAL, HEAL, HEAL, HEAL, HEAL,

                HEAL, HEAL, HEAL];
    }

    creepHasAppropriateBoosts(creep)
    {
        return true;
    }
}

module.exports = Job_Squad;
