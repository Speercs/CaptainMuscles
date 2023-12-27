'use strict'

let Job = require('job');

class Job_Fill_Cans extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Fill_Cans.constructor - executing');

        this.jobType = 'fill_cans';
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

        let totalCapacity = 0;
        if (creep)
        {
            if (this.desiredSpawnType != creep.memory.type)
                return null;

            if (creep.getResourceAmount() > 0)
                return null;

            totalCapacity = this.getTotalSpawnedCreepCapacity();
            totalCapacity += creep.store.getFreeCapacity();
        }
        else
        {
            totalCapacity = this.getTotalCreepCapacity();
            let additionalSpace = Math.min(32, Math.ceil((spawn.room.energyCapacityAvailable / 50) * (2 / 3))) * CARRY_CAPACITY;
            totalCapacity += additionalSpace;
        }

        let canEnergyNeeded = this.getCanEnergyNeeded();
        //console.log('Job_Fill_Cans.getTask - ' + this.data.room + ' - canEnergyNeeded: ' + canEnergyNeeded);
        if (canEnergyNeeded <= totalCapacity)
            return null;

        let storedEnergyAmount = this.getStoredEnergy();
        //console.log('Job_Fill_Cans.getTask - ' + this.data.room + ' - storedEnergyAmount: ' + storedEnergyAmount);

        let minHaveOrNeeded = Math.min(canEnergyNeeded, storedEnergyAmount);
        if (minHaveOrNeeded <= 0)
            return null;

        let utility = 1.0 - (totalCapacity / minHaveOrNeeded);
        if (utility <= 0)
            return null;

        //console.log('Job_Fill_Cans.getTask - ' + this.data.room + ' - canEnergyNeeded: ' + canEnergyNeeded + ' - creepEnergy: ' + creepEnergy);
        //return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'fill_can', program: 'task_fill_can', data: { t: can.id, x: can.pos.x, y: can.pos.y, r: can.pos.roomName }};
        return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'fill_cans', program: 'task_fill_cans', data: { r: this.roomName }};
    }

    getLowestCan()
    {
        let allCans = [];
        if (this.room.quickCan1 && (!this.room.quickLink || !this.room.coreLink))
            allCans.push(this.room.quickCan1);
        if (this.room.quickCan2 && (!this.room.quickLink || !this.room.coreLink))
            allCans.push(this.room.quickCan2);
        if (this.room.controllerCan && (!this.room.controllerLink || !this.room.coreLink))
            allCans.push(this.room.controllerCan);

        let cansWithSpace = _.filter(allCans, can => can.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        let sortedCansWithSpace = _.sortByOrder(allCans, can => can.store.getFreeCapacity(RESOURCE_ENERGY) - _.sum(_.filter(this.getCreeps(), creep => creep.hasTask({ n: 'task_fill_can', t: can.id })), creep => creep.store.getCapacity(RESOURCE_ENERGY)), 'desc');
        if (sortedCansWithSpace.length > 0)
            return sortedCansWithSpace[0];

        return null;
    }

    getCanEnergyNeeded()
    {
        let energyNeeded = 0;
        if (this.room)
        {
            let haveStorage = this.room.hasMyStorageOrTerminal();
            if (this.room.quickCan1 && (!this.room.quickLink || !this.room.coreLink))
            {
                let canEnergy = this.room.quickCan1.store.getFreeCapacity(RESOURCE_ENERGY);
                if (haveStorage && canEnergy >= CONTAINER_CAPACITY / 2)
                    energyNeeded += canEnergy;
            }
            if (this.room.quickCan2 && (!this.room.quickLink || !this.room.coreLink))
            {
                let canEnergy = this.room.quickCan2.store.getFreeCapacity(RESOURCE_ENERGY);
                if (haveStorage && canEnergy >= CONTAINER_CAPACITY / 2)
                    energyNeeded += canEnergy;
            }
            if (this.room.controllerCan && (!this.room.controllerLink || !this.room.coreLink))
            {
                let canEnergy = this.room.controllerCan.store.getFreeCapacity(RESOURCE_ENERGY);
                //if (haveStorage && canEnergy >= CONTAINER_CAPACITY / 2)
                    energyNeeded += canEnergy;
            }
        }

        //console.log('Job_Fill_Cans.getCanEnergyNeeded - ' + this.data.room + ' - energyNeeded: ' + energyNeeded);

        return energyNeeded;
    }

    getStoredEnergy()
    {
        let energyAmount = Room.getStoredResourceAmount(this.roomName, RESOURCE_ENERGY);
        if (energyAmount <= 0 && this.room)
            energyAmount = this.room.totalBonfireAmount;

        //console.log('Job_Fill_Cans.getStoredEnergy - ' + this.data.room + ' - energyAmount: ' + energyAmount);

        return energyAmount;
    }
}

module.exports = Job_Fill_Cans;
