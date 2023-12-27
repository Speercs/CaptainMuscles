'use strict'

Object.defineProperty(StructurePowerBank.prototype, "memory",
{
    configurable: true,
    get()
    {
        if (_.isUndefined(this.room.memory))
        {
            this.room.memory = {};
        }
        if (_.isUndefined(this.room.memory.powerBanks))
        {
            this.room.memory.powerBanks = {};
        }

        if (_.isUndefined(this.room.memory.powerBanks[this.id]))
        {
            let thisMemory = {};

            thisMemory.x = this.pos.x;
            thisMemory.y = this.pos.y;
            thisMemory.power = this.power;

            thisMemory.os = this.pos.getOpenSpotCount();

            this.room.memory.powerBanks[this.id] = thisMemory;
        }

        return this.room.memory.powerBanks[this.id];
    },
    set(value)
    {
        throw new Error("Could not set powerBank memory");
    }
});

Object.defineProperty(StructurePowerBank.prototype, "ticksToDestroy",
{
    configurable: true,
    get()
    {
        return StructurePowerBank.getTicksToDestroy(this.room.name, this.id);
    },
    set(value)
    {
        throw new Error("Could not set powerBank ticksToDestroy");
    }
});

StructurePowerBank.getTicksToDestroy = function (roomName, powerBankId)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.powerBanks || !roomMemory.powerBanks[powerBankId])
        return Infinity;

    let powerBankMemory = roomMemory.powerBanks[powerBankId];

    let attackCreeps = _.filter(Room.getJobCreeps(roomName, 'power_attack_' + powerBankId), c => c.room.name == roomName);
    let healCreeps = _.filter(Room.getJobCreeps(roomName, 'power_heal_' + powerBankId), c => c.room.name == roomName);
    let attackDamage = 20 * ATTACK_POWER;
    if (attackCreeps.length > 0 && healCreeps.length > 0)
        attackDamage = _.sum(attackCreeps, c => c.attackPower) * (healCreeps.length / attackCreeps.length);

    return powerBankMemory.hits / attackDamage;
}
