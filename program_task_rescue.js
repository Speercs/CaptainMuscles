'use strict'

let Task = require('program_task');

class Task_Rescue extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    doTask(creep)
    {
        super.doTask();

        let flag = Game.flags['rescue_' + this.memory.r];

        if (!flag)
            return TASK_RESULT_COMPLETE;

        let roomCenter = new RoomPosition(25, 25, this.memory.r);
        Game.map.visual.line(creep.pos, roomCenter, {color: '#ffffff', lineStyle: 'dashed'});
        Game.map.visual.circle(roomCenter, {radius: 1, fill: '#ffffff', opacity: 1.0});

        if (this.moveToRoom(this.memory.r, 1))
            return TASK_RESULT_BREAK;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            this.dropResources(RESOURCE_ENERGY);
        if (creep.getFreeSpace(RESOURCE_ENERGY) > 0)
            return this.getResourceNearest(RESOURCE_ENERGY);

        let sinks = creep.room.find(FIND_STRUCTURES).filter(s => (s.structureType == s.STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_TOWER) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && !s.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART && !opt.isPublic))
        if (sinks.length > 0)
        {
            let nearestSink = _.min(sinks, s => creep.pos.getRangeTo(s.pos));
            this.deliverResourceToTarget(nearestSink, RESOURCE_ENERGY, true);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        let sites = creep.room.constructionSites.filter(s => s.healInCombat());
        if (!sites || sites.length <= 0)
        {
            flag.remove();
            return TASK_RESULT_COMPLETE;
        }

        let site = sites.find(s => s.structureType == STRUCTURE_SPAWN);
        if (!site)
            site = sites.find(s => s.structureType == STRUCTURE_TOWER);

        if (!site)
        {
            if (flag)
                flag.remove();
            return TASK_RESULT_COMPLETE;
        }
        return this.buildTarget(site, true);
    }
}

module.exports = Task_Rescue
