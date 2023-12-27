'use strict'

const constants = require('constants');

const words =
[
    'EAT',
    'CRAYONS',
    '',
    'SHIT',
    'RAINBOWS',
    '',
];

class Task extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 1;
        this.autoBoost = 1;
    }

    sleep(tickCount)
    {
        if (this.creep)
            this.creep.room.visual.text(tickCount, this.creep.pos.x, this.creep.pos.y + .2, {opacity: 0.5});

        return super.sleep(tickCount);
    }

    refresh()
    {
        super.refresh();

        this.creep = Game.creeps[this.data.creep];
        if (this.creep && this.creep.currentTask && this.creep.currentTask.n == this.name)
        {
            this.memory = this.creep.currentTask;
        }
        else
        {
            let creepMemory = Memory.creeps[this.data.creep]
            if (creepMemory && creepMemory.tasks && creepMemory.tasks.length > 0 && creepMemory.tasks[creepMemory.tasks.length - 1].n == this.name)
            {
                //console.log('Task.refresh - ' + this.data.creep + ' - found creep memory - ' + this.name);
                this.memory = creepMemory.tasks[creepMemory.tasks.length - 1];
            }
        }
    }

    start()
    {
        super.start();

        // Move data to task memory
        let taskInfo = { n: this.name, pid: this.id, ...this.data };
        // Uncommenting this will cause child tasks to run their parent?
        //this.data = { creep: taskInfo.creep };

        delete taskInfo.creep;

        this.creep.pushTask(taskInfo);
        // Commenting this will cause child tasks to fail. This process will be cached and needs its memory set before it runs
        this.memory = this.creep.currentTask;
    }

    end()
    {
        if (this.creep && this.creep.name == constants.MONITOR_CREEP)
            console.log('Task.end - ' + this.creep.name + ' - ending task - ' + this.name);

        if (this.creep && this.creep.currentTask && this.creep.currentTask.n == this.name)
            this.creep.popTask();

        super.end();
    }

    run()
    {
        super.run();

        if (!this.creep)
            return this.suicide();

        if (this.creep.isCivilian() && this.creep.fatigue)
            return;

        if (!this.creep.currentTask)
        {
            if (this.creep.name == constants.MONITOR_CREEP)
                console.log('Task.run - ' + this.creep.name + ' - ending task, no currentTask');
            return this.suicide();
        }

        if (this.creep.currentTask.n != this.name && this.creep.currentTask.n != 'task_recycle')
        {
            //if (this.creep.name == constants.MONITOR_CREEP)
                console.log('Task.run - ' + this.creep.name + ' - ending task. This task name: ' + this.name + ' - ' + this.creep.pos + ' - currentTask name: ' + this.creep.currentTask.n + ' - hold: ' + this.data.hold);
            return this.suicide();
        }

        if (this.cancelIfWounded && this.creep.hits < this.creep.hitsMax)
        {
            if (this.creep.name == constants.MONITOR_CREEP)
                console.log('Task.run - ' + this.creep.name + ' - ending task, wounded: ' + this.name + ' - ' + this.creep.hits + ' - ' + this.creep.hitsMax);
            return this.suicide();
        }

        if (!this.memory)
        {
            if (this.creep.name == constants.MONITOR_CREEP)
                console.log('Task.run - ' + this.creep.name + ' - ending task, no memory');
            return this.suicide();
        }

        if (this.autoBoost && this.creep.memory.boostRequests && !this.creep.hasTask({ n: 'task_get_boosted' }))
        {
            this.launchChildProcess('get_boosted', 'task_get_boosted',  { creep: this.creep.name, r: this.creep.room.name }, true);
            return;
        }

        if (Game.flags.draw)
        {
            if (!this.creep.outputTaskCount)
                this.creep.outputTaskCount = 0;

            let visY = this.creep.pos.y + .2 - 0.5 + (this.creep.outputTaskCount * 0.25);

            this.creep.room.visual.text(this.name, this.creep.pos.x, visY, {opacity: 0.5, font: 0.25});

            this.creep.outputTaskCount += 1;
        }

        let result = this.doTask(this.creep);
        if (result == TASK_RESULT_COMPLETE)
        {
            if (this.creep.name == constants.MONITOR_CREEP)
                console.log('Task.run - ' + this.creep.name + ' - ending task: ' + this.name + ', complete');
            return this.suicide();
        }
    }

    doTask(creep)
    {

    }

    accumulate(creep)
    {
        if (!this.memory)
            return false;

        this.memory.rate = 1.0;

        // if (creep.memory.boosts)
        //     return true;

        let nearestBase = Room.getNearestBase(creep.room.name);
        if (!nearestBase)
            return true;

        if (!nearestBase.quickCan1 && !nearestBase.quickCan2 && !nearestBase.hasMyStorageOrTerminal())
            return nearestBase.totalBonfireAmount > 0 || nearestBase.energyAvailable >= nearestBase.energyCapacityAvailable;

        //if (nearestBase.isBootstrapping())
        //    return true;

        if (nearestBase.controller && nearestBase.controller.my && nearestBase.controller.level <= 1)
            return true;

        if (Room.hasPlentyOfEnergy(nearestBase.name))
            return true;

        let baseMemory = Room.getBaseMemory(nearestBase.name);
        let profitQuotient = Math.clamp(baseMemory.profitQuotient, 0.1, 1);

        if (!this.memory.acc)
            this.memory.acc = 0;
        this.memory.acc += profitQuotient;
        this.memory.rate = profitQuotient;
        if (this.memory.acc < 1)
            return false;

        this.memory.acc -= 1;

        return true;
    }

    getMissionRoom()
    {
        if (this.creep && this.creep.memory && this.creep.memory.mission && this.creep.memory.mission.room)
            return Game.rooms[this.creep.memory.mission.room];

        return null;
    }

    getTaskRoom()
    {
        if (this.memory.r)
            return Game.rooms[this.memory.r];

        return null;
    }

    getTarget()
    {
        let target = null;
        if (this.memory.t)
        {
            target = Game.getObjectById(this.memory.t);
            if (target)
                return target;
            else if (Game.rooms[this.memory.r])
                return null;
        }
        if (this.memory.r)
            return new RoomPosition(this.memory.x, this.memory.y, this.memory.r);

        return null;
    }

    setTarget(target)
    {
        this.memory.t = target.id;
        this.memory.x = target.pos.x;
        this.memory.y = target.pos.y;
        this.memory.r = target.pos.roomName;
    }

    avoidLair(additionalTicks = 0)
    {
        let creep = this.creep;

        if (creep.memory.job && creep.memory.job.source)
        {
            let sourceOrMineral = Game.getObjectById(creep.memory.job.source);

            if (sourceOrMineral)
            {
                let lair = sourceOrMineral.lair;
                if (lair && (!lair.ticksToSpawn || lair.ticksToSpawn < 20 + additionalTicks || ENERGY_REGEN_TIME - lair.ticksToSpawn < 5))
                {
                    let wakeTime = Game.time + additionalTicks;
                    this.launchChildProcess('avoid_lair', 'task_avoid_lair',  { creep: this.creep.name, t: lair.id, x: lair.pos.x, y: lair.pos.y, r: lair.pos.roomName, wake: wakeTime }, true);
                    return true;

                    let rangeToLair = creep.wpos.getRangeTo(lair.wpos)
                    if (rangeToLair < 10)
                    {
                        return this.fleeTarget(lair, 10, { ignoreCreeps: false });
                        //creep.moveTo(lair, { range: 10, flee: true, ignoreCreeps: false });
                        //return true;
                    }
                    else if (rangeToLair == 10)
                    {
                        if (lair.ticksToSpawn < 20 + additionalTicks)
                            this.sleep(Math.max(lair.ticksToSpawn + 10, additionalTicks));
                        return true;
                    }
                }
            }
        }

        return false;
    }

    boostAtTarget(target, boost, amount)
    {
        this.launchChildProcess('boost', 'task_boost',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, res: boost, amount: amount }, true);
        return true;
    }

    buildTarget(target, ignorePq)
    {
        this.launchChildProcess('build', 'task_build',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, ignorePq: ignorePq }, true);
        return true;
    }

    deliverResourceToStorage(resourceType = null, closest = false)
    {
        if (!resourceType)
        {
            for (let resource of constants.RESOURCES_ALL_REVERSED)
            {
                if (this.creep.getResourceAmount(resource) > 0)
                {
                    //console.log('Task.deliverResourceToStorage - ' + this.creep.name + ' - selected ' + resource);
                    resourceType = resource;
                    break;
                }
            }
        }

        if (!resourceType)
        {
            //console.log('Task.deliverResourceToStorage - ' + this.creep.name + ' - no resourceType');
            return TASK_RESULT_BREAK;
        }

        let base = null;
        if (resourceType == RESOURCE_ENERGY)
            base = Room.getNearestBase(this.creep.room.name);
        else
            base = Room.getNearestBaseFiltered(this.creep.room.name, b => b.hasMyStorageOrTerminal());

        if (!base)
        {
            console.log('Task.deliverResourceToStorage - ' + this.creep.name + ' - no base nearby');
            return TASK_RESULT_BREAK;
        }

        if (!base.hasMyStorageOrTerminal() && resourceType == RESOURCE_ENERGY)
        {
            let target = Room.getEnergyDeliveryTarget(base.name, this.creep, 0, 0, false, false, false, true, true);
            if (target)
                return this.deliverResourceToTarget(target, RESOURCE_ENERGY);
        }
        
        if (resourceType != RESOURCE_ENERGY && Room.getResourceAmountLevel(base.name, resourceType) >= constants.RESOURCE_LEVEL_EXCESS)
        {
            this.creep.drop(resourceType);
            return TASK_RESULT_BREAK;
        }

        // if (resourceType == RESOURCE_ENERGY)
        // {
        //     let target = Room.getEnergyDeliveryTarget(base.name, this.creep, 0, 0, true, true, false, true, true);
        //     if (target)
        //         return this.deliverResourceToTarget(target, resourceType);
        // }

        if (!closest && Room.isUnclaiming(base.name))
            closest = true;

        let storage = Room.getResourceDeliveryTarget(base.name, resourceType, this.creep, closest);
        if (storage)
        {
            // if (this.creep.room.name == 'W48N32')
            //     console.log('Task.deliverResourceToStorage - ' + this.creep.name + ' - delivering ' + resourceType + ' to ' + storage);
            return this.deliverResourceToTarget(storage, resourceType);
        }

        if (base.bonFirePos)
        {
            let dropOffPos = base.bonfirePos;
            this.launchChildProcess('drop', 'task_drop',  { creep: this.creep.name, x: dropOffPos.x, y: dropOffPos.y, r: dropOffPos.roomName, res: resourceType }, true);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        //console.log('Task.deliverResourceToStorage - ' + this.creep.name + ' - no target storage');

        return TASK_RESULT_BREAK;
    }

    deliverResourceToTarget(target, resourceType, once, color)
    {
        //console.log('Task.deliverResourceToTarget - ' + this.creep.name + ' - delivering ' + resourceType + ' to ' + target);
        this.launchChildProcess('deliver', 'task_deliver',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, res: resourceType, once: once, c: color }, true);
        return true;
    }

    destroyTarget(target)
    {
        //console.log('Task.destroyTarget - ' + this.creep.name + ' - destroying ' + target);
        this.launchChildProcess('destroyTarget', 'task_destroyTarget',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName }, true);
        return true;
    }

    dismantleTarget(target, forEnergy)
    {
        //console.log('Task.dismantleTarget - ' + this.creep.name + ' - dismantling ' + target);
        this.launchChildProcess('dismantle', 'task_dismantle',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, forEnergy: forEnergy }, true);
        return true;
    }

    dropResources(except)
    {
        for (let resourceType of RESOURCES_ALL)
        {
            if (except && resourceType == except)
                continue;

            let creepResource = this.creep.store.getUsedCapacity(resourceType);
            if (creepResource > 0)
            {
                this.creep._drop(resourceType);
                return true;
            }
        }

        return false;
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

    fortifyRoom(roomName)
    {
        this.launchChildProcess('fortify', 'task_fortify',  { creep: this.creep.name, r: roomName }, true);
        return true;
    }

    getResourceFromStorage(resourceType, includeCans = true, includeBonfire = true, amount = null)
    {
        let target = Room.getResourceStorageTarget(this.creep.room.name, resourceType, this.creep, amount, includeCans, includeBonfire);
        if (target)
            return this.getResourceFromTarget(target, resourceType, amount);

        return false;
    }

    getResourceFromTarget(target, resourceType, amount, color)
    {
        this.launchChildProcess('collect', 'task_collect',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, res: resourceType, amount: amount, c: color }, true);
        //console.log('Task.getResourceFromTarget - ' + this.creep.name + ' - launching task_collect - ' + this.name + ' - ' + this.creep.pos + ' - ' + this.creep.currentTask.n + ' - hold: ' + this.data.hold);
        return true;
    }

    getResourceNearest(resourceType, amount, takeFromCarrier = true, harvestIfPossible = true, searchRange = global.WORK_SEARCH_RANGE, color)
    {
        let target = null;

        if (this.creep.room.controller && !this.creep.room.controller.my && this.creep.room.controller.safeMode)
        {
            return this.retreat(this.creep.room.name);
        }

        if (!target)
        {
            if (harvestIfPossible && this.creep.memory[WORK] && resourceType == RESOURCE_ENERGY)
            {
                if (!this.creep.room.controller || (this.creep.room.controller.owner && !this.creep.room.controller.my) || (this.creep.room.controller.reservation && this.creep.room.controller.reservation.username != ME))
                {
                    target = Room.getResourcePickupTarget(this.creep.room.name, this.creep, resourceType, 0, 0, true, true, true, takeFromCarrier, true)
                    if (!target)
                    {
                        if (this.creep.memory[WORK] >= 4)
                        {
                            let wall = this.creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: s => s.hits && s.hits > constants.MIN_RAMPART_HITS && s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART } );
                            if (wall && wall.hits > constants.MIN_RAMPART_HITS)
                                return this.dismantleTarget(wall, true);
                        }

                        return this.retreat(this.creep.room.name);
                    }
                }
                    
                if (!target)
                {
                    let roomMemory = Room.getMemory(this.creep.room.name);
                    if (roomMemory && roomMemory.sources)
                    {
                        target = Room.getResourcePickupTarget(this.creep.room.name, this.creep, resourceType, 0, 0, true, true, true, takeFromCarrier, true)
                        if (!target)
                        {
                            let source = this.creep.pos.findClosestByRange(FIND_SOURCES, { filter: s => s.energy > 0 && s.pos.isSafe() } );
                            if (source)
                            {
                                this.launchChildProcess('harvest', 'task_harvest',  { creep: this.creep.name, t: source.id, x: source.pos.x, y: source.pos.y, r: source.pos.roomName }, true);
                                return TASK_RESULT_CONTINUE;
                            }
                        }
                    }
                }
            }
        }

        if (!target)
            target = Room.getResourcePickupTarget(this.creep.room.name, this.creep, resourceType, global.WORK_SEARCH_RANGE, 0, true, true, true, takeFromCarrier, true)
            

        let wait = null;

        if (target instanceof Creep)
        {
            wait = 1;
            //console.log('Task.getResourceNearest - forcing ' + target.name + ' to deliver to ' + this.creep.name);
            target.pushTaskProgram('deliver', 'task_deliver', { creep: target.name, t: this.creep.id, x: this.creep.pos.x, y: this.creep.pos.y, r: this.creep.pos.roomName, res: resourceType, amount: amount, once: true, c: color }, true);
        }

        this.launchChildProcess('collect', 'task_collect',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, res: resourceType, amount: amount, wait: wait, c: color }, true);
        return TASK_RESULT_CONTINUE;
    }

    fleeRoom()
    {
        let nearestExit = this.creep.pos.findClosestByRange(FIND_EXIT);
        this.creep.moveTo(nearestExit);
        return TASK_RESULT_BREAK;
    }

    gotoRoom(roomName, depth, options)
    {
        if (roomName != this.creep.room.name || this.creep.pos.nearEdge(depth))
        {
            let target = new RoomPosition(25, 25, roomName);
            let range = 24 - depth;

            return this.gotoTarget(target, range, options);
        }

        return false;
    }

    gotoTarget(target, range, options)
    {
        let inSameRoom = ((target.roomName && target.roomName == this.creep.room.name) || (target.pos && target.pos.roomName == this.creep.room.name));

        if (!inSameRoom || this.creep.pos.getRangeTo(target) > range)
        {
            if ((!options || (!options.planOnly && !options.flee)) && this.creep.memory.job && this.creep.isCivilian() && !this.creep.memory[CLAIM] && this.creep.wpos.getRangeTo(target.wpos) * 2 > this.creep.ticksToLive)
            {
                
                Room.removeCreepFromJob(this.creep.memory.job.room, this.creep.memory.job.type, this.creep.memory.job.id, this.creep.name);
                delete this.creep.memory.job;
                this.recycle('cannot reach target before end-of-life');
                return true;
            }

            if (!_.isUndefined(range))
            {
                if (!options)
                    options = {};

                if (inSameRoom)
                    options.range = range;
            }

            this.creep.moveTo(target, options);
            return true;
        }

        return false;
    }

    makeTargetFlee(target, range, options)
    {
        if (!(target instanceof Creep) || !target.my)
            return false;

        let fleeTarget = target.pos;

        target.pushTaskProgram('flee', 'task_flee',  { creep: target.name, x: fleeTarget.x, y: fleeTarget.y, r: fleeTarget.roomName, options: options, range: range }, true);
        return true;
    }

    moveToRoom(roomName, depth, options)
    {
        return this.gotoRoom(roomName, depth, options);

        if (roomName != this.creep.room.name || this.creep.pos.nearEdge(depth))
        {
            let target = new RoomPosition(25, 25, roomName);
            let range = 23 - depth;

            this.launchChildProcess('moveTo', 'task_moveTo',  { creep: this.creep.name, x: target.x, y: target.y, r: target.roomName, options: options, range: range }, true);
            return true;
        }

        return false;
    }

    moveToTarget(target, range, options)
    {
        return this.gotoTarget(target, range, options);

        let move = false;
        if (this.creep.memory.mission && this.creep.memory.mission.source)
        {
            let source = Game.getObjectById(this.creep.memory.mission.source);
            if (source)
            {
                let lair = target.lair;
                if (lair && (!lair.ticksToSpawn || lair.ticksToSpawn < 20 || ENERGY_REGEN_TIME - lair.ticksToSpawn < 5))
                {
                    let rangeToLair = this.creep.wpos.getRangeTo(lair.wpos)
                    if (rangeToLair < 10)
                        move = true;
                    else if (rangeToLair == 10)
                        return false;
                }
            }
        }

        if (!move &&
           ((target.roomName && target.roomName != this.creep.room.name) ||
            (target.pos && target.pos.roomName != this.creep.room.name) ||
             this.creep.pos.getRangeTo(target) > range))
            move = true;

        if (move)
        {
            if (target.roomName)
                this.launchChildProcess('moveTo', 'task_moveTo',  { creep: this.creep.name, x: target.x, y: target.y, r: target.roomName, options: options, range: range }, true);
            else
                this.launchChildProcess('moveTo', 'task_moveTo',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, options: options, range: range }, true);
        }

        return move;
    }

    paveRoom(roomName)
    {
        this.launchChildProcess('pave_base', 'task_pave_base',  { creep: this.creep.name, r: roomName }, true);
        return true;
    }

    recycle(reason)
    {
        //console.log('Program_Creep.recycle - ' + this.creep.name + ' recycling');
        this.launchChildProcess('recycle', 'task_recycle',  { creep: this.creep.name, reason: reason }, true);
        return true;
    }

    repairTarget(target, repairToFull, getEnergy = true)
    {
        this.launchChildProcess('repair', 'task_repair',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, toFull: repairToFull, getEnergy: getEnergy }, true);
        return true;
    }

    retreat(leaveRoom)
    {
        this.launchChildProcess('retreat', 'task_retreat',  { creep: this.creep.name, leaveRoom: leaveRoom }, true);
        return true;
    }

    unboostAt(target)
    {
        this.launchChildProcess('get_unboosted', 'task_get_unboosted',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName }, true);
        return true;
    }

    upgradeTarget(target, getEnergy = false)
    {
        this.launchChildProcess('upgrade', 'task_upgrade',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, getEnergy: getEnergy }, true);
        return true;
    }

    sayTheThing(creep)
    {
        // let sayIndex = Game.time % words.length;
        // if (words[sayIndex] != '')
        //     creep.say(words[sayIndex], true);
    }
}

module.exports = Task
