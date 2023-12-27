
const constants = require('constants');

require('commands');

require('Traveler');
require('WorldPosition');

require('extends_math');

require('extends_diplomacy');

require('extends_creep');
require('extends_creep_tasks');
require('extends_deposit');
require('extends_game');
require('extends_mineral');
require('extends_power_creep');
require('extends_reactor');
require('extends_room');
require('extends_room_boosts');
require('extends_room_hostiles')
require('extends_room_overrides');
require('extends_room_jobs');
require('extends_room_resources');
require('extends_room_object');
require('extends_room_position');
require('extends_room_visual');
require('extends_source');
require('extends_structure');
require('extends_structure_controller');
require('extends_structure_lab');
require('extends_structure_link');
require('extends_structure_tower');
require('extends_structure_power_bank');

const Kernel = require('os_kernel');

global.SKIP_ALL = 0;

global.MAX_NEARBY_RANGE = 6;
global.MAX_REMOTE_RANGE = 6;

module.exports =
{
    loop: function ()
    {
        if (global.SKIP_ALL || Game.cpu.bucket < 500)
            return;


        this.memHack();

        this.handleReset();

        if (!Memory.creeps)
            Memory.creeps = {};

        if (!global.AVERAGE_CPU_USAGE)
			global.AVERAGE_CPU_USAGE = Game.cpu.limit;

        if (!global.AVERAGE_CPU_PERCENT)
            global.AVERAGE_CPU_PERCENT = 1;

        this.calculateWorkRange();
        this.loadIntershardMemory();

		kernel = new Kernel();

		if (kernel.scheduler.getProcessCount() <= 0)
		{
			kernel.scheduler.launchProcess('monitor');
			kernel.scheduler.launchProcess('empire');

            for (let creepName in Game.creeps)
                kernel.scheduler.launchProcess('creep', { name: creepName, sleep: 3 });
		}

		kernel.run();

        global.AVERAGE_CPU_PERCENT = global.AVERAGE_CPU_USAGE / Game.cpu.limit;

        this.saveIntershardMemory();

        //this.tryGeneratePixel();
	},

    memHack: function()
    {
        if (global.lastTick && global.lastMemory && Game.time == (global.lastTick + 1))
        {
            delete global.Memory
            global.Memory = global.lastMemory
            RawMemory._parsed = global.lastMemory
            global.lastTick = Game.time;
        }
        else
        {
            Memory;
            global.lastMemory = RawMemory._parsed
            global.lastTick = Game.time
        }

        // let stringifyStart = Game.cpu.getUsed();
        // let tempMemoryString = JSON.stringify(Memory);
        // console.log('memHack - memory stringify time: ' + (Game.cpu.getUsed() - stringifyStart));
        //
        // let parseStart = Game.cpu.getUsed();
        // let tempMemory = JSON.parse(tempMemoryString);
        // console.log('memHack - memory parse time: ' + (Game.cpu.getUsed() - parseStart));
    },

    handleReset: function()
    {
        let reset = false;

		if (!Memory.empire)
            reset = true;

		if (reset)
		{
			console.log('main - empire reset detected.');
			// for (let creepName in Memory.creeps)
			// 	Memory.creeps[creepName].unemployed = 1;

			for (let key in Memory)
			{
				if (key != 'creeps')
			    	delete Memory[key];
			}
		}

        if (!Memory.missions)
        {
            console.log('main - mission reset detected.');

            // Send all living creeps to unemployment
            for (let creepName in Game.creeps)
            {
                let creep = Game.creeps[creepName];
                creep.cancelTask();
                creep.memory.unemployed = 1;
            }
        }
    },

    calculateWorkRange: function()
    {
        let maxRemoteRange = global.MAX_REMOTE_RANGE;
        let maxWorkSearchRange = global.MAX_NEARBY_RANGE;

        let minCpuAmount = 0.65;
        let cpuAmount = Math.clamp(global.AVERAGE_CPU_PERCENT, minCpuAmount, 1.0);
        let cpuLerpAmount = 1.0 - ((cpuAmount - minCpuAmount) * 2);
        let bucketPercent = Math.max(0, (Game.cpu.bucket - (constants.CPU_BUCKET_SIZE * 0.5)))/ (constants.CPU_BUCKET_SIZE * 0.5);
        let bucketLerpAmount = bucketPercent;
        let lerpAmount = cpuLerpAmount * bucketLerpAmount * bucketLerpAmount;
        //let lerpAmount = (cpuLerpAmount + bucketLerpAmount) / 2;

        let spawnSearchRange = Math.floor(Math.lerp(0, maxWorkSearchRange, lerpAmount));
        let workSearchRange = spawnSearchRange + 1;

        global.MAX_SEARCH_RANGE = maxWorkSearchRange;
        global.WORK_SEARCH_RANGE = workSearchRange;
        global.SPAWN_SEARCH_RANGE = spawnSearchRange;
        global.REMOTE_SEARCH_RANGE = maxRemoteRange;

        global.MAX_CPU_USAGE = Game.cpu.tickLimit * Game.cpu.bucket / constants.CPU_BUCKET_SIZE;
    },

    loadIntershardMemory: function()
    {
        global.shardMemory = {};

        if (Game.shard.name.startsWith('shard'))
        {
            // global.shardMemory['shard0'] = this.getShardMemory('shard0');
            // global.shardMemory['shard1'] = this.getShardMemory('shard1');
            // global.shardMemory['shard2'] = this.getShardMemory('shard2');
            // global.shardMemory['shard3'] = this.getShardMemory('shard3');
        }
        else
        {
            global.shardMemory[Game.shard.name] = {};
        }
    },

    getShardMemory: function(shardName)
    {
        let shardMem = "{}";

        if (Game.shard.name == shardName)
        {
            shardMem = (InterShardMemory.getLocal() || shardMem);
            //console.log('main.getShardMemory - ' + Game.shard.name + ' - ' + shardMem);
        }
        else
        {
            shardMem = (InterShardMemory.getRemote(shardName) || shardMem);
        }

        return JSON.parse(shardMem);
    },

    saveIntershardMemory: function()
    {
        // if (Game.shard.name.startsWith('shard'))
        // {
        //     InterShardMemory.setLocal(JSON.stringify(global.shardMemory[Game.shard.name]));
        //
        //     Memory.shards = {};
        //     for (let shardName in global.shardMemory)
        //         Memory.shards[shardName] = global.shardMemory[shardName];
        // }

    },

    tryGeneratePixel: function()
    {
        let shardCpuLimit = Game.cpu.limit;
        if (Game.cpu.shardLimits && Game.cpu.shardLimits[Game.shard.name])
            shardCpuLimit = Game.cpu.shardLimits[Game.shard.name];

        if (shardCpuLimit >= 50 && Game.cpu.generatePixel && Game.cpu.bucket >= constants.CPU_BUCKET_SIZE && global.AVERAGE_CPU_PERCENT < 0.75)
        {
            console.log("main - generating pixel");
            Game.cpu.generatePixel();
        }
    }
}
