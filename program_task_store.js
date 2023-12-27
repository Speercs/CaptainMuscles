'use strict'

const constants = require('constants');
let Task = require('program_task');

class Task_Store extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let base = Game.rooms[this.memory.r];
        if (!base || !base.isMyBase())
        {
            console.log('Task_Store.doTask - ' + creep.name + ' - ' + creep.room.name + ' - no base');
            return TASK_RESULT_COMPLETE;
        }

        let creepCarry = creep.getResourceAmount();
        if (creepCarry <= 0)
        {
            //console.log('Task_Store.doTask - ' + creep.name + ' - ' + creep.room.name + ' - no carry: ' + creepCarry + ' - ' + Game.time + ' - ' + creep.lostResourceAmount);
            return TASK_RESULT_COMPLETE;
        }


        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);

        if (creepCarry > creepEnergy)
        {
            // if (this.gotoRoom(this.memory.r, 0))
            //     return TASK_RESULT_BREAK;
            return this.deliverResourceToStorage();

            // this._drop(resourceType);
            // console.log('Task_Store.doTask - ' + creep.name + ' - ' + creep.room.name + ' - dropping ' + resourceType);
            // return TASK_RESULT_BREAK;
        }

        let baseMemory = Room.getBaseMemory(base.name);
        if (!baseMemory)
            console.log('Task_Store.doTask - ' + creep.name + ' - ' + creep.room.name + ' - base name: ' + base.name);
        // if (baseMemory.shipTarget)
        // {
        //     let energyLevel = Room.getResourceAmountLevel(this.memory.r, RESOURCE_ENERGY);
        //     if (energyLevel >= constants.RESOURCE_LEVEL_LOW && baseMemory.spendable > 0)
        //     {
        //         let shipToBase = Game.rooms[baseMemory.shipTarget];
        //         if (shipToBase && (!shipToBase.terminal || !shipToBase.terminal.my) && creep.wpos.getManhattanDist(shipToBase.controller.wpos) < creep.ticksToLive)
        //         {
        //             //console.log('XXXXXXXXXXXXXXXXXXX Task_Store.doTask - ' + creep.name + ' - shipping from ' + base.name + ' to ' + shipToBase.name);
        //             base = shipToBase;
        //             this.memory.r = base.name;
        //             baseMemory = Room.getBaseMemory(base.name);
        //         }
        //     }
        // }

        // let target = Room.getEnergyDeliveryTarget(base.name, creep, 0, 0, true, true, false, true, true);
        // if (target)
        // {
        //     if (target.store.getFreeCapacity() < creepEnergy && base.hasMyStorageOrTerminal())
        //         target = this.selectDeliveryTarget(creep, base);

        //     if (target)
        //         return this.deliverResourceToTarget(target, RESOURCE_ENERGY);
        // }

        if (!base.hasMyStorageOrTerminal())
        {
            let target = Room.getEnergyDeliveryTarget(base.name, creep, 0, 0, true, true, false, true, true);
            if (target)
                return this.deliverResourceToTarget(target, RESOURCE_ENERGY);
        }
        else
        {
            let target = this.selectDeliveryTarget(creep, base);
            if (target)
                return this.deliverResourceToTarget(target, RESOURCE_ENERGY);
        }

        let dropOffPos = base.bonfirePos;
        if (!dropOffPos)
        {
            console.log('Task_Store.doTask - ' + creep.name + ' - ' + creep.room.name + ' - no dropOffPos');
            return TASK_RESULT_COMPLETE;
        }

        this.launchChildProcess('drop', 'task_drop',  { creep: creep.name, x: dropOffPos.x, y: dropOffPos.y, r: dropOffPos.roomName, res: RESOURCE_ENERGY }, true);
        return TASK_RESULT_CONTINUE_NEXT;
    }

    selectDeliveryTarget(creep, base)
    {
        if (base.storage && base.storage.my && base.storage.store.getFreeCapacity() > 0)
            return base.storage;
        if (base.terminal && base.terminal.my && base.terminal.store.getFreeCapacity() > 0)
            return base.terminal;
    }
}

module.exports = Task_Store
