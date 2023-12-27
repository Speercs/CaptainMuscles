'use strict'

const constants = require('constants');

let Room_Program = require('program_room');

class Base extends Room_Program
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        this.baseMemory = Room.getBaseMemory(this.data.room);
        if (!this.baseMemory)
        {
            if (!Memory.empire.bases)
                Memory.empire.bases = {};

            this.baseMemory = { startTick: Game.time, ticksToLevel: {} };

            if (!Memory.empire.bases[this.data.room])
                Memory.empire.bases[this.data.room] = this.baseMemory;
        }
    }

    start()
    {
        super.start();

        // delete this.memory.demolish;

        this.launchChildProcess(`spawner`, 'base_spawner', { room: this.data.room });
        this.launchChildProcess(`defend`, 'mission_defend', { room: this.data.room });
        this.launchChildProcess(`accounting`, 'base_accounting', { room: this.data.room });
        this.launchChildProcess(`planner`, 'base_planner', { room: this.data.room });

        // Force recheck of level dependant missions if we restart
        delete this.baseMemory.level;

        this.baseMemory.baseCountChanged = 1;
    }

    end()
    {
        super.end();

        if (Memory.empire && Memory.empire.bases && Memory.empire.bases[this.data.room])
            delete Memory.empire.bases[this.data.room];
    }

    run()
    {
        super.run();

        if (!this.room || !this.room.isMyBase())
        {
            console.log('Base.run - ' + this.data.room + ' - is no longer a base. Ending process.');
            return this.suicide();
        }

        let powerSpawn = this.room.powerSpawn;

        if (powerSpawn && Room.getResourceAmountLevel(this.room.name, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_LOW)
        {
            let powerSpawnPower = powerSpawn.store.getUsedCapacity(RESOURCE_POWER);
            let powerSpawnEnergy = powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY);

            if (powerSpawnPower >= 1 && powerSpawnEnergy >= POWER_SPAWN_ENERGY_RATIO)
                powerSpawn.processPower();
        }

        //console.log('Base.run - ' + this.data.room + ' - executing');

        let flagName = 'claim_' + this.data.room;
        if (Game.flags[flagName])
            Game.flags[flagName].remove();

        this.countTicks();
        this.updateMissions();

        this.handleUnclaim();

        if (this.data.updateTime)
            delete this.data.updateTime;

        if (!this.baseMemory.updateTime || this.baseMemory.updateTime < (Game.time - 100))
        {
            this.baseMemory.updateTime = Game.time;
            this.slowUpdate();
        }
    }

    updateMissions()
    {
        if (this.baseMemory.baseCountChanged)
        {
            this.findNeighbors();
            delete this.baseMemory.shipTarget;
            delete this.baseMemory.baseCountChanged;
        }

        let controllerLevel = this.room.controller.level;
        if (controllerLevel != this.baseMemory.level)
        {
            this.baseMemory.level = controllerLevel;
            this.onControllerLevelChanged(controllerLevel);
        }

        // let paveable = (!this.room.isBootstrapping() && this.room.controller.level >= 4 && this.room.storage && this.room.storage.my);

        // if (paveable)
        // {
        //     //this.launchChildProcess('pave', 'mission_pave', { room: this.data.room, source: 0, targetRoom: 0 });

        //     let sources = this.room.sources;
        //     // for (let source of sources)
        //     //     this.launchChildProcess(`pave_${source.id}`, 'mission_pave', { room: this.data.room, source: source.id, targetRoom: 0 });

        //     if (this.baseMemory.neighbors)
        //     {
        //         // for (let neighborName of this.baseMemory.neighbors)
        //         //     this.launchChildProcess(`pave_${neighborName}`, 'mission_pave', { room: this.data.room, source: 0, targetRoom: neighborName });
        //     }
        // }

        this.selectShipTarget();
    }

    handleUnclaim()
    {
        if (!Room.isUnclaiming(this.data.room))
            return;

        if (this.room.storage && this.room.storage.store.getUsedCapacity() <= 0)
        {
            this.room.storage.destroy();

            let towers = this.room.towers;
            for (let tower of towers)
                tower.destroy();

            let extensions = this.room.extensions;
            if (extensions)
            {
                for (let extension of extensions)
                    extension.destroy();
            }
        }

        let resourceSum = _.sum(Room.getStoredResourceAmounts(this.data.room))

        //console.log('Program_Base.handleUnclaim - ' + this.data.room + ' - resourceSum: ' + resourceSum);

        if (resourceSum < 1000)
        {
            let myStructures = this.room.find(FIND_STRUCTURES);
            let finalResult = OK;
            for (let structure of myStructures)
            {
                let result = structure.destroy();
                if (result != OK)
                {
                    finalResult = result;
                    break;
                }
            }

            if (finalResult == OK)
            {
                let sites = this.room.find(FIND_CONSTRUCTION_SITES);
                for (let site of sites)
                {
                    let result = site.remove();
                    if (result != OK)
                    {
                        finalResult = result;
                        break;
                    }
                }

                if (finalResult == OK)
                {
                    console.log('Program_Base.handleUnclaim - ' + this.data.room + ' - unclaiming');
                    this.room.controller.unclaim();
                    unclaimFlag.remove();
                }
            }
        }
    }

    selectShipTarget()
    {
        delete this.baseMemory.shipTarget;

        if (!this.room.terminal || !this.room.terminal.my || this.room.controller.level < 6)
            return;

        //let neighbors = this.baseMemory.neighbors.map(nn => Game.rooms[nn]);
        let neighbors = Room.getMyBases().filter(b => b.name != this.room.name && global.realDistanceBetweenRooms(this.room.name, b.name) <= global.MAX_REMOTE_RANGE);
        neighbors = _.filter(neighbors, n => (n.controller.level < 8 && n.controller.level >= 6 && n.terminal && n.terminal.my));

        if (neighbors.length <= 0)
            return;

        // let targetNeighbors = neighbors.filter(n => n.controller.level == 6);
        // if (targetNeighbors.length <= 0)
        //     targetNeighbors = neighbors.filter(n => n.controller.level == 7);

        //let bestNeighbor = _.max(targetNeighbors, n => n.controller.progress);

        // if (this.room.controller.level < 8 && (this.room.controller.level < bestNeighbor.controller.level || (this.room.controller.level == bestNeighbor.controller.level && this.room.controller.progress > bestNeighbor.controller.progress)))
        //     return;

        let bestNeighbor = _.min(neighbors, n => (n.controller.progressTotal - n.controller.progress) / Math.max(n.memory.score.total, 0.1));
        //let bestNeighbor = _.max(neighbors, n => Math.max(n.memory.score.total, 1));
        //if (this.room.controller.level < 8 && this.room.controller.progressTotal - this.room.controller.progress < bestNeighbor.controller.progressTotal - bestNeighbor.controller.progress)
        //    return;
        this.baseMemory.shipTarget = bestNeighbor.name;
    }

    onControllerLevelChanged(controllerLevel)
    {
        if (controllerLevel >= 3)
        {
            //this.launchChildProcess(`fill_towers`, 'mission_fill_towers', { room: this.data.room });
        }

        // if (controllerLevel >= 4)
        // {
        //     this.launchChildProcess(`fortify`, 'mission_fortify', { room: this.data.room });
        // }

        if (controllerLevel >= 6)
        {
            //this.launchChildProcess(`extract`, 'mission_extract', { room: this.data.room, mineral: this.room.mineral.id });
            //this.launchChildProcess(`collect_${this.room.mineral.id}`, 'mission_collect', { room: this.data.room, source: this.room.mineral.id });
            this.launchChildProcess(`terminal`, 'base_terminal', { room: this.data.room });
            this.launchChildProcess(`labs`, 'base_labs', { room: this.data.room });
        }

        if (controllerLevel >= 7)
        {
            this.launchChildProcess(`factory`, 'base_factory', { room: this.data.room });
        }

        if (controllerLevel >= 8)
        {
            this.launchChildProcess(`observer`, 'base_observer', { room: this.data.room });
        }
    }

    countTicks()
    {
        let controller = this.room.controller;
        if (this.baseMemory.ticksToLevel && !this.baseMemory.ticksToLevel[controller.level])
        {
            let now = Game.time;
            let ticksToLevelInfo = { time: Game.time };
            if (controller.level == 1 || !this.baseMemory.ticksToLevel[controller.level - 1])
            {
                ticksToLevelInfo.ticks = 0;
                ticksToLevelInfo.total = 0;
            }
            else
            {
                ticksToLevelInfo.ticks = now - this.baseMemory.ticksToLevel[controller.level - 1].time;
                if (this.baseMemory.ticksToLevel[1])
                    ticksToLevelInfo.total = now - this.baseMemory.ticksToLevel[1].time;
                else
                    ticksToLevelInfo.total = ticksToLevelInfo.ticks;
            }

            this.baseMemory.ticksToLevel[controller.level] = ticksToLevelInfo;
        }

        // if (this.baseMemory.ticksToLevel)
        // {
        //     for (let level in this.baseMemory.ticksToLevel)
        //     {
        //         let y = this.displayLine + 0.2;
        //         this.displayLine += 1;
        //
        //         this.room.visual.text(level                                , 1, y, {align: 'left', opacity: 0.5});
        //         this.room.visual.text(this.baseMemory.ticksToLevel[level].total, 5, y, {align: 'left', opacity: 0.5});
        //     }
        //      this.displayLine += 2;
        // }
    }

    findNeighbors()
    {
        let nearbyRoomNames = Room.getRoomNamesInRangeFloodFill(this.data.room, global.MAX_SEARCH_RANGE, true, true);
        let nearbyBaseNames = _.filter(nearbyRoomNames, rn => rn != this.data.room && Room.isMyBase(rn));
        let nearbyBaseCountsByRange = _.countBy(nearbyBaseNames, rn => global.civilianRouteLength(this.data.room, rn));

        //console.log('Base.findNeighbors - ' + this.data.room + ' - finding neighbors - ' + JSON.stringify(nearbyBaseCountsByRange));

        this.baseMemory.neighbors = [];

        for (let i = 1; i <= global.MAX_SEARCH_RANGE; ++i)
        {
            if (nearbyBaseCountsByRange[i])
            {
                let closestBaseNames = _.filter(nearbyBaseNames, rn => global.civilianRouteLength(this.data.room, rn) == i);
                this.baseMemory.neighbors = closestBaseNames;
                //console.log('Base.findNeighbors - ' + this.data.room + ' - ' + JSON.stringify(closestBaseNames));
                break;
            }
        }

    }

    slowUpdate()
    {
        this.checkCombatBoostAmount();
        
        let couldAttack = this.baseMemory.canAttack;

        if (couldAttack && this.baseMemory.minCombatBoostLevel <= constants.RESOURCE_LEVEL_LOW)
            this.baseMemory.canAttack = false;
        else if (!couldAttack && this.baseMemory.minCombatBoostLevel >= constants.RESOURCE_LEVEL_NORMAL)
            this.baseMemory.canAttack = true;

        if (couldAttack != this.baseMemory.canAttack)
            console.log("Program_Base.slowUpdate - " + this.data.room + " - canAttack: " + this.baseMemory.canAttack);
    }

    checkCombatBoostAmount()
    {
        let boosts = 
           [RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
            RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
            RESOURCE_CATALYZED_ZYNTHIUM_ACID,
            RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
            RESOURCE_CATALYZED_KEANIUM_ALKALIDE];

        this.baseMemory.minCombatBoostLevel = constants.RESOURCE_LEVEL_EXCESS;
        let boostTotal = 0;
        let desiredBoostTotal = 0;

        for (let boost of boosts)
        {
            let boostLevel = Room.getResourceAmountLevel(this.data.room, boost);
            if (boostLevel < this.baseMemory.minCombatBoostLevel)
                this.baseMemory.minCombatBoostLevel = boostLevel;

            boostTotal += Room.getStoredResourceAmount(this.data.room, boost);
            desiredBoostTotal += Room.getDesiredResourceAmount(this.data.room, boost);
        }

        this.baseMemory.combatBoostAmount = boostTotal / desiredBoostTotal;
    }
}

module.exports = Base;
