'use strict'

global.TASK_RESULT_NONE     = 0;
global.TASK_RESULT_CONTINUE = 1;
global.TASK_RESULT_COMPLETE = 2;
global.TASK_RESULT_BREAK    = 3;
global.TASK_RESULT_CONTINUE_NEXT = 4;
global.TASK_RESULT_QUIT     = 5;

Creep.prototype.pushTaskProgram = function(label, name, data = {}, hold = false)
{
    let processId;
    let currentTask = this.currentTask;
    if (!currentTask || !currentTask.pid)
        processId = this.memory.pid
    else
        processId = currentTask.pid;

    let currentTaskProcess = kernel.scheduler.getProcessFromId(processId);
    if (!currentTaskProcess)
        return false;

    currentTaskProcess.launchChildProcess(label, name, data, hold);
    return true;
}

Creep.prototype.wakeUp = function()
{
    let processId;
    let currentTask = this.currentTask;
    if (!currentTask || !currentTask.pid)
        processId = this.memory.pid
    else
        processId = currentTask.pid;

    return kernel.scheduler.wakeSleepingProcessById(processId);
}

Object.defineProperty(Creep.prototype, "currentTask",
{
    configurable: true,
    get()
    {
        if (this.memory.tasks && this.memory.tasks.length > 0)
            return _.last(this.memory.tasks);
        return null;
    },
    set(value)
    {
        console.log('Creep.currentTask.set - ' + this.name + ' not implemented!');
    }
});

Creep.prototype.callTaskOrCreepProcessFunction = function(functionName, args)
{
    let currentTask = this.currentTask;
    if (currentTask)
    {
        if (!currentTask.pid)
            return null;

        return kernel.scheduler.callProcessFunction(currentTask.pid, functionName, args);
    }

    if (!this.memory.pid)
        return null;

    return kernel.scheduler.callProcessFunction(this.memory.pid, functionName, args);
}

Creep.prototype.hasTask = function(taskInfo)
{
    if (!this.memory.tasks || this.memory.tasks.length <= 0)
        return false;

    if (!taskInfo)
        return true;
    else
        return !_.isUndefined(_.find(this.memory.tasks, taskInfo));
}

Creep.prototype.hasCurrentTask = function(taskInfo)
{
    let currentTask = this.currentTask;
    if (!currentTask)
        return false;

    return _.isMatch(currentTask, taskInfo);
}


Creep.prototype.cancelTask = function(taskInfo)
{
    let currentTask = this.currentTask;
    if (!currentTask || !taskInfo)
    {
        this.setTask(null);
        return;
    }

    let taskIndex = _.findIndex(this.memory.tasks, taskInfo);
    if (taskIndex < 0)
    {
        this.setTask(null);
    }
    else if (taskIndex >= 0)
    {
        this.memory.tasks.splice(taskIndex, this.memory.tasks.length - taskIndex);
    }
}

Creep.prototype.setTask = function(taskInfo, target)
{
    if (taskInfo)
    {
        this.memory.tasks = [ taskInfo ];
        if (target)
            this.setCurrentTaskTarget(target);
    }
    else
    {
        delete this.memory.tasks;
    }
}

Creep.prototype.popTask = function()
{
    if (this.memory.tasks && this.memory.tasks.length > 0)
        return this.memory.tasks.pop();

    return null;
}

Creep.prototype.pushTask = function(taskInfo, target)
{
    if (!taskInfo)
        return;

    if (!this.memory.tasks)
        this.setTask(taskInfo);
    else
        this.memory.tasks.push(taskInfo);

    if (target)
        this.setCurrentTaskTarget(target);
}

Creep.prototype.pushTaskSameTarget = function(taskInfo)
{
    if (!taskInfo)
        return;

    let currentTask = this.currentTask;
    if (currentTask)
    {
        taskInfo.t = currentTask.t;
        taskInfo.x = currentTask.x;
        taskInfo.y = currentTask.y;
        taskInfo.r = currentTask.r;
    }
    else
    {
        console.log('Creep.pushTaskSameTarget - ' + this.name + ' no current task?')
    }

    if (!this.memory.tasks)
        this.setTask(taskInfo);
    else
        this.memory.tasks.push(taskInfo);
}

Creep.prototype.getCurrentTaskTarget = function()
{
    let taskInfo = this.currentTask;
    let target = null;
    if (taskInfo && taskInfo.r)
    {
        if (taskInfo.t && Game.rooms[taskInfo.r])
        {
            target = Game.getObjectById(taskInfo.t);
            if (!target && taskInfo.targets && taskInfo.targets.length > 0)
            {
                let targets = _.filter(taskInfo.targets.map(id => Game.getObjectById(id)), t => t);
                if (targets.length > 0)
                {
                    this.setCurrentTaskTarget(targets[0]);
                    taskInfo.targets = targets.map(t => t.id);
                }
                else
                {
                    console.log('Creep.getCurrentTaskTarget - ' + this.name + ' no targets?')
                    delete taskInfo.targets;
                }
            }

            if (!target || target.pos.x != taskInfo.x || target.pos.y != taskInfo.y || target.pos.r != taskInfo.r)
                this.setCurrentTaskTarget(target);
        }
        else
        {
            target = new RoomPosition(taskInfo.x, taskInfo.y, taskInfo.r);
        }
    }

    return target;
}

Creep.prototype.setCurrentTaskTarget = function(target)
{
    let taskInfo = this.currentTask;
    if (taskInfo)
    {
        if (Array.isArray(target))
        {
            if (target.length > 0)
            {
                let firstTarget = target[0];
                taskInfo.targets = target.map(t => t.id);
                target = firstTarget;

                //console.log('Creep.setCurrentTaskTarget - ' + this.name + ' setting ' + taskInfo.targets.length + ' targets')
            }
            else
            {
                target = null;
            }
        }

        if (target)
        {
            if (target.id)
            {
                taskInfo.t = target.id;
                taskInfo.x = target.pos.x;
                taskInfo.y = target.pos.y;
                taskInfo.r = target.pos.roomName;
            }
            else if (target.t)
            {
                taskInfo.t = target.t;
                taskInfo.x = target.x;
                taskInfo.y = target.y;
                if (target.roomName)
                    taskInfo.r = target.roomName;
                else if (target.r)
                    taskInfo.r = target.r;
            }
            else if (target.x)
            {
                delete taskInfo.t;
                taskInfo.x = target.x;
                taskInfo.y = target.y;
                if (target.roomName)
                    taskInfo.r = target.roomName;
                else if (target.r)
                    taskInfo.r = target.r;
            }
        }
        else
        {
            delete taskInfo.t;
            delete taskInfo.x;
            delete taskInfo.y;
            delete taskInfo.r;
        }
    }
}

Creep.prototype.shiftTaskTarget = function()
{
    let taskInfo = this.currentTask;
    if (taskInfo && taskInfo.targets && taskInfo.targets.length > 0)
    {
        taskInfo.targets.shift();
        if (taskInfo.targets.length <= 0)
            delete taskInfo.targets;
    }
}

Creep.prototype.moveToTaskTarget = function(target, range, options)
{
    if ((target.roomName && target.roomName != this.room.name) ||
        (target.pos && target.pos.roomName != this.room.name) ||
         this.pos.getRangeTo(target) > range)
    {
        if (!this.fatigue)
        {
            if (!options)
                options = {};
            // if (range <= 1)
            //     options.range = 0;
            // else
            if (!options.range)
                options.range = range;

            this.moveTo(target, options);
        }

        return true;
    }

    return false;
}

// Maybe remove, MoveTo as a task adds unnecessary complexity
Creep.prototype.moveToCurrentTaskTarget = function()
{
    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return false;

    if ((target.roomName && target.roomName != this.room.name) ||
        (target.pos && target.pos.roomName != this.room.name) ||
         this.pos.getRangeTo(target) > 1)
    {
        this.pushTaskSameTarget({ n: 'MoveTo', or: taskInfo.or });
        return true;
    }

    return false;
}

Creep.prototype.doTask = function ()
{
    let result = TASK_RESULT_NONE;
    if (this.spawning)
    {
        return TASK_RESULT_NONE;
    }
    else
    {
        let keepGoing = true;
        while (keepGoing)
        {
            keepGoing = false;
            let taskInfo = this.currentTask;
            if (!taskInfo)
                return result;

            let methodName = 'doTask' + taskInfo.n;
            if (!this[methodName])
            {
                console.log('Creep.doTask - ' + this.name + ' could not find method: ' + methodName);
                this.popTask();
            }
            else
            {
                result = this[methodName]();
                if (result == TASK_RESULT_COMPLETE)
                {
                    this.popTask();
                }
                else if (result == TASK_RESULT_CONTINUE)
                {
                    //console.log('Creep.doTask - ' + this.name + ' ' + taskInfo.n + ' continued');
                    this.popTask();
                    keepGoing = true;
                }
                else if (result == TASK_RESULT_CONTINUE_NEXT)
                {
                    //console.log('Creep.doTask - ' + this.name + ' ' + taskInfo.n + ' continued next - ' + this.currentTask.n);
                    keepGoing = true;
                }
            }
        }
    }

    return result;
}

Creep.prototype.doTaskBuild = function()
{
    let thisEnergy = this.store.getUsedCapacity(RESOURCE_ENERGY);
    if (thisEnergy <= 0)
        return TASK_RESULT_COMPLETE;

    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return TASK_RESULT_COMPLETE;

    let rangeToTarget = this.pos.getRangeTo(target);

    if (rangeToTarget > 3)
        delete taskInfo.gotClose;

    if (this.moveToTaskTarget(target, 3))
        return TASK_RESULT_BREAK;

    if (rangeToTarget == 0)
    {
        this.moveRandom();
        return TASK_RESULT_BREAK;
    }

    if (rangeToTarget > 2 && !taskInfo.gotClose)
        this.moveTo(target);

    if (rangeToTarget <= 2)
        taskInfo.gotClose = 1;

    let nearestBase = Room.getNearestBase(this.room.name);

    let baseMemory = Room.getBaseMemory(nearestBase.name);
    let profitQuotient = Math.min(1, baseMemory.profitQuotient);
    let buildThisTick = true;

    if (!this.room.isBootstrapping())
    {
        if (!taskInfo.acc)
            taskInfo.acc = 0;
        taskInfo.acc += profitQuotient;
        taskInfo.rate = profitQuotient;
        if (taskInfo.acc >= 1)
            taskInfo.acc -= 1;
        else
            buildThisTick = false;
    }


    if (this.cantBuild || !buildThisTick)
        return TASK_RESULT_BREAK;

    this.build(target);
    if (thisEnergy <= this.buildPower)
        return TASK_RESULT_CONTINUE;

    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskClaim = function()
{
    let taskInfo = this.currentTask;
    let targetRoom = Game.rooms[taskInfo.r];
    if (!targetRoom)
    {
        let roomMemory = Room.getMemory(taskInfo.r);
        if (roomMemory && roomMemory.controller)
        {
            let target = new RoomPosition(roomMemory.controller.x, roomMemory.controller.y, taskInfo.r);
            this.moveTo(target, { offRoad: true });
        }
        else
        {
            let target = new RoomPosition(25, 25, taskInfo.r);
            this.moveTo(target, { offRoad: true });
        }

        return;
    }

    if (this.room.name != targetRoom.name)
    {
        this.moveTo(targetRoom.controller);
        return;
    }

    let rangeToController = this.pos.getRangeTo(targetRoom.controller);
    if (rangeToController > 1)
    {
        this.moveTo(targetRoom.controller);
    }
    else
    {
        if (targetRoom.controller.reservation && targetRoom.controller.reservation.username != ME)
            this.attackController(targetRoom.controller);
        else if (targetRoom.controller.owner && !targetRoom.controller.my)
            this.attackController(targetRoom.controller);
        else
            this.claimController(targetRoom.controller);
    }
}


// res: resourceType - default to RESOURCE_ENERGY
Creep.prototype.doTaskCollect = function()
{
    let creepSpace = this.store.getFreeCapacity() - (this.gainedResourceAmount || 0) + (this.lostResourceAmount || 0);
    if (creepSpace <= 0 && !this.lostResourceAmount)
        return TASK_RESULT_COMPLETE;

    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return TASK_RESULT_COMPLETE;

    let resourceType = null;
    if (!taskInfo.res)
    {
        if (target instanceof StructureLink || target instanceof StructureTower)
            taskInfo.res = RESOURCE_ENERGY
    }

    if (taskInfo.res)
        resourceType = taskInfo.res;


    if (target.store && target.store.getUsedCapacity(taskInfo.res) <= 0)
    {
        console.log('Creep.doTaskCollect - ' + this.name + ' - ' + this.room.name + ' - ' + this.memory.mission.type + ' - found no ' + taskInfo.res + ' in ' + target);
        return TASK_RESULT_COMPLETE;
    }

    if (!this.cantTransfer)
    {
        let nextPos = this.nextMovePos;

        if (!nextPos.isEqualTo(this.pos) && nextPos.roomName == this.pos.roomName)
        {
            let delivererAhead = _.find(nextPos.lookFor(LOOK_CREEPS), c => c.my && c.hasCurrentTask({ n: 'Deliver' }) && !c.cantTransfer && c.store.getUsedCapacity(resourceType) > 0);// && c.nextMovePos.isEqualTo(this.pos));
            if (delivererAhead)
            {
                //console.log('Creep.doTaskCollect - ' + this.name + ' - taking ' + resourceType + ' from ' + delivererAhead.name);
                delivererAhead.transfer(this, resourceType);

                let delivererTask = delivererAhead.popTask();
                return TASK_RESULT_CONTINUE;
            }
        }
    }


    if (this.moveToTaskTarget(target, 1))
        return TASK_RESULT_BREAK;

    if (target.amount)
    {
        if (this.cantPickup)
            return TASK_RESULT_BREAK;

        this.pickup(target);
        return TASK_RESULT_CONTINUE;
    }
    else
    {
        if (this.cantWithdraw)
            return TASK_RESULT_BREAK;

        if (taskInfo.res)
        {
            this.withdraw(target, taskInfo.res);
            return TASK_RESULT_CONTINUE;
        }
        else
        {
            let thisSpace = this.store.getUsedCapacity();
            for (let resourceType of RESOURCES_ALL)
            {
                let targetResourceAmount = target.store.getUsedCapacity(resourceType);
                if (targetResourceAmount)
                {
                    this.withdraw(target, resourceType);
                    if (targetResourceAmount >= thisSpace)
                        return TASK_RESULT_CONTINUE;
                    else
                        return TASK_RESULT_BREAK;
                }
            }
        }
    }

    return TASK_RESULT_COMPLETE;
}

Creep.prototype.doTaskDeliver = function()
{
    let thisCarry = this.store.getUsedCapacity() + (this.gainedResourceAmount || 0) - (this.lostResourceAmount || 0);
    if (thisCarry <= 0)
        return TASK_RESULT_COMPLETE;

    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return TASK_RESULT_COMPLETE;

    let resourceType = null;
    if (taskInfo.res)
        resourceType = taskInfo.res;
    if (target.store && !(target instanceof Creep))
    {
        let targetSpace = target.store.getFreeCapacity(resourceType);
        if (targetSpace <= 0)
            return TASK_RESULT_COMPLETE;
    }

    if (!this.cantTransfer)
    {
        let nextPos = this.nextMovePos;

        if (!nextPos.isEqualTo(this.pos) && nextPos.roomName == this.pos.roomName)
        {
            //let collectorAhead = _.find(nextPos.lookFor(LOOK_CREEPS), c => c.my && (c.hasCurrentTask({ n: 'Collect' }) || c.hasCurrentTask({ n: 'Idle' })) && !c.cantTransfer && c.store.getFreeCapacity(resourceType) > 0);// && c.nextMovePos.isEqualTo(this.pos));
            let collectorAhead = _.find(nextPos.lookFor(LOOK_CREEPS), c => c.my && c.hasCurrentTask({ n: 'Collect' }) && !c.cantTransfer && c.store.getFreeCapacity(resourceType) > 0);// && c.nextMovePos.isEqualTo(this.pos));
            if (collectorAhead)
            {
                //console.log('Creep.doTaskDeliver - ' + this.name + ' - handing ' + resourceType + ' to ' + collectorAhead.name);
                this.transfer(collectorAhead, resourceType);
                collectorAhead.cantTransfer = true;

                let collectorTask = collectorAhead.popTask();

                return TASK_RESULT_CONTINUE;
            }
        }
    }

    // if (!this.cantTransfer && resourceType == RESOURCE_ENERGY)
    // {
    //     let nextPos = this.nextMovePos;
    //
    //     if (!nextPos.isEqualTo(this.pos) && nextPos.roomName == this.pos.roomName)
    //     {
    //         let delivererAhead = _.find(nextPos.lookFor(LOOK_CREEPS), c => c.my && c.hasCurrentTask({ n: 'Deliver' }) && !c.cantTransfer && c.store.getUsedCapacity(resourceType) > 0);// && c.nextMovePos.isEqualTo(this.pos));
    //         if (delivererAhead)
    //         {
    //             delivererAhead.transfer(this, RESOURCE_ENERGY);
    //             this.cantTransfer = true;
    //
    //             let delivererTask = delivererAhead.popTask();
    //             return TASK_RESULT_CONTINUE;
    //         }
    //     }
    // }


    if (this.moveToTaskTarget(target, 1))
        return TASK_RESULT_BREAK;

    if (this.cantTransfer)
        return TASK_RESULT_BREAK;

    if (taskInfo.res)
    {
        let thisResource = this.store.getUsedCapacity(resourceType);
        if (thisResource > 0)
        {
            this.transfer(target, taskInfo.res);
            if (taskInfo.targets && taskInfo.targets.length > 0)
            {
                this.shiftTaskTarget();
                return TASK_RESULT_CONTINUE_NEXT;
            }
            else
            {
                return TASK_RESULT_CONTINUE;
            }

        }
    }
    else
    {
        for (let resourceType of RESOURCES_ALL)
        {
            let thisResource = this.store.getUsedCapacity(resourceType);
            if (thisResource > 0)
            {
                this.transfer(target, resourceType);
                if (thisResource >= thisCarry)
                    return TASK_RESULT_CONTINUE;
                else
                    return TASK_RESULT_BREAK;
            }
        }
    }

    return TASK_RESULT_COMPLETE;
}

Creep.prototype.doTaskDrop = function()
{
    let thisCarry = this.store.getUsedCapacity();
    if (thisCarry <= 0)
        return TASK_RESULT_COMPLETE;

    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return TASK_RESULT_COMPLETE;

    if (this.moveToTaskTarget(target, 1))
        return TASK_RESULT_BREAK;

    let rangeTo = this.pos.getRangeTo(target);
    //console.log('Creep.doTaskDrop - ' + this.name + ' - at range ' + rangeTo);

    if (rangeTo >= 1)
    {
        if (rangeTo == 1)
        {
            let structure = _.find(target.lookFor(LOOK_STRUCTURES), object => object.structureType != STRUCTURE_ROAD);
            if (!structure)
            {
                let creep = _.first(target.lookFor(LOOK_CREEPS));
                if (creep && creep.store.getFreeCapacity() > 0)
                {
                    if (taskInfo.res)
                    {
                        this.transfer(creep, taskInfo.res);
                        return TASK_RESULT_COMPLETE;
                    }
                    else
                    {
                        for (let resourceType of RESOURCES_ALL)
                        {
                            let thisResource = this.store.getUsedCapacity(resourceType);
                            if (thisResource > 0)
                            {
                                this.transfer(creep, resourceType);
                                if (thisResource >= thisCarry)
                                    return TASK_RESULT_COMPLETE;
                                else
                                    return TASK_RESULT_BREAK;
                            }
                        }
                    }
                }
                else if (!creep)
                {
                    let site = _.first(target.lookFor(LOOK_CONSTRUCTION_SITES));
                    if (!site)
                    {
                        this.moveTo(target, { range: 0 });
                        return TASK_RESULT_BREAK;
                    }
                }
            }
        }
        else
        {
            this.moveTo(target, { range: 1 });
            return TASK_RESULT_BREAK;
        }
    }

    //console.log('Creep.doTaskDrop - ' + this.name + ' - at the spot!');

    if (taskInfo.res)
    {
        this._drop(taskInfo.res);
        return TASK_RESULT_COMPLETE;
    }
    else
    {
        for (let resourceType of RESOURCES_ALL)
        {
            let thisResource = this.store.getUsedCapacity(resourceType);
            if (thisResource > 0)
            {
                this._drop(resourceType);
                if (thisResource >= thisCarry)
                    return TASK_RESULT_COMPLETE;
                else
                    return TASK_RESULT_BREAK;
            }
        }
    }

    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskExtract = function()
{
    //return TASK_RESULT_BREAK;
    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return TASK_RESULT_COMPLETE;

    if (this.room.name != taskInfo.r)
    {
        this.moveToTaskTarget(target, 1);
        return TASK_RESULT_BREAK;
    }

    let mineral = this.room.mineral;
    let container = mineral.container;
    let extractor = mineral.extractor;

    if (!extractor || !container || !container.store)
        return TASK_RESULT_COMPLETE;

    if (this.moveToTaskTarget(container, 0))
        return TASK_RESULT_BREAK;

    let containerSpace = container.store.getFreeCapacity();
    if (containerSpace < this.harvestPower)
    {
        this.pushTask({ n: 'Idle', c: 5 });
        return TASK_RESULT_BREAK;
    }

    if (extractor.coolDown)
    {
        this.pushTask({ n: 'Idle', c: extractor.coolDown });
        return TASK_RESULT_BREAK;
    }

    this.harvest(mineral);
    this.pushTask({ n: 'Idle', c: EXTRACTOR_COOLDOWN });
    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskFlee = function()
{
    let taskInfo = this.currentTask;

    let target = null;
    if (taskInfo.t)
    {
        target = Game.getObjectById(taskInfo.t);
        if (!target)
            return TASK_RESULT_COMPLETE;
        target = target.pos;
    }
    else if (taskInfo.r)
    {
        target = new RoomPosition(taskInfo.x, taskInfo.y, taskInfo.r);
    }

    if (this.pos.getRangeTo(target) >= taskInfo.range)
        return TASK_RESULT_COMPLETE;

    //console.log('Creep.doTaskFlee - ' + this.name + ' - attempting to flee ' + target);
    this.moveTo(target, { range: taskInfo.range, flee: true });

    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskFortify = function()
{
    let thisEnergy = this.store.getUsedCapacity(RESOURCE_ENERGY);
    if (thisEnergy <= 0)
        return TASK_RESULT_COMPLETE;

    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();

    if (target)
    {
        if (this.moveToTaskTarget(target, 2))
            return TASK_RESULT_BREAK;

        if (this.pos.getRangeTo(target) == 0)
        {
            this.moveRandom();
            return TASK_RESULT_BREAK;
        }
    }

    if (this.cantBuild)
        return TASK_RESULT_BREAK;

    if (this.memory.targets)
    {
        let targets = _.filter(this.memory.targets.map(t => Game.getObjectById(t)), to => to && (to.progressTotal || (to.hits && to.hits < to.hitsMax)) && to.pos.roomName == this.room.name && to.pos.getRangeTo(this) <= 3);
        if (targets.length <= 0)
        {
            delete this.memory.targets;
        }
        else
        {
            target = _.min(targets, t => t.hits || t.progress);
            if (target.hits)
            {
                this.repair(target);
            }
            else
            {
                this.build(target);
                return TASK_RESULT_COMPLETE;
            }

            if (targets.length != this.memory.targets.length)
                this.memory.targets = targets.map(t => t.id);
        }
    }

    if (!this.memory.targets)
    {
        return TASK_RESULT_COMPLETE;
    }

    if (thisEnergy <= this.memory.work)
        return TASK_RESULT_BREAK;

    if (!taskInfo.c)
        taskInfo.c = 50;

    if (--taskInfo.c <= 0)
        return TASK_RESULT_COMPLETE;

    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskHarvest = function()
{
    let thisSpace = this.store.getFreeCapacity(RESOURCE_ENERGY);
    if (thisSpace <= 0)
        return TASK_RESULT_COMPLETE;

    //return TASK_RESULT_BREAK;
    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return TASK_RESULT_COMPLETE;

    if (this.moveToTaskTarget(target, 1))
        return TASK_RESULT_BREAK;

    this.harvest(target);
    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskIdle = function()
{
    let taskInfo = this.currentTask;

    // if (this.memory.mission.type == 'extract')
    //     this.room.visual.text(taskInfo.c, this.pos.x, this.pos.y);

    if (taskInfo.c > 0)
    {
        taskInfo.c -= 1;
        return TASK_RESULT_BREAK;
    }

    return TASK_RESULT_CONTINUE;
}

// Maybe remove, MoveTo as a task adds unnecessary complexity
Creep.prototype.doTaskMoveTo = function()
{
    let taskInfo = this.currentTask;
    let target = Game.getObjectById(taskInfo.t);
    if (target)
    {
        target = target.pos;
    }
    else
    {
        if (!taskInfo.r)
        {
            console.log('Creep.doTaskMoveTo - ' + this.name + ' x: ' + taskInfo.x + ', y: ' + taskInfo.y + ', r: ' + taskInfo.r);
            //return TASK_RESULT_BREAK;
            return TASK_RESULT_COMPLETE;
        }

        //console.log('Creep.doTaskMoveTo - ' + this.name + ' x: ' + taskInfo.x + ', y: ' + taskInfo.y + ', r: ' + taskInfo.r);
        target = new RoomPosition(taskInfo.x, taskInfo.y, taskInfo.r);
    }


    let range = 1;
    if (!_.isUndefined(taskInfo.range))
        range = taskInfo.range;

    if (this.room.name != target.roomName || this.pos.getRangeTo(target) > range)
    {
        this.moveTo(target, { range: range, offRoad: taskInfo.or });
        return TASK_RESULT_BREAK;
    }

    return TASK_RESULT_COMPLETE;
}

Creep.prototype.doTaskPave = function()
{
    let taskInfo = this.currentTask;

    //console.log('Creep.doTaskPave - ' + this.name);
    if (!this.memory.pathToPave || this.memory.pathToPave.length <= 0 || this.store.getUsedCapacity(RESOURCE_ENERGY) <= 0)
        return TASK_RESULT_COMPLETE;

    while (this.memory.pathToPave.length > 0)
    {
        let targetSpot = _.min(this.memory.pathToPave.map(p => new RoomPosition(p.x, p.y, p.roomName)), p => p.toWorldPosition().getRangeTo(this.wpos));
        let indexOfTarget = _.findIndex(this.memory.pathToPave, p => p.x == targetSpot.x && p.y == targetSpot.y && p.roomName == targetSpot.roomName);

        //console.log('Creep.doTaskPave - ' + this.name + ' - ' + targetSpot);
        while (this.memory.pathToPave.length > 0)
        {
            let interrupted = Room.inDanger(targetSpot.roomName);
            if (interrupted)
                this.memory.interrupted = 1;
            if (interrupted || targetSpot.nearEdge(0))
            {
                this.memory.pathToPave.splice(indexOfTarget, 1);
                if (this.memory.pathToPave.length > 0)
                {
                    targetSpot = _.min(this.memory.pathToPave.map(p => new RoomPosition(p.x, p.y, p.roomName)), p => p.toWorldPosition().getRangeTo(this.wpos));
                    indexOfTarget = _.findIndex(this.memory.pathToPave, p => p.x == targetSpot.x && p.y == targetSpot.y && p.roomName == targetSpot.roomName);
                }
            }
            else
            {
                break;
            }
        }

        if (this.memory.pathToPave.length <= 0)
            return TASK_RESULT_BREAK;

        if (this.memory.mission.source)
        {
            let source = Game.getObjectById(this.memory.mission.source);
            if (source)
            {
                let lair = source.lair;
                if (lair && (!lair.ticksToSpawn || lair.ticksToSpawn < 20 || ENERGY_REGEN_TIME - lair.ticksToSpawn < 5))
                {
                    if (this.wpos.getRangeTo(lair.wpos) < 10)
                        this.moveTo(lair, { range: 10, flee: true, ignoreCreeps: false });
                    return TASK_RESULT_BREAK;
                }
            }
        }

        if (this.room.name != targetSpot.roomName || this.pos.nearEdge(0))
        {
            this.moveTo(targetSpot);
            return TASK_RESULT_BREAK;
        }

        let repairPower = this.repairPower;
        let structuresAtSpot = targetSpot.lookFor(LOOK_STRUCTURES);

        let road = _.find(structuresAtSpot, object => object.structureType == STRUCTURE_ROAD);
        if (!road)
        {
            //console.log('Creep.doTaskPave - ' + this.name + ' - no road at ' + targetSpot);
            let site = _.find(targetSpot.lookFor(LOOK_CONSTRUCTION_SITES), object => object.structureType == STRUCTURE_ROAD);
            if (!site)
            {
                let result = this.room.createConstructionSite(targetSpot.x, targetSpot.y, STRUCTURE_ROAD);
                //console.log('Creep.doTaskPave - trying to create site at ' + targetSpot + ', result: ' + result);
                return TASK_RESULT_BREAK;
            }

            let rangeToSpot = this.pos.getRangeTo(targetSpot);

            if (rangeToSpot > 2)
                this.moveTo(targetSpot);

            if (rangeToSpot <= 3)
            {
                let buildThisTick = true;
                let nearestBase = Room.getNearestBase(this.room.name);
                if (nearestBase && !nearestBase.isBootstrapping())
                {
                    let baseMemory = Room.getBaseMemory(nearestBase.name);
                    let profitQuotient = Math.min(1, baseMemory.profitQuotient);

                    if (!taskInfo.acc)
                        taskInfo.acc = 0;
                    taskInfo.acc += profitQuotient;
                    taskInfo.rate = profitQuotient;
                    if (taskInfo.acc >= 1)
                        taskInfo.acc -= 1;
                    else
                        buildThisTick = false;
                }

                if (buildThisTick)
                {
                    let result = this.build(site);
                    //console.log('Creep.doTaskPave - trying to build site at ' + targetSpot + ', result: ' + result);
                }
            }

            return TASK_RESULT_BREAK;
        }
        else
        {
            if (road.hits <= road.hitsMax - repairPower)
            {
                let rangeToRoad = this.pos.getRangeTo(targetSpot);
                if (rangeToRoad > 0)
                {
                    //console.log('Creep.doTaskPave - ' + this.name + ' - moving to ' + targetSpot);
                    this.moveTo(targetSpot);
                }

                if (rangeToRoad <= 3)
                {
                    let result = this.repair(road);
                    //console.log('Creep.doTaskPave - trying to repair target at ' + targetSpot + ', result: ' + result);
                }

                return TASK_RESULT_BREAK;
            }
            else
            {
                //console.log('Creep.doTaskPave - ' + this.name + ' - splicing ' + targetSpot);
                this.memory.pathToPave.splice(indexOfTarget, 1);
                //return TASK_RESULT_BREAK;
            }
        }
    }
}

Creep.prototype.doTaskQuickFill = function()
{
    let taskInfo = this.currentTask;

    let room = Game.rooms[this.memory.mission.room];

    let standPos = null;
    let can = null;
    let otherCan = null;
    let creepNum = this.memory.n;
    if (this.memory.mission)
        creepNum = this.memory.mission.spot;
    //console.log('Creep.doTaskQuickFill - ' + this.name + ' - n: ' + creepNum);

    if (creepNum == 0)
        standPos = room.quickCreepPos1;
    else if (creepNum == 1)
        standPos = room.quickCreepPos2;
    else if (creepNum == 2)
        standPos = room.quickCreepPos3;
    else if (creepNum == 3)
        standPos = room.quickCreepPos4;

    if (!standPos)
        return TASK_RESULT_COMPLETE;

    if (this.room != room || this.pos.getRangeTo(standPos) > 0)
    {
        this.moveTo(standPos, { range: 0 });
        return TASK_RESULT_BREAK;
    }

    if (standPos.getRangeTo(room.quickCan1) <= 1)
    {
        can = room.quickCan1;
        otherCan = room.quickCan2;
    }
    else
    {
        can = room.quickCan2;
        otherCan = room.quickCan1;
    }

    let thisEnergy = this.store.getUsedCapacity(RESOURCE_ENERGY);
    if (thisEnergy <= 0)
    {
        let droppedResource = _.find(this.pos.findInRange(FIND_DROPPED_RESOURCES, 1),
                                               (object) => (object.resourceType == RESOURCE_ENERGY));

        if (droppedResource)
        {
            this.pickup(droppedResource);
            return TASK_RESULT_BREAK;
        }
    }

    let thisSpace = this.store.getFreeCapacity(RESOURCE_ENERGY);
    let thisCapacity = this.store.getCapacity();

    let quickLink = this.room.quickLink;
    let quickTower = this.room.quickTower;

    let quickThing = quickLink || quickTower;

    let canEnergy = 0;
    if (can)
        canEnergy = can.store.getUsedCapacity(RESOURCE_ENERGY);

    let otherCanEnergy = 0;
    if (otherCan)
        otherCanEnergy = otherCan.store.getUsedCapacity(RESOURCE_ENERGY);

    let quickThingEnergy = 0;
    if (quickThing)
        quickThingEnergy = quickThing.store.getUsedCapacity(RESOURCE_ENERGY);

    let towerTargetEnergy = TOWER_CAPACITY / 4;
    let canTargetEnergy = 3 * (CONTAINER_CAPACITY / 4);
    let towerTakeableEnergy = TOWER_CAPACITY - towerTargetEnergy;

    let target = this.getCurrentTaskTarget();
    if (!target || this.pos.getRangeTo(target) > 1 || !target.store || target.store.getFreeCapacity(RESOURCE_ENERGY) <= 0)
    {
        target = null;

        target = _.find(this.pos.findInRange(FIND_MY_STRUCTURES, 1),
                        (object) => ((object.structureType == STRUCTURE_SPAWN ||
                                      object.structureType == STRUCTURE_EXTENSION) &&
                                      object.store.getFreeCapacity(RESOURCE_ENERGY) > 0));

        // if (!target)
        //     return TASK_RESULT_BREAK;

        this.setCurrentTaskTarget(target);
    }

    //if (!target && ((quickTower && quickThingEnergy < TOWER_CAPACITY / 2) || (otherCan && otherCanEnergy < canEnergy - 1)))
    if (!target && quickTower && quickThingEnergy < towerTargetEnergy)
        target = quickTower;

    if (!target && quickTower && canEnergy < canTargetEnergy)
        target = can;

    if (!target && quickLink && can && canEnergy < canTargetEnergy)
        target = can;

    if (thisEnergy <= 0)
    {
        if (target && target != can && canEnergy > 0)
        {
            this.withdraw(can, RESOURCE_ENERGY);
            return TASK_RESULT_BREAK;
        }
        else if (quickTower && target != quickTower && quickThingEnergy > towerTakeableEnergy)
        {
            let amount = Math.min(thisSpace, quickThingEnergy - towerTargetEnergy);
            this.withdraw(quickTower, RESOURCE_ENERGY, amount);
            return TASK_RESULT_BREAK;
        }
        else if (quickLink && target != quickLink)
        {
            quickLink.requestEnergy();
            if (quickThingEnergy > 0)
            {
                this.withdraw(quickLink, RESOURCE_ENERGY);
                return TASK_RESULT_BREAK;
            }
        }
    }
    else if (target)
    {
        this.transfer(target, RESOURCE_ENERGY);
        return TASK_RESULT_BREAK;
    }

    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskQuit = function()
{
    return TASK_RESULT_QUIT;
}

Creep.prototype.doTaskRepair = function()
{
    //console.log('Creep.doTaskRepair - ' + this.name);
    if (!this.memory.repairables || this.memory.repairables.length <= 0 || this.store.getUsedCapacity(RESOURCE_ENERGY) <= 0)
        return TASK_RESULT_COMPLETE;

    while (this.memory.repairables.length > 0)
    {
        let targetSpot = new RoomPosition(this.memory.repairables[0].x, this.memory.repairables[0].y, this.memory.repairables[0].roomName);

        while (this.memory.repairables.length > 0 && targetSpot.nearEdge(0))
        {
            this.memory.repairables.splice(0, 1);
            targetSpot = new RoomPosition(this.memory.repairables[0].x, this.memory.repairables[0].y, this.memory.repairables[0].roomName);
        }

        if (this.memory.repairables.length <= 0)
            return;

        if (this.room.name != targetSpot.roomName)
        {
            this.moveTo(targetSpot);
            return;
        }

        let repairPower = this.memory.work * REPAIR_POWER;
        let structuresAtSpot = _.filter(targetSpot.lookFor(LOOK_STRUCTURES), object => object.structureType != STRUCTURE_WALL && object.structureType != STRUCTURE_RAMPART && object.hits && object.hits <= object.hitsMax - repairPower);
        if (structuresAtSpot.length <= 0)
        {
            //console.log('Creep.doTaskRepair - ' + this.name + ' - splicing ' + targetSpot);
            this.memory.repairables.splice(0, 1);
            continue;
        }

        let repairTarget = _.first(structuresAtSpot);
        if (repairTarget)
        {
            if (this.pos.getRangeTo(targetSpot) > 3)
            {
                //console.log('Creep.doTaskRepair - ' + this.name + ' - moving to ' + targetSpot);
                this.moveTo(targetSpot);
                return;
            }

            let result = this.repair(repairTarget);
            //console.log('Creep.doTaskRepair - trying to repair target at ' + targetSpot + ', result: ' + result);
            return;
        }
        else
        {
            this.memory.repairables.splice(0, 1);
        }
    }
}

Creep.prototype.doTaskRecycle = function()
{
    let taskInfo = this.currentTask;
    let room = Game.rooms[taskInfo.r];
    if (!room)
    {
        room = Room.getNearestBase(this.room.name);
        if (room)
            taskInfo.r = room.name;
    }

    if (!room || !room.quickCanPos2)
    {
        if (taskInfo.reason)
            console.log('Creep.doTaskRecycle - ' + this.name + ' self-retiring. Reason: ' + taskInfo.reason);
        else
            console.log('Creep.doTaskRecycle - ' + this.name + ' self-retiring.');
        this.suicide();
        return;
    }

    if (this.memory.heal && this.hitsPercent < 1)
        this.heal(this);


    if (room.storage && room.storage.my)
    {
        let thisResources = this.store.getUsedCapacity();
        if (thisResources > 0)
        {
            if (this.room != room || this.pos.getRangeTo(room.storage) > 1)
            {
                this.moveTo(room.storage);
                return;
            }
            else
            {
                for (let resourceType of RESOURCES_ALL)
                {
                    if (this.store.getUsedCapacity(resourceType) > 0)
                    {
                        this.transfer(room.storage, resourceType);
                        return;
                    }
                }
            }
        }

    }

    let quickCanPos = room.quickCanPos1;
    let rangeToCan = this.pos.getRangeTo(quickCanPos);

    // if (rangeToCan <= 1 && taskInfo.reason)
    // {
    //     this.say(taskInfo.reason, false);
    // }

    if (this.room != room || rangeToCan > 0)
    {
        this.moveTo(quickCanPos);
        return;
    }

    let thisEnergy = this.store.getUsedCapacity(RESOURCE_ENERGY);

    let target = _.first(this.pos.findInRange(FIND_MY_SPAWNS, 1));
    if (target && thisEnergy && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
    {
        //console.log('Creep.doTaskRecycle - ' + this.name + ' transfering energy to spawn ');
        this.transfer(target, RESOURCE_ENERGY);
    }
    else if (target)
    {
        let result = target.recycleCreep(this);
        if (result == OK)
        {
            if (taskInfo.reason)
            {

                console.log('Creep.doTaskRecycle - ' + this.name + ' recycling in ' + this.room.name + '. Reason: ' + taskInfo.reason);
            }
            else
            {
                console.log('Creep.doTaskRecycle - ' + this.name + ' recycling in ' + this.room.name);
            }
        }
    }
    else
    {
        if (taskInfo.reason)
            console.log('Creep.doTaskRecycle - ' + this.name + ' self-retiring in ' + this.room.name + '. Reason: ' + taskInfo.reason);
        else
            console.log('Creep.doTaskRecycle - ' + this.name + ' self-retiring in ' + this.room.name);
        this.suicide();
    }
}

Creep.prototype.doTaskReserve = function()
{
    let taskInfo = this.currentTask;
    let targetRoom = Game.rooms[taskInfo.r];
    if (!targetRoom)
    {
        let target = new RoomPosition(25, 25, taskInfo.r);
        this.moveTo(target);
        return;
    }

    if (this.room.name != targetRoom.name)
    {
        this.moveTo(targetRoom.controller);
        return;
    }

    let rangeToController = this.pos.getRangeTo(targetRoom.controller);
    if (rangeToController > 1)
    {
        this.moveTo(targetRoom.controller);
    }
    else
    {
        let nearestBase = Room.getNearestBase(this.room.name);
        let baseCount = Room.getMyBases().length;

        // if (nearestBase && nearestBase.controller.level >= 4 && this.room.sources.length > 1 && nearestBase.storage && nearestBase.storage.my && Game.gcl.level > baseCount)
        //     this.claimController(targetRoom.controller);
        // else
        if (targetRoom.controller.reservation && targetRoom.controller.reservation.username != ME)
            this.attackController(targetRoom.controller);
        else if (targetRoom.controller.owner && !targetRoom.controller.my)
            this.attackController(targetRoom.controller);
        else
            this.reserveController(targetRoom.controller);
    }
}

Creep.prototype.doTaskRetreat = function()
{
    let taskInfo = this.currentTask;
    if (this.memory[HEAL])
    {
        if (this.hits < this.hitsMax)
        {
            this.heal(this);
        }
        else
        {
            let wounded = _.min(_.filter(this.pos.findInRange(FIND_MY_CREEPS, 3), object => object.hits < object.hitsMax), object => object.hits);
            if (wounded)
            {
                let rangeToWounded = this.pos.getRangeTo(wounded.pos);
                if (rangeToWounded <= 1)
                {
                    this.heal(wounded);
                }
                else if (rangeToWounded <= 3)
                {
                    this.rangedHeal(wounded);
                }
            }
        }
    }

    let room = Game.rooms[taskInfo.r];
    if (!room)
    {
        room = Room.getNearestBase(this.room.name);
        if (room)
            taskInfo.r = room.name;
        else
            return;
    }

    if (this.room != room || this.pos.nearEdge(5))
    {
        if (taskInfo.dontIgnoreCreeps)
            this.moveTo(room.controller, { range: 1, ignoreCreeps: !taskInfo.dontIgnoreCreeps });
        else
            this.moveTo(room.controller, { range: 1 });
        return;
    }
}

Creep.prototype.doTaskSeekPortal = function()
{
    let taskInfo = this.currentTask;

    if (this.room.name != taskInfo.r)
    {
        let target = new RoomPosition(25, 25, taskInfo.r);
        this.moveTo(target, { range: 23 });
        return;
    }

    let portal = Game.getObjectById(taskInfo.t);
    if (!portal)
    {
        console.log('Creep.doTaskSeekPortal - ' + this.name + ' - ' + this.room.name + ' - cannot find portal ' + taskInfo.t + ' in room ' + taskInfo.r);
        return TASK_RESULT_QUIT;
    }

    this.moveTo(portal, { range: 0, ignoreStructures: true });

    return TASK_RESULT_BREAK;
}

Creep.prototype.doTaskUnload = function()
{
    let taskInfo = this.currentTask;
    let nearestBase = Room.getNearestBase(this.room.name);

    for (let resourceType in this.store)
    {
        let target;
        if (nearestBase)
            target = Room.getResourceDeliveryTarget(nearestBase.name, resourceType, this, true);
        if (target)
        {
            this.pushTask({ n: 'Deliver', or: true, res: resourceType }, target);
            return TASK_RESULT_CONTINUE_NEXT;
        }
        else
        {
            this._drop(resourceType);
            console.log('Creep.doTaskUnload - ' + this.name + ' - ' + this.room.name + ' - dropping ' + resourceType);
            return TASK_RESULT_BREAK;
        }
    }

    return TASK_RESULT_COMPLETE;
}

Creep.prototype.doTaskUpgrade = function()
{
    let thisEnergy = this.store.getUsedCapacity(RESOURCE_ENERGY);
    if (thisEnergy <= 0)
        return TASK_RESULT_COMPLETE;

    let taskInfo = this.currentTask;
    let target = this.getCurrentTaskTarget();
    if (!target)
        return TASK_RESULT_COMPLETE;

    if (this.moveToTaskTarget(target, 3))
        return TASK_RESULT_BREAK;

    this.upgradeController(target);
    if (thisEnergy <= this.upgradePower)
        return TASK_RESULT_COMPLETE;

    return TASK_RESULT_BREAK;
}
