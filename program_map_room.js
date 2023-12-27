'use strict'

const constants = require('constants');
const util_transforms = require('util_transforms');
const { fromRoomPosition } = require('./WorldPosition');

const maxAccessWait = 20;

const drawDebugInfo = false;

class Program_Map_Room extends kernel.process
{
    constructor (...args)
    {
        super(...args);
    }

    refresh()
    {
        this.flag = Game.flags['mapRoom_' + this.data.room];
        if (this.flag)
        {
            this.flag.memory.pid = this.id;
            if (!this.flag.memory.accessTime)
                this.flag.memory.accessTime = Game.time;
        }

        this.room = Game.rooms[this.data.room]
    }

    start()
    {
        super.start();
        
        console.log('Program_Map_Room.start - mapping: ' + this.data.room);
    }

    end()
    {
        console.log('Program_Map_Room.end - no longer mapping: ' + this.data.room);
        if (this.flag)
            this.flag.remove();
        
        super.end();
    }

    run()
    {
        super.run();

        //return this.suicide();
        
        if (!this.flag)
            return this.suicide();

        if (Game.time - this.flag.memory.accessTime > maxAccessWait)
            return this.suicide();

        let roomMemory = Room.getMemory(this.data.room);
        if ((roomMemory && roomMemory.hostiles) || Room.isEnemyBase(this.data.room) || !this.flag.memory.hostileTime)
            this.flag.memory.hostileTime = Game.time;
        else if (Game.time - this.flag.memory.hostileTime > maxAccessWait)
            return this.suicide();

        if (!this.room)
            return;

        this.buildMaps();
        
        // let squadCostMatrix = this.getSquadFormationCostMatrix();
        // util_transforms.drawCostMatrix(squadCostMatrix, this.data.room, 100, true);

        if (!this.room.damageMap)
            this.buildDamageMap();

        if (drawDebugInfo || Game.flags.draw)
            util_transforms.drawTransform(this.room.damageMap, this.data.room, this.flag.memory.damageMax, false);
    }

    // Build maps ------------------------------------------------------

    buildMaps()
    {
        if (!this.flag.memory.exitAccess)
            this.buildExitAccessMaps();
    }

    buildDamageMap()
    {
        if (this.room.damageMap && this.flag.memory.damageTime >= Game.time)
            return;

        //console.log('Program_Map_Room.buildDamageMap - ' + this.data.room);
        
        let towers = this.room.towers.filter(t => !t.my && t.killOnSight() && t.store.getUsedCapacity(RESOURCE_ENERGY) >= TOWER_ENERGY_COST && (!this.room.controller || t.isActive()));

        let damageMax = 0;
        let damageMap = {};

        //console.log('Program_Map_Room.buildDamageMap - ' + this.data.room + ' - towers: ' + towers.length);

        if (towers.length > 0)
        {
            for (var i = 0; i < 50; ++i)
            {
                damageMap[i] = {};
                for (var j = 0; j < 50; ++j)
                {
                    let damage = 0;
                    for (let tower of towers)
                        damage += tower.estimatedDamageAtPosition(new RoomPosition(i, j, this.data.room))

                    damageMap[i][j] = damage;

                    if (damage > damageMax)
                        damageMax = damage;
                }
            }
        }

        let damageTotal = damageMax;

        let enemyCreeps = _.filter(this.room.find(FIND_HOSTILE_CREEPS), c => c.attackInCombat());

        for (let creep of enemyCreeps)
        {
            let creepRanged = creep.partCountBoosted(RANGED_ATTACK);
            if (creepRanged)
            {
                let rangedDamageMultiplier = 3;
                let maxRange = 4;
                let maxRangeDamage = maxRange + 1;
                for (var i = -maxRange; i <= maxRange; ++i)
                {
                    let ex = creep.pos.x + i;
                    if (ex < 0 || ex > 49)
                        continue;

                    if (!damageMap[ex])
                        damageMap[ex] = {};

                    for (var j = -maxRange; j <= maxRange; ++j)
                    {
                        let wy = creep.pos.y + j;
                        if (wy < 0 || wy > 49)
                            continue;

                        let damage = creepRanged * RANGED_ATTACK_POWER * rangedDamageMultiplier;
                        let damageRange = maxRangeDamage - creep.pos.getRangeTo(ex, wy);
                        damage *= damageRange / maxRange;
                        if (damageMap[ex][wy])
                            damage += damageMap[ex][wy];
                        damageMap[ex][wy] = damage;

                        damageTotal += damage;

                        if (damage > damageMax)
                            damageMax = damage;
                    }
                }
            }

            let creepAttack = creep.partCountBoosted(ATTACK);
            if (creepAttack)
            {
                let maxRange = 2;
                for (var i = -maxRange; i <= maxRange; ++i)
                {
                    let ex = creep.pos.x + i;
                    if (ex < 0 || ex > 49)
                        continue;

                    if (!damageMap[ex])
                        damageMap[ex] = {};

                    for (var j = -maxRange; j <= maxRange; ++j)
                    {
                        let wy = creep.pos.y + j;
                        if (wy < 0 || wy > 49)
                            continue;

                        let damage = creepAttack * RANGED_ATTACK_POWER;
                        if (damageMap[ex][wy])
                            damage += damageMap[ex][wy];
                        damageMap[ex][wy] = damage;

                        damageTotal += damage;

                        if (damage > damageMax)
                            damageMax = damage;
                    }
                }
            }
        }

        this.room.damageMap = damageMap;
        this.flag.memory.damageMax = damageMax;
        this.flag.memory.damageTotal = damageTotal;
        this.flag.memory.damageTime = Game.time;
    }

    buildExitAccessMaps()
    {
        this.flag.memory.exitAccess = {};

        let blockers = this.room.find(FIND_STRUCTURES, { filter: s => !s.my && ((s.structureType == STRUCTURE_RAMPART && !s.isPublic) || s.structureType == STRUCTURE_WALL) }).map(s => s.pos);

        let exits = Game.map.describeExits(this.flag.pos.roomName);
        for (let exitDirection in exits)
            this.flag.memory.exitAccess[exitDirection] = this.buildExitAccessMap(exitDirection, blockers);
    }

    buildExitAccessMap(exitDirection, blockers)
    {
        let transform = util_transforms.outsideBaseTransform(this.data.room, blockers, exitDirection);
        let mapString = "";
        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                let value = Math.max(0, Math.floor(transform[i][j]));
                let index = (i * 50) + j;
                mapString = mapString.concat(value);
            }
        }

        return mapString;
    }

    buildSquadAccessMap()
    {
        console.log('Program_Map_Room.buildSquadAccessMap - ' + this.data.room);
        
        let obstructionTransform = util_transforms.distanceFromObstructionTransform(this.data.room);
        let swampTransform = util_transforms.distanceFromSwampTransform(this.data.room);
        let costMatrix = new PathFinder.CostMatrix;

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                let cost = 0;
                if (obstructionTransform[i][j] == 0 || obstructionTransform[i][j] == 1)
                    cost += 10;
                if (swampTransform[i][j] == 1)
                    cost += 8;

                if (cost > 0)
                    costMatrix.set(i, j, cost);
            }
        }

        this.flag.memory.squadAccess = costMatrix.serialize();
        this.flag.squadAccess = costMatrix;
    }
    // ------------------------------------------------------

    drawMap(exitDirection)
    {
        if (!this.flag.memory.exitAccess[exitDirection])
            return;

        util_transforms.drawString(this.flag.memory.exitAccess[exitDirection], this.data.room, 1, true)
    }

    getBaseTerrainValue(terrain, i, j)
    {
        let terrainHere = terrain.get(i, j);
        if (terrainHere == TERRAIN_MASK_WALL)
            return 255;
        if (terrainHere == TERRAIN_MASK_SWAMP)
            return 10;
        return 2;
    }

    getCombatCostMatrix(healPower, doFormationPlan)
    {
        if (!this.room)
            return null;

        this.flag.memory.accessTime = Game.time;

        if (!this.room.combatCostMatrix)
            this.room.combatCostMatrix = this.generateCombatCostMatrix(healPower, doFormationPlan);

        return this.room.combatCostMatrix;
    }

    generateCombatCostMatrix(healPower, doFormationPlan)
    {
        let room = this.flag.room;
        if (!room)
            return null;

        let isMyBase = room.isMyBase();

        let additionalDamageCost = 30;
        let additionalStructureCost = 100;
        let squadAccessMultiplier = 4;
        let additionalCreepCost = 0;

        let terrain = Game.map.getRoomTerrain(room.name);

        let costMatrix = new PathFinder.CostMatrix;

        let structures = room.find(FIND_STRUCTURES);
        // if (isMyBase)
        //     structures = structures.filter(s => s.structureType === STRUCTURE_ROAD);

        let thisProcess = this;
        let thisFlag = this.flag;

        if (structures.length > 0)
        {
            let maxHits = _.max(structures, s => s.hits).hits;

            structures.forEach(function(struct)
            {
                if (!struct.attackInCombat() && struct.blocksMovement())
                {
                    costMatrix.set(struct.pos.x, struct.pos.y, 255);
                    return;
                }

                if (costMatrix.get(struct.pos.x, struct.pos.y) == 255)
                    return;

                let value = costMatrix.get(struct.pos.x, struct.pos.y) || /*(struct.structureType === STRUCTURE_ROAD) ? 1 : 0 ||*/ thisProcess.getBaseTerrainValue(terrain, struct.pos.x, struct.pos.y);

                let additionalValue = 0;
                
                if ((struct.structureType === STRUCTURE_WALL || (struct.owner && !struct.my)) && struct.hits)
                    additionalValue = Math.max(1, (struct.hits / maxHits) * additionalStructureCost);

                if (additionalValue > 0)
                    value = Math.min(255, value + additionalValue);
                
                costMatrix.set(struct.pos.x, struct.pos.y, value);
            });    
        }

        let creeps = room.find(FIND_CREEPS);
        for (let creep of creeps)
        {
            let maxRange = 1;
            for (var i = -maxRange; i <= maxRange; ++i)
            {
                let ex = creep.pos.x + i;
                if (ex < 0 || ex > 49)
                    continue;
                for (var j = -maxRange; j <= maxRange; ++j)
                {
                    let wy = creep.pos.y + j;
                    if (wy < 0 || wy > 49)
                        continue;

                    if (i == 0 && j == 0 && !creep.attackInCombat())
                    {
                        costMatrix.set(ex, wy, 255);
                        continue;
                    }

                    let value = costMatrix.get(ex, wy) || thisProcess.getBaseTerrainValue(terrain, ex, wy);
                    value = Math.min(255, value + additionalCreepCost);
                    
                    costMatrix.set(ex, wy, value);
                }
            }

            
        }

        if (this.flag.memory.damageMax > 0)
        {
            let squadFormationMatrix = thisProcess.getSquadFormationCostMatrix();
            for (var i = 0; i < 50; ++i)
            {
                for (var j = 0; j < 50; ++j)
                {
                    let value = costMatrix.get(i, j) || thisProcess.getBaseTerrainValue(terrain, i, j);
                    if (value >= 250)
                        continue;

                    let additionalValue = 0;
                    if (doFormationPlan)
                        additionalValue += squadFormationMatrix.get(i, j) * squadAccessMultiplier;
                    if (thisFlag.memory.damageMax > 0)
                        additionalValue += (thisProcess.getDamageAt({x: i, y: j}) / this.flag.memory.damageMax) * additionalDamageCost;

                    if (additionalValue > 0)
                        value = Math.min(255, value + additionalValue);
                    
                    costMatrix.set(i, j, value);
                }
            }
        }

        if (drawDebugInfo || Game.flags.draw)
            util_transforms.drawCostMatrix(costMatrix, room.name, 255, true);

        return costMatrix;
    }

    getDamageAt(position)
    {
        if (!this.room)
            return 0;

        this.flag.memory.accessTime = Game.time;

        if (!this.room.damageMap)
            this.buildDamageMap();

        if (!this.room.damageMap[position.x])
            return 0;
        if (!this.room.damageMap[position.x][position.y])
            return 0;

        return this.room.damageMap[position.x][position.y];
    }

    getSquadFormationCostMatrix()
    {
        this.flag.memory.accessTime = Game.time;

        if (!this.flag.memory.squadAccess)
            this.buildSquadAccessMap();

        if (!this.flag.squadAccess)
            this.flag.squadAccess = PathFinder.CostMatrix.deserialize(this.flag.memory.squadAccess);

        return this.flag.squadAccess;
    }

    squadFormationPossibleAt(position)
    {
        this.getSquadFormationCostMatrix();
        return (this.flag.squadAccess.get(position.x, position.y) > 1);
    }

    objectIsAccessible(from, to)
    {
        if (!this.flag.memory.exitAccess)
            return false;

        this.flag.memory.accessTime = Game.time;

        //console.log('Program_Map_Room.objectIsAccessible - ' + this.flag.pos.roomName + ' - checking from: ' + from.pos + ', to: ' + to.pos);
        let exits = Game.map.describeExits(this.flag.pos.roomName);
        for (let exitDirection in exits)
        {
            let map = this.flag.memory.exitAccess[exitDirection];
            let fromIndex = (from.pos.x * 50) + from.pos.y;
            let toIndex = (to.pos.x * 50) + to.pos.y;
            if (map && map[fromIndex] == map[toIndex])
                return true;
        }

        return false;
    }
}

module.exports = Program_Map_Room;
