'use strict'

const constants = require('constants');
let Mission_Creeps = require('program_mission_creeps');

class Empire_Flags extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_FLAGS;

        //console.log('Empire_Flags.constructor - ' + this.data.room + ' - executing');
        //this.frequency = 10;
    }

    refresh()
    {
        super.refresh();

        if (!Memory.flags)
            Memory.flags = {};

        this.memory = Memory.flags;
    }

    run()
    {
        //console.log('Empire_Flags.run - ' + this.data.spawn + ' - executing');

        this.processFlags();
        this.cleanFlags();
    }

    processFlags()
    {
        for (let flagName in Game.flags)
        {
            let flag = Game.flags[flagName];
            let flagNameParts = flagName.split("_");
            let flagType = flagNameParts[0];

            if (!flag.memory)
                flag.memory = {};
            if (!flag.memory.type)
                flag.memory.type = flagType;
            if (!flag.memory.name)
                flag.memory.name = flagName;
            if (!flag.memory.room)
                flag.memory.room = flag.pos.roomName;

            if (this[flagType])
                this[flagType](flag, flagNameParts, flag.memory);
        }
    }

    cleanFlags()
    {
        for (let flagName in Memory.flags)
        {
            let flag = Game.flags[flagName];

            if (!flag)
            {
                let flagMemory = Memory.flags[flagName];
                let flagNameParts = flagName.split("_");
                let flagType = flagNameParts[0];
                let methodName = flagType + "Cleanup";

                if (this[methodName])
                {
                    console.log("Empire_Flags.cleanFlags - Cleaning up flag: " + flagName + " - type: " + flagType);
                    this[methodName](flagNameParts, flagMemory);
                    delete Memory.flags[flagName];
                }
            }
        }
    }

    // assault ******************************
    assault(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.assault - " + flag.pos);

        let exits = Game.map.describeExits(flag.pos.roomName);
        for (let exitDirection in exits)
        {
            let neighborRoom = exits[exitDirection];
            this.launchChildProcess(`assaultFrom_${neighborRoom}`, 'mission_assault', { room: neighborRoom })
        }
    }

    assaultCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.assaultCleanup - want to clean up - ' + JSON.stringify(flagMemory));

        let exits = Game.map.describeExits(flagMemory.room);
        for (let exitDirection in exits)
        {
            let neighborRoom = exits[exitDirection];
            this.endChildProcess(`assaultFrom_${neighborRoom}`);
        }
    }

    
    // attack ******************************
    attack(flag, flagNameParts, flagMemory)
    {
        return;
        //console.log("Empire_Flags.attack - " + flag.pos);

        if (flag.room && flag.name == 'attack')
        {
            if (Game.flags['attack_' + flag.room.name])
            {
                flag.remove();
                return;
            }

            flag.pos.createFlag('attack_' + flag.room.name);
            return;
        }
        else
        {
            let attackMissionInfo = { type: 'attack', room: this.memory.r };
            let attackMission = Mission_Creeps.getMemory(attackMissionInfo);
            if (!attackMission)
                this.launchChildProcess(`attack_${flag.pos.roomName}`, 'mission_attack', { room: flag.pos.roomName })
        }
    }

    attackCleanup(flagNameParts, flagMemory)
    {
        return;
        console.log('Empire_Flags.attackCleanup - want to clean up - ' + JSON.stringify(flagMemory));

        this.endChildProcess(`attack_${flagMemory.room}`);
    }

    // claim ******************************
    claim(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.claim - " + flag.pos.roomName);

        //this.launchChildProcess(`claim_${flagMemory.room}`, 'mission_claim', { room: flagMemory.room });
        //Game.map.visual.rect(new RoomPosition(1, 1, flag.pos.roomName), 48, 48, {fill: 'transparent', stroke: '#b99cfb', strokeWidth: 1});
        if (Memory.empire)
            Memory.empire.nextClaim = flag.pos.roomName;
    }

    claimCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.claimCleanup - want to clean up - ' + JSON.stringify(flagMemory));

        //this.endChildProcess(`claim_${flagMemory.room}`);
    }

    // combatTest ******************************
    combatTest(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.combatTest - " + flag.pos);

        this.launchChildProcess(`combat_test`, 'mission_combat_test', {});
    }

    combatTestCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.combatTestCleanup - want to clean up - ' + JSON.stringify(flagMemory));

        this.endChildProcess(`combat_test`);
    }

    // ignore ******************************
    ignore(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.ignore - " + flag.pos);

        if (flag.room && flag.name == 'ignore')
        {
            if (Game.flags['ignore_' + flag.room.name])
            {
                flag.remove();
                return;
            }

            flag.pos.createFlag('ignore_' + flag.room.name);
            return;
        }
    }

    ignoreCleanup(flagNameParts, flagMemory)
    {

    }

    // mapRoom ******************************
    mapRoom(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.mapRoom - " + flag.pos);

        this.launchChildProcess(`mapRoom_${flag.pos.roomName}`, 'map_room', { room: flag.pos.roomName })
    }

    mapRoomCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.mapRoomCleanup - want to clean up - ' + JSON.stringify(flagMemory));
        this.endChildProcess(`mapRoom_${flagMemory.room}`);
    }

    // nuke ******************************
    nuke(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.nuke - " + flag.pos);

        let nearestValidNukingBase = Room.getNearestBaseFiltered(flag.pos.roomName, b => b.controller.level >= 8 && b.nuker && b.nuker.store.getFreeCapacity(RESOURCE_ENERGY) <= 0 && b.nuker.store.getFreeCapacity(RESOURCE_GHODIUM) <= 0 && !b.nuker.cooldown);
        if (nearestValidNukingBase && Game.map.getRoomLinearDistance(flag.pos.roomName, nearestValidNukingBase.name) <= NUKE_RANGE)
        {
            let result = nearestValidNukingBase.nuker.launchNuke(flag.pos);
            console.log("Empire_Flags.nuke - " + nearestValidNukingBase.name + ' launching nuke at ' + flag.pos + '!!! result: ' + result);
            flag.remove();
        }
    }

    nukeCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.nukeCleanup - want to clean up - ' + JSON.stringify(flagMemory));
    }

    // nukesInRange ******************************
    nukesInRange(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.nukesInRange - " + flag.pos);
        let nukingBasesInRange = Room.getMyBasesInRange(flag.pos.roomName, 10, false).filter(b => b.controller.level >= 8 && b.nuker && b.nuker.store.getFreeCapacity(RESOURCE_ENERGY) <= 0 && b.nuker.store.getFreeCapacity(RESOURCE_GHODIUM) <= 0 && !b.nuker.cooldown);
        let visual = new RoomVisual(flag.pos.roomName);
        visual.text(nukingBasesInRange.length, flag.pos.x, flag.pos.y + 2, { opacity: 0.5 });
    }

    nukesInRangeCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.nukesInRangeCleanup - want to clean up - ' + JSON.stringify(flagMemory));
    }

    // powerCreep ******************************
    powerCreep(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.powerCreep - " + flag.pos);
        let powerCreepName = flagNameParts[1];
        if (!Game.powerCreeps[powerCreepName])
            return;

        this.launchChildProcess(`power_creep_${powerCreepName}`, 'power_creep', { creep: powerCreepName, flag: flag.name });
    }

    powerCreepCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.powerCreepCleanup - want to clean up - ' + JSON.stringify(flagMemory));
        let powerCreepName = flagNameParts[1];
        if (!Game.powerCreeps[powerCreepName])
            return;

        this.endChildProcess(`power_creep_${powerCreepName}`);
    }

    // quad ******************************
    quad(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.quad - " + flag.pos);

        this.launchChildProcess(`quad_${flagMemory.name}`, 'mission_squad', { room: flagMemory.room, flag: flagMemory.name, size: 4 });
    }

    quadCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.quad - want to clean up - ' + JSON.stringify(flagMemory));

        this.endChildProcess(`quad_${flagMemory.name}`);
    }

    // repelTest ******************************
    repelTest(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.repelTest - " + flag.pos);

        this.launchChildProcess(`repelTest`, 'mission_repel', { room: flag.pos.roomName });
    }

    repelTestCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.repelTest - want to clean up - ' + JSON.stringify(flagMemory));

        this.endChildProcess(`repelTest`);
    }

    // replan ******************************
    replan(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.replan - " + flag.pos);

        let roomName = flag.pos.roomName;

        if (!Room.isMyBase(roomName))
        {
            flag.remove();
            return;
        }

        let baseMemory = Room.getBaseMemory(roomName);
        if (!baseMemory)
        {
            flag.remove();
            return;
        }

        if (flag.name == 'replan')
        {
            if (Game.flags['replan_' + roomName])
            {
                flag.remove();
                return;
            }

            flag.pos.createFlag('replan_' + roomName);
            return;
        }

        let energyAmount = Room.getStoredResourceAmount(roomName, RESOURCE_ENERGY);

        // if (energyAmount < 50000)
        //     return;

        baseMemory.replan = 1;
        flag.remove();
    }

    replanCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.replan - want to clean up - ' + JSON.stringify(flagMemory));
    }

    // unclaim ******************************
    unclaim(flag, flagNameParts, flagMemory)
    {
        //console.log("Empire_Flags.unclaim - " + flag.pos);

        if (!Room.isMyBase(flag.pos.roomName))
        {
            flag.remove();
            return;
        }

        if (!flag.room)
            return;

        if (flag.name == 'unclaim')
        {
            if (Game.flags['unclaim_' + flag.room.name])
            {
                flag.remove();
                return;
            }

            flag.pos.createFlag('unclaim_' + flag.room.name);
            return;
        }

        if (flag.room.nuker && flag.room.nuker.my)
            flag.room.nuker.destroy();

        if (flag.room.powerSpawn && flag.room.powerSpawn.my)
            flag.room.powerSpawn.destroy();

        if (flag.room.factory && flag.room.factory.my)
            flag.room.factory.destroy();

        if (flag.room.labs)
        {
            for (let lab of flag.room.labs)
            {
                if (lab.my)
                    lab.destroy();
            }
        }
    }

    unclaimCleanup(flagNameParts, flagMemory)
    {
        //console.log('Empire_Flags.unclaimCleanup - want to clean up - ' + JSON.stringify(flagMemory));
    }
}

module.exports = Empire_Flags;
