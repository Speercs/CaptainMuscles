'use strict'

let Task = require('program_task');

class Task_Fill_Towers extends Task
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

            return TASK_RESULT_BREAK;
            // else
            //     return TASK_RESULT_COMPLETE;
        }

        let towers = room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType == STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 });
        if (towers.length <= 0)
            return TASK_RESULT_COMPLETE;

        towers = _.sortBy(towers, s => s.store.getUsedCapacity(RESOURCE_ENERGY));

        let quickTower = room.quickTower;

        for (let tower of towers)
        {
            if (quickTower && quickTower.id == tower.id)
                continue;

            let energyNeeded = tower.store.getFreeCapacity(RESOURCE_ENERGY);
            let otherDeliverers = _.filter(Game.creeps, object => object.hasTask({ n: 'deliver', t: tower.id }));
            let promisedEnergyCount = _.sum(otherDeliverers.map(od => od.store.getUsedCapacity(RESOURCE_ENERGY)));

            //console.log('Task_Fill_Towers.doTask - ' + creep.name + ' energyNeeded: ' + energyNeeded + ', promisedEnergyCount: '+ promisedEnergyCount)

            if (promisedEnergyCount < energyNeeded)
                return this.deliverResourceToTarget(tower, RESOURCE_ENERGY, true);
        }

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Fill_Towers
