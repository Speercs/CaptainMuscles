'use strict'

let Task = require('program_task');

class Task_Fill_Spawn extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();

        let room = Game.rooms[this.memory.r];
        if (!room)
            return null;

        let sinks = room.slowExtensions;
        if (!sinks)
            return TASK_RESULT_COMPLETE;

        sinks = sinks.filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

        this.memory.targetIds = sinks.map(s => s.id);
    }

    doTask(creep)
    {
        super.doTask();

        let room = Game.rooms[this.memory.r];
        if (!room)
        {
            console.log('Task_Fill_Spawn.doTask - ' + creep.name + ' - ' + creep.room.name + ' - no room');
            return TASK_RESULT_COMPLETE;
        }

        if (room.energyCapacityAvailable - room.energyAvailable <= 0)
        {
            //console.log('Task_Fill_Spawn.doTask - ' + creep.name + ' - ' + creep.room.name + ' - room doesnt need energy');
            return TASK_RESULT_COMPLETE;
        }

        let creepCapacity = creep.store.getCapacity();
        if (creepCapacity <= 0)
        {
            console.log('Task_Fill_Spawn.doTask - ' + creep.name + ' - ' + creep.room.name + ' - no capacity');
            return TASK_RESULT_COMPLETE;
        }

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();
            
        if (creepEnergy <= 0)
            return this.getEnergy(creep);

        if (this.memory.t)
        {
            let target = Game.getObjectById(this.memory.t);
            if (target && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            {
                if (this.gotoTarget(target, 1))
                    return TASK_RESULT_BREAK;

                creep._transfer(target, RESOURCE_ENERGY);
                delete this.memory.t;

                if (!this.memory.targetIds || this.memory.targetIds.length <= 0)
                    return TASK_RESULT_COMPLETE;

                if (creep.getResourceAmount(RESOURCE_ENERGY) <= 0)
                    return this.getEnergy(creep);
            }
        }

        if (!this.memory.targetIds)
            return TASK_RESULT_COMPLETE;

        let sinks = this.memory.targetIds.map(id => Game.getObjectById(id));
        sinks = sinks.filter(s => s && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        if (sinks.length <= 0)
            return TASK_RESULT_COMPLETE;

        sinks = _.sortBy(sinks, s => creep.wpos.getRangeTo(s.wpos));
        
        let sink = sinks.shift();
        this.memory.t = sink.id;

        this.memory.targetIds = sinks.map(s => s.id);

        this.gotoTarget(sink, 1)
        return TASK_RESULT_BREAK;
    }

    getEnergy(creep)
    {
        // if (Room.inDanger(this.memory.r))
        // {
            if (this.getResourceFromStorage(RESOURCE_ENERGY, true, true))
                return TASK_RESULT_BREAK;
        // }
        // else
        // {
        //     if (this.getResourceNearest(RESOURCE_ENERGY))
        //         return TASK_RESULT_BREAK;
        // }

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Fill_Spawn
