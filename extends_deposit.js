'use strict'

Object.defineProperty(Deposit.prototype, "memory",
{
    configurable: true,
    get()
    {
        if (_.isUndefined(this.room.memory))
        {
            this.room.memory = {};
        }
        if (_.isUndefined(this.room.memory.deposits))
        {
            this.room.memory.deposits = {};
        }

        if (_.isUndefined(this.room.memory.deposits[this.id]))
        {
            let thisMemory = {};

            thisMemory.x = this.pos.x;
            thisMemory.y = this.pos.y;

            thisMemory.os = this.pos.getOpenSpotCount();

            thisMemory.ttd = this.ticksToDecay;
            thisMemory.lcd = this.lastCooldown;

            this.room.memory.deposits[this.id] = thisMemory;
        }

        return this.room.memory.deposits[this.id];
    },
    set(value)
    {
        throw new Error("Could not set deposit memory");
    }
});
