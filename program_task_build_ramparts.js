'use strict'

let Task = require('program_task');

class Task_Build_Ramparts extends Task
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
            this.creep.memory.ept = 1;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        if (creepEnergy <= 0)
            return TASK_RESULT_COMPLETE;

        let target = this.getTarget();
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (this.moveToTarget(target, 3))
            return TASK_RESULT_BREAK;

        if (creep.cantBuild)
            return TASK_RESULT_BREAK;

        if (target.progressTotal)
            creep.build(target);

        let sites = creep.room.find(FIND_CONSTRUCTION_SITES, { filter: s => s.structureType == STRUCTURE_RAMPART && s.id != target.id });

        if (sites.length <= 0)
            return TASK_RESULT_COMPLETE;

        let nearestSite = _.min(sites, s => creep.pos.getRangeTo(s.pos));
        this.setTarget(nearestSite);
        if (creep.pos.getRangeTo(nearestSite.pos) > 1)
            creep.moveTo(nearestSite);
        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Build_Ramparts
