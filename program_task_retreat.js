'use strict'

let Task = require('program_task');

class Task_Retreat extends Task
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 0;
    }

    start()
    {
        super.start();
    }

    doTask(creep)
    {
        if (creep.store.getUsedCapacity() > 0)
            this.dropResources();

        if (creep.memory[HEAL])
            creep.heal(creep);

        if (creep.memory[RANGED_ATTACK])
        {
            let hostileFilter = (pt => pt.owner && pt.attackInCombat());
            if (!creep.room.controller || !creep.room.controller.my)
                hostileFilter = (pt => (!pt.owner || !pt.my) && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_ROAD && pt.attackInCombat());
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

        if (!this.memory.toRoom)
        {
            let nearestBase = Room.getNearestBaseByCivilianRoute(creep.room.name);
            if (!nearestBase)
                return TASK_RESULT_COMPLETE;

            this.memory.toRoom = nearestBase.name;
        }

        //console.log('Task_Retreat.doTask - ' + creep.name + ' - ' + creep.pos + ' - retreating to ' + nearestBase.name);

        // if (this.memory.leaveRoom && creep.room.name == this.memory.leaveRoom)
        // {
        //     let exits = creep.room.find(FIND_EXIT);
        //     if (exits && exits.length > 0)
        //     {
        //         let nearestExit = _.min(exits, x => creep.pos.getRangeTo(x));
        //         creep.moveTo(nearestExit)
        //         return TASK_RESULT_BREAK;
        //     }
        // }

        if (this.memory.leaveRoom && creep.room.name != this.memory.leaveRoom && !creep.pos.nearEdge(3))
            return TASK_RESULT_COMPLETE;

        if (this.gotoRoom(this.memory.toRoom, 0))
            return TASK_RESULT_BREAK;

        if (creep.room.towerFillPos)
        {
            if (this.gotoTarget(creep.room.towerFillPos, 3))
                return TASK_RESULT_BREAK;
        }
        else
        {
            if (creep.room.controller && creep.hits < creep.hitsMax && this.gotoTarget(creep.room.controller, 5))
                return TASK_RESULT_BREAK;
        }
        
        if (this.gotoRoom(this.memory.toRoom, 3))
            return TASK_RESULT_BREAK;

        return TASK_RESULT_COMPLETE;
    }
}

module.exports = Task_Retreat
