'use strict'

const constants = require('constants');

class Program_Creep extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        this.monitorCreep = 0;
    }

    refresh()
    {
        super.refresh();

        this.memory = Memory.creeps[this.data.name];
        this.creep = Game.creeps[this.data.name];

        //console.log('Program_Creep.constructor - executing');

        if (this.memory && (this.memory[HEAL] || this.memory[ATTACK] || this.memory[RANGED_ATTACK]))
            this.priority = PROCESS_PRIORITY_DEFENSE;
    }

    start()
    {
        super.start();
        if (this.memory)
            this.memory.pid = this.id;
    }

    sleep(tickCount)
    {
        if (this.creep)
            this.creep.room.visual.text(tickCount, this.creep.pos.x, this.creep.pos.y + .2, {opacity: 0.5});

        return super.sleep(tickCount);
    }

    end()
    {
        //console.log('Program_Creep.end - executing');

        super.end();

        if (this.memory)
        {

            if (this.memory.job)
                Room.removeCreepFromJob(this.memory.job.room, this.memory.job.type, this.memory.job.id, this.data.name);

            delete Memory.creeps[this.data.name];
        }

        if (global.cachedPaths)
        {
            for (let pathRoom in global.cachedPaths)
            {
                if (global.cachedPaths[pathRoom][this.data.name])
                    delete global.cachedPaths[pathRoom][this.data.name];
            }
        }
    }

    laidOff()
    {
        if (this.memory.job)
        {
            Room.removeCreepFromJob(this.memory.job.room, this.memory.job.type, this.memory.job.id, this.data.name);
            delete this.memory.job;
        }

        this.endChildProcesses();
    }

    run()
    {
        super.run();

        if (!this.creep)
            return this.suicide();

        if (this.creep.spawning)
            return this.sleep(CREEP_SPAWN_TIME);

        if (this.creep.currentTask)
        {
            //console.log('XXXXXXXXXXXXXXXX Program_Creep.run - ' + this.creep.name + ' - ' + this.creep.pos + ' - creep with currentTask updating, job: ' + JSON.stringify(this.memory.job) + ', task: ' + JSON.stringify(this.creep.currentTask));
        }

        if (this.creep.ticksToLive < 50)
        {
            return this.recycle('end of life');
        }
            
        if (this.memory.mst && this.memory.mst == global.chineseify(Game.time))
        {
            if (this.memory.job && this.memory.job.id != 'store')
                console.log('XXXXXXXXXXXXXXXX Program_Creep.run - ' + this.creep.name + ' - ' + this.creep.pos + ' - checking for job again in same tick. Leaving ' + JSON.stringify(this.memory.job) + ', hitsPercent: ' + this.creep.hitsPercent);
            return;
        }
        

        this.memory.mst = global.chineseify(Game.time);

        if (this.memory.job)
        {
            if (this.creep.name == constants.MONITOR_CREEP)
            {
                console.log('holding: ' + this.data.hold);
                console.log('XXXXXXXXXXXXXXXX Program_Creep.run - ' + this.creep.name + ' - ' + this.creep.pos + ' - leaving job ' + JSON.stringify(this.memory.job) + ', hitsPercent: ' + this.creep.hitsPercent);
            }

            Room.removeCreepFromJob(this.memory.job.room, this.memory.job.type, this.memory.job.id, this.data.name);
            if (this.memory.boosts)
            {
                let foundSpecificJob = this.findSpecificJob(this.memory.job);
                if (foundSpecificJob)
                    return;
            }

            delete this.memory.job;

            // this.findJob();
            // return;
        }

        this.creep.cancelTask();
        
        

        if (this.creep.hits < this.creep.hitsMax)
        {
            if (this.creep.room.isMyBase() && this.creep.room.towers.length <= 0)
                return this.recycle('wounded');

            return this.retreat(this.creep.room.name);
        }
            

        if (this.creep.memory.type == 'carry' && this.creep.getResourceAmount() > 0 && this.store())
            return;

        let idleCreepsOfType = _.filter(this.creep.room.find(FIND_MY_CREEPS), c => !c.spawning && c.memory.type == this.creep.memory.type && c.isIdle());
        if (idleCreepsOfType.length > 4 && !Room.inDanger(this.creep.room.name))
        {
            return this.recycle('no task found');//, sleepTime);
        }
        else if (idleCreepsOfType.length > 1)
        {
            let oldestIdleCreepOfType = _.min(idleCreepsOfType, c => c.ticksToLive);
            if (oldestIdleCreepOfType.name == this.creep.name)
            {
                if (this.findJob())
                    return;

                //if ((this.creep.ticksToLive < CREEP_LIFE_TIME * 0.1 || (this.creep.isCivilian() && this.creep.ticksToLive < CREEP_LIFE_TIME * 0.9)) && Room.isMyBase(this.creep.room.name) && Game.cpu.bucket < constants.CPU_BUCKET_SIZE)
                if (this.creep.ticksToLive < CREEP_LIFE_TIME * 0.1 && Room.isMyBase(this.creep.room.name))
                    return this.recycle('no task found');//, sleepTime);
            }    
        }
        else
        {
            if (this.findJob())
                return;

            if (this.creep.memory.type == 'reactor_fill')
                return this.recycle('reactor filler completed task');

            //if ((this.creep.ticksToLive < CREEP_LIFE_TIME * 0.1 || (this.creep.isCivilian() && this.creep.ticksToLive < CREEP_LIFE_TIME * 0.9)) && Room.isMyBase(this.creep.room.name) && Game.cpu.bucket < constants.CPU_BUCKET_SIZE)
            if (this.creep.ticksToLive < CREEP_LIFE_TIME * 0.1 && Room.isMyBase(this.creep.room.name))
                return this.recycle('no task found');//, sleepTime);
        }

        if (!Room.isMyBase(this.creep.room.name))
            return this.retreat(this.creep.room.name);

        if (this.creep.room.quickCanPos1 && this.creep.pos.getRangeTo(this.creep.room.quickCanPos1) < 1 && this.fleeTarget(this.creep.room.quickCanPos1, 3))
            return;
        if (this.creep.room.quickCanPos2 && this.creep.pos.getRangeTo(this.creep.room.quickCanPos2) < 1 && this.fleeTarget(this.creep.room.quickCanPos2, 3))
            return;
            
        let cpuRemaining = 1 - global.AVERAGE_CPU_PERCENT;
        let bucketFullness = (Game.cpu.bucket / constants.CPU_BUCKET_SIZE);
        let sleepDivisor = (bucketFullness + cpuRemaining) / 2;
        let sleepTime = ((this.creep.room.extensions.length + 1) / CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8]);
        sleepTime = Math.ceil(sleepTime / (sleepDivisor * sleepDivisor * sleepDivisor)) * CREEP_SPAWN_TIME;

        if (this.creep.ticksToLive < sleepTime)
            return this.recycle('no task found');
            
        // if (Game.cpu.bucket >= constants.CPU_BUCKET_SIZE)
        //     return this.sleep(sleepTime);
        //return this.recycle('no task found', sleepTime);

        return this.sleep(sleepTime);
    }

    fleeTarget(target, range, options)
    {
        if (target.roomName && target.roomName != this.creep.room.name)
            return false;
        if (target.pos && target.pos.roomName != this.creep.room.name)
            return false;

        if (this.creep.pos.getRangeTo(target >= range))
            return false;

        if (target.roomName)
            this.launchChildProcess('flee', 'task_flee',  { creep: this.creep.name, x: target.x, y: target.y, r: target.roomName, options: options, range: range }, true);
        else
            this.launchChildProcess('flee', 'task_flee',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, options: options, range: range }, true);

        return true;
    }

    retreat(leaveRoom)
    {
        //console.log('Program_Creep.retreat - ' + this.creep.name + ' - ' + this.creep.pos + ' - retreating from ' + leaveRoom);
        this.launchChildProcess('retreat', 'task_retreat',  { creep: this.creep.name, leaveRoom: leaveRoom }, true);
        if (this.monitorCreep && this.creep.name == constants.MONITOR_CREEP)
            console.log('Program_Creep.retreat - ' + this.creep.room.name + ' - ' + this.creep.name + ' - hold: ' + this.data.hold);
        return null;
    }

    recycle(reason, maxTickCount)
    {
        //console.log('Program_Creep.recycle - ' + this.creep.name + ' recycling');
        this.launchChildProcess('recycle', 'task_recycle',  { creep: this.creep.name, reason: reason, maxTickCount: maxTickCount }, true);
        if (this.monitorCreep && this.creep.name == constants.MONITOR_CREEP)
            console.log('Program_Creep.recycle - ' + this.creep.room.name + ' - ' + this.creep.name + ' - hold: ' + this.data.hold);
        return null;
    }

    store()
    {
        let nearestBase = Room.getNearestBase(this.creep.pos.roomName);
        if (!nearestBase)
            return false;

        let storeTask = { utility: 0.001, jobId: 'store', jobType: 'store', name: 'store', program: 'task_store', room: nearestBase.name, data: { r: nearestBase.name } };
        this.assignToJobTask(storeTask);
        return true;
    }

    findSpecificJob(jobInfo)
    {
        let jobInstance = Room.getJobInstance(jobInfo);
        if (!jobInstance)
        {
            console.log('XXXXXXXXXXXXXXXX Program_Creep.findSpecificJob - ' + this.creep.name + ' - no job instance found for ' + JSON.stringify(jobInfo));
            return false;
        }

        let task = jobInstance.getTaskDirect();
        if (!task)
        {
            console.log('XXXXXXXXXXXXXXXX Program_Creep.findSpecificJob - ' + this.creep.name + ' - ' + this.creep.pos + ' - no task found for ' + JSON.stringify(jobInfo));
            return false;
        }

        task.room = jobInfo.room;

        //console.log('XXXXXXXXXXXXXXXX Program_Creep.findSpecificJob - ' + this.creep.name + ' - ' + this.creep.pos + ' - reassigned to task: ' + JSON.stringify(task) + ', from jobInfo: ' + JSON.stringify(jobInfo));

        return this.assignToJobTask(task);
    }

    findJob()
    {
        let roomName = this.creep.room.name;

        //if (this.monitorCreep && this.creep.name == constants.MONITOR_CREEP)
        if (this.creep.memory.type == 'assaulter')
            console.log('XXXXXXXXXXXXXXXX Program_Creep.findJob - ' + this.creep.name + ' - looking for job');

        let task = null;
        if (Room.isMyBase(roomName))
            task = Room.findTask(roomName, this.creep, true, false);
        if (!task)
            task = Room.findTaskInRange(roomName, global.REMOTE_SEARCH_RANGE, this.creep, true);
        if (!task)
            task = Room.findTaskInRange(roomName, global.WORK_SEARCH_RANGE  , this.creep, false);
        if (!task)
            return false;

        if (this.monitorCreep && this.creep.name == constants.MONITOR_CREEP)
            console.log('XXXXXXXXXXXXXXXX Program_Creep.findJob - ' + roomName + ' - ' + this.creep.name + ' - got task - ' + JSON.stringify(task));

        return this.assignToJobTask(task);
    }

    assignToJobTask(task)
    {
        let jobMemory = { type: task.jobType, id: task.jobId, task: task.name, room: task.room };
        if (task.source)
            jobMemory.source = task.source;

        if (!Room.addCreepToJob(task.room, task.jobType, task.jobId, this.creep.name, jobMemory))
        {
            console.log('Program_Creep.assignToJobTask - ' + this.creep.room.name + ' - ' + this.creep.name + ' - could not add creep to task - ' + JSON.stringify(task));
            return false;
        }


        this.creep.cancelTask();

        delete this.creep.memory.spawnShard;

        this.memory.job = jobMemory;

        task.data.creep = this.creep.name;
        this.launchChildProcess(task.name, task.program, task.data, true);

        //if (this.monitorCreep && this.creep.name == constants.MONITOR_CREEP)
        if (this.creep.memory.type == 'transfer')
            console.log('XXXXXXXXXXXXXXXX Program_Creep.assignToJobTask - ' + this.creep.name + ' - ' + this.creep.pos + ' - starting job ' + JSON.stringify(this.memory.job) + ', hitsPercent: ' + this.creep.hitsPercent);

        if (this.monitorCreep && this.creep.name == constants.MONITOR_CREEP)
            console.log('Program_Creep.assignToJobTask - ' + this.creep.room.name + ' - ' + this.creep.name + ' - hold: ' + this.data.hold);

        return true;
    }
}

module.exports = Program_Creep
