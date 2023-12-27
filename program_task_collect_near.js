'use strict'

const constants = require('constants');

let Task = require('program_task');

class Task_Collect_Near extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let creepSpace = creep.getFreeSpace();

        if (creepSpace <= 0)
        {
            if (this.creep.name == constants.MONITOR_CREEP)
                console.log('Task_Collect_Near.doTask - ' + creep.name + ' - creep has no space');
            return TASK_RESULT_COMPLETE;
        }
            
            // return this.deliverStuff(creep);

        let target = this.getTarget();
        if (!target)
        {
            // if (creep.getResourceAmount() > 0)
            //     return this.deliverStuff(creep);
            console.log('Task_Collect_Near.doTask - ' + creep.name + ' - no target');
            return TASK_RESULT_COMPLETE;
        }

        let roomMemory = Room.getMemory(this.memory.r);
        if (!roomMemory || !roomMemory.haul || !roomMemory.haul.out || !roomMemory.haul.out[this.memory.t])
            return TASK_RESULT_COMPLETE;


        if (target.lair)
        {
            if (roomMemory && !roomMemory.clear)
                return TASK_RESULT_COMPLETE;
            
            if (this.avoidLair())
                return TASK_RESULT_BREAK;
        }

        if (constants.BUCKET_BRIGADE)
        {
            let spawnRoom = Game.rooms[creep.memory.spawnRoom];
            if (!spawnRoom || !spawnRoom.hasMyStorageOrTerminal())
            {
                if (!creep.isMovingToward(target))
                    this.gotoTarget(target, 5, { planOnly: 1 });

                if (creep.isMovingToward(target))
                {
                    let nextPos = creep.nextMovePos;

                    if (!nextPos.isEqualTo(creep.pos) && nextPos.roomName == creep.pos.roomName)
                    {
                        let creepAhead = _.find(nextPos.lookFor(LOOK_CREEPS), c => c.my && c.memory.type == 'carry');
                        if (creepAhead && !creepAhead.cantTransfer)
                        {
                            let creepAheadEnergy = creepAhead.getResourceAmount(RESOURCE_ENERGY);
                            if (creepAheadEnergy <= creepSpace)
                            {
                                creepAhead._transfer(creep, RESOURCE_ENERGY);
                                creepAhead.wakeUp();
                                // if (creepAheadSpace <= creepCarry)
                                //     creepAhead.popTask();
                                return TASK_RESULT_COMPLETE;
                            }
                        }
                    }
                }
            }
        }

        if (this.gotoTarget(target, 5))
            return TASK_RESULT_BREAK;

        let nearbyResources = [];
        
        if (!(target instanceof Structure))
        {
            nearbyResources = target.lookForInRange(LOOK_RESOURCES, 5);
            let container  = target.container;
            if (container && container.store && container.store.getUsedCapacity() > 0)
                nearbyResources.push(container);
            // This can fuck up if the source is close enough to one of our storage containers... don't *think* we need it
            //nearbyResources = nearbyResources.concat(target.lookForInRange(LOOK_STRUCTURES, 5, s => s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0));
            nearbyResources = nearbyResources.concat(target.lookForInRange(LOOK_TOMBSTONES, 5, s => s.store.getUsedCapacity() > 0 ));
        }
        else
        {
            if (target.mineralType)
                return this.getResourceFromTarget(target, target.mineralType);

            Room.cancelResourcePickup(this.memory.r, this.memory.t);
            if (this.creep.name == constants.MONITOR_CREEP)
                console.log('Task_Collect_Near.doTask - ' + creep.name + ' - target has no mineralType');
            return TASK_RESULT_COMPLETE;
        }
        
        let hasHarvesters = true;
        let harvesters = Room.getJobCreeps(target.room.name, 'harvest_' + target.id);
        if (!harvesters || harvesters.length <= 0)
        {
            harvesters = Room.getJobCreeps(target.room.name, 'extract');
            if (!harvesters || harvesters.length <= 0)
                hasHarvesters = false;
        }

        let targetRegenerating = (!target.energy && !target.mineralAmount);

        if (nearbyResources.length <= 0 && (!hasHarvesters || targetRegenerating))
        {
            // if (creep.getResourceAmount() > 0)
            //     return this.deliverStuff(creep);
            console.log('Task_Collect_Near.doTask - ' + creep.name + ' - target ' + target.id + ' has no harvesters or no resources')
            Room.cancelResourcePickup(this.memory.r, this.memory.t);
            return TASK_RESULT_COMPLETE;
        }
            
        if (nearbyResources.length <= 0)
        {
            return this.takeANap(creep, target, creepSpace, 0);
        }

        {
            let collectTarget = _.find(nearbyResources, nr => nr.amount);
            if (!collectTarget)
                collectTarget = _.find(nearbyResources, nr => nr.deathTime);
            if (collectTarget)
                return this.getResourceFromTarget(collectTarget);
        }

        let minToPickup = creepSpace;
        if (!hasHarvesters)
        {
            if (target.room.name == 'W34N24')
                console.log('Task_Collect_Near.doTask - ' + creep.name + ' - target ' + target.id + ' has no harvesters')
            minToPickup = 0;
        }
            
        let resourceSum = _.sum(nearbyResources, nr => { if (nr.store) return nr.store.getUsedCapacity(); return nr.amount; } );

        if (resourceSum >= minToPickup || targetRegenerating)
        {
            let collectTarget = _.find(nearbyResources, nr => nr.amount);
            if (!collectTarget)
                collectTarget = _.find(nearbyResources, nr => nr.deathTime);
            if (!collectTarget)
                collectTarget = _.max(nearbyResources, nr => { if (nr.store) return nr.store.getUsedCapacity(); return nr.amount; });

            return this.getResourceFromTarget(collectTarget);
        }

        return this.takeANap(creep, target, creepSpace, resourceSum);
    }

    deliverStuff(creep)
    {
        return this.deliverResourceToStorage();
    }

    takeANap(creep, target, creepSpace, resourceSum = 0)
    {
        let energyPerTick = Source.getMaxEnergyInPerTick(this.memory.r, this.memory.t);
        if (!energyPerTick || energyPerTick < 10)
            energyPerTick = 10;

        let sleepTime = Math.ceil((creepSpace - resourceSum) / energyPerTick);
        if (creep.ticksToLive <= sleepTime * 2)
            return TASK_RESULT_COMPLETE;

        if (target.lair && this.avoidLair(sleepTime))
            return TASK_RESULT_BREAK;

        this.sleep(sleepTime);
        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Collect_Near
