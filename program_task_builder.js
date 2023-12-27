'use strict'

let Task = require('program_task');

const maxSearchTime = 10;

class Task_Builder extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();


    }

    end()
    {
        super.end();

        if (this.creep && this.creep.memory)
            delete this.creep.memory.ept;
    }

    doTask(creep)
    {
        if (this.creep && this.creep.memory)
            delete this.creep.memory.ept;

        if (!Room.isMyBase(this.memory.r))
            return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 1))
        {
            if (creep.store.getUsedCapacity() > 0)
                this.dropResources();
            return TASK_RESULT_BREAK;
        }
            
        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();
        if (creepEnergy <= 0)
            return this.getResourceNearest(RESOURCE_ENERGY);

        if (creep.room.controller && creep.room.controller.my && (creep.room.controller.level < 2 || (creep.room.controller.ticksToDowngrade && creep.room.controller.ticksToDowngrade <= CONTROLLER_DOWNGRADE[creep.room.controller.level] / 2)))
        {
            this.upgradeTarget(creep.room.controller, false);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        let repairTarget = this.findUrgentRepairTarget(creep);
        if (repairTarget)
        {
            delete this.memory.search;
            return this.repairTarget(repairTarget, true);
        }

        //if (Room.isUnclaiming(this.memory.r))
        //    return TASK_RESULT_COMPLETE;

        if (creep.memory.n > 0 && this.memory.search && this.memory.search >= maxSearchTime)
        {
            let nearestBase = Room.getNearestBase(this.memory.r);
            if (nearestBase)
            {
                let nearestBaseMemory = Room.getBaseMemory(this.memory.r);
                if (nearestBaseMemory)
                {
                    if ((nearestBaseMemory.spendable || 0) < 0 - creep.buildPower)
                        return TASK_RESULT_COMPLETE;
                }
            }
        }
       
        let buildTarget = this.findBuildTarget(creep);
        if (buildTarget)
        {
            delete this.memory.search;
            return this.buildTarget(buildTarget);
        }

        this.memory.search = (this.memory.search || 0) + 1;

        if (this.memory.search < maxSearchTime)
            return TASK_RESULT_BREAK;

        if (creep.memory.type != "worry")
            return TASK_RESULT_COMPLETE;

        if (creep.memory.n == 0 && (Game.rooms[this.memory.r].controller.level >= 3 || creep.memory.boosts))// && creep.room.hasMyStorageOrTerminal())
        {
            let paveTime = Room.getPaveTime(this.memory.r, this.memory.r);
            if (!paveTime)
            {
                this.paveRoom(this.memory.r);
                return TASK_RESULT_CONTINUE_NEXT;
            }
            else
            {
                let decayTime = ((ROAD_HITS / ROAD_DECAY_AMOUNT) * ROAD_DECAY_TIME) / 10;
                let remainingWaitTIme = Math.floor((paveTime + decayTime) - Game.time);

                if (remainingWaitTIme <= 0)
                {
                    this.paveRoom(this.memory.r);
                    return TASK_RESULT_CONTINUE_NEXT;
                }
            }
        }

        // if (creep.memory.n == 0 || Room.beingNuked(this.memory.r))
        // {
        //     let doFortify = Room.beingNuked(this.memory.r);
        //     if (!doFortify && creep.room.controller)
        //     {
        //         let towers = creep.room.towers.filter(t => t.my);
        //         doFortify = (towers.length > 0 && (!creep.room.controller.safeMode || creep.room.controller.safeModeCooldown || creep.room.controller.safeMode < 1000 || Room.getMyBases().length > 1));
        //     }

        //     if (doFortify)
        //     {
        //         this.fortifyRoom(this.memory.r);
        //         return TASK_RESULT_CONTINUE_NEXT;
        //     }
        // }

        return TASK_RESULT_COMPLETE;
    }

    findUrgentRepairTarget(creep)
    {
        let room = Game.rooms[this.memory.r];
        if (!room)
            return null;
            
        let repairables = room.find(FIND_MY_STRUCTURES, { filter: s => s.hits && s.hits < s.hitsMax && s.structureType != STRUCTURE_RAMPART });
        if (repairables.length > 0)
            return _.min(repairables, t => creep.pos.getRangeTo(t));

        let quickCan1 = room.quickCan1;
        if (quickCan1 && quickCan1.hits <= quickCan1.hitsMax / 2)
            return quickCan1;

        let quickCan2 = room.quickCan2;
        if (quickCan2 && quickCan2.hits <= quickCan2.hitsMax / 2)
            return quickCan2;

        let controllerCan = room.controllerCan;
        if (controllerCan && controllerCan.hits <= controllerCan.hitsMax / 2)
            return controllerCan;

        return null;
    }

    findBuildTarget(creep)
    {
        let room = Game.rooms[this.memory.r];
        if (!room)
            return null;
        let sites = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: s => s.structureType != STRUCTURE_ROAD && s.structureType != STRUCTURE_RAMPART && s.isSafe() });
        if (sites.length <= 0)
            return null;
        let site = _.min(sites, s => creep.wpos.getManhattanDist(s.wpos));
        return site;
    }
}

module.exports = Task_Builder
