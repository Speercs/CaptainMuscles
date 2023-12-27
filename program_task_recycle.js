'use strict'

let Task = require('program_task');

class Task_Recycle extends Task
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 0;
        this.autoBoost = 0;
    }

    doTask(creep)
    {
        super.doTask(creep);

        if (!this.memory.ticks)
            this.memory.ticks = 0;

        if (this.memory.maxTickCount && ++this.memory.ticks > this.memory.maxTickCount)
            return TASK_RESULT_COMPLETE;

        let room = Room.getNearestBase(creep.room.name);

        if (!room || !room.quickCanPos2)
        {
            // if (this.memory.reason)
            //     console.log('Creep.doTaskRecycle - ' + creep.name + ' self-retiring. Reason: ' + this.memory.reason);
            // else
            //     console.log('Creep.doTaskRecycle - ' + creep.name + ' self-retiring.');
            creep.suicide();
            return TASK_RESULT_BREAK;
        }

        // if (creep.memory.heal && creep.hitsPercent < 1)
        //     creep.heal(creep);

        if (room.storage && room.storage.my)
        {
            let creepCarry = creep.store.getUsedCapacity();
            if (creepCarry > 0)
            {
                if (creep.room != room || creep.pos.getRangeTo(room.storage) > 1)
                {
                    creep.moveTo(room.storage);
                    return TASK_RESULT_BREAK;
                }
                else
                {
                    for (let resourceType of RESOURCES_ALL)
                    {
                        if (creep.store.getUsedCapacity(resourceType) > 0)
                        {
                            creep._transfer(room.storage, resourceType);
                            return TASK_RESULT_BREAK;
                        }
                    }
                }
            }

        }

        if (!this.memory.maxTickCount && creep.memory.boosts && room.labs)
        {
            let lab = _.find(room.labs, l => !l.cooldown || l.cooldown < creep.ticksToLive);
            if (lab)
                return this.unboostAt(lab);
        }

        let quickCanPos = room.quickCanPos1;
        let rangeToCan = creep.pos.getRangeTo(quickCanPos);

        if (creep.room != room || rangeToCan > 0)
        {
            creep.moveTo(quickCanPos, { range: 0 });
            return TASK_RESULT_BREAK;
        }

        let creepEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);

        let target = _.first(creep.pos.findInRange(FIND_MY_SPAWNS, 1));
        if (target && creepEnergy && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        {
            //console.log('Creep.doTaskRecycle - ' + creep.name + ' transfering energy to spawn ');
            creep._transfer(target, RESOURCE_ENERGY);
        }
        else if (target)
        {
            let result = target.recycleCreep(creep);
            if (result == OK)
            {
                if (this.memory.reason)
                    console.log('Creep.doTaskRecycle - ' + creep.name + ' recycling in ' + creep.room.name + '. Reason: ' + this.memory.reason);
                else
                    console.log('Creep.doTaskRecycle - ' + creep.name + ' recycling in ' + creep.room.name);
                return TASK_RESULT_BREAK;
            }
        }
        else
        {
            // if (this.memory.reason)
            //     console.log('Creep.doTaskRecycle - ' + creep.name + ' self-retiring in ' + creep.room.name + '. Reason: ' + this.memory.reason);
            // else
            //     console.log('Creep.doTaskRecycle - ' + creep.name + ' self-retiring in ' + creep.room.name);
            creep.suicide();
            return TASK_RESULT_BREAK;
        }
    }
}

module.exports = Task_Recycle
