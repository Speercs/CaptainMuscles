'use strict'

let Job = require('job');
let Mission_Creeps = require('program_mission_creeps');

class Job_Combat_Test extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Combat_Test.constructor - executing');

        this.jobType = 'combat_test';
        this.desiredSpawnType = 'ranged';

        this.isMilitary = true;
    }

    creepAdded(creepName, jobMemory)
    {
        let missionInfo = { type: 'combat_test' };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return;

        let missionProcess = kernel.scheduler.getProcessFromId(missionMemory.pid);
        if (!missionProcess)
            return false;

        missionProcess.creepAdded(creepName);
    }

    creepRemoved(creepName)
    {
        let missionInfo = { type: 'combat_test' };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return;

        let missionProcess = kernel.scheduler.getProcessFromId(missionMemory.pid);
        if (!missionProcess)
            return false;

        missionProcess.creepRemoved(creepName);
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        let missionInfo = { type: 'combat_test' };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return null;

        //let minPartCount = Math.max(1, Math.floor(missionMemory.minPartCount * .8));
        let maxParts = 1;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task };
    }

    getTask(creep, spawn)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let missionInfo = { type: 'combat_test' };
        let missionMemory = Mission_Creeps.getMemory(missionInfo);
        if (!missionMemory)
            return null;

        //console.log('Job_Combat_Test.getTask - ' + this.roomName + ' - found missionMemory, creep: ' + creep + ', spawn: ' + spawn);

        if (!missionMemory.wantSpawn)
            return null;

        //console.log('Job_Combat_Test.getTask - ' + this.roomName + ' - found wantSpawn, creep: ' + creep + ', spawn: ' + spawn);

        // if (creep)
        // {
        //     let allowed = ((creep.memory.type == 'ranged' && creep.memory[RANGED_ATTACK] >= missionMemory.minPartCount) ||
        //                    (creep.memory.type == 'attack' && creep.memory[ATTACK]        >= missionMemory.minPartCount));
        //
        //     if (!allowed)
        //         return null;
        // }

        //console.log('Job_Combat_Test.getTask - ' + this.roomName + ' - giving combat_test task to creep: ' + creep + ', spawn: ' + spawn);

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'combat_test', program: 'task_combat_test', data: { r: this.roomName }};
    }
}

module.exports = Job_Combat_Test;
