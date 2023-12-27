'use strict'

const constants = require('constants');

class Program_Power_Creep extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        this.priority = global.PROCESS_PRIORITY_POWER_CREEPS;

        //console.log('Program_Power_Creep.constructor - executing');
    }

    refresh()
    {
        super.refresh();

        if (!Memory.powerCreeps)
            Memory.powerCreeps = {};
        if (!Memory.powerCreeps[this.data.creep])
            Memory.powerCreeps[this.data.creep] = {};
        this.memory = Memory.powerCreeps[this.data.creep];
        this.creep = Game.powerCreeps[this.data.creep];

        this.flag = Game.flags[this.data.flag];
        if (this.flag)
            this.room = Game.rooms[this.flag.pos.roomName];
        else
            this.room = null;
    }

    start()
    {
        console.log('************Program_Power_Creep.start - starting power creep process');
        
        super.start();
        if (this.memory)
            this.memory.pid = this.id;
    }

    end()
    {
        console.log('************Program_Power_Creep.end - ending power creep process');

        super.end();

        if (this.isAlive())
            this.creep.suicide();
    }

    run()
    {
        super.run();

        if (!this.flag || !this.creep)
            return this.suicide();

        // if (!this.flag.room)
        // {
        //     this.flag.destroy();
        //     return this.suicide();
        // }

        if (this.spawn())
            return;

        this.generateOps();

        if (this.avoidNuke())
            return;

        if (this.renew())
            return;
            
        // if (this.goHome())
        //     return;

        if (this.enableController(this.flag.room.name))
            return;

        if (this.storeContents())
            return;

        if (this.regenSource())
            return;

        if (this.retrieveOps())
            return;

        if (this.operateExtension())
            return;
            
        if (this.operateSpawn())
            return;

        if (this.operateFactory())
            return;

        if (this.operateStorage())
            return;

        if (this.operateLabs())
            return;
            
        if (this.regenOuterSource())
            return;
            
        if (this.goHome())
            return;
    }

    isAlive()
    {
        return !!this.creep && !!this.creep.ticksToLive;
    }

    isHome()
    {
        return (this.creep.room.name == this.flag.room.name);
    }

    spawn()
    {
        if (!this.isAlive())
        {
            let nearestBaseWithPowerSpawn = Room.getNearestBaseFiltered(this.flag.pos.roomName, r => r.controller.level >= 7 && r.powerSpawn);
            if (!nearestBaseWithPowerSpawn)
            {
                console.log('************Program_Power_Creep.spawn - cannot spawn power creep: ' + this.data.creep + ', for room: ' + this.flag.pos.roomName);
                this.flag.remove();
                this.suicide();
                return true;
            }

            if (!this.creep.spawnCooldownTime || this.creep.spawnCooldownTime <= Date.now())
            {
                console.log('************Program_Power_Creep.spawn - spawning power creep: ' + this.data.creep + ', in room: ' + nearestBaseWithPowerSpawn.name + ', for room: ' + this.flag.pos.roomName);
                this.creep.spawn(nearestBaseWithPowerSpawn.powerSpawn);
            }
                

            return true;
        }

        return false;
    }

    unspawn()
    {
        if (this.isAlive())
        {
            this.creep.suicide();
            return true;
        }

        return false;
    }

    hasOpsForPower(powerName)
    {
        if (!POWER_INFO || !POWER_INFO[powerName])
        {
            console.log('Program_Power_Creep.hasOpsForPower - ' + this.creep.name + ' - ' + this.creep.pos + ' - cannot find power info for ' + powerName);
            return false;
        }

        let powerInfo = POWER_INFO[powerName];
        if (!powerInfo.ops)
            return true;

        return (this.creep.store.getUsedCapacity(RESOURCE_OPS) >= powerInfo.ops);
    }
    
    goHome()
    {
        if (this.isHome())
            return false;
            
        this.creep.moveTo(this.flag.pos);
        return true;
    }

    enableController(roomName)
    {
        let room = Game.rooms[roomName];
        if (!room || !room.controller || room.controller.isPowerEnabled)
            return false;

        if (this.creep.room.name == room.name)
            this.creep.room.visual.line(this.creep.pos, room.controller.pos);

        if (this.creep.wpos.getRangeTo(room.controller.wpos) > 1)
        {
            this.creep.moveTo(room.controller);
            return true;
        }

        this.creep.enableRoom(room.controller);
        return true;
    }

    avoidNuke()
    {
        if (this.creep.memory.avoidNukeUntil)
        {
            if (Game.time > this.creep.memory.avoidNukeUntil)
            {
                delete this.creep.memory.avoidNukeUntil;
                delete this.creep.memory.nukeRoom;
                return false;
            }

            if (this.creep.room.name == this.creep.memory.nukeRoom)
            {
                let nearestExit = this.creep.pos.findClosestByRange(FIND_EXIT);
                this.creep.moveTo(nearestExit);
                return true;
            }

            if (this.creep.pos.nearEdge(5))
            {
                this.creep.moveTo(new RoomPosition(25, 25, this.creep.pos.roomName), { range: 19 });
                return true;
            }

            return true;
        }

        let nukes = this.creep.room.find(FIND_NUKES);
        if (nukes.length > 0)
        {
            let nukesLandingSoon = nukes.filter(n => n.timeToLand < 100);
            
            if (nukesLandingSoon.length > 0)
            {
                let leastSoonNuke = _.max(nukesLandingSoon, n => n.timeToLand);
                let endTime = Game.time + leastSoonNuke.timeToLand + 5;
                this.creep.memory.avoidNukeUntil = endTime;
                this.creep.memory.nukeRoom = this.creep.room.name;
                return true;
            }
        }
    }

    renew()
    {
        if (this.creep.ticksToLive > 500)
            return false;
            
        let target = this.creep.room.powerSpawn;
        if (!target)
        {
            let nearestBaseWithPowerSpawn = Room.getNearestBaseFiltered(this.creep.room.name, r => r.controller.level >= 7 && r.powerSpawn);
            if (!nearestBaseWithPowerSpawn)
                return false;
                
            target = (nearestBaseWithPowerSpawn.powerSpawn);
        }

        if (!target)
            return false;

        if (this.creep.pos.getRangeTo(target) > 1)
        {
            this.creep.moveTo(target);
            return true;
        }

        if (this.creep.renew(this.creep.room.powerSpawn) != OK)
            return true;

        return false;
    }

    storeContents()
    {
        if (this.creep.store.getFreeCapacity() > this.creep.store.getUsedCapacity())
            return false;

        let target = (this.creep.room.storage || this.creep.room.terminal);
        if (!target)
            return false;

        if (this.creep.pos.getRangeTo(target) > 1)
        {
            this.creep.moveTo(target);
            return true;
        }

        for (let resource of constants.RESOURCES_ALL_REVERSED)
        {
            let minAmount = 0;
            if (resource == RESOURCE_OPS)
                minAmount = 100;
            let heldAmount = this.creep.store.getUsedCapacity(resource);
            let amountToStore = heldAmount - minAmount;

            if (amountToStore > 0)
            {
                this.creep.transfer(target, resource, amountToStore);
                return true;
            }
        }

        return false;
    }

    retrieveOps()
    {
        let opsAmount = this.creep.store.getUsedCapacity(RESOURCE_OPS);
        let opsDesiredAmount = 100;
        let opsPickupAmount = opsDesiredAmount - opsAmount;

        if (opsPickupAmount <= 0)
            return false;

        let target = Room.getResourceStorageTarget(this.creep.room.name, RESOURCE_OPS, this.creep, opsPickupAmount, true, true);
        if (!target)
            return false;

        if (this.creep.pos.getRangeTo(target) > 1)
        {
            this.creep.moveTo(target);
            return true;
        }

        this.creep.withdraw(target, RESOURCE_OPS, opsPickupAmount);

        return false;
    }

    generateOps()
    {
        if (this.creep.ticksToLive <= 100)
            return false;

        let powerInfo = this.creep.powers[PWR_GENERATE_OPS];
        if (!powerInfo || powerInfo.cooldown > 0)
            return false;

        this.creep.usePower(PWR_GENERATE_OPS);
        return true;
    }

    regenSource()
    {
        let powerInfo = this.creep.powers[PWR_REGEN_SOURCE];
        if (!powerInfo)
            return false;
            
        if (!this.room)
            return false;

        let unboostedSources = this.room.find(FIND_SOURCES, { filter: s => s.getRegenPowerTicksRemaining() <= this.creep.wpos.getManhattanDist(s.wpos) });
        if (unboostedSources.length <= 0)
            return false;

        let target = _.min(unboostedSources, s => this.creep.pos.getRangeTo(s));

        this.creep.room.visual.line(this.creep.pos, target.pos);

        if (this.creep.pos.getRangeTo(target) > 3)
        {
            this.creep.moveTo(target);
            return true;
        }

        if (powerInfo.cooldown || target.getRegenPowerTicksRemaining())
            return true;

        this.creep.usePower(PWR_REGEN_SOURCE, target);
    }
    
    regenOuterSource()
    {
        let powerInfo = this.creep.powers[PWR_REGEN_SOURCE];
        if (!powerInfo)
            return false;
            
        let nearbyRooms = Room.getRoomNamesInRangeFloodFill(this.creep.room.name, 1, false, false);
        let sourcesNearby = [];
        
        for (let roomName of nearbyRooms)
        {
            let room = Game.rooms[roomName];
            if (!room || (room.controller && !room.controller.owner && !room.controller.reservation))
                continue;

            let roomMemory = Room.getMemory(roomName);
            if (!roomMemory || (!room.controller && !roomMemory.clear))
                continue;
            
            sourcesNearby = sourcesNearby.concat(room.sources);
        }
        
        sourcesNearby = sourcesNearby.filter(s => s.getRegenPowerTicksRemaining() <= this.creep.wpos.getManhattanDist(s.wpos));
        
        if (sourcesNearby.length <= 0)
            return false;
            
        let target = _.min(sourcesNearby, s => this.creep.wpos.getManhattanDist(s.wpos));
        
        if (this.enableController(target.room.name))
            return true;
            
        this.creep.room.visual.line(this.creep.pos, target.pos);
        
        if (this.creep.wpos.getRangeTo(target.wpos) > 3)
        {
            this.creep.moveTo(target);
            return true;
        }

        if (powerInfo.cooldown || target.getRegenPowerTicksRemaining())
            return true;

        this.creep.usePower(PWR_REGEN_SOURCE, target);
    }

    operateLabs()
    {
        let powerInfo = this.creep.powers[PWR_OPERATE_LAB];
        if (!powerInfo || powerInfo.cooldown > 10)
            return false;
            
        if (!this.room || !this.room.isMyBase())
            return false;

        if (!this.room.structures[STRUCTURE_LAB])
            return false;

        let unboostedLabs = _.filter(this.room.structures[STRUCTURE_LAB], l => l.getWantsBoost() && l.getOperateLabPowerTicksRemaining() <= this.creep.wpos.getManhattanDist(l.wpos));
        if (unboostedLabs.length <= 0)
            return false;

        let target = _.min(unboostedLabs, s => this.creep.pos.getRangeTo(s));

        this.creep.room.visual.line(this.creep.pos, target.pos);

        if (this.creep.pos.getRangeTo(target) > 3)
        {
            this.creep.moveTo(target);
            return true;
        }

        if (powerInfo.cooldown)
            return true;

        if (!this.hasOpsForPower(PWR_OPERATE_LAB))
            return true;

        this.creep.usePower(PWR_OPERATE_LAB, target);

        return false;
    }

    operateStorage()
    {
        let powerInfo = this.creep.powers[PWR_OPERATE_STORAGE];
        if (!powerInfo)
            return false;

        if (!this.room || !this.room.isMyBase())
            return false;

        if (!this.room.storage || !this.room.storage.my)
            return false;

        let target = (this.room.storage);
        if (!target)
            return false;

        if (target.getEffectTicksRemaining(PWR_OPERATE_STORAGE) > 0)
            return false;

        if (target.store.getFreeCapacity() / target.store.getCapacity() > 0.01)
            return false;

        this.creep.room.visual.line(this.creep.pos, target.pos);

        if (this.creep.pos.getRangeTo(target) > 3)
        {
            this.creep.moveTo(target);
            return true;
        }

        if (powerInfo.cooldown)
            return true;

        if (!this.hasOpsForPower(PWR_OPERATE_STORAGE))
            return true;

        this.creep.usePower(PWR_OPERATE_STORAGE, target);

        return false;
    }

    operateExtension()
    {
        let powerInfo = this.creep.powers[PWR_OPERATE_EXTENSION];
        if (!powerInfo)
            return false;
            
        if (!this.room || !this.room.isMyBase())
            return false;

        let potentialTargets = [];
        if (this.room.containers)
            potentialTargets = potentialTargets.concat(this.room.containers);
        if (this.room.terminal)
            potentialTargets.push(this.room.terminal);
        if (this.room.storage)
            potentialTargets.push(this.room.storage);

        potentialTargets = potentialTargets.filter(o => o.store.getUsedCapacity(RESOURCE_ENERGY) > 0);

        if (potentialTargets.length <= 0)
            return false;

        let target = _.max(potentialTargets, o => o.store.getUsedCapacity(RESOURCE_ENERGY));
        if (!target)
            return false;

        let energyNeededPercent = 1.0 - (this.room.energyAvailable / this.room.energyCapacityAvailable);
        let powerNeeded = (energyNeededPercent >= powerInfo.level * 0.2);

        if (!powerNeeded)
        {
            let spawns = this.room.find(FIND_MY_SPAWNS);
            for (let spawn of spawns)
            {
                if (spawn.memory && spawn.memory.energyDesired && spawn.memory.energyDesired <= this.room.energyCapacityAvailable && spawn.memory.energyDesired > this.room.energyAvailable)
                {
                    powerNeeded = true;
                    break;
                }
            }
        }

        if (!powerNeeded)
            return false;

        this.creep.room.visual.line(this.creep.pos, target.pos);

        if (this.creep.pos.getRangeTo(target) > 3)
        {
            this.creep.moveTo(target);
            return true;
        }

        if (powerInfo.cooldown)
            return true;

        if (!this.hasOpsForPower(PWR_OPERATE_EXTENSION))
            return true;

        this.creep.usePower(PWR_OPERATE_EXTENSION, target);

        return false;
    }
    
    operateSpawn()
    {
        let powerInfo = this.creep.powers[PWR_OPERATE_SPAWN];
        if (!powerInfo || powerInfo.cooldown > 10)
            return false;
            
        if (!this.room || !this.room.isMyBase())
            return false;

        if (this.room.energyAvailable < this.room.energyCapacityAvailable)
            return false;
            
        let spawns = this.room.spawns;
        if (spawns.length <= 0)
            return false;
            
        for (let spawn of spawns)
        {
            if (spawn.getEffectTicksRemaining(PWR_OPERATE_SPAWN) || !spawn.spawning)
                continue;
                
            this.creep.room.visual.line(this.creep.pos, spawn.pos);

            if (this.creep.pos.getRangeTo(spawn) > 3)
            {
                this.creep.moveTo(spawn);
                return true;
            }
    
            if (powerInfo.cooldown)
                return true;
    
            if (!this.hasOpsForPower(PWR_OPERATE_SPAWN))
                return true;
    
            this.creep.usePower(PWR_OPERATE_SPAWN, spawn);
            return false;
        }

        return false;
    }

    operateFactory()
    {
        let powerInfo = this.creep.powers[PWR_OPERATE_FACTORY];
        if (!powerInfo || powerInfo.cooldown > 10)
            return false;
            
        if (!this.room || !this.room.isMyBase())
            return false;

        let factory = this.room.factory;
        let factoryMemory = Room.getBaseFactoryMemory(this.room.name);

        if (!factory || !factoryMemory || factory.getEffectTicksRemaining(PWR_OPERATE_FACTORY) || (factory.level && factory.level != powerInfo.level))
            return false;

        if (factory.level && factory.level == powerInfo.level && !factoryMemory.needsEffect)
            return false;

        this.creep.room.visual.line(this.creep.pos, factory.pos);

        if (this.creep.pos.getRangeTo(factory) > 3)
        {
            this.creep.moveTo(factory);
            return true;
        }

        if (powerInfo.cooldown)
            return true;

        if (!this.hasOpsForPower(PWR_OPERATE_FACTORY))
            return true;

        this.creep.usePower(PWR_OPERATE_FACTORY, factory);

        return false;
    }
}

module.exports = Program_Power_Creep
