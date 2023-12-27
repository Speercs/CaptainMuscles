'use strict'

let Task = require('program_task');

class Task_Avoid_Nuke extends Task
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 0;
        this.autoBoost = 0;
    }

    start()
    {
        super.start();
    }

    doTask(creep)
    {
        if (Game.time >= this.memory.endTime)
            return TASK_RESULT_COMPLETE;

        if (creep.store.getUsedCapacity() > 0)
            this.dropResources();

        if (creep.memory[HEAL] && creep.hits < creep.hitsMax)
            creep.heal(creep);

        if (creep.memory[RANGED_ATTACK])
        {
            let hostileFilter = (pt => pt.owner && pt.attackInCombat());
            if (!creep.room.controller || !creep.room.controller.my)
                hostileFilter = (pt => (!pt.owner || !pt.my) && pt.structureType != STRUCTURE_ROAD && pt.attackInCombat());
            let potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, 3, hostileFilter);
            if (potentialTargets.length <= 0)
                potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, 3, hostileFilter);
            if (potentialTargets.length <= 0)
                potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 3, hostileFilter);

            if (potentialTargets.length > 0)
            {
                let target = _.min(potentialTargets, pt => pt.hits);
                if (creep.pos.getRangeTo(target) <= 1 && target.owner)
                    creep.rangedMassAttack(target);
                else
                    creep.rangedAttack(target);
            }
        }

        if (creep.room.name == this.memory.leaveRoom)
            this.fleeRoom(creep);
        else if (creep.pos.nearEdge(5))
            this.gotoRoom(creep.room.name, 5);

        return TASK_RESULT_BREAK;
    }

    fleeRoom(creep)
    {
        let nearestExit = creep.pos.findClosestByRange(FIND_EXIT);
        creep.moveTo(nearestExit);
        return true;
    }
}

module.exports = Task_Avoid_Nuke
