'use strict'

let Task = require('program_task');

class Task_Fortify_Nearby extends Task
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
            this.creep.memory.ept = this.creep.memory.work;

        if (!this.memory.positions)
            return TASK_RESULT_COMPLETE;

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

        let sites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3, { filter: s => s.structureType == STRUCTURE_RAMPART });
        if (sites.length > 0)
        {
            creep.build(sites[0]);

            if (creepEnergy <= creep.memory.work)
                return TASK_RESULT_COMPLETE;

            return TASK_RESULT_BREAK;
        }

        let ramparts = creep.pos.findInRange(FIND_STRUCTURES, 3, { filter: s => s.structureType == STRUCTURE_RAMPART && this.memory.positions.indexOf(global.spotToChinese(s.pos)) >= 0 });
        if (ramparts.length > 0)
        {
            let lowestRampart = _.min(ramparts, r => r.hits);
            if (lowestRampart.hits < 100000 || Room.inDanger(creep.room.name) || this.accumulate(creep))
            {
                creep.repair(lowestRampart);

                if (creepEnergy <= creep.memory.work)
                    return TASK_RESULT_COMPLETE;
            }

            return TASK_RESULT_BREAK;
        }

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Fortify_Nearby
