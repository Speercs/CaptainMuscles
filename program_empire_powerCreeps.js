'use strict'

const constants = require('constants');

let powerSelectionOrder =
[
    PWR_GENERATE_OPS,
    PWR_OPERATE_SPAWN,
    PWR_GENERATE_OPS,
    PWR_OPERATE_SPAWN,
    PWR_OPERATE_EXTENSION,
    PWR_OPERATE_EXTENSION,
    PWR_OPERATE_STORAGE,
    PWR_GENERATE_OPS,
    PWR_OPERATE_SPAWN,
    PWR_OPERATE_EXTENSION,
    PWR_REGEN_SOURCE,
    PWR_REGEN_SOURCE,
    PWR_REGEN_SOURCE,
    PWR_OPERATE_STORAGE,
    PWR_REGEN_SOURCE,
];

class Program_Empire_PowerCreeps extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Program_Empire_PowerCreeps.constructor - executing');

        this.frequency = 1;
    }

    refresh()
    {
        super.refresh();

        if (!Memory.empire)
            Memory.empire = {};
        if (!Memory.empire.powerCreeps)
            Memory.empire.powerCreeps = {};

        this.memory = Memory.empire.powerCreeps;
    }

    run()
    {
        super.run();

        console.log('Program_Empire_PowerCreeps.run - executing');

        this.memory.count = 0;
        this.memory.levels = 0;
        
        for (let powerCreepName in Game.powerCreeps)
        {
            let powerCreep = Game.powerCreeps[powerCreepName];
            this.memory.levels += powerCreep.level + 1;
            this.memory.count += 1;
        }

        this.memory.remainingLevels = Game.gpl.level - this.memory.levels;

        console.log('Program_Empire_PowerCreeps.run - count: ' + this.memory.count + ', remainingPowerLevels: ' + this.memory.remainingLevels);

        if (this.updatePowerCreeps())
            return;

        if (this.manageFlags())
            return;

        console.log('Program_Empire_PowerCreeps.run - taking a nap');
        this.sleep(100);
    }

    manageFlags()
    {
        let powerCreepFlags = _.filter(Game.flags, f => f.name.startsWith('powerCreep'));
        console.log('Program_Empire_PowerCreeps.manageFlags - powerCreepFlags: ' + powerCreepFlags.length);

        for (let flag of powerCreepFlags)
        {
            if (!flag.room)
            {
                console.log('Program_Empire_PowerCreeps.manageFlags - removing flag: ' + flag.name + ' from unseen room: ' + flag.pos.roomName);
                flag.remove();
                return true;
            }

            let otherFlagInRoom = powerCreepFlags.find(f => f.name != flag.name && f.pos.roomName == flag.pos.roomName);
            if (otherFlagInRoom)
            {
                console.log('Program_Empire_PowerCreeps.manageFlags - removing second flag: ' + otherFlagInRoom.name + ' from room: ' + otherFlagInRoom.pos.roomName);
                otherFlagInRoom.remove();
                return true;
            }
        }

        let priorityBases = Room.getMyBases();
        priorityBases.sort(
            (a, b) => 
            {
                if (a.controller.level != b.controller.level)
                    return a.controller.level - b.controller.level;
                else
                    return b.memory.score.total - a.memory.score.total;
            }
        );

        priorityBases = priorityBases.slice(0, this.memory.count);

        for (let base of priorityBases)
        {
            console.log('Program_Empire_PowerCreeps.manageFlags - base: ' + base.name + ' level: ' + base.controller.level + ', score: ' + base.memory.score.total);
        }
        //return;

        let flagsInNonPriorityBases = [];

        for (let flag of powerCreepFlags)
        {
            if (!priorityBases.find(b => b.name == flag.pos.roomName))
            {
                flagsInNonPriorityBases.push(flag);
                console.log('Program_Empire_PowerCreeps.manageFlags - removing flag: ' + flag.name + ' from non-priority room: ' + flag.pos.roomName);
                flag.remove();
                return true;
            }
        }

        if (flagsInNonPriorityBases.length > 0)
        {
            for (let base of priorityBases)
            {
                if (flagsInNonPriorityBases.length <= 0)
                    break;

                if (!powerCreepFlags.find(f => f.pos.roomName == base.name))
                {
                    console.log('Program_Empire_PowerCreeps.manageFlags - moving flag: ' + flagsInNonPriorityBases[0].name + ' to room: ' + base.name);
                    flagsInNonPriorityBases[0].setPosition(new RoomPosition(20, 20, base.name));
                    flagsInNonPriorityBases = flagsInNonPriorityBases.slice(1);

                    return true;
                }
            }
        }

        let powerCreepsWithoutFlags = _.filter(Game.powerCreeps, c => !Game.flags['powerCreep_' + c.name]);
        let priorityBasesWithoutPowerCreeps = priorityBases.filter(b => !powerCreepFlags.find(f => f.pos.roomName == b.name));

        console.log('Program_Empire_PowerCreeps.manageFlags - powerCreepsWithoutFlags: ' + powerCreepsWithoutFlags.length + ', priorityBasesWithoutPowerCreeps: ' + priorityBasesWithoutPowerCreeps.length);

        if (powerCreepsWithoutFlags.length <= 0 || priorityBasesWithoutPowerCreeps.length <= 0)
            return false;

        for (let powerCreep of powerCreepsWithoutFlags)
        {
            let newFlagName = 'powerCreep_' + powerCreep.name;
            let newFlagPosition = new RoomPosition(20, 20, priorityBasesWithoutPowerCreeps[0].name);
            let result = newFlagPosition.createFlag(newFlagName);

            console.log('Program_Empire_PowerCreeps.manageFlags - placing flag: ' + newFlagName + ' at: ' + newFlagPosition + ', result: ' + result);
            priorityBasesWithoutPowerCreeps = priorityBasesWithoutPowerCreeps.slice(1);
            return true;
        }

        return false;
    }

    updatePowerCreeps()
    {
        if (this.memory.remainingLevels <= 0)
            return false;

        if (this.upgradePowerCreeps())
            return true;

        if (this.createNewPowerCreep())
            return true;

        return false;
    }

    createNewPowerCreep()
    {
        let creepExists = true;
        let creepNumber = 0;
        while (creepExists)
        {
            let newCreepName = 'b' + creepNumber;
            let powerCreep = Game.powerCreeps[newCreepName];
            creepExists = !!powerCreep;
            if (!creepExists)
            {
                let newCreepClass = POWER_CLASS.OPERATOR;

                let result = PowerCreep.create(newCreepName, newCreepClass);
                console.log('Program_Empire_PowerCreeps.createNewPowerCreep - creating powerCreep: ' + newCreepName + ', class: ' + newCreepClass + ', result: ' + result);
                return true;
            }
            creepNumber += 1;
        }

        return true;
    }

    upgradePowerCreeps()
    {
        for (let powerCreepName in Game.powerCreeps)
        {
            let powerCreep = Game.powerCreeps[powerCreepName];
            if (powerCreep.level < powerSelectionOrder.length)
            {
                this.upgradePowerCreep(powerCreep);
                return true;
            }
        }

        console.log('Program_Empire_PowerCreeps.upgradePowerCreeps - no powerCreeps upgraded');
        return false;
    }

    upgradePowerCreep(powerCreep)
    {
        let desiredPower = powerSelectionOrder[powerCreep.level];
        let result = powerCreep.upgrade(powerSelectionOrder[powerCreep.level]);

        console.log('Program_Empire_PowerCreeps.upgradePowerCreep - upgrading powerCreep ' + powerCreep.name + ' with power ' + desiredPower + ', result: ' + result);

        if (result == OK && powerCreep.ticksToLive)
        {
            console.log('Program_Empire_PowerCreeps.upgradePowerCreep - suiciding powerCreep ' + powerCreep.name + ' to allow for respawn with new power');
            powerCreep.suicide();
        }
    }
}

module.exports = Program_Empire_PowerCreeps
