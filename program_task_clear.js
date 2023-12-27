'use strict'

let Task = require('program_task');

class Task_Clear extends Task
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 0;
    }

    start()
    {
        super.start();

        let roomMemory = Room.getMemory(this.memory.r);
        if (roomMemory)
            roomMemory.clear = 1;
    }

    end()
    {
        if (this.memory)
        {
            let clearerCount = Room.getJobCreepCount(this.memory.r, 'clear');
            let roomMemory = Room.getMemory(this.memory.r);
            if (roomMemory && clearerCount <= 1)
                delete roomMemory.clear;
        }

        super.end();

    }

    doTask(creep)
    {
        super.doTask();

        if (!this.memory.r)
            return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 0))
        {
            this.healSelf(creep);
            return TASK_RESULT_BREAK;
        }
        
        let nearestKeeper = this.creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, { filter: s => s.hits && (!s.effects || s.effects.length <= 0 || !s.effects.find(e => e.effect == EFFECT_INVULNERABILITY))});
        if (!nearestKeeper)
            nearestKeeper = this.creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: s => s.store && s.effects && s.effects.length > 0 && s.effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER) && s.store.getUsedCapacity() <= 0 });
        if (!nearestKeeper)
            nearestKeeper = this.creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: c => c.isSourceKeeper() });
        
        if (nearestKeeper)
        {
            //console.log('Task_Clear.doTask - ' + creep.name + ' - ' + this.memory.r + ' - target: ' + nearestKeeper.owner.username);
            return this.attackKeeper(creep, nearestKeeper);
        }

        this.healSelf(creep);

        let sources = [];
        if (creep.room.mineral)
            sources.push(creep.room.mineral);
        if (creep.room.sources)
            sources = sources.concat(creep.room.sources);

        if (sources.length <= 0)
        {
            console.log('Task_Clear.doTask - ' + creep.name + ' - ' + this.memory.r + ' - no sources?!?');
            return TASK_RESULT_COMPLETE;
        }

        let nextSource = _.min(sources, s => s.lair.ticksToSpawn);
        if (nextSource == Infinity)
        {
            console.log('Task_Clear.doTask - ' + creep.name + ' - ' + this.memory.r + ' - could not find next spawning lair');
            return TASK_RESULT_COMPLETE;
        }

        let maxRange = Math.ceil((creep.hitsMax - creep.hits) / 100) + 1;

        if (this.gotoTarget(nextSource, maxRange, { ignoreCreeps: false }))
            return TASK_RESULT_BREAK;

        //console.log('Task_Clear.doTask - ' + creep.name + ' - ' + this.memory.r + ' - no target');

        return TASK_RESULT_BREAK;
    }

    attackKeeper(creep, keeper)
    {
        let amRanged = creep.memory[RANGED_ATTACK];
        let engageRange = 1;
        if (amRanged)
            engageRange = 3;

        if (this.gotoTarget(keeper, engageRange, { ignoreCreeps: false }))
        {
            this.healSelf(creep);
            return TASK_RESULT_BREAK;
        }

        if (amRanged)
            creep.rangedAttack(keeper);
        else
            creep.attack(keeper);

        return TASK_RESULT_BREAK;
    }

    healSelf(creep)
    {
        if (creep.hits < creep.hitsMax && creep.memory[HEAL])
            creep.heal(creep);
    }
}

module.exports = Task_Clear
