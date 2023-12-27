'use strict'

// w4rl0ck 26 April 2017 at 23:41

Object.defineProperty(Mineral.prototype, "memory",
{
    configurable: true,
    get()
    {
        if (_.isUndefined(this.room.memory))
        {
            this.room.memory = {};
        }

        if (this.mineralType === 'T')
        {
            if (_.isUndefined(this.room.memory.thorium))
            {
                let thisMemory = {};
    
                thisMemory.id = this.id;
    
                thisMemory.x = this.pos.x;
                thisMemory.y = this.pos.y;
    
                thisMemory.type = this.mineralType;
    
                thisMemory.os = this.pos.getOpenSpotCount();
    
                if (!this.room.controller)
                {
                    let keeperLair = this.pos.findClosestByRange(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_KEEPER_LAIR } } );
                    if (keeperLair)
                        thisMemory.l = keeperLair.id;
                }
    
                //console.log('Source.memory - setting memory for source ' + this.id);
    
                this.room.memory.thorium = thisMemory;
            }

            if (this.room.memory.thorium)
                this.room.memory.thorium.amount = this.mineralAmount;

            return (this.room.memory.thorium = this.room.memory.thorium || {});
        }
        else
        {
            if (_.isUndefined(this.room.memory.mineral))
            {
                let thisMemory = {};
    
                thisMemory.id = this.id;
    
                thisMemory.x = this.pos.x;
                thisMemory.y = this.pos.y;
    
                thisMemory.type = this.mineralType;
    
                thisMemory.os = this.pos.getOpenSpotCount();
    
                if (!this.room.controller)
                {
                    let keeperLair = this.pos.findClosestByRange(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_KEEPER_LAIR } } );
                    if (keeperLair)
                        thisMemory.l = keeperLair.id;
                }
    
                //console.log('Source.memory - setting memory for source ' + this.id);
    
                this.room.memory.mineral = thisMemory;
            }

            if (this.room.memory.mineral)
                this.room.memory.mineral.amount = this.mineralAmount;

            return (this.room.memory.mineral = this.room.memory.mineral || {});
        }

    },
    set(value)
    {
        if (_.isUndefined(this.room.memory))
        {
            this.room.memory = {};
        }

        this.room.memory.mineral = value;
    }
});

Object.defineProperty(Mineral.prototype, "container",
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

Object.defineProperty(Mineral.prototype, "containerPos",
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

Object.defineProperty(Mineral.prototype, "extractor",
{
    configurable: true,
    get()
    {
        let memory = this.memory;
        if (!memory)
            return null;

        let extractor = null;
        if (memory.e)
            extractor = Game.getObjectById(memory.e);
        if (!extractor)
        {
            extractor = _.find(this.room.lookForAt(LOOK_STRUCTURES, this.pos), object => object.structureType == STRUCTURE_EXTRACTOR);
            this.extractor = extractor;
        }
        return extractor;
    },
    set(value)
    {
        let memory = this.memory;
        if (!memory)
            return;

        if (!value)
        {
            delete memory.e;
        }
        else
        {
            memory.e = value.id;
        }
    }
});

Object.defineProperty(Mineral.prototype, "lair",
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

Mineral.getMaxResourceInPerTick = function(roomName, id)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.mineral)
        return 0;

    let harvesters = _.filter(Room.getJobCreeps(roomName, 'extract_' + id), c => !c.spawning);

    let creepMaxHarvest = (_.sum(harvesters.map(c => c.memory.work)) || 0) / (EXTRACTOR_COOLDOWN + 1);

    return Math.max(creepMaxHarvest, 0);
}

Mineral.prototype.getNearbyResourceCount = function()
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