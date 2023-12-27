'use strict'

const constants = require('constants');

const MAX_PROCESS_ID = 9999999;

class Scheduler
{
    constructor ()
    {
        if (!Memory.os.scheduler)
        {
            Memory.os.scheduler = {};
        }

        this.memory = Memory.os.scheduler;

        if (!this.memory.processes)
        {
            this.memory.processes =
            {
                index: {},
                queue: [],
                running: false,
                completed: [],
                sleeping: [],
                suspended: [],
            };
        }

        // upgrade
        if (!this.memory.processes.sleeping)
            this.memory.processes.sleeping = [];
        if (!this.memory.processes.suspended)
            this.memory.processes.suspended = [];

        this.updateSleepingProcesses();
        this.updateSuspendedProcesses();

        // Take any processes that were completed last tick and put them back in the queue
        if (this.memory.processes.completed.length > 0)
        {
            this.memory.processes.queue = this.memory.processes.queue.concat(this.memory.processes.completed);
            this.memory.processes.completed = [];
        }

        // If the last running process somehow got stuck, put it on the end so everything else can run first
        if (this.memory.processes.running)
        {
            this.memory.processes.queue.push(this.memory.processes.running);
            this.memory.processes.running = false;
        }
    }

    prep()
    {
        // for (let processId in this.memory.processes.index)
        // {
        //     let processInfo = this.memory.processes.index[processId];
        //     if (processInfo.d)
        //     {
        //         delete processInfo.d.lcl;
        //         delete processInfo.d.lclt;
        //     }
        // }

        //let startCpu = Game.cpu.getUsed();

        global.activePrograms = {};
        this.memory.processes.queue = _.filter(this.memory.processes.queue, p => this.getProcessFromId(p));
        this.memory.processes.queue = _.sortBy(this.memory.processes.queue, p => this.getProcessFromId(p).priority);

        //let endCpu = Game.cpu.getUsed();

        //console.log('Scheduler.prep - prep cpu used: ' + (endCpu - startCpu));

        if (this.memory.processes.queue.length > 0)
        {
            let firstProcessName = this.getProcessFromId(this.memory.processes.queue[0]).name;
            //console.log('Scheduler.prep - first process is ' + (this.getProcessFromId(this.memory.processes.queue[0]).name));
            if (firstProcessName == 'monitor')
                this.runNextProcess();
        }
    }

    cleanup()
    {
        global.activePrograms = null;
    }

    updateSleepingProcesses()
    {
        let i = 0;
        while (i < this.memory.processes.sleeping.length)
        {
            let processId = this.memory.processes.sleeping[i];
            let processInfo = this.memory.processes.index[processId];
            let splice = false;

            if (!processInfo)
            {
                splice = true;
            }
            else
            {
                // let processName = processInfo.n;
                // let startCpu = Game.cpu.getUsed();
                // let profileInfo = this.startProfile(processName);

                if (--processInfo.d.sleep < 0)
                {
                    delete processInfo.d.sleep;
                    splice = true;

                    this.memory.processes.queue.push(processId);
                }

                // this.endProfile(startCpu, profileInfo);
            }

            if (splice)
                this.memory.processes.sleeping.splice(i, 1);
            else
                ++i;
        }
    }

    // We give an empty entry for each suspended process to track overall average cpu usage - more useful than the actual usage
    updateSuspendedProcesses()
    {
        let i = 0;
        while (i < this.memory.processes.suspended.length)
        {
            let processId = this.memory.processes.suspended[i];
            let processInfo = this.memory.processes.index[processId];
            let splice = false;

            if (!processInfo)
            {
                splice = true;
            }
            else
            {
                // let processName = processInfo.n;
                // let startCpu = Game.cpu.getUsed();
                // let profileInfo = this.startProfile(processName);

                // this.endProfile(startCpu, profileInfo);
            }

            if (splice)
                this.memory.processes.suspended.splice(i, 1);
            else
                ++i;
        }
    }

    launchProcess (name, data = {}, parent = false, block = false)
    {
        const processId = this.getNextProcessId();
        let processInfo =
        {
            n: name,
            d: data,
            p: parent
        };

        if (block)
            processInfo.b = 1;

        this.memory.processes.index[processId] = processInfo;

        this.memory.processes.queue.push(processId);

        this.startProcessById(processId);

        return processId;
    }

    startProcessById(processId)
    {
        let process = this.getProcessFromId(processId);

        if (process)
        {
            try
            {
                if (process.start)
                    process.start();
            }
            catch (error)
            {
                console.log('Scheduler.startProcessById - error trying to start process, name: ' + process.name + ' - ' + error);
            }
        }
    }

    resumeProcessById(processId)
    {
        let process = this.getProcessFromId(processId);

        if (process)
        {
            try
            {
                if (process.resume)
                    process.resume();
            }
            catch (error)
            {
                console.log('Scheduler.resumeProcessById - error trying to resume process, name: ' + process.name + ' - ' + error);
            }
        }
    }

    runNextProcess()
    {
        if (this.memory.processes.queue.length == 0)
            return false;

        if (!this.memory.processes.running)
            this.memory.processes.running = this.memory.processes.queue.shift();

        let result = this.profileAndRunProcessById(this.memory.processes.running);

        if (result)
        {
            if (result == PROCESS_RESULT_SLEEP)
            {
                this.memory.processes.sleeping.push(this.memory.processes.running);
            }
            else if (result == PROCESS_RESULT_SUSPEND)
            {
                //console.log('Scheduler.runNextProcess - ' + this.memory.processes.running + ' -  suspended');
                this.memory.processes.suspended.push(this.memory.processes.running);
            }
            else
            {
                this.memory.processes.completed.push(this.memory.processes.running);
            }

        }


        this.memory.processes.running = false;

        return true;
    }

    profileAndRunProcessById(processId)
    {
        let processInfo = this.memory.processes.index[processId];
        if (!processInfo)
            return false;

        let processName = processInfo.n;
        let success = true;

        let startCpu = Game.cpu.getUsed();
        let profileInfo = this.startProfile(processName);

        // if (processInfo.n == 'mission_harvest' && processInfo.d.room == 'W51N31' && processInfo.d.source == '5bbcaa4a9099fc012e6311f8')
        //     console.log('Scheduler.profileAndRunProcessById - ' + JSON.stringify(processInfo) + ' executing');

        let process = false;
        try
        {
            process = this.getProcessFromInfo(processId, processInfo);
        }
        catch (error)
        {
            console.log('Scheduler.profileAndRunProcessById - error trying to get process, id: ' + processId + ' - ' + error);
            // If we broke trying to load the process class, we need to hold onto the id until the error is fixed
            //success = true;
        }

        if (process)
        {
            let result = false;

            if (processInfo.d.hold)
                result = PROCESS_RESULT_SUSPEND;
            else if (processInfo.d.sleep)
                result = PROCESS_RESULT_SLEEP;

            if (!result)
            {
                if (constants.TRY_CATCH)
                {
                    try
                    {
                        result = process.run();
                        process.postRun();
                    }
                    catch (error)
                    {
                        console.log('Scheduler.profileAndRunProcessById - error trying to run process, name: ' + processName + ' - ');
                        console.log(error.stack || error.message || error);

                        if (process.onFail)
                        {
                            try
                            {
                                process.onFail();
                            }
                            catch (errorOnFail)
                            {
                                console.log('Scheduler.profileAndRunProcessById - error trying to run process.onFail, name: ' + processName);
                                console.log(error.stack || error.message || error);
                            }
                        }
                    }
                }
                else
                {
                    result = process.run();
                    process.postRun();
                }

                if (processInfo.d.hold)
                {
                    result = PROCESS_RESULT_SUSPEND;
                    //console.log('Scheduler.profileAndRunProcessById - ' + processName + ' -  suspended');
                }

                else if (processInfo.d.sleep)
                    result = PROCESS_RESULT_SLEEP;
                else
                    result = PROCESS_RESULT_COMPLETED;
            }

            if (!_.isUndefined(result))
                success = result;
        }
        else
        {
            //console.log('Scheduler.profileAndRunProcessById - process not found, id: ' + this.memory.processes.running);
            success = false;
        }

        this.endProfile(startCpu, profileInfo);

        return success;
    }

    callProcessFunction(pid, functionName, parameters)
    {
        let process = this.getProcessFromId(pid);

        if (!process)
        {
            console.log('Scheduler.callProcessFunction - could not get process : ' + pid);
            return null;
        }

        let processFunction = process[functionName];
        if (!processFunction)
        {
            console.log('Scheduler.callProcessFunction - could not find ' + functionName + ' function for process: ' + pid);
            return null;
        }

        if (constants.TRY_CATCH)
        {
            try
            {
                return process[functionName](parameters);
            }
            catch(error)
            {
                console.log('Scheduler.callProcessFunction - error calling ' + functionName + ' function for process: ' + pid);
                console.log(error.stack || error.message || error);
                return null;
            }
        }

        return process[functionName](parameters);
    }

    startProfile(processName)
    {
        if (!global.profiler)
            global.profiler = {};
        if (!global.profiler.processes)
            global.profiler.processes = {}
        if (!global.profiler.processes[processName])
            global.profiler.processes[processName] = { samples: [], average: 0, overhead: 0 };

        if (!global.profiler.activations[processName])
            global.profiler.activations[processName] = 0;

        global.profiler.activations[processName] += 1;

        return global.profiler.processes[processName];
    }

    endProfile(startCpu, profileInfo)
    {
        let maxSamples = 1000;
        let endCpu = Game.cpu.getUsed();

        let cpuUsed = endCpu - startCpu;

        profileInfo.samples.push(cpuUsed);
        if (profileInfo.samples.length > maxSamples)
            profileInfo.samples.splice(0, profileInfo.samples.length - maxSamples);

        profileInfo.average = _.sum(profileInfo.samples) / profileInfo.samples.length;
    }

    getIndexCount()
    {
        let processCount = this.memory.processes.queue.length + this.memory.processes.completed.length;
        if (this.memory.processes.running)
            processCount += 1;
        return processCount;
    }

    getProcessCount()
    {
        return Object.keys(this.memory.processes.index).length;
    }

    getNextProcessId ()
    {
        if (!this.memory.lastProcessId)
        {
            this.memory.lastProcessId = 0;
        }

        while (true)
        {
            this.memory.lastProcessId++;
            if (this.memory.lastProcessId > MAX_PROCESS_ID)
            {
                this.memory.lastProcessId = 1;
            }

            if (this.memory.processes.index[this.memory.lastProcessId])
            {
                continue;
            }
            return this.memory.lastProcessId;
        }
    }

    getProcessFromId (processId)
    {
        const processInfo = this.memory.processes.index[processId];
        if (!processInfo)
            return false;

        return this.getProcessFromInfo(processId, processInfo);
    }

    getProcessFromInfo (processId, processInfo)
    {
        if (!global.activePrograms)
            global.activePrograms = {};
        if (global.activePrograms[processId])
            return global.activePrograms[processId];

        try
        {
            const ProgramClass = this.getProgramClass(processInfo.n);
            if (ProgramClass)
            {
                const process = new ProgramClass(processId, processInfo.n, processInfo.d, processInfo.p);

                process.refresh();

                global.activePrograms[processId] = process;

                return process;
            }
        }
        catch (error)
        {
            console.log('Scheduler.getProcessFromInfo - error trying to get process, id: ' + processId + ', name: ' + processInfo.n + ' - ' + error);
            throw error;
        }

        return false;
    }

    getProgramClass (programName)
    {
        try
        {
            const program = require(`program_${programName}`);
            return program;
        }
        catch(error)
        {
            console.log('Scheduler.getProgramClass - error trying to get program: programName - ' + error);
            throw error;
        }

        return false;
    }

    isProcessIdActive (processId)
    {
        return !!this.memory.processes.index[processId];
    }

    killProcessById (processId)
    {
        let processInfo = this.memory.processes.index[processId];
        if (processInfo)
        {
            let process = this.getProcessFromId(processId);

            if (process)
            {
                if (constants.TRY_CATCH)
                {
                    try
                    {
                        process.end();
                    }
                    catch (error)
                    {
                        console.log('Scheduler.killProcessById - error trying to end process, name: ' + process.name);
                        console.log(error.stack || error.message || error);
                    }
                }
                else
                {
                    process.end();
                }
            }

            if (processInfo.p)
            {
                let parentInfo = this.memory.processes.index[processInfo.p];
                if (parentInfo && parentInfo.d && parentInfo.d.children)
                {
                    for (let childLabel in parentInfo.d.children)
                    {
                        if (parentInfo.d.children[childLabel] == processId)
                        {
                            //console.log('Scheduler.killProcessById - removing child ' + childLabel + ' from process ' + parentInfo.n + ' children');
                            delete parentInfo.d.children[childLabel];
                        }
                    }
                }

                if (processInfo.b)
                {
                    if (parentInfo && parentInfo.d && parentInfo.d.hold)
                        delete parentInfo.d.hold;

                    let parentIndex = this.memory.processes.suspended.indexOf(processInfo.p);
                    if (parentIndex >= 0)
                    {
                        this.memory.processes.suspended.splice(parentIndex, 1);
                        if (parentInfo)
                        {
                            //console.log('Scheduler.killProcessById - ' + processInfo.n + ' no longer blocking ' + parentInfo.n);
                            this.memory.processes.queue.push(processInfo.p);
                            this.resumeProcessById(processInfo.p);
                        }
                    }
                }
            }

            delete this.memory.processes.index[processId];
        }
    }

    wakeSleepingProcessById(processId)
    {
        let sleepingProcessIndex = this.memory.processes.sleeping.indexOf(processId);
        if (sleepingProcessIndex < 0)
            return false;

        let processInfo = this.memory.processes.index[processId];
        if (!processInfo)
        {
            this.memory.processes.sleeping.splice(sleepingProcessIndex, 1);
            return false;
        }

        delete processInfo.d.sleep;
        this.memory.processes.sleeping.splice(sleepingProcessIndex, 1);
        this.memory.processes.queue.push(processId);
        return true;
    }
}

module.exports = Scheduler
