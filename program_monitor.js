'use strict'

const constants = require('constants');

global.MONITOR_UPDATE_FREQUENCY = 10;

class Monitor extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Monitor.constructor - executing');

        this.priority = PROCESS_PRIORITY_MONITOR;
    }

    run()
    {
        super.run();
        //console.log('Monitor.run - executing');

        //this.convertStructuresPlansToStrings();

        if (global.profiler)
        {
            let visual = new RoomVisual();

            if (global.cachedProfilerVisuals && global.cachedProfilerVisuals.time + global.MONITOR_UPDATE_FREQUENCY > Game.time)
            {
                visual.import(global.cachedProfilerVisuals.data);
            }
            else
            {
                this.displayCpuInfo(visual);
                this.displayProcessInfo(visual);

                global.cachedProfilerVisuals = { data: visual.export(), time: Game.time };
            }

            visual.text(Game.time, 25, 0, {align: 'center', opacity: 1.0});

            this.displayBaseEconomy();
        }
    }

    convertStructuresPlansToStrings()
    {
        let bases = Room.getMyBases();
        let conversionCount = 0;

        for (let base of bases)
        {
            let baseName = base.name;
            let basePlan = Room.getBasePlanMemory(baseName);

            if (!basePlan || !basePlan.structures)
                continue;

            for (let structureType in basePlan.structures)
            {
                let oldStructureList = basePlan.structures[structureType];
                if (!Array.isArray(oldStructureList))
                    continue;

                let newStructureList = '';
                for (let spot of oldStructureList)
                {
                    newStructureList = newStructureList.concat(global.spotToChinese(spot));
                }

                basePlan.structures[structureType] = newStructureList;
                
                conversionCount += 1;
            }
        }

        console.log('Program_Monitor.convertStructuresPlansToStrings - converted ' + conversionCount + ' structure lists into strings');
    }

    displayCpuInfo(visual)
    {
        let labelX = 45;
        let dataX  = 48;

        let labelY   = 1;
        let opacity = 0.3;

        let profileInfo = global.profiler.cpu;

        let shardCpuLimit = Game.cpu.limit;
        if (Game.cpu.shardLimits && Game.cpu.shardLimits[Game.shard.name])
            shardCpuLimit = Game.cpu.shardLimits[Game.shard.name];

        visual.text(Game.shard.name              , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(shardCpuLimit                , dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text('MAX_CPU_USAGE'              , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(global.MAX_CPU_USAGE.toFixed(2), dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text("CPU | 10"                   , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(profileInfo.average10.toFixed(2), dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text("CPU | 100"                   , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(profileInfo.average100.toFixed(2), dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text("CPU | 1000"                   , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(profileInfo.average1000.toFixed(2), dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text("Bucket"                      , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(Game.cpu.bucket               , dataX , labelY++, {align: 'right', opacity: opacity});

        let memoryUsed = RawMemory.get().length;
        visual.text("Memory"                      , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(memoryUsed                    , dataX , labelY++, {align: 'right', opacity: opacity});

        if (Memory.empire && Memory.empire.baseCount)
        {
            visual.text("Bases"                 , labelX, labelY  , {align: 'right', opacity: opacity});
            visual.text(Memory.empire.baseCount , dataX , labelY++, {align: 'right', opacity: opacity});
        }

        if (Memory.empire && Memory.empire.bases)
        {
            let cpuPerBase = profileInfo.average / Object.keys(Memory.empire.bases).length;
            visual.text("CPU | base"         , labelX, labelY  , {align: 'right', opacity: opacity});
            visual.text(cpuPerBase.toFixed(2), dataX , labelY++, {align: 'right', opacity: opacity});
        }

        let creepCount = Object.keys(Game.creeps).length;
        visual.text("Creeps"                    , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(creepCount                  , dataX , labelY++, {align: 'right', opacity: opacity});

        let cpuPerCreep = 0;
        if (creepCount > 0)
            cpuPerCreep = profileInfo.average / creepCount;
        visual.text("CPU | creep"         , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(cpuPerCreep.toFixed(2), dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text("Remote range"                , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(global.REMOTE_SEARCH_RANGE    , dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text("Work range"                  , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(global.WORK_SEARCH_RANGE  + ' | ' + global.MAX_SEARCH_RANGE, dataX , labelY++, {align: 'right', opacity: opacity});

        visual.text("Spawn range"                 , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(global.SPAWN_SEARCH_RANGE + ' | ' + global.MAX_SEARCH_RANGE, dataX , labelY++, {align: 'right', opacity: opacity});



        let heap = Game.cpu.getHeapStatistics();
        let heapPercent = (heap.total_heap_size / heap.heap_size_limit).toFixed(2);



        visual.text("Heap"     , labelX, labelY  , {align: 'right', opacity: opacity});
        visual.text(heapPercent, dataX , labelY++, {align: 'right', opacity: opacity});
    }

    displayProcessInfo(visual)
    {
        if (!global.profiler || !global.profiler.processes || !Memory.os || !Memory.os.scheduler || !Memory.os.scheduler.processes || !Memory.os.scheduler.processes.index)
            return;


        let processCounts = _.countBy(Memory.os.scheduler.processes.index, object => object.n);
        let processTypeCount = Object.keys(processCounts).length;
        let maxOutputSize = 10;
        let scale = maxOutputSize / (processTypeCount + 1);

        let nameOffset = 16;
        let activationsOffset = 13;
        let averageOffset = 8;
        let countOffset = 5.5;
        let totalOffset = 1;

        let offsetBase = 49;

        let nameX        = offsetBase - (nameOffset        * scale);
        let activationsX = offsetBase - (activationsOffset * scale);
        let averageX     = offsetBase - (averageOffset     * scale);
        let countX       = offsetBase - (countOffset       * scale);
        let totalX       = offsetBase - (totalOffset       * scale);

        let labelY   = 49;
        let labelYSpacing = 1.2 * scale;
        let opacity = 0.3;

        let processNameList = _.sortBy(Object.keys(global.profiler.processes), n => n);

        for (let processName of processNameList)
        {
            let processInfo = global.profiler.processes[processName];
            processInfo.activeCount = processCounts[processName] || 0;

            let activations = 0;
            if (global.profiler.activations && global.profiler.activations[processName])
            {
                activations = global.profiler.activations[processName];
                delete global.profiler.activations[processName];
            }

            processInfo.total = processInfo.average * activations//Math.max(processInfo.activeCount, activations);

            let displayAverage = processInfo.average.toFixed(4);
            let displayTotal = processInfo.total.toFixed(2);

            visual.text(processName            , nameX       , labelY, {font: scale, align: 'right', opacity: opacity});
            visual.text(activations            , activationsX, labelY, {font: scale, align: 'right', opacity: opacity});
            visual.text(displayAverage         , averageX    , labelY, {font: scale, align: 'right', opacity: opacity});
            visual.text(processInfo.activeCount, countX      , labelY, {font: scale, align: 'right', opacity: opacity});
            visual.text(displayTotal           , totalX      , labelY, {font: scale, align: 'right', opacity: opacity});

            labelY -= labelYSpacing;
        }
    }

    displayBaseEconomy(visual)
    {
        if (!global.cachedBaseVisuals)
            global.cachedBaseVisuals = {};

        let bases = Room.getMyBases();
        for (let base of bases)
        {
            if (global.cachedBaseVisuals[base.name] && global.cachedBaseVisuals[base.name].time + global.MONITOR_UPDATE_FREQUENCY > Game.time)
            {
                new RoomVisual(base.name).import(global.cachedBaseVisuals[base.name].data);
                continue;
            }

            let labelX = 1;
            let valueX = 9;
            let opacity = 0.3;
            let displayLine = 1;

            let baseMemory = Room.getBaseMemory(base.name);
            if (!baseMemory)
                continue;
            let visual = new RoomVisual(base.name);

            this.drawBaseEconomyLine(visual, baseMemory         , 'totalHarvest'       , 'Harvest'               , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'carryPercent'       , 'Carry'        , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'totalIn'            , 'In'                    , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'totalOut'           , 'Out'                   , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'totalCostPerTick'   , 'Cost'                  , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'totalOutPlusCost'   , 'Total Out'             , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'profit'             , 'Profit'                , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'profitQuotient'     , 'ProfitQuotient'        , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'storedEnergy'       , 'Stored Energy'         , labelX, valueX, displayLine++);
            this.drawBaseEconomyLine(visual, baseMemory         , 'storedEnergyPerTick', 'Stored Energy per Tick', labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'spendable'          , 'Spendable'             , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'spawnedParts'       , 'Spawned parts'         , labelX, valueX, displayLine++);
            this.drawBaseEconomyLine(visual, baseMemory         , 'spawnTimeUsed'      , 'Spawn Capacity Used'   , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'carryCapacity'      , 'Carry Capacity'        , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'carryCapacityNeeded', 'Carry Capacity Needed' , labelX, valueX, displayLine++, 2);
            this.drawBaseEconomyLine(visual, baseMemory         , 'shipTarget'         , 'Ship Target'           , labelX, valueX, displayLine++);


            if (baseMemory.labs && baseMemory.labs.rip)
                this.drawBaseEconomyLine(visual, baseMemory.labs.rip, 'output'             , 'Lab Product'           , labelX, valueX, displayLine++);

            if (baseMemory.factory && baseMemory.factory.product)
                this.drawBaseEconomyLine(visual, baseMemory.factory , 'product'            , 'Factory Product'      , labelX, valueX, displayLine++);

            if (baseMemory.terminal && baseMemory.terminal.sent)
                this.drawBaseEconomyLine(visual, baseMemory.terminal.sent , 'r'       , ' -> ' + baseMemory.terminal.sent.to, labelX, valueX, displayLine++);

            if (baseMemory.creepCounts)
            {
                displayLine += 2;
                for (let jobType in baseMemory.creepCounts)
                {
                    if (baseMemory.creepCounts[jobType])
                    {
                        visual.text(jobType                        , labelX, displayLine  , {align: 'left', opacity: opacity});
                        visual.text(baseMemory.creepCounts[jobType], valueX, displayLine++, {align: 'left', opacity: opacity});
                    }
                }
            }

            let scale = 0.25;

            let amountOffset = 6;
            let desiredOffset = 10;
            let choiceOffset = 14;

            let typeX    = 1;
            let amountX  = typeX + (scale * amountOffset);
            let desiredX = typeX + (scale * desiredOffset);
            let choiceX  = typeX + (scale * choiceOffset);

            let labelY   = 49;
            let labelYSpacing = 1.2 * scale;

            for (let resourceType of RESOURCES_ALL)
            {
                let resourceTotal = Room.getStoredResourceAmount(base.name, resourceType);
                if (!resourceTotal)
                    continue;

                let desiredAmount = Room.getDesiredResourceAmount(base.name, resourceType);

                let resourceLevel = Room.getResourceAmountLevel(base.name, resourceType);
                let resourceLevelMessage = constants.RESOURCE_LEVEL_NAMES[resourceLevel];

                visual.text(resourceType        , typeX   , labelY, {font: scale, align: 'left', opacity: opacity});
                visual.text(resourceTotal       , amountX , labelY, {font: scale, align: 'left', opacity: opacity});
                visual.text(desiredAmount       , desiredX, labelY, {font: scale, align: 'left', opacity: opacity});
                visual.text(resourceLevelMessage, choiceX , labelY, {font: scale, align: 'left', opacity: opacity});

                labelY -= labelYSpacing;
            }

            global.cachedBaseVisuals[base.name] = { data: visual.export(), time: Game.time };
        }
    }

    drawBaseEconomyLine(visual, object, key, label, lx, vx, y, fixed)
    {
        if (!object[key])
            return;

        let opacity = 0.3;

        let value = (object[key] || 0);
        if (fixed)
            value = value.toFixed(fixed);

        visual.text(label, lx, y, {align: 'left', opacity: opacity});
        visual.text(value, vx, y, {align: 'left', opacity: opacity});
    }
}

module.exports = Monitor
