'use strict'

// w4rl0ck 26 April 2017 at 23:41

Object.defineProperty(Source.prototype, "memory",
{
    configurable: true,
    get()
    {
        if (_.isUndefined(this.room.memory))
        {
            this.room.memory = {};
        }
        if (_.isUndefined(this.room.memory.sources))
        {
            this.room.memory.sources = {};
        }

        if (_.isUndefined(this.room.memory.sources[this.id]))
        {
            let thisMemory = {};

            thisMemory.x = this.pos.x;
            thisMemory.y = this.pos.y;

            thisMemory.os = this.pos.getOpenSpotCount();

            this.room.memory.sources[this.id] = thisMemory;

            if (!this.room.controller)
            {
                let keeperLair = this.pos.findClosestByRange(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_KEEPER_LAIR } } );
                if (keeperLair)
                    this.lair = keeperLair;
            }

            //console.log('Source.memory - setting memory for source ' + this.id);


        }

        return this.room.memory.sources[this.id];
    },
    set(value)
    {
        throw new Error("Could not set source memory");
        // if (_.isUndefined(this.room.memory))
        // {
        //     this.room.memory = {};
        // }
        // if (_.isUndefined(this.room.memory.sources))
        // {
        //     this.room.memory.sources = {};
        // }
        // // if (!_.isObject(Memory.structure))
        // // {
        // //     throw new Error("Could not set structure memory");
        // // }
        // this.room.memory.sources[this.id] = value;
    }
});

Object.defineProperty(Source.prototype, "container",
{
    configurable: true,
    get()
    {
        let memory = this.memory;
        let container = null;
        if (memory && memory.c)
        {
            container = Game.getObjectById(memory.c);
            if (!container)
                delete memory.c;
        }

        if (!container)
        {
            container = _.find(this.room.lookForAtArea(LOOK_STRUCTURES, this.pos.y - 1, this.pos.x - 1, this.pos.y + 1, this.pos.x + 1, true), object => object.structure.structureType == STRUCTURE_CONTAINER);
            if (container && container.structure)
                this.container = container.structure;
        }

        return container
    },
    set(value)
    {
        let memory = this.memory;
        if (!memory)
            return;

        if (!value)
        {
            delete memory.c;
        }
        else
        {
            memory.c = value.id;
            this.containerPos = value.pos;
        }
    }
});

Object.defineProperty(Source.prototype, "containerPos",
{
    configurable: true,
    get()
    {
        let memory = this.memory;
        if (!memory || !memory.cx)
            return null;
        else
            return new RoomPosition(memory.cx, memory.cy, this.room.name);
    },
    set(value)
    {
        let memory = this.memory;
        if (!memory)
            return;

        if (!value)
        {
            delete memory.cx;
            delete memory.cy;
        }
        else
        {
            memory.cx = value.x;
            memory.cy = value.y;
        }
    }
});

Object.defineProperty(Source.prototype, "lair",
{
    configurable: true,
    get()
    {
        let memory = this.memory;
        let lair = null;
        if (memory && memory.l)
            lair = Game.getObjectById(memory.l);

        return lair
    },
    set(value)
    {
        let memory = this.memory;
        if (!memory)
            return;

        if (!value)
            delete memory.l;
        else
            memory.l = value.id;
    }
});

Object.defineProperty(Source.prototype, "link",
{
    configurable: true,
    get()
    {
        let memory = this.memory;
        let link = null;
        if (memory && memory.li)
        {
            link = Game.getObjectById(memory.li);
            if (!link)
                delete memory.li;
        }

        if (!link)
        {
            link = _.find(this.room.lookForAt(LOOK_STRUCTURES, this.linkPos), object => object.structureType == STRUCTURE_LINK);
            this.link = link;
        }

        return link
    },
    set(value)
    {
        let memory = this.memory;
        if (!memory)
            return;

        if (!value)
            delete memory.li;
        else
            memory.li = value.id;
    }
});

Object.defineProperty(Source.prototype, "linkPos",
{
    configurable: true,
    get()
    {
        let memory = this.memory;
        if (!memory || !memory.lx)
            return null;
        else
            return new RoomPosition(memory.lx, memory.ly, this.room.name);
    },
    set(value)
    {
        let memory = this.memory;
        if (!memory)
            return;

        if (!value)
        {
            delete memory.lx;
            delete memory.ly;
        }
        else
        {
            memory.lx = value.x;
            memory.ly = value.y;
        }
    }
});

Source.getHarvesterDistanceToArrive = function(roomName, sourceId)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.sources || !roomMemory.sources[sourceId])
        return 0;

    let harvesters = Room.getJobCreeps(roomName, 'harvest_' + sourceId);
    let harvesterWithDTA = harvesters.find(h => h.currentTask && h.currentTask.n == 'task_harvester' && h.currentTask.dta);
    if (!harvesterWithDTA)
        return 0;

    return harvesterWithDTA.currentTask.dta;
}

Source.getAverageCarryNeeded = function(roomName, sourceId)
{
    let energyPerTick = Source.getAverageEnergyInPerTick(roomName, sourceId);
    if (energyPerTick <= 0)
        return 0;

    let harvesters = Room.getJobCreeps(roomName, 'harvest_' + sourceId);
    let harvesterWithDTA = harvesters.find(h => h.currentTask && h.currentTask.n == 'task_harvester' && h.currentTask.dta);
    if (!harvesterWithDTA)
        return 0;

    let haulingDistance = harvesterWithDTA.currentTask.dta * 2;
    let amountToHaul = haulingDistance * energyPerTick;
    return amountToHaul;
}

Source.getAverageEnergyInPerTick = function(roomName, sourceId)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.sources || !roomMemory.sources[sourceId])
        return 0;

    let sourceMemory = roomMemory.sources[sourceId];
    let sourcePos = new RoomPosition(sourceMemory.x, sourceMemory.y, roomName);

    let harvesters = Room.getJobCreeps(roomName, 'harvest_' + sourceId);
    //let harvesters = _.filter(Room.getJobCreeps(roomName, 'harvest_' + sourceId), c => !c.spawning && c.room.name == roomName && c.pos.getRangeTo(sourcePos) <= 1);

    let sourceMaxEnergy = SOURCE_ENERGY_CAPACITY;
    let rechargeTime = ENERGY_REGEN_TIME;
    if (!roomMemory.controller)
        sourceMaxEnergy = SOURCE_ENERGY_KEEPER_CAPACITY;
    else if (!roomMemory.controller.o && !roomMemory.controller.r)
        sourceMaxEnergy = SOURCE_ENERGY_NEUTRAL_CAPACITY;

    let sourceEnergyPerTick = (sourceMaxEnergy / rechargeTime);
    let creepMaxHarvest = (_.sum(harvesters.map(c => c.harvestPower)) || 0);

    let source = Game.getObjectById(sourceId);
    if (source)
        sourceEnergyPerTick += source.getRegenPowerExtraEnergyPerTick();

    if (!sourceMemory.c && !sourceMemory.li)
    {
        sourceEnergyPerTick -= harvesters.length;
        creepMaxHarvest -= harvesters.length
    }

    // let visual = new RoomVisual(roomName);
    // visual.text(sourceEnergyPerTick.toFixed(0), sourceMemory.x, sourceMemory.y, { opacity: 0.5 });

    return Math.max(Math.min(sourceEnergyPerTick, creepMaxHarvest), 0);
}

Source.getMaxEnergyInPerTick = function(roomName, sourceId)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.sources || !roomMemory.sources[sourceId])
        return 0;

    let sourceMemory = roomMemory.sources[sourceId];
    let sourcePos = new RoomPosition(sourceMemory.x, sourceMemory.y, roomName);

    let harvesters = Room.getJobCreeps(roomName, 'harvest_' + sourceId);
    //let harvesters = _.filter(Room.getJobCreeps(roomName, 'harvest_' + sourceId), c => !c.spawning && c.room.name == roomName && c.pos.getRangeTo(sourcePos) <= 1);

    let creepMaxHarvest = (_.sum(harvesters.map(c => c.harvestPower)) || 0);

    if (!sourceMemory.c && !sourceMemory.li)
        creepMaxHarvest -= harvesters.length;

    return Math.max(creepMaxHarvest, 0);
}

Source.prototype.getRegenPowerExtraEnergyPerTick = function()
{
    if (!this.effects || this.effects.length <= 0)
        return 0;

    let effectInfo = _.find(this.effects, e => e.effect == PWR_REGEN_SOURCE);
    if (!effectInfo)
        return 0;

    let extraEnergy = POWER_INFO[PWR_REGEN_SOURCE].effect[effectInfo.level - 1] / POWER_INFO[PWR_REGEN_SOURCE].period;

    //console.log('Source.getRegenPowerExtraEnergyPerTick - ' + this.pos + ' - ' + extraEnergy);

    return extraEnergy;
}

Source.prototype.getRegenPowerTicksRemaining = function()
{
    if (!this.effects || this.effects.length <= 0)
        return 0;

    let effectInfo = _.find(this.effects, e => e.effect == PWR_REGEN_SOURCE);
    if (!effectInfo)
        return 0;

    return effectInfo.ticksRemaining;
}

Source.prototype.getNearbyResourceCount = function()
{
    // if (this.container && this.container.store)
    // {
    //     delete this.memory.rs;
    //     delete this.memory.rct;
    //     return this.container.store.getUsedCapacity();
    // }

    if (this.memory.rs)
    {
        if (Game.time - this.memory.rct < 20)
            return this.memory.rs;
    }

    let nearbyResources = this.lookForInRange(LOOK_RESOURCES, 1);
    nearbyResources = nearbyResources.concat(this.lookForInRange(LOOK_STRUCTURES, 1, s => s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0));
    nearbyResources = nearbyResources.concat(this.lookForInRange(LOOK_TOMBSTONES, 1, s => s.store.getUsedCapacity() > 0 ));

    let resourceSum = _.sum(nearbyResources, nr => { if (nr.store) return nr.store.getUsedCapacity(); return nr.amount; } );

    this.memory.rs = resourceSum;
    this.memory.rct = Game.time;

    return resourceSum;
}
