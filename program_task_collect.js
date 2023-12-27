'use strict'

let Task = require('program_task');

class Task_Collect extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let creepSpace = creep.getFreeSpace();

        // if (creep.name == 'shardSeason_Spawn1_carry_37423')
        //     console.log('Task_Collect.doTask - ' + creep.name + ' - currentCreepSpace: ' + currentCreepSpace + ', creepSpace: ' + creepSpace);

        if (creepSpace <= 0)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.memory.c)
        {
            let targetPos = target;
            if (target.pos)
                targetPos = target.pos;
                
            Game.map.visual.line(creep.pos, targetPos, {color: this.memory.c, lineStyle: 'dashed'});
            Game.map.visual.circle(targetPos, {radius: 1, fill: this.memory.c, opacity: 0.5});
        }

        let resourceType = null;
        if (!this.memory.res)
        {
            if (target instanceof StructureLink || target instanceof StructureTower)
                this.memory.res = RESOURCE_ENERGY
        }

        if (this.memory.res)
            resourceType = this.memory.res;

        let amount = this.memory.amount;
        if (amount)
            amount = Math.min(amount, creep.getFreeSpace());
        if (amount && target.store)
            amount = Math.min(amount, target.getResourceAmount(this.memory.res));
        if (amount && target.amount)
            amount = Math.min(amount, target.amount);

        if (target.store && target.getResourceAmount(this.memory.res) <= 0)
        {
            //console.log('Task_Collect.doTask - ' + this.creep.name + ' - ' + this.creep.room.name + ' - ' + this.creep.memory.job.id + ' - found no ' + this.memory.res + ' in ' + target);
            return TASK_RESULT_COMPLETE;
        }

        // if (this.memory.wait && creep.pos.getRangeTo(target) > 1)
        //     return TASK_RESULT_BREAK;

        if (this.gotoTarget(target, 1))
            return TASK_RESULT_BREAK;

        if (target.structureType == STRUCTURE_LINK && target.store.getUsedCapacity(RESOURCE_ENERGY) <= 0)
        {
            target.requestEnergy();
            return TASK_RESULT_BREAK;
        }

        let currentCreepSpace = creep.store.getFreeCapacity();
        if (currentCreepSpace <= 0)
            return TASK_RESULT_BREAK;

        if (target.amount)
        {
            if (creep.cantPickup)
                return TASK_RESULT_BREAK;

            creep.pickup(target);
            return TASK_RESULT_COMPLETE;
        }
        else
        {
            if (this.memory.res)
            {
                if (target instanceof Creep)
                {
                    if (target.cantTransfer)
                        return TASK_RESULT_BREAK;
                    target._transfer(creep, this.memory.res, amount);
                }
                else
                {
                    if (this.creep.cantWithdraw)
                        return TASK_RESULT_BREAK;
                    this.creep._withdraw(target, this.memory.res, amount);
                }

                return TASK_RESULT_COMPLETE;
            }
            else if (target.store)
            {
                for (let resourceType of RESOURCES_ALL)
                {
                    let targetResourceAmount = target.store.getUsedCapacity(resourceType);
                    amount = Math.min(amount, targetResourceAmount);
                    if (targetResourceAmount)
                    {
                        if (target instanceof Creep)
                        {
                            if (target.cantTransfer)
                                return TASK_RESULT_BREAK;
                            target._transfer(creep, resourceType, amount);
                        }
                        else
                        {
                            if (this.creep.cantWithdraw)
                                return TASK_RESULT_BREAK;
                            this.creep._withdraw(target, resourceType, amount);
                        }

                        if (targetResourceAmount >= creepSpace)
                            return TASK_RESULT_COMPLETE;
                        else
                            return TASK_RESULT_BREAK;
                    }
                }
            }
            else
            {
                // WTF is this?
                console.log('Task_Collect.doTask - ' + creep.name + ' - what the heck is this? ' + JSON.stringify(target));
            }
        }

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Collect
