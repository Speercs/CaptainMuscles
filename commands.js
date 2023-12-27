'use strict'

global.cancelAllOrders = function()
{
    console.log('cancelAllOrders - cancelling ' + Object.keys(Game.market.orders).length + ' orders');
    _.each(Game.market.orders, o => Game.market.cancelOrder(o.id));
}

global.cleanUpBases = function(removeExtras)
{
    let count = 0;
    let bases = Room.getMyBases();
    
    for (let base of bases)
    {
        try
        {
            let baseMemory = Room.getBaseMemory(base.name);
            let planMemory = Room.getBasePlanMemory(base.name);
            
            if (!baseMemory || !planMemory || !planMemory.structures)
            {
                console.log('cleanUpBases - base memory not found for ' + base.name);
                continue;
            }
            
            for (let structureType in planMemory.structures)
            {
                if (structureType == STRUCTURE_ROAD || structureType == STRUCTURE_CONTAINER)
                    continue;
                    
                let plannedSpotList = Room.getBasePlanMemoryStructuresSpots(base.name, structureType);
                
                let structures = base.structures[structureType];
                
                if (!structures)
                    continue;
                    
                for (let structure of structures)
                {
                    if (structureType == STRUCTURE_TOWER && base.quickTower && base.quickTower.id == structure.id)
                        continue;
                    
                    let plannedSpot = _.find(plannedSpotList, s => s.x == structure.pos.x && s.y == structure.pos.y);
                    if (!plannedSpot)
                    {
                        count += 1;
                        if (removeExtras)
                            structure.destroy();
                        console.log('cleanUpBases - ' + structureType + " - " + structure.pos + " - outside of planned spot");
                    }
                }
            }
        }
        catch (error)
        {
            console.log('cleanUpBases - error trying to check base: ' + base.name + ' - ' + error);
        }
    }
    
    if (removeExtras)
    {
        console.log('cleanUpBases - ' + count + ' structures destroyed');
    }
    else
    {
        console.log('cleanUpBases - ' + count + ' structures found (NOT DESTROYED)');
    }
}

global.clearMemory = function()
{
    for (let memKey in Memory)
    {
        if (memKey != 'creeps')
        {
            delete Memory[memKey];
        }
    }

    if (Memory.creeps)
    {
        for (let creepName in Memory.creeps)
            delete Memory.creeps[creepName].tasks;
    }
        
    console.log('clearMemory - Memory cleared');
}

global.killAllCreeps = function()
{
    _.each(Game.creeps, c => c.suicide());
}

global.killIdleCreeps = function()
{
    _.each(Game.creeps, c => { if (c.isIdle()) c.suicide(); });
}

global.killCreepsWithTask = function(taskName)
{
    _.each(Game.creeps, c => { if (c.hasTask({ n: taskName })) c.suicide(); });
}

global.removeAllFlags = function(type)
{
    _.each(Game.flags, f => { if (!type || f.name.startsWith(type)) f.remove(); });
}

global.resetProcesses = function()
{
    if (Memory.os && Memory.os.scheduler && Memory.os.scheduler.processes && Memory.os.scheduler.processes.index && Memory.os.scheduler.processes.sleeping)
    {
        let notSleepingCount = 0;
        let notSuspendedCount = 0;
        for (let processId in Memory.os.scheduler.processes.completed)
        {
            let sleepingIndex = Memory.os.scheduler.processes.sleeping.indexOf(processId);
            while (sleepingIndex >= 0)
            {
                notSleepingCount += 1;
                Memory.os.scheduler.processes.sleeping.splice(sleepingIndex, 1);
                sleepingIndex = Memory.os.scheduler.processes.sleeping.indexOf(processId);
            }

            let suspendedIndex = Memory.os.scheduler.processes.suspended.indexOf(processId);
            while (suspendedIndex >= 0)
            {
                notSuspendedCount += 1;
                Memory.os.scheduler.processes.suspended.splice(suspendedIndex, 1);
                suspendedIndex = Memory.os.scheduler.processes.suspended.indexOf(processId);
            }
        }

        for (let processId in Memory.os.scheduler.processes.queue)
        {
            let sleepingIndex = Memory.os.scheduler.processes.sleeping.indexOf(processId);
            while (sleepingIndex >= 0)
            {
                notSleepingCount += 1;
                Memory.os.scheduler.processes.sleeping.splice(sleepingIndex, 1);
                sleepingIndex = Memory.os.scheduler.processes.sleeping.indexOf(processId);
            }

            let suspendedIndex = Memory.os.scheduler.processes.suspended.indexOf(processId);
            while (suspendedIndex >= 0)
            {
                notSuspendedCount += 1;
                Memory.os.scheduler.processes.suspended.splice(suspendedIndex, 1);
                suspendedIndex = Memory.os.scheduler.processes.suspended.indexOf(processId);
            }
        }

        console.log('resetProcesses - cleared ' + notSleepingCount + ' not-actually-sleeping processes');
        console.log('resetProcesses - cleared ' + notSuspendedCount + ' not-actually-suspended processes');

        let oldSleepingCount = Memory.os.scheduler.processes.sleeping.length;
        Memory.os.scheduler.processes.sleeping = _.unique(Memory.os.scheduler.processes.sleeping);
        let newSleepingCount = Memory.os.scheduler.processes.sleeping.length;
        let sleepersRemoved = oldSleepingCount - newSleepingCount;

        console.log('resetProcesses - ' + sleepersRemoved + ' duplicate sleepers removed');


        let oldSuspendedCount = Memory.os.scheduler.processes.suspended.length;
        Memory.os.scheduler.processes.suspended = _.unique(Memory.os.scheduler.processes.suspended);
        let newSuspendedCount = Memory.os.scheduler.processes.suspended.length;
        let suspendedRemoved = oldSuspendedCount - newSuspendedCount;

        console.log('resetProcesses - ' + suspendedRemoved + ' duplicate suspended removed');


        let oldCompletedCount = Memory.os.scheduler.processes.completed.length;
        Memory.os.scheduler.processes.completed = _.unique(Memory.os.scheduler.processes.completed);
        let newCompletedCount = Memory.os.scheduler.processes.completed.length;
        let completedRemoved = oldCompletedCount - newCompletedCount;

        console.log('resetProcesses - ' + completedRemoved + ' duplicate completed removed');


        let oldQueueCount = Memory.os.scheduler.processes.queue.length;
        Memory.os.scheduler.processes.queue = _.unique(Memory.os.scheduler.processes.queue);
        let newQueueCount = Memory.os.scheduler.processes.queue.length;
        let queueRemoved = oldQueueCount - newQueueCount;

        console.log('resetProcesses - ' + queueRemoved + ' duplicate queue removed');

        let queue = [];

        let resetCount = 0;
        for (let processId in Memory.os.scheduler.processes.index)
        {
            if (Memory.os.scheduler.processes.sleeping.indexOf(processId) < 0 && Memory.os.scheduler.processes.suspended.indexOf(processId) < 0)
            {
                resetCount += 1;
                queue.push(processId);
            }
        }

        Memory.os.scheduler.processes.completed = [];
        Memory.os.scheduler.processes.queue = queue;

        console.log('resetProcesses - resetting process queue with ' + resetCount + ' processes');

    }
}

global.resetProcessQueue = function()
{
    if (Memory.os && Memory.os.scheduler && Memory.os.scheduler.processes && Memory.os.scheduler.processes.index)
    {
        let queue = [];

        let processCount = 0;
        for (let processId in Memory.os.scheduler.processes.index)
        {
            processCount += 1;
            queue.push(processId);
        }

        Memory.os.scheduler.processes.completed = [];
        Memory.os.scheduler.processes.queue = queue;

        console.log('restartAllProcesses - resetting process queue with ' + processCount + ' processes');
    }
}

global.restartAllProcesses = function(type)
{
    if (Memory.os && Memory.os.scheduler && Memory.os.scheduler.processes && Memory.os.scheduler.processes.index)
    {
        let processCount = 0;
        for (let processId in Memory.os.scheduler.processes.index)
        {
            let process = Memory.os.scheduler.processes.index[processId];
            if (!type || process.n == type)
            {
                processCount += 1;
                global.kernel.scheduler.startProcessById(processId);
            }
        }
        console.log('restartAllProcesses - restarting ' + processCount + ' processes of type: ' + type);
    }
}

global.endAllProcesses = function(type)
{
    if (Memory.os && Memory.os.scheduler && Memory.os.scheduler.processes && Memory.os.scheduler.processes.index)
    {
        let processCount = 0;
        for (let processId in Memory.os.scheduler.processes.index)
        {
            let process = Memory.os.scheduler.processes.index[processId];
            if (!type || process.n == type)
            {
                processCount += 1;
                global.kernel.scheduler.killProcessById(processId);
            }
        }
        console.log('endAllProcesses - ending ' + processCount + ' processes of type: ' + type);
    }
}

global.wakeAllProcesses = function(type)
{
    if (Memory.os && Memory.os.scheduler && Memory.os.scheduler.processes && Memory.os.scheduler.processes.index)
    {
        let processCount = 0;
        for (let processId in Memory.os.scheduler.processes.index)
        {
            let process = Memory.os.scheduler.processes.index[processId];
            if (!type || process.n == type)
            {
                if (process.d.sleep)
                {
                    processCount += 1;
                    delete process.d.sleep;
                }
            }
        }
        console.log('wakeAllProcesses - waking ' + processCount + ' processes of type: ' + type);
    }
}
