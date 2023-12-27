'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Fill_Labs extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Fill_Labs.constructor - executing');

        this.jobType = 'fill_labs';
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
        if (!this.room || !this.room.isMyBase())
            return null;

        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            if (creep.getResourceAmount() > 0)
                return null;
        }

        let labMemory = Room.getBaseLabsMemory(this.room.name);
        if (!labMemory)
            return null;

        let labStatus = labMemory.labStatus;
        if (!labStatus)
            return null;

        let creeps = this.getSpawnedCreeps();

        for (let thisLabStatus of labStatus)
        {
            if (!thisLabStatus.boost && (!labMemory.rip || !thisLabStatus.input))
                continue;
                
            let fillingCreep = _.find(creeps, c => c.memory.tasks && c.memory.tasks.length > 0 && c.memory.tasks[0].t == thisLabStatus.id);
            if (fillingCreep)
                continue;

            let labTask = this.getLabTask(labMemory, thisLabStatus);
            if (labTask)
                return labTask;
        }

        return null;
    }

    getLabTask(labMemory, thisLabStatus)
    {
        let lab = Game.getObjectById(thisLabStatus.id);
        if (!lab)
            return false;

        let mineralAmount = 0;
        if (lab.mineralType)
            mineralAmount = lab.store.getUsedCapacity(lab.mineralType);
        let energyAmount = lab.store.getUsedCapacity(RESOURCE_ENERGY);

        let mineralFull = (mineralAmount >= LAB_MINERAL_CAPACITY * 0.75);
        let energyFull = (energyAmount >= LAB_ENERGY_CAPACITY);
        if (mineralFull && energyFull)
            return false;

        // if (!energyFull && Room.getResourceAmountLevel(lab.room.name, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_LOW)
        //     return this.makeLabTask(lab, RESOURCE_ENERGY);

        if (thisLabStatus.boost)
        {
            if (!mineralFull && (!lab.mineralType || (lab.mineralType == thisLabStatus.boost && mineralAmount < thisLabStatus.amount)))
                return this.makeLabTask(lab, thisLabStatus.boost, thisLabStatus.amount);

            if (!energyFull)
                return this.makeLabTask(lab, RESOURCE_ENERGY);
        }

        if (mineralFull)
            return false;

        let reactionInfo = labMemory.rip;
    
        if (!reactionInfo)
            return false;

        if (reactionInfo.outputAmount <= 0)
            return false;
    
        if (thisLabStatus.input == 1)
        {
            if (!lab.mineralType || (lab.mineralType == reactionInfo.input1 && mineralAmount < reactionInfo.outputAmount))
                return this.makeLabTask(lab, reactionInfo.input1, reactionInfo.outputAmount);

            return false;
        }
        
        if (thisLabStatus.input == 2)
        {
            if (!lab.mineralType || (lab.mineralType == reactionInfo.input2 && mineralAmount < reactionInfo.outputAmount))
                return this.makeLabTask(lab, reactionInfo.input2, reactionInfo.outputAmount);

            return false;
        }

        return false;
    }

    makeLabTask(lab, resourceType, amount)
    {
        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'fill_lab', program: 'task_fill_lab', data: { t: lab.id, x: lab.pos.x, y: lab.pos.y, r: lab.room.name, res: resourceType, amount: amount }};
    }
}

module.exports = Job_Fill_Labs;
