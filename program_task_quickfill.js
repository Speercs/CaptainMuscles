'use strict'

let Task = require('program_task');

class Task_Quickfill extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let spotNumber = creep.memory.job.spot;

        let room = Game.rooms[this.memory.r];
        if (!room)
        {
            console.log('Creep.doTaskQuickFill - ' + creep.name + ' - room not found - ' + JSON.stringify(this.memory));
            return TASK_RESULT_COMPLETE;
        }

        //console.log('Creep.doTaskQuickFill - ' + creep.name + ' - n: ' + spotNumber);
        let standPos = null;
        let can = null;
        let otherCan = null;
        if (spotNumber == 0)
            standPos = room.quickCreepPos1;
        else if (spotNumber == 1)
            standPos = room.quickCreepPos2;
        else if (spotNumber == 2)
            standPos = room.quickCreepPos3;
        else if (spotNumber == 3)
            standPos = room.quickCreepPos4;

        if (!standPos)
        {
            console.log('Creep.doTaskQuickFill - ' + creep.name + ' - n: ' + spotNumber);
            return TASK_RESULT_COMPLETE;
        }


        if (creep.room != room || creep.pos.getRangeTo(standPos) > 0)
        {
            creep.moveTo(standPos, { range: 0 });
            return TASK_RESULT_BREAK;
        }

        if (standPos.getRangeTo(room.quickCan1) <= 1)
        {
            can = room.quickCan1;
            otherCan = room.quickCan2;
        }
        else
        {
            can = room.quickCan2;
            otherCan = room.quickCan1;
        }

        let creepEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
        if (creepEnergy <= 0)
        {
            let droppedResource = creep.lookForFirstInRange(LOOK_RESOURCES, 1, r => r.resourceType == RESOURCE_ENERGY);
            //let droppedResource = _.find(creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1), (object) => (object.resourceType == RESOURCE_ENERGY));

            if (droppedResource)
            {
                creep.pickup(droppedResource);
                return TASK_RESULT_BREAK;
            }
        }

        if (creep.store.getUsedCapacity() > creepEnergy)
        {
            for (let resource of RESOURCES_ALL)
            {
                if (resource == RESOURCE_ENERGY)
                    continue;

                if (creep.store.getUsedCapacity(resource) > 0)
                {
                    creep._drop(resource);
                    return TASK_RESULT_BREAK;
                }
            }
        }

        let creepSpace = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        let creepCapacity = creep.store.getCapacity();

        let quickLink = creep.room.quickLink;
        let quickTower = creep.room.quickTower;

        let quickThing = quickLink || quickTower;

        let canEnergy = 0;
        if (can)
        {
            canEnergy = can.store.getUsedCapacity(RESOURCE_ENERGY);
            if (creepSpace > 0 && can.store.getUsedCapacity() > canEnergy)
            {
                for (let resource of RESOURCES_ALL)
                {
                    if (resource == RESOURCE_ENERGY)
                        continue;

                    if (can.store.getUsedCapacity(resource) > 0)
                    {
                        creep._withdraw(can, resource);
                        return TASK_RESULT_BREAK;
                    }
                }
            }
        }


        let otherCanEnergy = 0;
        if (otherCan)
            otherCanEnergy = otherCan.store.getUsedCapacity(RESOURCE_ENERGY);

        let quickThingEnergy = 0;
        if (quickThing)
            quickThingEnergy = quickThing.store.getUsedCapacity(RESOURCE_ENERGY);

        let towerTargetEnergy = TOWER_CAPACITY / 4;
        let canTargetEnergy = CONTAINER_CAPACITY / 2;
        let towerTakeableEnergy = TOWER_CAPACITY / 2;

        let output = null;
        if (this.memory.t)
            output = Game.getObjectById(this.memory.t);
        if (!output || creep.pos.getRangeTo(output) > 1 || !output.store || output.store.getFreeCapacity(RESOURCE_ENERGY) <= 0)
        {
            output = creep.lookForFirstInRange(LOOK_STRUCTURES, 1, s => s.my && (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

            if (output)
            {
                this.memory.t = output.id;
                this.memory.x = output.x;
                this.memory.y = output.y;
            }
        }

        if (!output && quickTower && quickThingEnergy < TOWER_CAPACITY)
            output = quickTower;

        //if (!output && ((quickTower && quickThingEnergy < TOWER_CAPACITY / 2) || (otherCan && otherCanEnergy < canEnergy - 1)))
        // if (!output && quickTower && quickThingEnergy < towerTargetEnergy)
        //     output = quickTower;

        // if (!output && quickTower && canEnergy < canTargetEnergy)
        //     output = can;

        if (!output && quickLink && can && canEnergy < canTargetEnergy)
            output = can;


        if (!output)
        {
            let sleepTime = 100;
            let spawns = creep.room.spawns;
            let spawning = false;
            if (spawns.length > 0)
            {
                for (let spawn of spawns)
                {
                    if (!spawn.spawning)
                        continue;

                    spawning = true;

                    if (spawn.spawning.remainingTime + 1 < sleepTime)
                        sleepTime = spawn.spawning.remainingTime + 1;
                }
            }
            
            if (!spawning)
                sleepTime = CREEP_SPAWN_TIME * 3;

            this.sleep(sleepTime);
            return TASK_RESULT_BREAK;
        }

        if (creepEnergy > 0)
        {
            creep._transfer(output, RESOURCE_ENERGY);
            return TASK_RESULT_BREAK;
        }

        if (quickLink && output != quickLink)
        {
            quickLink.requestEnergy();
            if (quickThingEnergy > 0)
            {
                creep._withdraw(quickLink, RESOURCE_ENERGY);
                return TASK_RESULT_BREAK;
            }
        }

        if (output != can && canEnergy > 0)
        {
            creep._withdraw(can, RESOURCE_ENERGY);
            return TASK_RESULT_BREAK;
        }

        if (quickTower && output != quickTower && quickThingEnergy > towerTakeableEnergy)
        {
            let amount = Math.min(creepSpace, quickThingEnergy - towerTargetEnergy);
            creep._withdraw(quickTower, RESOURCE_ENERGY, amount);
            return TASK_RESULT_BREAK;
        }

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Quickfill
