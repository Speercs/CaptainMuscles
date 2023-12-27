'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Harvest extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'harvest', room: this.data.room, source: this.data.source });

        this.desiredSpawnType = 'worky';

        // if (this.data.room == 'W51N31')
        //     console.log('Mission_Harvest.constructor - ' + this.data.room + ' executing');
    }

    run()
    {
        //console.log('Mission_Harvest.run - executing');
        super.run();

        return this.suicide();
    }

    updateCreepInfo()
    {
        super.updateCreepInfo();

        this.updateSourceInfo();
    }

    updateInfo()
    {
        //console.log('Mission_Harvest.updateInfo - executing');
        super.updateInfo();

        let roomMemory = Room.getMemory(this.data.room);
        if (!roomMemory || !roomMemory.sources || !roomMemory.sources[this.data.source])
            return;

        let sourceMemory = roomMemory.sources[this.data.source];
        if (sourceMemory.l && !roomMemory.clear)
            this.layOffAllCreeps();

        if (this.memory.creeps.length > 0)
        {
            let nearestBase = Room.getNearestBase(this.data.room);
            let reserved = (roomMemory.controller && roomMemory.controller.r)
            let reservedByOther = (reserved && roomMemory.controller.r != ME);

            // let paveable = (!reservedByOther && nearestBase && !nearestBase.isBootstrapping() && nearestBase.controller.level >= 4 && nearestBase.storage && nearestBase.storage.my);
            // if (paveable)
            //     this.launchChildProcess(`pave`, 'mission_pave', { room: this.data.room, source: this.data.source });
            //
            // let source = Game.getObjectById(this.data.source);
            // if (!source || !source.link)
            //     this.launchChildProcess(`collect`, 'mission_collect', { room: this.data.room, source: this.data.source });
        }
        else
        {
            this.endChildProcess(`pave`);
            this.endChildProcess(`collect`);
        }
    }

    updateSourceInfo()
    {
        this.memory.in = 0;

        let roomMemory = Room.getMemory(this.data.room);
        if (!roomMemory || !roomMemory.sources || !roomMemory.sources[this.data.source])
            return;

        let sourceMemory = roomMemory.sources[this.data.source];

        let creeps = this.getCreeps();
        let nearestBase = Room.getNearestBase(this.data.room);

        let sourceMaxEnergy = SOURCE_ENERGY_CAPACITY;
        let rechargeTime = ENERGY_REGEN_TIME;
        if (!roomMemory.controller)
        {
            sourceMaxEnergy = SOURCE_ENERGY_KEEPER_CAPACITY;
            rechargeTime *= 0.85;
        }
        else if (!roomMemory.controller.o && !roomMemory.controller.r && (!nearestBase || nearestBase.controller.level < 3))
        {
            sourceMaxEnergy = SOURCE_ENERGY_NEUTRAL_CAPACITY;
        }

        let sourceEnergyPerTick = sourceMaxEnergy / rechargeTime;

        //console.log('Mission_Harvest.updateInfo - creepsInRange: ' + creepsInRange.length);
        this.memory.w = _.sum(creeps.map(object => object.memory.work));
        this.memory.wd = Math.ceil(sourceEnergyPerTick / HARVEST_POWER) + 1;

        sourceMemory.in = Math.min(this.memory.w * HARVEST_POWER, sourceEnergyPerTick);
        //if (sourceMemory.c || (Room.isMyBase(this.data.room) && Game.rooms[this.data.room].isBootstrapping()))
            this.memory.in += sourceMemory.in;

        this.memory.in -= this.memory.creeps.length;

        this.memory.os = sourceMemory.os;
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        this.updateSourceInfo();

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: this.memory.wd, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (creep && this.desiredSpawnType != creep.memory.type)
            return null;

        if (this.memory.w >= this.memory.wd)
            return null;

        if (this.memory.creeps.length >= this.memory.os)
            return null;

        let roomMemory = Room.getMemory(this.data.room);
        if (!roomMemory || !roomMemory.sources || !roomMemory.sources[this.data.source])
            return null;

        let sourceMemory = roomMemory.sources[this.data.source];
        if (sourceMemory.l && !roomMemory.clear)
            return null;

        let utility = 1.0 - (this.memory.w / this.memory.wd);
        return { utility: utility, task: 'harvest', program: 'task_harvest', data: { t: this.data.source, x: sourceMemory.x, y: sourceMemory.y, r: this.data.room }};
    }
}

module.exports = Mission_Harvest
