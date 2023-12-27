'use strict'

const constants = require('constants');
let Job = require('job');

class Job_Build extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Build.constructor - executing');

        this.jobType = 'build';
        this.desiredSpawnType1 = 'worry';
        this.desiredSpawnType2 = 'worky';
    }

    getTotalEnergyOut()
    {
        return _.sum(this.getCreepMemories().map(cm => cm.ept || 0));
    }

    creepAdded(creepName, jobMemory)
    {
        let creep = Game.creeps[creepName];
        if (creep && creep.memory.boosts && creep.memory.boosts.indexOf('XLH2O') >= 0)
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

        let boosts = this.getDesiredBoosts(spawn);
        
        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, task: task, boosts: boosts };
    }

    getTask(creep, spawn)
    {
        if (creep && creep.memory.type != this.desiredSpawnType1 && creep.memory.type != this.desiredSpawnType2)
            return null;

        if (creep && creep.memory.type == this.desiredSpawnType2 && this.roomName != creep.room.name)
            return null;

        this.desiredSpawnType = this.desiredSpawnType1;

        let creeps = this.getCreeps();
        if (creeps.length < 4 && ((Room.isMyBase(this.roomName) && this.room.spawns.length <= 0) || (!Room.isMyBase(this.roomName) && Room.wantToClaim(this.roomName))))
        {
            console.log('Job_Build.getTask - ' + this.roomName + ' - new base requesting builder');
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
        }
            

        if (!this.room || !this.room.bonfirePos)
            return null;

        if (this.room.spawns.length > 0 && !this.room.quickCan1 && !this.room.quickCan2 && !this.room.hasMyStorageOrTerminal() && this.room.totalBonfireAmount <= 0)
            return null;

        let baseMemory = Room.getBaseMemory(this.roomName);
        if (!baseMemory)
            return null;

        let basePlanMemory = Room.getBasePlanMemory(this.roomName);
        if (!basePlanMemory || !basePlanMemory.planComplete)
            return null;

        let desiredDistanceToEnergySource = 5;

        let sites = this.room.constructionSites.filter(s => s.structureType != STRUCTURE_ROAD && s.structureType != STRUCTURE_RAMPART);
        if ((spawn && spawn.room.controller.level <= 5 && spawn.room.name == this.room.name) || (creep && creep.room.name == this.room.name && creep.room.controller.level <= 5))
        {
            let sources = this.room.sources;
            if (sites.some(s => 
            {
                if (s.pos.getRangeTo(this.room.quickCanPos1) <= desiredDistanceToEnergySource)
                    return true;
                if (s.pos.getRangeTo(this.room.quickCanPos2) <= desiredDistanceToEnergySource)
                    return true;
                if (s.pos.getRangeTo(this.room.controllerCanPos) <= desiredDistanceToEnergySource)
                    return true;
                for (let source of sources)
                {
                    if (s.pos.getRangeTo(source.pos) <= desiredDistanceToEnergySource)
                        return true;
                }
    
                return false;
            }))
                this.desiredSpawnType = this.desiredSpawnType2;
        }

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        
        if (creeps.length <= 0)
        {
            if (this.room.spawns.length <= 0)
                return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};

            if ((this.room.quickCan1 && this.room.quickCan1.hits <= this.room.quickCan1.hitsMax * 0.5) ||
                (this.room.quickCan2 && this.room.quickCan2.hits <= this.room.quickCan2.hitsMax * 0.5) ||
                (this.room.controllerCan && this.room.controllerCan.hits <= this.room.controllerCan.hitsMax * 0.5))
                return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};

            // if (Room.beingNuked(this.roomName))
            //     return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};

            if (this.room.controller.level >= 3)
            {
                let paveTime = Room.getPaveTime(this.roomName, this.roomName);
                if (!paveTime)
                {
                    return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
                }
                else
                {
                    let decayTime = ((ROAD_HITS / ROAD_DECAY_AMOUNT) * ROAD_DECAY_TIME) / 10;
                    let remainingWaitTIme = Math.floor((paveTime + decayTime) - Game.time);
    
                    if (remainingWaitTIme <= 0)
                        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
                }
            }

            // let towers = this.room.towers.filter(t => t.my);
            // let doFortify = (towers.length > 0 && (!this.room.controller.safeMode || this.room.controller.safeModeCooldown || this.room.controller.safeMode < 1000 || Room.getMyBases().length > 1));

            // if (doFortify)
            // {
            //     let ramparts = this.room.ramparts;
            //     if (ramparts.length <= 0)
            //         return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
                    
            //     let minRampart = _.min(ramparts, r => r.hits);
            //     if (!minRampart || minRampart.hits < constants.DESIRED_RAMPART_HITS)
            //         return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
            // }
        }



        if (sites.length <= 0)
            return null;

        if (this.room.isBootstrapping())
        {

            let existingCreepMemories = this.getCreepMemories();
            let foundBoosted = false;
            for (let creepMemory of existingCreepMemories)
            {
                if (creepMemory.boosts)
                {
                    foundBoosted = true;
                    break;
                }
            }

            if (!foundBoosted && this.getDesiredBoosts(spawn))
            {
                return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
            }
        }

        // if ((this.room.isBootstrapping() || Room.getResourceAmountLevel(this.roomName, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_NORMAL) && this.getCreepMemories().length <= 0)
        //     return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};

        let effectiveProfit = baseMemory.spendable;//(baseMemory.spendable * baseMemory.profitQuotient) - thisSpending;
        if (creeps.length <= 0 || (effectiveProfit > 0 && baseMemory.profitQuotient >= 1))
            return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};

        return null;

        // let utility = 0.0;
        // if ((this.room.isBootstrapping() || Room.getResourceAmountLevel(this.roomName, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_NORMAL) && this.getCreepMemories().length <= 0)
        // {
        //     utility = 1.0;
        // }
        // else if (effectiveProfit > 0)
        // {
        //
        //     utility = 1.0 - (thisSpending / (effectiveProfit + thisSpending));
        // }
        //
        // if (utility <= 0.0)
        //     return null;
        //
        // return { utility: utility, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
    }

    getTaskDirect()
    {
        return { utility: 1.0, jobId: this.id, jobType: this.jobType, name: 'builder', program: 'task_builder', data: { r: this.roomName }};
    }

    getDesiredBoosts(spawn)
    {
        if (!spawn || !this.room || (!this.room.isBootstrapping() && !Room.beingNuked(this.room.name)))
            return null;

        let boosts = [];

        if (Room.getResourceAmountLevel(spawn.room.name, 'XLH2O') >= constants.RESOURCE_LEVEL_LOW)
            boosts.push({ b: 'XLH2O', r: 0 });

        if (!Room.beingNuked(this.room.name))
        {
            if (Room.getResourceAmountLevel(spawn.room.name, 'XKH2O') >= constants.RESOURCE_LEVEL_LOW)
                boosts.push({ b: 'XKH2O', r: 0 });
            if (Room.getResourceAmountLevel(spawn.room.name, 'XZHO2') >= constants.RESOURCE_LEVEL_LOW)
                boosts.push({ b: 'XZHO2', r: 0 });
        }
        
        if (boosts.length <= 0)
            return null;

        return boosts;
    }
}

module.exports = Job_Build;
