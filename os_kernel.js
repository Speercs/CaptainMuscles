'use strict'

const constants = require('constants');

const Process = require('os_process')
const Scheduler = require('os_scheduler')

class Kernel
{
    constructor ()
    {
        if (!global.profiler)
            global.profiler = {};
        if (!global.profiler.cpu)
            global.profiler.cpu = { samples: [], average: 0, average10: 0, average100: 0, average1000: 0 };

        // global.profiler.prevActivations = global.profiler.activations || {};

        // global.profiler.activations = {};

        if (!global.profiler.activations)
            global.profiler.activations = {};

        global.kernel = this;
        if (!Memory.os)
        {
            Memory.os = {}
        }

        this.memory = Memory.os;
        this.scheduler = new Scheduler()
        this.process = Process;
    }

    run()
    {
        let startCpu = Game.cpu.getUsed();

        this.scheduler.prep();

        // if (this.scheduler.getProcessCount() < this.scheduler.getIndexCount())
        //     console.log('Kernel.run - process count less than index count!');

        while (Game.cpu.getUsed() < global.MAX_CPU_USAGE && this.scheduler.runNextProcess()) {}

        this.scheduler.cleanup();

        this.trackCpuUsage(startCpu);
    }

    trackCpuUsage(startCpu)
    {
        let maxSamples = 1000;

        let profileInfo = global.profiler.cpu;

        let endCpu = Game.cpu.getUsed();

        let cpuUsed = endCpu - startCpu;

        profileInfo.samples.push(cpuUsed);
        if (profileInfo.samples.length > maxSamples)
            profileInfo.samples.splice(0, profileInfo.samples.length - maxSamples);

        let sampleCount = profileInfo.samples.length;
        let sum10 = 0;
        let sum100 = 0;
        let sum1000 = 0;
        let totalSum = 0;
        for (let i in profileInfo.samples)
        {
            if (i >= sampleCount - 10)
                sum10 += profileInfo.samples[i];
            if (i >= sampleCount - 100)
                sum100 += profileInfo.samples[i];
            if (i >= sampleCount - 1000)
                sum1000 += profileInfo.samples[i];

            totalSum += profileInfo.samples[i];
        }

        profileInfo.average10 = sum10 / Math.min(profileInfo.samples.length, 10);
        profileInfo.average100 = sum100 / Math.min(profileInfo.samples.length, 100);
        profileInfo.average1000 = sum1000 / Math.min(profileInfo.samples.length, 1000);
        profileInfo.average = totalSum / profileInfo.samples.length;

        global.AVERAGE_CPU_USAGE = profileInfo.average;
    }
}

module.exports = Kernel
