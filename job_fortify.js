'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Fortify extends Job
{
    constructor (...args)
    {
        //console.log('Job_Quickfill.constructor - executing');
        super(...args);

        this.jobType = 'fortify';
        this.desiredSpawnType = 'worry';
    }

    getTotalEnergyOut()
    {
        return _.sum(this.getCreepMemories().map(cm => cm.ept || 0));
    }

    creepAdded(creepName, jobMemory)
    {
        let creep = Game.creeps[creepName];
        if (creep && creep.memory.boosts)
        {
            let existingCreeps = this.getCreeps();
            for (let existingCreep of existingCreeps)
            {
                if (!existingCreep.memory.boosts)
                    this.layOffCreep(existingCreep);
            }
        }
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null, spawn);
        if (!task)
            return null;

        //console.log('Job_Fortify.getDesiredSpawn - ' + roomName + ' - ' + jobId + ' - ' + spawn);

        let maxParts = 5;
        if (Room.inDanger(this.roomName) || Room.beingNuked(this.roomName) || ((Room.getMemory(this.roomName).minWallHits || 0) < constants.DESIRED_RAMPART_HITS))
            maxParts = null;

        let boosts = this.getDesiredBoosts(spawn);

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task, maxParts: maxParts, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        //console.log('Job_Fortify.getTask - ' + roomName + ' - ' + jobId + ' - ' + creep);
        if (!this.wantToFortify(creep, spawn))
            return null;

        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'fortify', program: 'task_fortify', data: { r: this.roomName }};
    }

    wantToFortify(creep, spawn)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return false;

        if (!this.room || !this.room.isMyBase() || this.room.controller.level < 2)
            return false;

        if (Room.sendingAwayResources(this.roomName))
            return false;

        // if (Room.getResourceAmountLevel(this.roomName, RESOURCE_ENERGY) < constants.RESOURCE_LEVEL_LOW)
        //     return false;

        if (Game.gcl.level < 2 && !this.room.controller.safeModeCooldown && this.room.controller.safeModeAvailable && !Room.inDanger(this.roomName) && !Room.beingNuked(this.roomName))
            return false;

        // if (creep)
        // {
        //     let maxParts = this.room.controller.level;
        //     if (!Room.hasPlentyOfEnergy(this.roomName) && !Room.inDanger(this.roomName) && creep.memory.work > maxParts)
        //         return false;
        // }


        let towers = this.room.towers.filter(t => t.my);
        let doFortify = (towers.length > 0 && (!this.room.controller.safeMode || this.room.controller.safeModeCooldown || this.room.controller.safeMode < 1000 || Room.getMyBases().length > 1));

        if (!doFortify)
            return false;

        let desiredCount = 1;
        if (Room.beingNuked(this.roomName) || (Room.inDanger(this.roomName) && this.room.find(FIND_HOSTILE_CREEPS).some(c => !c.isInvader() && c.killOnSight())))
            desiredCount = 3;
        else if (Room.wantsReplan(this.roomName))
            return false;

        if (Room.inDanger(this.roomName) && desiredCount > 1 && Room.getResourceAmountLevel(this.roomName, RESOURCE_ENERGY) > constants.RESOURCE_LEVEL_CRITICAL)
        {
            let defenders = Room.getJobSpawnedCreeps(this.roomName, 'defend');
            if (defenders.length > 0)
            {
                let hostiles = this.room.find(FIND_HOSTILE_CREEPS).filter(c => c.killOnSight());
                desiredCount = Math.min(desiredCount, hostiles.length, defenders.length);
            }
        }

        if (creep && !creep.memory.boosts && this.getSpawnedCreeps().length >= desiredCount)
            return false;

        let creeps = this.getCreeps();
        if (!creep && creeps.length >= desiredCount)
            return false;

        if (this.room.find(FIND_MY_CONSTRUCTION_SITES).find(cs => cs.structureType == STRUCTURE_RAMPART || cs.structureType == STRUCTURE_WALL))
            return true;

        let ramparts = this.room.ramparts;
        if (ramparts.length <= 0)
            return true;

        let minRampart = _.min(ramparts, r => r.hits);

        if (!Room.beingNuked(this.roomName) && !Room.inDanger(this.roomName))
        {
            if (minRampart && minRampart.hits >= minRampart.hitsMax * constants.MIN_RAMPART_PERCENT)
                return false;
        }
            
        if (minRampart && Room.beingNuked(this.roomName) && minRampart.hits > minRampart.hitsMax * 0.95)
            return false;
        if (minRampart && (minRampart.hits >= constants.DESIRED_RAMPART_HITS || minRampart.hits >= minRampart.hitsMax))
            return false;

        if (desiredCount <= 1 && creeps.length >= 1)
        {
            let baseMemory = Room.getBaseMemory(this.roomName);
            if (!baseMemory)
                return false;

            if (baseMemory.spendable <= 0 || baseMemory.profitQuotient <= 1)
                return false;
        }

        return true;
    }

    getTaskDirect()
    {
        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'fortify', program: 'task_fortify', data: { r: this.roomName }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn)
            return null;

        let minResourceLevel = constants.RESOURCE_LEVEL_LOW;
        if (Room.inDanger(this.roomName) || Room.beingNuked(this.roomName))
        {
            minResourceLevel = constants.RESOURCE_LEVEL_CRITICAL;
        }
        else
        {
            // if ((Room.getMemory(this.roomName).minWallHits || 0) <= constants.DESIRED_RAMPART_HITS)
            // {
            //     minResourceLevel = constants.RESOURCE_LEVEL_CRITICAL;
            // }
            // else
            
            {
                let myBases = Room.getMyBases();
                let lowestBase = _.min(myBases, b => Room.getMemory(b.name).minWallHits || 0);
                if (lowestBase && lowestBase.name == this.roomName)
                    minResourceLevel = constants.RESOURCE_LEVEL_CRITICAL;
            }
        }
            
            
        let resourceLevel = Room.getResourceAmountLevel(spawn.room.name, 'XLH2O');
        if (resourceLevel >= minResourceLevel)
            return [ { b: 'XLH2O', r: 0 } ];

        if (Room.inDanger(this.roomName) || Room.beingNuked(this.roomName))
        {
            resourceLevel = Room.getResourceAmountLevel(spawn.room.name, 'LH2O');
            if (resourceLevel >= minResourceLevel)
                return [ { b: 'LH2O', r: 0 } ];

            resourceLevel = Room.getResourceAmountLevel(spawn.room.name, 'LH');
            if (resourceLevel >= minResourceLevel)
                return [ { b: 'LH', r: 0 } ];
        }

        return null;
    }
}

module.exports = Job_Fortify;
