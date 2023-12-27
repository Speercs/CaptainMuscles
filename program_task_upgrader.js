'use strict'

let Task = require('program_task');

class Task_Upgrader extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();
    }

    end()
    {
        super.end();

        if (this.creep && this.creep.memory)
            delete this.creep.memory.ept;
    }

    doTask(creep)
    {
        if (this.creep)
            this.creep.memory.ept = this.creep.upgradePower;

        let room = this.getTaskRoom();
        if (!room)
            return TASK_RESULT_COMPLETE;

        if (Room.inDanger(room.name))
        {
            this.launchChildProcess('fortify', 'task_fortify',  { creep: this.creep.name,  r: room.name, inDanger: true }, true);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        let controllerCanPos = room.controllerCanPos;

        if (creep.room.name != room.name)
        {
            creep.moveTo(controllerCanPos);
            return TASK_RESULT_BREAK;
        }

        if (creep.room.controller.level >= 8 && creep.memory.n > 0)
            return TASK_RESULT_COMPLETE;

        let controllerCan = room.controllerCan;
        let controllerLink = room.controllerLink;

        let energySource = controllerCan;
        if (!energySource)
            energySource = controllerLink;

        // if (!energySource)
        // {
        //     console.log('Task_Upgrader.doTask - no energy source found');
        //     //return TASK_RESULT_COMPLETE;
        // }

        let energy = creep.getResourceAmount(RESOURCE_ENERGY);
        let getAnyEnergy = ((!energySource || energySource.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) && (Room.getStoredResourceAmount(room.name, RESOURCE_ENERGY) > 0 || room.controller.level < 2 || (room.controller.ticksToDowngrade && room.controller.ticksToDowngrade <= CONTROLLER_DOWNGRADE[room.controller.level] / 2)))
        //let getAnyEnergy = (!energySource && (Room.getStoredResourceAmount(room.name, RESOURCE_ENERGY) > 0 || room.controller.level < 2 || (room.controller.ticksToDowngrade && room.controller.ticksToDowngrade <= CONTROLLER_DOWNGRADE[room.controller.level] / 2)))
        // if (getAnyEnergy)
        //     return this.getResourceNearest(RESOURCE_ENERGY);

        let rangeToCan = creep.pos.getRangeTo(controllerCanPos);
        let rangeToController = creep.pos.getRangeTo(room.controller);

        let maxCapacity = creep.store.getCapacity();
        let upgradePower = creep.upgradePower;
        // Dont want to gather more energy if we can't possibly use it
        let ableToFillUp = maxCapacity < (upgradePower * creep.ticksToLive);
        let needMoreEnergy = energy <= upgradePower * (Math.max(rangeToCan, 1) + 1);

        if (ableToFillUp && needMoreEnergy || (rangeToCan <= 0 && energySource && room.controller.level < 4 && creep.store.getFreeCapacity(RESOURCE_ENERGY) > creep.upgradePower))
        {
            if (rangeToCan > 1)
            {
                creep.moveTo(controllerCanPos);
            }
            else if (energySource && energySource.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            {
                creep._withdraw(energySource, RESOURCE_ENERGY);
                if (controllerLink)
                    controllerLink.requestEnergy();
            }
            else if (controllerLink)
            {
                controllerLink.requestEnergy();
                if (getAnyEnergy)
                    return this.getResourceNearest(RESOURCE_ENERGY, null, creep.room.isBootstrapping());
            }
            else
            {
                if (getAnyEnergy)
                    return this.getResourceNearest(RESOURCE_ENERGY, null, creep.room.isBootstrapping());
            }
        }
        else if (room.controller.sign)
        {
            if (rangeToController > 1)
                creep.moveTo(room.controller);
            else
                creep.signController(room.controller, '');
        }
        else if (this.memory.rts || rangeToController > 3)
        {
            this.memory.rts = 1;
            let openSpots = _.sortBy(room.controller.pos.getOpenPositionsInRange(3), spot => spot.getRangeTo(room.controllerCanPos));
            let mySpot = openSpots[creep.memory.n];

            //console.log('Task_Upgrader.doTask - ' + creep.name + ' myspot is ' + mySpot);

            let rangeToSpot = creep.pos.getRangeTo(mySpot);
            if (rangeToSpot > 0)
                creep.moveTo(mySpot, { range: 0 });
            else
                delete this.memory.rts;
        }

        if (!controllerLink && !needMoreEnergy)
        {
            let nearbyUpgraders = creep.lookForInRange(LOOK_CREEPS, 1, c => c.my && c.memory.job && c.memory.job.type == creep.memory.job.type && c.pos.getRangeTo(room.controllerCanPos) > rangeToCan && c.getResourceAmount(RESOURCE_ENERGY) < creep.getResourceAmount(RESOURCE_ENERGY));
            if (nearbyUpgraders.length > 0)
            {
                let lowestUpgrader = _.min(nearbyUpgraders, nu => nu.getResourceAmount(RESOURCE_ENERGY));
                let amountToTransfer = Math.min(creep.store.getUsedCapacity(RESOURCE_ENERGY) - (upgradePower * 2), lowestUpgrader.getFreeSpace(RESOURCE_ENERGY));
                if (amountToTransfer > 0)
                {
                    creep.room.visual.line(creep.pos, lowestUpgrader.pos);
                    creep.transfer(lowestUpgrader, RESOURCE_ENERGY, amountToTransfer);
                }
            }

        }
        if (Room.inDanger(room.name) && room.hasMyStorageOrTerminal() && (!room.controller.ticksToDowngrade || room.controller.ticksToDowngrade > CONTROLLER_DOWNGRADE[room.controller.level] / 2))
            return TASK_RESULT_BREAK;

        let upgradeThisTick = this.accumulate(creep);

        if (!upgradeThisTick || energy <= 0 || rangeToController > 3)
            return TASK_RESULT_BREAK;

        // if (!controllerCan)
        // {
        //     let sites = creep.pos.lookForInRange(LOOK_CONSTRUCTION_SITES, 3, c => c.my);
        //     if (sites.length > 0)
        //     {
        //         let site = _.min(sites, s => s.progressTotal - s.progress);
        //         creep.build(site);
        //         return TASK_RESULT_BREAK;
        //     }
        // }

        if (controllerCan && controllerCan.hits < controllerCan.hitsMax / 2)
            creep.repair(controllerCan);
        else
            creep.upgradeController(room.controller);

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Upgrader
