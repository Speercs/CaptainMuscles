'use strict'

let Task = require('program_task');

class Task_Build extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();


        //this.launchChildProcess(`fill_worker_${this.memory.target}`, 'mission_fill_worker', { room: this.memory.r, target: this.creep.id });
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
            this.creep.memory.ept = this.creep.buildPower;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();
        if (creepEnergy <= 0)
            return this.getResourceNearest(RESOURCE_ENERGY);

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        if (this.moveToTarget(target, 3))
        {
            delete this.memory.gotClose;
            return TASK_RESULT_BREAK;
        }

        let rangeToTarget = creep.pos.getRangeTo(target);

        if (rangeToTarget == 0)
        {
            this.fleeTarget(target, 2);
            return TASK_RESULT_BREAK;
        }

        if (rangeToTarget > 2 && !this.memory.gotClose)
            creep.moveTo(target);

        if (rangeToTarget <= 2)
            this.memory.gotClose = 1;

        if (creep.room.isBootstrapping() && creep.room.energyCapacityAvailable && !creep.room.hasMyStorageOrTerminal() && creep.room.energyAvailable < creep.room.energyCapacityAvailable)
        {
            let sinks = creep.room.find(FIND_MY_STRUCTURES).filter(s => s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION));
            if (sinks.length <= 0)
                return TASK_RESULT_BREAK;

            let nearestSink = _.min(sinks, s => creep.pos.getRangeTo(s.pos));
            this.deliverResourceToTarget(nearestSink, RESOURCE_ENERGY, true);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        let buildThisTick = this.data.ignorePq || this.accumulate(creep);
        //let buildThisTick = true;

        if (creep.cantBuild || !buildThisTick)
            return TASK_RESULT_BREAK;

        let result = creep.build(target);
        if (result == ERR_INVALID_TARGET)
        {
            let creepsHere = _.filter(target.pos.lookFor(LOOK_CREEPS), c => c.my);
            _.each(creepsHere, c => this.makeTargetFlee(c, 3));
        }
        if (creepEnergy <= creep.buildPower)
            return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Build
