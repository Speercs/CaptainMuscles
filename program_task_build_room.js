'use strict'

let Task = require('program_task');

class Task_Build_Room extends Task
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

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let buildTarget = this.findBuildTarget(creep);
        if (buildTarget)
        {
            delete this.memory.search;
            return this.buildTarget(buildTarget);
        }

        this.memory.search = (this.memory.search || 0) + 1;

        if (this.memory.search >= 10)
            return TASK_RESULT_COMPLETE;

        return TASK_RESULT_BREAK;
    }

    findBuildTarget(creep)
    {
        let room = Game.rooms[this.memory.r];
        if (!room)
            return null;
        let sites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: s => s.structureType != STRUCTURE_ROAD && s.structureType != STRUCTURE_RAMPART });
        if (sites.length <= 0)
            return null;
        let site = _.min(sites, s => creep.wpos.getManhattanDist(s.wpos));
        return site;
    }
}

module.exports = Task_Build_Room
