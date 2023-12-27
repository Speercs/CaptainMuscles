'use strict'

const constants = require('constants');

global.creepTypeIds =
{
    'move':     0,
    'carry':    1,
    'work':     2,
    'worry':    3,
    'warry':    4,
    'worky':    5,
    'transfer': 6,
    'reserve':  7,
    'claim':    8,
    'attack':   9,
    'ranged':   10,
    'heal':     11,
    'destroy':  12,
    'defend':   13,
    'front' :   14,
    'back'  :   15,
    'ranged_boosted' : 16,
    'commando':  17,
    'harvester': 18,
    'assaulter': 19,
    'reactor_fill' : 20,
    'fast_work' : 21,
};

class Base_Spawner extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base_Spawner.constructor - ' + this.data.room + ' - executing');
        this.frequency = 3;
    }

    sleep(tickCount)
    {
        let spawns = this.room.spawns;
        if (spawns.length > 0)
        {
            let spawn = spawns[0];
            spawn.room.visual.text(tickCount, spawn.pos.x, spawn.pos.y + .2, {opacity: 0.5, stroke: '#000000'});
            //console.log('Base_Spawner.sleep - ' + this.data.room + ' - ' + this.id + ' - sleeping for ' + tickCount);
        }

        return super.sleep(tickCount);
    }

    refresh()
    {
        super.refresh();

        // if (!Memory.spawns)
        //     Memory.spawns = {};
        //
        // if (!Memory.spawns[this.data.spawn])
        //     Memory.spawns[this.data.spawn] = {};
        //
        // this.memory = Memory.spawns[this.data.spawn];
        // this.spawn = Game.spawns[this.data.spawn];
        // if (this.spawn)
        //     this.room = this.spawn.room;
        this.room = Game.rooms[this.data.room];
    }

    run()
    {
        // if (this.data.spawn == 'Spawn11')
        //     console.log('Base_Spawner.run - ' + this.data.spawn + ' - executing');

        if (this.data.spawn)
        {
            console.log('Base_Spawner.run - ' + this.data.spawn + ' - ending old spawn process.');
            return this.suicide();
        }

        if (!this.room)
        {
            console.log('Base_Spawner.run - ' + this.data.room + ' - room not found');
            return;
        }

        let spawns = this.room.spawns.filter(s => s.my);
        let minSpawnTimeRemaining = Infinity;

        let spawningCount = 0;

        let energyAvailable = this.room.energyCapacityAvailable;
        if (this.room.find(FIND_MY_CREEPS).length < this.room.controller.level || Room.getStoredResourceAmount(this.room.name, RESOURCE_ENERGY) <= 0)
        {
            energyAvailable = this.room.energyAvailable;
        }
        else if (this.room.isPowerCreepActive(PWR_OPERATE_EXTENSION, 3))
        {
            let spawnEnergyCapacity = _.sum(spawns, s => s.store.getCapacity(RESOURCE_ENERGY));
            energyAvailable -= spawnEnergyCapacity;
        }
        
        for (let spawn of spawns)
        {
            if (spawn.memory.renew && spawn.memory.renew.length > 0)
            {
                this.doSpawnRenew(spawn);
                spawningCount += 1;
                minSpawnTimeRemaining = Math.min(minSpawnTimeRemaining, 3);
                continue;
            }

            let result = this.runSpawn(spawn, energyAvailable);
            if (result)
                return this.sleep((CREEP_SPAWN_TIME * spawns.length) - 1);

            if (spawn.spawning)
            {
                spawningCount += 1;
                if (spawn.spawning.remainingTime < minSpawnTimeRemaining)
                    minSpawnTimeRemaining = spawn.spawning.remainingTime;
            }
        }

        if (spawningCount >= spawns.length)
        {
            if (minSpawnTimeRemaining < Infinity && minSpawnTimeRemaining > 0)
                return this.sleep(minSpawnTimeRemaining - 1);

            if (minSpawnTimeRemaining >= Infinity)
                return this.sleep((CREEP_SPAWN_TIME * spawns.length) - 1);
        }

        return this.sleep((CREEP_SPAWN_TIME * spawns.length) - 1);
    }

    doSpawnRenew(spawn)
    {
        spawn.memory.renew = spawn.memory.renew.filter(cn => Game.creeps[cn] && Game.creeps[cn].hasTask({ n: 'task_renew', t: spawn.id }));

        // Cant do this here since we dont run every tick
        // if (spawn.spawning)
        //     return;

        // let renewableCreeps = spawn.memory.renew.map(cn => Game.creeps[cn]).filter(c => spawn.room.name == c.room.name && spawn.pos.getRangeTo(c.pos) <= 1);
        // if (renewableCreeps.length <= 0)
        //     return;

        // let creepToRenew = _.min(renewableCreeps, c => c.ticksToLive);
        // let result = spawn.renewCreep(creepToRenew);
        // if (result == OK)
        //     delete creepToRenew.memory.boosts;
    }

    runSpawn(spawn, energyAvailable)
    {
        delete spawn.memory.energyDesired;

        let baseMemory = Room.getBaseMemory(this.data.room);

        if (!spawn.spawning && (!baseMemory.spawnTick || Game.time - baseMemory.spawnTick >= CREEP_SPAWN_TIME))
        {
            // if (global.AVERAGE_CPU_PERCENT > 0.75 && Game.cpu.bucket < constants.CPU_BUCKET_SIZE * 0.75)
            //     return;

            let result = this.spawnForJobHome(this.data.room, spawn, energyAvailable);

            if (result)
                return result;

                
            if (this.room.energyAvailable < this.room.energyCapacityAvailable && (!this.room.hasMyStorageOrTerminal() || Room.getResourceAmountLevel(this.data.room, RESOURCE_ENERGY) < constants.RESOURCE_LEVEL_LOW))
                return false;

            let doRemote = true;
            if (!this.room.hasMyStorageOrTerminal())// || Room.getResourceAmountLevel(this.data.room, RESOURCE_ENERGY) < constants.RESOURCE_LEVEL_LOW)
                doRemote = false;

            if (doRemote)
            {
                result = this.spawnForJob(this.data.room, global.REMOTE_SEARCH_RANGE, spawn, true, true, energyAvailable);
                if (result)
                    return result;
            }

            result = this.spawnForJob(this.data.room, global.SPAWN_SEARCH_RANGE , spawn, true, false, energyAvailable);
            if (result)
                return result;
        }
        else if (spawn.spawning && spawn.spawning.remainingTime == 0)
        {
            let creepsNearby = spawn.pos.lookForInRange(LOOK_CREEPS, 1, c => c.my);
            if (creepsNearby.length > 0)
            {
                for (let creep of creepsNearby)
                {
                    if (creep.hasTask())
                    {
                        creep.pushTaskProgram('flee', 'task_flee',  { creep: creep.name, x: spawn.pos.x, y: spawn.pos.y, r: spawn.pos.roomName, range: 3 }, true);
                    }
                    else
                    {
                        creep.move(Math.ceil(Math.random() * 8) + 1);
                    }
                }
            }
        }

        return false;
    }

    spawnForJobHome(roomName, spawn, energyAvailable)
    {
        let desiredSpawn = Room.getDesiredSpawn(roomName, spawn, true, false, spawn.room);
        if (!desiredSpawn)
            return false;

        let partList = desiredSpawn.partList;
        if (!partList)
            partList = this.getPartListForJobByType(spawn, roomName, energyAvailable, desiredSpawn.type, desiredSpawn.maxParts, desiredSpawn.boosts);

        if (desiredSpawn.type == 'assaulter')
            console.log('Base_Spawner.spawnForJobHome - ' + this.data.room + ' considering partlist: ' + partList + ' for ' + desiredSpawn.type);
        

        if (partList.length <= 0)
            return false;

        //console.log('Base_Spawner.spawnForJobHome - ' + roomName + ' - got partList - ' + JSON.stringify(partList));

        if (desiredSpawn.minParts)
        {
            let relevantPartCount = this.relevantPartCount(desiredSpawn.type, partList);
            if (relevantPartCount < desiredSpawn.minParts)
                return false;
        }

        //console.log('Base_Spawner.spawnForJobHome - ' + roomName + ' - have enough relevantParts');

        // let idleCreepOfType = _.find(spawn.room.find(FIND_MY_CREEPS), c => c.memory.type == desiredSpawn.type && c.isIdle());
        // if (idleCreepOfType)
        // {
        //     console.log('Base_Spawner.spawnForJobHome - ' + roomName + ' - have idle creeps of type ' + desiredSpawn.type);
        //     return false;
        // }
            

        //let idleCreepsOfType = _.filter(Game.creeps, c => c.room.name == this.data.room && c.memory.type == desiredSpawn.type && c.isIdle());
        // if (idleCreepsOfType.length > 0)
        //     return false;
        //
        // console.log('Base_Spawner.spawnForJobHome - ' + roomName + ' - no idle ' + desiredSpawn.type + ' found in ' + this.data.room);

        let cost = global.calculatePartListCost(partList);
        if (this.room.energyCapacityAvailable < cost)
            return false;

        
        if (this.room.energyAvailable < cost)
        {
            // if (!this.room.isPowerCreepActive(PWR_OPERATE_EXTENSION, 3))
            //     return false;

            console.log('Base_Spawner.spawnForJobHome - ' + this.data.room + ' waiting for ' + cost + ' energy for ' + desiredSpawn.type);

            spawn.memory.energyDesired = cost;
            return 3;
        }

        return this.trySpawnCreepForJob(spawn, roomName, desiredSpawn, partList, cost);
    }

    spawnForJob(roomName, range, spawn, skipHome, isRemote, energyAvailable)
    {
        //console.log('Base_Spawner.spawnForJob - ' + roomName + ' - range: ' + range + ' - checking ---------------');
        let desiredSpawnCheck = Room.getDesiredSpawnInRange(roomName, range, spawn, skipHome, isRemote);

        let desiredSpawn = null;
        let nextSpawn = desiredSpawnCheck.next();
        while (nextSpawn.value)
        {
            desiredSpawn = nextSpawn.value;
            if (desiredSpawn.type)
            {
                if (desiredSpawn.type == 'back')
                    console.log('Base_Spawner.spawnForJob - ' + this.data.room + ' want to spawn ' + desiredSpawn.type + ' for ' + desiredSpawn.jobType);

                let partList = desiredSpawn.partList;
                if (!partList)
                    partList = this.getPartListForJobByType(spawn, roomName, energyAvailable, desiredSpawn.type, desiredSpawn.maxParts, desiredSpawn.boosts);

                if (desiredSpawn.type == 'assaulter')
                    console.log('Base_Spawner.spawnForJob - ' + this.data.room + ' considering partlist: ' + partList + ' for ' + desiredSpawn.type);

                if (partList.length <= 0)
                {
                    nextSpawn = desiredSpawnCheck.next();
                    continue;
                }

                if (desiredSpawn.minParts && this.relevantPartCount(desiredSpawn.type, partList) < desiredSpawn.minParts)
                {
                    nextSpawn = desiredSpawnCheck.next();
                    continue;
                }

                if (!desiredSpawn.swarm)
                {
                    let idleCreepOfType = _.find(spawn.room.find(FIND_MY_CREEPS), c => c.memory.type == desiredSpawn.type && c.isIdle());
                    if (idleCreepOfType)
                    {
                        //console.log('Base_Spawner.spawnForJob - ' + roomName + ' - have idle creeps of type ' + desiredSpawn.type);
                        nextSpawn = desiredSpawnCheck.next();
                        continue;
                    }
                }
                

                // let idleCreepsOfType = _.filter(Game.creeps, c => c.room.name == this.data.room && c.memory.type == desiredSpawn.type && c.isIdle());
                // if (idleCreepsOfType.length > 0)
                // {
                //     nextSpawn = desiredSpawnCheck.next();
                //     continue;
                // }

                let cost = global.calculatePartListCost(partList);
                if (this.room.energyCapacityAvailable < cost)
                {
                    nextSpawn = desiredSpawnCheck.next();
                    continue;
                }
                if (this.room.energyAvailable < cost)// && this.room.isPowerCreepActive(PWR_OPERATE_EXTENSION, 3))
                {
                    spawn.memory.energyDesired = cost;
                    return 3;
                }

                if (this.room.energyAvailable < cost)
                {
                    // if (!this.room.isPowerCreepActive(PWR_OPERATE_EXTENSION, 3))
                    // {
                    //     nextSpawn = desiredSpawnCheck.next();
                    //     continue;
                    // }

                    spawn.memory.energyDesired = cost;
                    return 3;
                }

                let result = this.trySpawnCreepForJob(spawn, roomName, desiredSpawn, partList, cost);
                if (result)
                {
                    return result;
                }
            }

            nextSpawn = desiredSpawnCheck.next();
        }

        desiredSpawnCheck.return();

        return false;
    }

    trySpawnCreepForJob(spawn, roomName, desiredSpawn, partList, cost)
    {
        let partCount = _.countBy(partList);
        let partCountString = '';
        for (let partType of constants.BODYPARTS)
        {
            let count = (partCount[partType] || 0);
            partCountString = partCountString.concat(global.letters[count]);
        }

        let creepMemory = { ...partCount };
        creepMemory.b = partCountString;
        creepMemory.type = desiredSpawn.type;
        creepMemory.spawnRoom = this.room.name;
        creepMemory.parts = partList.length;

        if (creepMemory.claim)
            creepMemory.costPerTick = cost / CREEP_CLAIM_LIFE_TIME;
        else
            creepMemory.costPerTick = cost / CREEP_LIFE_TIME;

        creepMemory.costPerTick = creepMemory.costPerTick.toFixed(2);

        creepMemory.job = { type: desiredSpawn.jobType, id: desiredSpawn.jobId, task: desiredSpawn.task.name, room: desiredSpawn.room };
        if (desiredSpawn.task.source)
            creepMemory.job.source = desiredSpawn.task.source;

        let creepName = this.nameCreep(Game.shard.name, spawn, desiredSpawn.type);

        let result = this.spawnCreep(spawn, desiredSpawn.type, creepName, partList, cost, creepMemory);

        if (result == OK)
        {
            console.log('Base_Spawner.trySpawnCreepForJob - ' + spawn.room.name + ' - ' + spawn.name + ' spawning ' + creepName + ' with parts ' + JSON.stringify(partCount) + ' for task ' + desiredSpawn.task.name + ' - ' + desiredSpawn.room);

            Memory.creeps[creepName] = creepMemory;

            let sleepTime = partList.length * CREEP_SPAWN_TIME;

            if (spawn.effects && spawn.effects.length > 0)
            {
                
                let effectInfo = _.find(spawn.effects, e => e.effect == PWR_OPERATE_SPAWN);
                if (effectInfo)
                {
                    let timeReduction = POWER_INFO[PWR_OPERATE_SPAWN].effect[effectInfo.level - 1];
                    sleepTime *= timeReduction

                    console.log('Base_Spawner.trySpawnCreepForJob - ' + spawn.room.name + ' - ' + spawn.name + ' spawning ' + creepName + ' with parts ' + JSON.stringify(partCount) + ' for task ' + desiredSpawn.task.name + ' - ' + desiredSpawn.room + ' - sleepTime: ' + sleepTime);
                }
            }
        
            kernel.scheduler.launchProcess('creep', { name: creepName, sleep: sleepTime });

            let baseMemory = Room.getBaseMemory(this.data.room);
            baseMemory.spawnTick = Game.time;

            Room.addCreepToJob(desiredSpawn.room, desiredSpawn.jobType, desiredSpawn.jobId, creepName, creepMemory.job);

            let desiredBoosts = desiredSpawn.boosts;
            if (desiredBoosts && desiredBoosts.length > 0)
            {
                let boostRequests = [];
                //console.log('**********Base_Spawner.trySpawnCreepForJob - ' + this.room.name + ' - ' + creepName + ' desiredBoosts: ' + JSON.stringify(desiredBoosts));

                for (let boost of desiredBoosts)
                {
                    let affectedPart = constants.BOOST_PARTS[boost.b];
                    if (!affectedPart)
                        continue;

                    partCount = creepMemory[affectedPart];
                    if (!partCount)
                        continue;

                    boostRequests.push({ creep: creepName, boost: boost.b, amount: partCount * LAB_BOOST_MINERAL, r: boost.r });
                }

                //console.log('**********Base_Spawner.trySpawnCreepForJob - ' + this.room.name + ' - ' + creepName + ' requesting boosts: ' + JSON.stringify(boostRequests));

                if (boostRequests.length > 0 && Room.requestBoosts(this.data.room, boostRequests))
                    Memory.creeps[creepName].boostRequests = boostRequests;
            }

            return sleepTime;
        }
        else
        {
            console.log('Base_Spawner.trySpawnCreepForJob - ' + spawn.room.name + ' FAILED TO SPAWN ' + creepName + ' with parts ' + partList + ' for task ' + desiredSpawn.task.name + ' - result: ' + result);
        }

        return false;
    }

    nameCreep(shard, spawn, type)
    {
        let shardChar = shard.charAt(shard.length - 1);
        // let timeChar = global.letters[(Game.time % global.letters.length)];
        let typeChar = global.letters[global.creepTypeIds[type] % global.letters.length];
        let roomChar = global.letters[Room.getMyBases().indexOf(spawn.room) % global.letters.length];

        let creepCount = 0;
        let countChar1 = global.letters[creepCount % global.letters.length];
        let countChar2 = global.letters[Math.floor(creepCount / global.letters.length)]

        let creepName = typeChar.concat(roomChar.concat(shardChar.concat(countChar1.concat(countChar2))));
        while (Memory.creeps && Memory.creeps[creepName])
        {
            creepCount += 1;
            countChar1 = global.letters[creepCount % global.letters.length];
            countChar2 = global.letters[Math.floor(creepCount / global.letters.length)]
            creepName = typeChar.concat(roomChar.concat(shardChar.concat(countChar1.concat(countChar2))));
        }
        

        // Chinese characters, this looked nice, but NOT valid property names in javascript, so it breaks the memory watcher
        // let shardCharNumber = global.chineseify(shardChar.charCodeAt(0));
        // let spawnNumber = global.chineseify(parseInt(spawn.name.match(/\d+/g)));
        // let typeNumber = global.chineseify(global.creepTypeIds[type]);
        // let time = global.chineseify(Game.time);
        // let creepName = String.fromCharCode(shardCharNumber).concat(String.fromCharCode(spawnNumber).concat(String.fromCharCode(typeNumber).concat(String.fromCharCode(time))));

        //console.log('Base_Spawner.nameCreep - ' + shardChar + '/' + shardCharNumber + ' + ' + spawnNumber + ' + ' + typeNumber + ' + ' + time + ' = ' + creepName);

        return creepName;

        // old way
        //return shard + '_' + spawn.name + '_' + type + '_' + Game.time;
    }

    haveRequiredBoosts(boostInfo, partList)
    {
        // confirm we have required boosts
        return true;
        // if (!boostInfo || boostInfo.length <= 0)
        //     return true;
        //
        // let partListCount = _.countBy(partList);
        //
        // for (let boost of boostInfo)
        // {
        //     let affectedPart = constants.BOOST_PARTS[boost.b];
        //     if (!affectedPart)
        //         continue;
        //
        //     partCount = partListCount[affectedPart];
        //     if (!partCount)
        //         continue;
        // }
    }

    relevantPartCount(type, partList)
    {
        let relevantPart = type;
        if (type == 'worry' || type == 'warry' || type == 'worky' || type == 'harvester')
            relevantPart = WORK;
        else if (type == 'reserve')
            relevantPart = CLAIM;
        else if (type == 'transfer' || type == 'reactor_fill')
            relevantPart = CARRY;
        else if (type == 'destroy')
            relevantPart = ATTACK;
        else if (type == 'ranged' || type == 'ranged_boosted')
            return partList.filter(x => x == RANGED_ATTACK || x == HEAL || x == TOUGH).length;
        else if (type == 'commando' || type == 'assaulter')
            return partList.filter(x => x == RANGED_ATTACK || x == HEAL).length;

        return partList.filter(x => x == relevantPart).length;
    }

    getPartListForJobByType(spawn, jobRoom, energyAvailable, type, maxParts, boosts)
    {
        let energyToSpawnWith = energyAvailable;//spawn.room.energyAvailable;
        //console.log('program_base_spawner.getPartListForJobByType - ' + spawn.name + ' attempting to spawn ' + type + ' with ' + energyToSpawnWith + ' energy');
        let partList = [];
        switch(type)
        {
            case 'assaulter':
            {
                //energyToSpawnWith = spawn.room.energyCapacityAvailable;
                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [], [RANGED_ATTACK, MOVE, MOVE, HEAL], [], true, Math.ceil(maxParts / 2), 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [], [RANGED_ATTACK, MOVE, MOVE, HEAL], [], true, Infinity, 1);
                break;
            }
            case 'attack':
            {
                partList = this.selectPartsAttack(maxParts, energyToSpawnWith);
                break;
            }
            case 'carry':
            {
                energyToSpawnWith = Math.min(spawn.room.quickFillableEnergyCapacityAvailable, energyAvailable);

                if (!maxParts)
                {
                    //maxParts = 16;
                    // if (this.room.isBootstrapping())
                    //     maxParts = 2;
                    // else if (this.room.controller.level >= 7)
                    //     maxParts = 20;
                }

                //console.log('program_base_spawner.spawnCreep - ' + spawn.name + ' attempting to spawn ' + type + ' with ' + energyToSpawnWith + ' energy');

                if (spawn.room.towers.length <= 0)
                {
                    if (maxParts)
                        partList = this.selectParts(energyToSpawnWith, [], [CARRY, MOVE], [], true, maxParts, 1);
                    else
                        partList = this.selectParts(energyToSpawnWith, [], [CARRY, MOVE], [], true, Infinity, 1);
                }
                else
                {
                    if (maxParts)
                        partList = this.selectParts(energyToSpawnWith, [], [CARRY, CARRY, MOVE], [], true, Math.ceil(maxParts / 2), 1);
                    else
                        partList = this.selectParts(energyToSpawnWith, [], [CARRY, CARRY, MOVE], [], true, Infinity, 1);
                }
                break;
            }
            case 'claim':
            {
                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [], [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM], [], true, maxParts, 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [], [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM], [], true, Infinity, 1);
                break;
            }
            case 'defend':
            {
                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [], [RANGED_ATTACK, RANGED_ATTACK, MOVE], [], true, Math.ceil(maxParts / 2), 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [], [RANGED_ATTACK, RANGED_ATTACK, MOVE], [], true, Infinity, 1);
                break;
            }
            case 'destroy':
            {
                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [], [MOVE, ATTACK], [], true, maxParts, 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [], [MOVE, ATTACK], [], true, Infinity, 1);
                break;
            }
            case 'fast_work':
            {
                partList = this.selectPartsFastWork(spawn, maxParts, jobRoom, boosts, energyToSpawnWith);
                break;
            }
            case 'harvester':
            {
                partList = this.selectPartsWorky(spawn, maxParts, jobRoom, boosts, energyToSpawnWith);
                break;
            }
            case 'heal':
            {
                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [], [MOVE, HEAL], [], true, maxParts, 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [], [MOVE, HEAL], [], true, Infinity, 1);
                break;
            }
            case 'move':
            {
                partList = this.selectParts(energyToSpawnWith, [], [MOVE], [], true, maxParts, 1);
                break;
            }
            case 'ranged':
            {
                partList = this.selectPartsRangedAttack(maxParts, energyToSpawnWith);
                break;
            }
            case 'ranged_boosted':
            {
                partList = this.selectPartsRangedBoosted(maxParts, energyToSpawnWith, boosts);
                break;
            }
            case 'reactor_fill':
            {
                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [], [CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], [], true, maxParts, 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [], [CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], [], true, Infinity, 1);

                break;
            }
            case 'reserve':
            {
                // if (maxParts)
                //     energyToSpawnWith = spawn.room.quickFillableEnergyCapacityAvailable;

                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [], [CLAIM, MOVE], [], true, maxParts, 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [], [CLAIM, MOVE], [], true, Infinity, 1);

                break;
            }
            case 'transfer':
            {
                if (maxParts)
                    partList = this.selectParts(energyToSpawnWith, [CARRY], [CARRY], [MOVE], true, maxParts - 1, 1);
                else
                    partList = this.selectParts(energyToSpawnWith, [CARRY], [CARRY], [MOVE], true, Infinity, 1);
                break;
            }
            case 'warry':
            {
                partList = this.selectPartsWarry(spawn, maxParts, jobRoom, boosts, energyToSpawnWith);
                break;
            }
            case 'work':
            {
                partList = this.selectPartsWork(spawn, maxParts, jobRoom, boosts, energyToSpawnWith);
                break;
            }
            case 'worky':
            {
                partList = this.selectPartsWorky(spawn, maxParts, jobRoom, boosts, energyToSpawnWith);
                break;
            }
            case 'worry':
            {
                energyToSpawnWith = Math.min(spawn.room.quickFillableEnergyCapacityAvailable, energyToSpawnWith);
                partList = this.selectPartsWorry(maxParts, energyToSpawnWith, boosts);
                break;
            }
        }

        if (partList.length < 1)
        {
            console.log('Base_Spawner.getPartListForJobByType - ' + spawn.name + ' no parts selected for ' + type + ' with ' + energyToSpawnWith + ' energy');
        }

        return partList;
    }

    selectPartsAssault1(mission)
    {
        let toughCount = 5;
        let rangedAttackCount = 5;
        let healCount = 14;
        let partList =          Array(toughCount).fill(TOUGH)
                        .concat(Array(rangedAttackCount).fill(RANGED_ATTACK))
                        .concat(Array(toughCount + rangedAttackCount + healCount).fill(MOVE))
                        .concat(Array(healCount).fill(HEAL));

        return partList;
    }

    selectPartsAttack(maxParts, energyToSpawnWith)
    {
        let partList = [];

        let pattern = [MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, HEAL];
        let patternCost = global.calculatePartListCost(pattern);

        if (energyToSpawnWith >= patternCost * 2)
        {
            if (maxParts)
                partList = this.selectParts(energyToSpawnWith, [], pattern, [], true, maxParts / 4, 1);
            else
                partList = this.selectParts(energyToSpawnWith, [], pattern, [], true, Infinity, 1);
        }
        else
        {
            pattern = [TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, HEAL];
            patternCost = global.calculatePartListCost(pattern);

            if (energyToSpawnWith < patternCost)
                pattern = [MOVE, MOVE, ATTACK, ATTACK];

            if (maxParts)
                partList = this.selectParts(energyToSpawnWith, [], pattern, [], true, maxParts / 2, 1);
            else
                partList = this.selectParts(energyToSpawnWith, [], pattern, [], true, Infinity, 1);
        }

        return partList;
    }

    selectPartsRangedAttack(maxParts, energyToSpawnWith)
    {
        let partList = [];

        let pattern = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL];
        let patternCost = global.calculatePartListCost(pattern);

        if ((!maxParts || maxParts >= 4) && energyToSpawnWith >= patternCost * 2)
        {
            if (maxParts)
                return this.selectParts(energyToSpawnWith, [], pattern, [], true, maxParts / 4, 1);
            return  this.selectParts(energyToSpawnWith, [], pattern, [], true, Infinity, 1);
        }

        pattern = [TOUGH, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, HEAL];
        patternCost = global.calculatePartListCost(pattern);

        if ((!maxParts || maxParts >= 2) && energyToSpawnWith >= patternCost * 2)
        {
            if (maxParts)
                return this.selectParts(energyToSpawnWith, [], pattern, [], true, maxParts / 2, 1);
            return this.selectParts(energyToSpawnWith, [], pattern, [], true, Infinity, 1);
        }

        if (energyToSpawnWith >= global.calculatePartListCost([RANGED_ATTACK, MOVE, HEAL, MOVE]))
        {
            if (maxParts)
                return this.selectParts(energyToSpawnWith, [], [RANGED_ATTACK, MOVE], [HEAL, MOVE], true, maxParts, 1);

            return this.selectParts(energyToSpawnWith, [], [RANGED_ATTACK, MOVE], [HEAL, MOVE], true, Infinity, 1);
        }

        if (maxParts)
            return this.selectParts(energyToSpawnWith, [], [MOVE, RANGED_ATTACK], [], true, maxParts, 1);

        return this.selectParts(energyToSpawnWith, [], [MOVE, RANGED_ATTACK], [], true, Infinity, 1);
    }

    selectPartsRangedBoosted(maxParts, energyToSpawnWith, boosts)
    {
        let pattern = [RANGED_ATTACK, MOVE, MOVE, HEAL];
        let repeatDivisor = 1;
        
        if (_.find(boosts, 'b', 'XZHO2'))
        {
            pattern = [TOUGH, RANGED_ATTACK, RANGED_ATTACK, MOVE, HEAL];
            repeatDivisor = 2;
        }
        else if (_.find(boosts, 'b', 'ZHO2'))
        {
            pattern = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, HEAL, HEAL, HEAL];
            repeatDivisor = 3;
        }  
        else if (_.find(boosts, 'b', 'ZO'))
        {
            pattern = [RANGED_ATTACK, MOVE, HEAL];
            repeatDivisor = 1;
        }

        if (maxParts)
            return this.selectParts(energyToSpawnWith, [], pattern, [], true, maxParts / repeatDivisor, 1);

        return  this.selectParts(energyToSpawnWith, [], pattern, [], true, Infinity, 1);
    }

    selectPartsWarry(maxParts, energyToSpawnWith, boosts)
    {
        if (!boosts)
            return this.selectParts(energyToSpawnWith, [], [WORK, CARRY, MOVE, MOVE], [], true, maxParts, 1);

        let boostMove  = _.find(boosts, 'b', 'XZHO2');

        if (boostMove)
            return this.selectParts(energyToSpawnWith, [], [WORK, WORK, CARRY, CARRY, MOVE], [], true, maxParts, 1);

        return this.selectParts(energyToSpawnWith, [], [WORK, CARRY, MOVE, MOVE], [], true, maxParts, 1);
    }

    selectPartsFastWork(spawn, maxParts, jobRoom, boosts, energyToSpawnWith)
    {
        let boostedMove = (boosts && _.find(boosts, 'b', 'XZHO2'));

        if (boostedMove)
        {
            return this.selectParts(energyToSpawnWith, [], [WORK, WORK, WORK, WORK, MOVE], [], true, maxParts, 1);
        }

        let partList;

        let pattern = [WORK, MOVE];
        let patternCost = global.calculatePartListCost(pattern);
        let repeatCount = Infinity;
        if (maxParts)
            repeatCount = maxParts;
        partList = this.selectParts(energyToSpawnWith, [], pattern, [], true, repeatCount, 1);

        return partList;
    }

    selectPartsWork(spawn, maxParts, jobRoom, boosts, energyToSpawnWith)
    {
        let boostedMove = (boosts && _.find(boosts, 'b', 'XZHO2'));

        if (boostedMove)
        {
            return this.selectParts(energyToSpawnWith, [], [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE], [], true, maxParts, 1);
        }

        let partList;

        let pattern = [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];
        let patternCost = global.calculatePartListCost(pattern);
        if (energyToSpawnWith >= patternCost * 2)
        {
            let repeatCount = Infinity;
            if (maxParts)
                repeatCount = Math.ceil(maxParts / 6);
            partList = this.selectParts(energyToSpawnWith, [], pattern, [], true, repeatCount, 1);
        }
        else
        {
            let repeatCount = Infinity;
            if (maxParts)
                repeatCount = Math.ceil(maxParts / 2) - 1;
            partList = this.selectParts(energyToSpawnWith, [WORK, WORK], [WORK, WORK, MOVE], [MOVE], true, repeatCount);
        }

        return partList;
    }

    selectPartsWorky(spawn, maxParts, jobRoom, boosts, energyToSpawnWith)
    {
        let boostedMove = (boosts && _.find(boosts, 'b', 'XZHO2'));

        if (boostedMove)
        {
            return this.selectParts(energyToSpawnWith, [], [WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE], [], true, maxParts, 1);
            
        }

        let partList;

        let pattern = [CARRY, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];
        let patternCost = global.calculatePartListCost(pattern);
        if (energyToSpawnWith >= patternCost * 2)
        {
            let repeatCount = Infinity;
            if (maxParts)
                repeatCount = Math.ceil(maxParts / 6);
            partList = this.selectParts(energyToSpawnWith, [], pattern, [], true, repeatCount, 1);
        }
        else
        {
            let repeatCount = Infinity;
            if (maxParts)
                repeatCount = Math.ceil(maxParts / 2) - 1;
            partList = this.selectParts(energyToSpawnWith, [CARRY, WORK, WORK], [WORK, WORK, MOVE], [MOVE], true, repeatCount);
        }

        return partList;
    }

    selectPartsWorry(maxParts, energyToSpawnWith, boosts)
    {
        if (!boosts)
        {
            let pattern = [WORK, CARRY, MOVE];
            let patternCost = global.calculatePartListCost(pattern);
            if (energyToSpawnWith < patternCost * 2)
                pattern = [WORK, CARRY, CARRY, MOVE, MOVE];

            return this.selectParts(energyToSpawnWith, [], pattern, [], true, maxParts, 1);
        }

        let boostMove  = _.find(boosts, 'b', 'XZHO2');

        if (boostMove)
            return this.selectParts(energyToSpawnWith, [], [WORK, WORK, CARRY, CARRY, MOVE], [], true, maxParts, 1);

        return this.selectParts(energyToSpawnWith, [], [WORK, CARRY, MOVE], [], true, maxParts, 1);
    }

    spawnCreep(spawn, type, creepName, partList, cost, memory)
    {
        let energyStructures = this.selectEnergyStructures(this.room, cost);
        return spawn.spawnCreep(partList, creepName, { memory: memory, energyStructures: energyStructures });
    }

    selectParts(energy, basePartList, pattern, endPartList, repeat, maxRepeat, minRepeat)
    {
        var energyCost = 0;

        if (energy == null)
            energy = 300;
        if (maxRepeat == null || maxRepeat < 0)
            maxRepeat = Infinity;
        if (minRepeat == null || minRepeat < 0)
            minRepeat = 0;

        var partList = basePartList.slice();
        var maxParts = 50 - (partList.length + endPartList.length);

        var basePartCost = global.calculatePartListCost(basePartList) + global.calculatePartListCost(endPartList);

        energy -= basePartCost;
        energyCost += basePartCost;

        var partGroupCost = global.calculatePartListCost(pattern);

        var partCountMax = 1;
        if (repeat)
            partCountMax = Math.min(Math.floor(energy / partGroupCost), Math.floor(maxParts / pattern.length), maxRepeat);

        partCountMax = Math.max(partCountMax, 0, minRepeat);

        for (var partIndex in pattern)
        {
            var part = pattern[partIndex];
            var partGroupCount = partCountMax;
            while (partGroupCount > 0)
            {
                partGroupCount--;
                partList.push(part);
                energyCost += BODYPART_COST[part];
            }
        }

        partList = partList.concat(endPartList);

        //console.log(basePartList + " + (" + pattern + " * " + partCountMax + ") for " + energyCost);

        return partList;
    }

    selectEnergyStructures(room, cost)
    {
        let spawns = room.spawns;
        let quickExtensions = room.quickExtensions || [];
        let slowExtensions = room.slowExtensions || [];
        
        if (slowExtensions.length > 0)
        {
            let stockerPos = room.stockerPos;
            slowExtensions = _.sortBy(slowExtensions, e => e.pos.getRangeTo(stockerPos));
        }
            
        return spawns.concat(quickExtensions.concat(slowExtensions));
    }
}

module.exports = Base_Spawner;
