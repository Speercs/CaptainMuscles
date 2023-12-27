'use strict'

Structure.prototype.getEffectTicksRemaining = function(power)
{
    if (!this.effects || this.effects.length <= 0)
        return 0;

    let effectInfo = _.find(this.effects, e => e.effect == power);
    if (!effectInfo)
        return 0;

    return effectInfo.ticksRemaining;
}

Structure.prototype.isDemolishable = function(allowLootable)
{
    return (this.hits && !this.my &&
        this.structureType != STRUCTURE_ROAD &&
        this.structureType != STRUCTURE_CONTAINER &&
        this.structureType != STRUCTURE_INVADER_CORE &&
        this.structureType != STRUCTURE_POWER_BANK &&
        (this.structureType != STRUCTURE_STORAGE  || allowLootable || this.store.getUsedCapacity() <= 0) &&
        (this.structureType != STRUCTURE_TERMINAL || allowLootable || this.store.getUsedCapacity() <= 0) &&
        (this.structureType != STRUCTURE_FACTORY  || allowLootable || this.store.getUsedCapacity() <= 0));
}

Structure.prototype.isLootable = function()
{
    return (this.hits && !this.my &&
       ((this.structureType == STRUCTURE_STORAGE  && this.store.getUsedCapacity() > 0) ||
        (this.structureType == STRUCTURE_TERMINAL && this.store.getUsedCapacity() > 0) ||
        (this.structureType == STRUCTURE_FACTORY  && this.store.getUsedCapacity() > 0)));
}

Structure.prototype.blocksMovement = function()
{
    return (this.structureType != STRUCTURE_ROAD &&
            this.structureType != STRUCTURE_CONTAINER &&
           (this.structureType != STRUCTURE_RAMPART || (!this.my && !this.isPublic)));
}
