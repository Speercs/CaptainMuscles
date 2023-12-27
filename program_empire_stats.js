'use strict'

const constants = require('constants');

class Program_Empire_Stats extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Program_Empire_Stats.constructor - executing');

        this.priority = PROCESS_PRIORITY_STATS;
        this.frequency = 15;
    }

    run()
    {
        super.run();
        //console.log('Program_Empire_Stats.run - executing');

        this.creepCount = Object.keys(Game.creeps).length;

        if (!Memory.stats)
        {
            Memory.stats = {};
        }

        Memory.stats.gcl = Game.gcl;
        Memory.stats.gpl = Game.gpl;

        if (Memory.empire && Memory.empire.accounting)
        {
            Memory.stats.accounting = Memory.empire.accounting;
        }

        this.cpuStats();
        this.creepStats();
        this.baseStats();
    }

    cpuStats()
    {
        let cpuStats = Memory.stats.cpu = {};

        if (global.profiler.cpu && global.profiler.cpu.samples && global.profiler.cpu.samples.length > 0)
        {
            cpuStats.cpuUsed = _.last(global.profiler.cpu.samples);

            if (this.creepCount > 0)
                cpuStats.cpuUsedPerCreep = cpuStats.cpuUsed / this.creepCount;
        }

        cpuStats.bucket = Game.cpu.bucket;
        cpuStats.memoryUsed = RawMemory.get().length;
    }

    creepStats()
    {
        let creepStats = Memory.stats.creeps = {};
        creepStats.count = this.creepCount;
    }

    baseStats()
    {
        let basesStats = Memory.stats.bases = {};
        let bases = Room.getMyBases()
        
        for (let base of bases)
        {
            let baseStats = basesStats[base.name] = {};
            let controller = base.controller;
            let controllerLevel = controller.level;
            if (controller.progressTotal)
                controllerLevel = (controllerLevel + (controller.progress / controller.progressTotal));
                
            baseStats.controllerLevel = controllerLevel;
        }
    }
}

module.exports = Program_Empire_Stats
