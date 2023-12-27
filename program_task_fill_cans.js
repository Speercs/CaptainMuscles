'use strict'

let Task = require('program_task');

class Task_Fill_Cans extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (!room)
            return TASK_RESULT_COMPLETE;

        let creepCapacity = creep.store.getCapacity();
        if (creepCapacity <= 0)
            return TASK_RESULT_COMPLETE;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();

        if (creepEnergy <= 0)
        {
            if (this.getResourceFromStorage(RESOURCE_ENERGY, false, true))
                return TASK_RESULT_BREAK;
            else
                return TASK_RESULT_COMPLETE;
        }

        let potentialTargets = [];

        if (room.quickCan1 && (!room.quickLink || !room.coreLink))
            potentialTargets.push(room.quickCan1);
        if (room.quickCan2 && (!room.quickLink || !room.coreLink))
            potentialTargets.push(room.quickCan2);
        if (room.controllerCan && (!room.controllerLink || !room.coreLink))
            potentialTargets.push(room.controllerCan);

        potentialTargets = _.filter(potentialTargets, pt => pt.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

        if (potentialTargets.length <= 0)
            return TASK_RESULT_COMPLETE;

        potentialTargets = _.sortByOrder(potentialTargets, pt => pt.store.getFreeCapacity(RESOURCE_ENERGY), 'desc');

        for (let potentialTarget of potentialTargets)
        {
            let energyNeeded = potentialTarget.store.getFreeCapacity(RESOURCE_ENERGY);
            let otherDeliverers = _.filter(Game.creeps, object => object.hasTask({ n: 'deliver', t: potentialTarget.id }));
            let promisedEnergyCount = _.sum(otherDeliverers.map(od => od.store.getUsedCapacity(RESOURCE_ENERGY)));

            //console.log('Task_Fill_Cans.doTask - ' + creep.name + ' energyNeeded: ' + energyNeeded + ', promisedEnergyCount: '+ promisedEnergyCount)

            if (promisedEnergyCount < energyNeeded)
                return this.deliverResourceToTarget(potentialTarget, RESOURCE_ENERGY);
        }

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Fill_Cans
