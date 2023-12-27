'use strict'

const constants = require('constants');

let Task = require('program_task');

class Task_Deliver extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_DELIVER;
    }

    start()
    {
        super.start();

        //console.log('Task_Deliver.start - ' + this.creep.name + ' - starting');

        // if (!this.memory.res)
        //     console.log('Task_Deliver.start - ' + this.creep.name + ' - NO RESOURCE SPECIFIED');
    }

    doTask(creep)
    {
        super.doTask();

        //console.log('Task_Deliver.doTask - ' + this.creep.name + ' executing');

        let creepCarry = creep.getResourceAmount(this.memory.res);
        if (creepCarry <= 0)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();
        if (!target)
        {
            //console.log('Task_Deliver.doTask - ' + this.creep.name + ' no target');
            return TASK_RESULT_COMPLETE;
        }

        if (this.memory.c)
        {
            let targetPos = target;
            if (target.pos)
                targetPos = target.pos;
                
            Game.map.visual.line(creep.pos, targetPos, {color: this.memory.c, lineStyle: 'dashed'});
            Game.map.visual.circle(targetPos, {radius: 1, fill: this.memory.c, opacity: 0.5});
        }

        let resourceType = null;
        if (this.memory.res)
            resourceType = this.memory.res;

        //console.log('Task_Deliver.doTask - ' + this.creep.name + ' - delivering ' + resourceType + ' to ' + target);

        if (target.store && !(target instanceof Creep))
        {
            let targetSpace = target.store.getFreeCapacity(resourceType);
            if (targetSpace <= 0)
            {
                //console.log('Task_Deliver.doTask - ' + this.creep.name + ' no space in ' + target);
                return TASK_RESULT_COMPLETE;
            }
        }

        if (constants.BUCKET_BRIGADE)
        {
            let spawnRoom = Game.rooms[creep.memory.spawnRoom];
            if (!spawnRoom || !spawnRoom.hasMyStorageOrTerminal())
            {
                if (!creep.isMovingToward(target))
                    this.gotoTarget(target, 1, { planOnly: 1 });
    
                if (creep.isMovingToward(target) && !creep.cantTransfer && (!this.memory.res || this.memory.res == RESOURCE_ENERGY))
                {
                    let nextPos = creep.nextMovePos;
    
                    if (!nextPos.isEqualTo(creep.pos) && nextPos.roomName == creep.pos.roomName)
                    {
                        let creepAhead = _.find(nextPos.lookFor(LOOK_CREEPS), c => c.my && c.memory.type == 'carry');
                        if (creepAhead)
                        {
                            let creepAheadSpace = creepAhead.getFreeSpace(this.memory.res);
                            if (creepAheadSpace >= creepCarry)
                            {
                                creep._transfer(creepAhead, this.memory.res);
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

        if (this.gotoTarget(target, 1))
            return TASK_RESULT_BREAK;

        let currentCreepCarry = creep.store.getUsedCapacity();
        if (currentCreepCarry <= 0)
            return TASK_RESULT_BREAK;

        if (creep.cantTransfer)
            return TASK_RESULT_BREAK;

        if (this.memory.res)
        {
            let thisResource = this.creep.store.getUsedCapacity(resourceType);
            if (thisResource > 0)
            {
                this.creep._transfer(target, this.memory.res);
                if (this.memory.once)
                    return TASK_RESULT_COMPLETE;
            }

            if (creep.getResourceAmount(resourceType) > 0)
                return TASK_RESULT_BREAK;
        }
        else
        {
            for (let resourceType of RESOURCES_ALL)
            {
                let thisResource = this.creep.store.getUsedCapacity(resourceType);
                if (thisResource > 0)
                {
                    this.creep._transfer(target, resourceType);
                    if (this.memory.once)
                        return TASK_RESULT_COMPLETE;

                    if (thisResource >= creepCarry)
                        return TASK_RESULT_CONTINUE;
                    else
                        return TASK_RESULT_BREAK;
                }
            }
        }

        //console.log('Task_Deliver.doTask - ' + this.creep.name + ' didnt do anything ');

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Deliver
