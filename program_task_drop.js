'use strict'

const constants = require('constants');

let Task = require('program_task');

class Task_Drop extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_DELIVER;
    }

    doTask(creep)
    {
        super.doTask();

        let creepCarry = creep.getResourceAmount();
        if (creepCarry <= 0)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

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

        if (creep.cantDrop || creep.cantTransfer)
            return TASK_RESULT_BREAK;

        let rangeTo = creep.pos.getRangeTo(target);
        //console.log('Creep.doTaskDrop - ' + creep.name + ' - at range ' + rangeTo);

        if (rangeTo >= 1)
        {
            if (rangeTo == 1)
            {
                let structure = _.find(target.lookFor(LOOK_STRUCTURES), object => object.structureType != STRUCTURE_ROAD);
                if (structure)
                {
                    if (structure.store)
                    {
                        for (let resourceType of RESOURCES_ALL)
                        {
                            let creepResource = creep.store.getUsedCapacity(resourceType);
                            if (creepResource > 0 && structure.store.getFreeCapacity(resourceType) > 0)
                            {
                                creep._transfer(structure, resourceType);
                                if (creepResource >= creepCarry)
                                    return TASK_RESULT_COMPLETE;
                                else
                                    return TASK_RESULT_BREAK;
                            }
                        }
                    }
                }
                else
                {
                    let otherCreep = _.first(target.lookFor(LOOK_CREEPS));
                    if (otherCreep && otherCreep.store.getFreeCapacity() > 0)
                    {
                        if (this.memory.res)
                        {
                            creep._transfer(otherCreep, this.memory.res);
                            return TASK_RESULT_COMPLETE;
                        }
                        else
                        {
                            for (let resourceType of RESOURCES_ALL)
                            {
                                let creepResource = creep.store.getUsedCapacity(resourceType);
                                if (creepResource > 0)
                                {
                                    creep._transfer(creep, resourceType);
                                    if (creepResource >= creepCarry)
                                        return TASK_RESULT_COMPLETE;
                                    else
                                        return TASK_RESULT_BREAK;
                                }
                            }
                        }
                    }
                    else if (!otherCreep)
                    {
                        let site = _.first(target.lookFor(LOOK_CONSTRUCTION_SITES));
                        if (!site)
                        {
                            creep.moveTo(target, { range: 0 });
                            return TASK_RESULT_BREAK;
                        }
                    }
                }
            }
            else
            {
                creep.moveTo(target, { range: 1 });
                return TASK_RESULT_BREAK;
            }
        }

        //console.log('Creep.doTaskDrop - ' + creep.name + ' - at the spot!');

        if (this.memory.res)
        {
            creep._drop(this.memory.res);
            return TASK_RESULT_COMPLETE;
        }
        else
        {
            for (let resourceType of RESOURCES_ALL)
            {
                let creepResource = creep.store.getUsedCapacity(resourceType);
                if (creepResource > 0)
                {
                    creep._drop(resourceType);
                    if (creepResource >= creepCarry)
                        return TASK_RESULT_COMPLETE;
                    else
                        return TASK_RESULT_BREAK;
                }
            }
        }

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Drop
