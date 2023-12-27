'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Upgrade extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Upgrade.constructor - executing');

        this.jobType = 'upgrade';
        this.desiredSpawnType = 'worky';
    }

    getTotalEnergyOut()
    {
        return (_.sum(this.getCreepMemories().map(c => c.work)) || 0) * UPGRADE_CONTROLLER_POWER;
    }

    creepAdded(creepName, jobMemory)
    {
        // let creep = Game.creeps[creepName];
        // if (creep)
        // {
        //     let existingCreeps = this.getCreeps();
        //     for (let existingCreep of existingCreeps)
        //     {
        //         if (!existingCreep.memory.boosts && existingCreep.memory.work < creep.memory.work)
        //             this.layOffCreep(existingCreep);
        //     }
        // }
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null);
        if (!task)
            return null;

        let maxParts = task.maxParts;
        if ((!maxParts || maxParts >= CONTROLLER_MAX_UPGRADE_PER_TICK) && this.room.controller.level >= 8)
            maxParts = CONTROLLER_MAX_UPGRADE_PER_TICK;

        let boosts = this.getDesiredBoosts(spawn);

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: maxParts, task: task, boosts: boosts };
    }

    getTask(creep)
    {
        if (!this.room)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let existingCreeps = this.getCreeps();

        if (existingCreeps.length > 0 && this.room.isBootstrapping())
            return null;

        if (existingCreeps.length > 0 && this.room.controller.level >= 8)
            return null;

        if (Room.sendingAwayResources(this.room.name) && (!this.room.controller.ticksToDowngrade || this.room.controller.ticksToDowngrade > CONTROLLER_DOWNGRADE[this.room.controller.level] / 10))
            return null;

        if (existingCreeps.length <= 0 && (this.room.controller.level < 4 || (this.room.controller.ticksToDowngrade && this.room.controller.ticksToDowngrade <= CONTROLLER_DOWNGRADE[this.room.controller.level] / 2)))
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'upgrade', program: 'task_upgrader', data: { r: this.roomName }}

        let boosted = (creep && creep.memory.boosts && creep.memory.boosts.indexOf('XGH2O') >= 0);
        if (boosted)
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'upgrade', program: 'task_upgrader', data: { r: this.roomName }}

        if (Room.wantsReplan(this.roomName) && this.room.hasMyStorageOrTerminal())
            return null;

        // if (creep && !boosted)
        // {
        //     for (let existingCreep of existingCreeps)
        //     {
        //         if (!existingCreep.memory.boosts && creep.memory.work < existingCreep.memory.work)
        //             return null;
        //     }
        // }

        let controllerCan = this.room.controllerCan;
        let controllerLink = this.room.controllerLink;

        // if (!controllerCan && !controllerLink && (!this.room.controller.ticksToDowngrade || this.room.controller.ticksToDowngrade > 5000))
        //     return null;

        let baseMemory = Room.getBaseMemory(this.roomName);
        if (!baseMemory)
            return null;

        let roomPracticalEnergyLevel = Room.getPracticalResourceAmountLevel(this.roomName, RESOURCE_ENERGY);
        let roomEnergyLevel = Room.getResourceAmountLevel(this.roomName, RESOURCE_ENERGY);
        let canAffordMoreUpgrading = ((roomPracticalEnergyLevel >= constants.RESOURCE_LEVEL_NORMAL && roomEnergyLevel >= constants.RESOURCE_LEVEL_LOW)||
                                     (baseMemory.spendable &&
                                      baseMemory.spendable > 0 &&
                                      !baseMemory.shipTarget));

        if (!boosted &&
          (!canAffordMoreUpgrading ||
           //(this.room.controller.level >= 4 && !this.room.storage) ||
           //(this.room.controller.level >= 6 && !this.room.terminal) ||
           (this.room.controller.level >= 8 && roomEnergyLevel < constants.RESOURCE_LEVEL_HIGH)))
        {
            let controllerDowngradeTime = CONTROLLER_DOWNGRADE[this.room.controller.level];
            if (this.room.controller.ticksToDowngrade && this.room.controller.ticksToDowngrade < controllerDowngradeTime / 2 && existingCreeps.length < 1)
                return { utility: 1, jobId: this.id, jobType: this.jobType, name: 'upgrade', program: 'task_upgrader', data: { r: this.roomName }};

            return null;
        }



        if (!boosted && existingCreeps.length > 0 && roomEnergyLevel < constants.RESOURCE_LEVEL_NORMAL && baseMemory.spendable <= existingCreeps[0].memory.work)
            return null;

        let maxCreeps = 1;
        if (this.room.controller.level < 8)
        {
            maxCreeps = this.room.controller.pos.getOpenPositionsAtRange(3);
            if (controllerLink)
                maxCreeps -= 1;
        }

        if (!boosted && existingCreeps.length >= maxCreeps)
            return null;

        if (boosted)
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'upgrade', program: 'task_upgrader', data: { r: this.roomName }};

        let thisSpending = this.getTotalEnergyOut();
        let effectiveProfit = baseMemory.spendable;//(baseMemory.spendable * baseMemory.profitQuotient) - thisSpending;

        if (effectiveProfit > 0 && baseMemory.profitQuotient >= 1)
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'upgrade', program: 'task_upgrader', data: { r: this.roomName }};

        return null;

        // let utility = 0;
        // if (roomEnergyLevel >= constants.RESOURCE_LEVEL_NORMAL)
        //     utility = 1.0 - (existingCreeps.length / maxCreeps);
        // else if (effectiveProfit > 0)
        //     utility = 1.0 - (thisSpending / (effectiveProfit + thisSpending));
        //
        // if (utility <= 0.0 && !boosted)
        //     return null;
        //
        // return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'upgrade', program: 'task_upgrader', data: { r: this.roomName }};
    }

    getTaskDirect()
    {
        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'upgrade', program: 'task_upgrader', data: { r: this.roomName }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn)
            return null;

        let room = Game.rooms[this.roomName];
        if (!room)
            return null;

        if (this.room.isBootstrapping() || (room.name != spawn.room.name && room.controller.level < 8))
        {
            let boosts = [];

            if (Room.getResourceAmountLevel(spawn.room.name, 'XGH2O') >= constants.RESOURCE_LEVEL_LOW)
                boosts.push({ b: 'XGH2O', r: 0 });
            else
                return null;
            
            if (Room.getResourceAmountLevel(spawn.room.name, 'XKH2O') >= constants.RESOURCE_LEVEL_LOW)
                boosts.push({ b: 'XKH2O', r: 0 });
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZHO2') >= constants.RESOURCE_LEVEL_LOW)
                boosts.push({ b: 'XZHO2', r: 0 });

            if (boosts.length <= 0)
                return null;

            return boosts;
        }

        let resourceLevel = Room.getResourceAmountLevel(spawn.room.name, 'XGH2O');
        let minResourceLevel = constants.RESOURCE_LEVEL_LOW;
        if (room.controller.level >= 8)
            minResourceLevel = constants.RESOURCE_LEVEL_HIGH;
        if (resourceLevel < minResourceLevel)
            return null;

        return [ { b: 'XGH2O', r: 0 } ];
    }
}

module.exports = Job_Upgrade;
