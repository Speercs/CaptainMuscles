'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Upgrade extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'upgrade', room: this.data.room });

        this.desiredSpawnType = 'worky';
        if (this.room && this.room.controller.level < 2)
            this.desiredSpawnType = 'worry';

        //console.log('Mission_Upgrade.constructor - executing');
    }

    run()
    {
        super.run();
        //console.log('Mission_Build.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        //console.log('Mission_Upgrade.updateInfo - ' + this.data.room + ' - executing');

        this.memory.out = 0;

        let lastCreepOut = 0;
        let creepCount = 0;
        while (creepCount < this.memory.creeps.length)
        {
            let creep = Game.creeps[this.memory.creeps[creepCount]];
            if (!creep)
            {
                this.memory.creeps.splice(creepCount, 1);
            }
            else if (creep.memory.type != this.desiredSpawnType)
            {
                this.layOffCreep(creep);
            }
            else
            {
                lastCreepOut = creep.upgradePower;
                this.memory.out += lastCreepOut;
                ++creepCount;
            }
        }

        this.memory.lastCreepOut = lastCreepOut;

        let baseMemory = Room.getBaseMemory(this.data.room);
        let controllerCan = null;
        let controllerLink = null;
        if (this.room)
        {
            controllerCan = this.room.controllerCan;
            controllerLink = this.room.controllerLink;
        }
        if (baseMemory && (controllerCan || controllerLink))
        {
            let totalProfit = baseMemory.spendable;

            this.memory.profitForUpgrading = totalProfit;

            if (this.memory.creeps.length > 1 && totalProfit + this.memory.lastCreepOut < 0)
            {
                let creep = Game.creeps[this.memory.creeps[this.memory.creeps.length - 1]];
                creep._drop(RESOURCE_ENERGY);
                this.layOffCreep(creep, 1);
            }
        }
        else
        {
            delete this.memory.profitForUpgrading;
        }
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        let task = this.getTask(creep);
        if (!task)
            return null;

        let baseMemory = Room.getBaseMemory(this.data.room);

        let maxParts = task.maxParts;
        if (maxParts && maxParts >= CONTROLLER_MAX_UPGRADE_PER_TICK && this.room.controller.level >= 8 )
            maxParts = CONTROLLER_MAX_UPGRADE_PER_TICK;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (!this.room)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let controllerCan = this.room.controllerCan;
        let controllerLink = this.room.controllerLink;

        if (!controllerCan && !controllerLink)
            return null;

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory)
            return null;

        if (!this.memory.profitForUpgrading ||
             this.memory.profitForUpgrading <= 0 ||
             baseMemory.shipTarget ||
             (this.room.controller.level >= 4 && !this.room.storage) ||
             (this.room.controller.level >= 6 && !this.room.terminal))
        {
            if (this.memory.creeps.length < 1)
                return { utility: 1, task: 'upgrade', program: 'task_upgrade', maxParts: 1, data: { r: this.room.name }};

            return null;
        }

        let maxCreeps = 8;
        if (this.room.controller.level >= 8)
            maxCreeps = 1;
        // else if (!this.room.storage || !this.room.storage.my)
        //     maxCreeps = this.room.controller.pos.getOpenPositionsInRange(3);
        else if (!controllerLink)
            maxCreeps = 9;

        if (this.memory.creeps.length >= maxCreeps)
            return null;

        let utility = 1.0 - (this.memory.out / this.memory.profitForUpgrading);
        return { utility: utility, task: 'upgrade', program: 'task_upgrade', data: { r: this.room.name }};
    }
}

module.exports = Mission_Upgrade
