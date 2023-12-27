'use strict'

const constants = require('constants');
let Mission_Creeps = require('program_mission_creeps');

class Program_Empire_Warfare extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Program_Empire_Warfare.constructor - executing');

        this.frequency = 100;
        this.priority = global.PROCESS_PRIORITY_MONITOR;
    }

    refresh()
    {
        super.refresh();

        if (!Memory.empire)
            Memory.empire = {};
        if (!Memory.empire.warfare)
            Memory.empire.warfare = {};

        this.memory = Memory.empire.warfare;
    }

    run()
    {
        super.run();

        if (!constants.AUTO_ATTACK)
        {
            this.endChildProcesses();

            let oldTargets = [];
            if (this.memory.targets && this.memory.targets.length > 0)
                oldTargets = this.memory.targets;

            this.memory.targets = []
            this.cancelAttacks(oldTargets);

            return;
        }

        console.log('Program_Empire_Warfare.run - executing');

        if (Game.cpu.bucket < constants.CPU_BUCKET_SIZE / 2)
            return this.sleep((constants.CPU_BUCKET_SIZE - Game.cpu.bucket) / 100);

        this.selectTarget();
    }

    selectTarget()
    {
        if (!Memory.diplomacy)
            Memory.diplomacy = {};

        if (!Memory.diplomacy.ratings)
            Memory.diplomacy.ratings = {};

        let oldTargets = [];
        if (this.memory.targets && this.memory.targets.length > 0)
            oldTargets = this.memory.targets;

        // this.memory.targets = []
        // this.cancelAttacks(oldTargets);
        // return;

        let availableRoomMemories = _.filter(Memory.rooms, mem => mem.controller && (!mem.controller.sm || mem.controller.sm < Game.time));
        let roomScores = [];

        for (let roomMemory of availableRoomMemories)
        {
            let roomName = roomMemory.name;
            roomMemory.attackScore = this.scoreRoom(roomName, roomMemory);

            if (roomMemory.attackScore)
                roomScores.push({ name: roomName, memory: roomMemory, score: roomMemory.attackScore });
        }

        if (roomScores.length <= 0)
        {
            this.cancelAttacks(oldTargets);
            return;
        }

        let boostAmount = this.calculateBoostAmount();

        let allowedTargetCount = Math.floor(Math.lerp(0, 4, boostAmount));
        console.log("Empire_Warfare.selectTarget - allowedTargetCount: " + allowedTargetCount);

        roomScores.sort((a, b) => b.score - a.score);
        roomScores = roomScores.slice(0, allowedTargetCount);

        this.memory.targets = roomScores.map(rs => rs.name);
        if (Memory.empire && Memory.empire.desiredRoom)
        {
            this.memory.targets.splice(0, 0, Memory.empire.desiredRoom);
            this.memory.targets = _.unique(this.memory.targets, false);
            this.memory.targets = this.memory.targets.slice(0, allowedTargetCount);
        }
        
        this.cancelAttacks(oldTargets);
        this.launchAttacks(this.memory.targets);
    }

    calculateBoostAmount()
    {
        let bases = Room.getMyBases();
        let boosts = 
           [RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
            RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
            RESOURCE_CATALYZED_ZYNTHIUM_ACID,
            RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
            RESOURCE_CATALYZED_KEANIUM_ALKALIDE];

        let boostTotal = 0;
        let desiredBoostTotal = 0;

        for (let base of bases)
        {
            for (let boost of boosts)
            {
                boostTotal += Room.getStoredResourceAmount(base.name, boost);
                desiredBoostTotal += Room.getDesiredResourceAmount(base.name, boost);
            }
        }

        let boostAmount = boostTotal / desiredBoostTotal;
        console.log("Empire_Warfare.calculateBoostAmount - boostAmount: " + boostAmount + ", boostTotal: " + boostTotal + ",desiredBoostTotal: " + desiredBoostTotal);
        return boostAmount;
    }

    launchAttacks(targets)
    {
        this.memory.attackingBases = [];

        for (let target of targets)
            this.launchAttack(target);
        
        this.memory.attackingBases = _.unique(this.memory.attackingBases, false);
    }

    launchAttack(roomName)
    {
        let attackMissionInfo = { type: 'attack', room: this.memory.r };
        let attackMission = Mission_Creeps.getMemory(attackMissionInfo);
        if (!attackMission)
            this.launchChildProcess(`attack_${roomName}`, 'mission_attack', { room: roomName })

        let bases = Room.getMyBases();

        for (let base of bases)
        {
            if (global.realDistanceBetweenRooms(roomName, base.name) > MAX_REMOTE_RANGE)
                continue;

            let route = Game.map.findRoute(roomName, base.name);
            if (route == ERR_NO_PATH || route.length > MAX_REMOTE_RANGE)
                continue;
            
            this.memory.attackingBases.push(base.name);
        }
    }

    cancelAttacks(oldTargets)
    {
        for (let oldTarget of oldTargets)
        {
            if (!_.find(this.memory.targets, t => t == oldTarget))
                this.cancelAttack(oldTarget);
        }
    }

    cancelAttack(roomName)
    {
        if (!roomName)
            return;

        console.log("Empire_Warfare.cancelAttack - cancelling attack on: " + roomName);
        this.endChildProcess(`attack_${roomName}`);
    }

    scoreRoom(roomName, roomMemory)
    {
        if (!Room.isEnemyBase(roomName))// || !roomMemory.hostiles || !roomMemory.hostiles.tc)
            return 0;

        if (!Room.killOnSight(roomName))
            return 0;

        let bases = Room.getMyBases();

        let baseProximity = 0;

        for (let base of bases)
        {
            let distance = global.realDistanceBetweenRooms(roomName, base.name);
            if (distance > MAX_REMOTE_RANGE)
                continue;

            let route = Game.map.findRoute(roomName, base.name);
            if (route != ERR_NO_PATH)
                distance = route.length;
            if (distance > MAX_REMOTE_RANGE)
                continue;
            
            baseProximity += ((MAX_REMOTE_RANGE + 1) - distance) * base.controller.level;
        }

        let towerCount = 1;
        if (roomMemory.hostiles && roomMemory.hostiles.tc)
            towerCount = roomMemory.hostiles.tc;

        if (towerCount > 3)
            return 0;

        let wallFactor = 1;
        if (roomMemory.maxWallHits && !isNaN(roomMemory.maxWallHits))
            wallFactor += Math.ceil(roomMemory.maxWallHits / 1000000)

        let claimValue = (roomMemory.score || 0) + 1;

        let score = (baseProximity) / (towerCount * wallFactor);

        return score;
    }
}

module.exports = Program_Empire_Warfare
