'use strict'

StructureLab.prototype.getFreeSpace = function(resourceType)
{
    if (!this.store)
        return 0;

    if (resourceType != RESOURCE_ENERGY && !this.mineralType)
        return LAB_MINERAL_CAPACITY;

    let resourceAmount = this.store.getFreeCapacity(resourceType);
    if (resourceAmount == null)
        resourceAmount = 0;
    if (this.gainedResourceType)
        resourceAmount -= this.gainedResourceAmount;
    if (this.lostResourceType)
        resourceAmount += this.lostResourceAmount;

    if (resourceAmount < 0)
        resourceAmount = 0;
    return resourceAmount;
}

StructureLab.prototype.getOperateLabPowerTicksRemaining = function()
{
    if (!this.effects || this.effects.length <= 0)
        return 0;

    let effectInfo = _.find(this.effects, e => e.effect == PWR_OPERATE_LAB);
    if (!effectInfo)
        return 0;

    return effectInfo.ticksRemaining;
}

StructureLab.prototype.getWantsBoost = function()
{
    let labMemory = Room.getBaseLabsMemory(this.room.name);
    if (!labMemory || !labMemory.rip)
        return false;

    let reactionInfo = labMemory.rip;

    if (this.id == labMemory.inputLab1)
        return false;

    if (this.id == labMemory.inputLab2)
        return false;

    return true;
}

StructureLab.prototype.desiredMineralType = function()
{
    let labMemory = Room.getBaseLabsMemory(this.room.name);
    if (!labMemory)
        return false;

    let labStatus = labMemory.labStatus;
    if (!labStatus)
        return false;

    let thisLabStatus = _.find(labStatus, ls => ls.id == this.id);
    if (!thisLabStatus)
        return false;

    if (thisLabStatus.boost)
    {
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < thisLabStatus.amount * (LAB_BOOST_ENERGY / LAB_BOOST_MINERAL))
            return RESOURCE_ENERGY;
        return thisLabStatus.boost;
    }

    if (!labMemory.rip)
        return false;

    let reactionInfo = labMemory.rip;

    if (this.id == labMemory.inputLab1)
        return reactionInfo.input1;

    if (this.id == labMemory.inputLab2)
        return reactionInfo.input2;

    return reactionInfo.output;
}

StructureLab.prototype.desiredResourceLoadAmount = function()
{
    let labMemory = Room.getBaseLabsMemory(this.room.name);
    if (!labMemory)
        return 0;

    let labStatus = labMemory.labStatus;
    if (!labStatus)
        return 0;

    let thisLabStatus = _.find(labStatus, ls => ls.id == this.id);
    if (!thisLabStatus)
        return 0;

    if (thisLabStatus.boost)
    {
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < LAB_ENERGY_CAPACITY)
            return LAB_ENERGY_CAPACITY - this.store.getUsedCapacity(RESOURCE_ENERGY);
        if (!this.mineralType)
            return thisLabStatus.amount;
        if (this.mineralType && this.mineralType == thisLabStatus.boost && this.store.getUsedCapacity(this.mineralType) < thisLabStatus.amount)
            return thisLabStatus.amount - this.store.getUsedCapacity(this.mineralType);
        if (this.mineralType && this.mineralType != thisLabStatus.boost)
            return this.store.getUsedCapacity(this.mineralType);

        return 0;
    }

    if (!labMemory.rip)
        return 0;

    let reactionInfo = labMemory.rip;

    if (this.id == labMemory.inputLab1)
    {
        if (!this.mineralType)
            return reactionInfo.outputAmount;
        if (this.mineralType && this.mineralType == reactionInfo.input1 && this.store.getUsedCapacity(this.mineralType) < reactionInfo.outputAmount)
            return reactionInfo.outputAmount - this.store.getUsedCapacity(this.mineralType);
        if (this.mineralType && this.mineralType != reactionInfo.input1)
            return this.store.getUsedCapacity(this.mineralType);

        return 0;
    }

    if (this.id == labMemory.inputLab2)
    {
        if (!this.mineralType)
            return reactionInfo.outputAmount;
        if (this.mineralType && this.mineralType == reactionInfo.input2 && this.store.getUsedCapacity(this.mineralType) < reactionInfo.outputAmount)
            return reactionInfo.outputAmount - this.store.getUsedCapacity(this.mineralType);
        if (this.mineralType && this.mineralType != reactionInfo.input2)
            return this.store.getUsedCapacity(this.mineralType);

        return 0;
    }

    return 0;
}

StructureLab.prototype.needsLoad = function()
{
    let labMemory = Room.getBaseLabsMemory(this.room.name);
    if (!labMemory)
        return false;

    let labStatus = labMemory.labStatus;
    if (!labStatus)
        return false;

    let thisLabStatus = _.find(labStatus, ls => ls.id == this.id);
    if (!thisLabStatus)
        return false;

    let mineralAmount = 0;
    if (this.mineralType)
        mineralAmount = this.store.getUsedCapacity(this.mineralType);

    let mineralFull = (mineralAmount >= LAB_MINERAL_CAPACITY);

    if (thisLabStatus.boost)
        return (!this.mineralType || (this.mineralType == thisLabStatus.boost && ((!mineralFull && mineralAmount < thisLabStatus.amount) || this.store.getUsedCapacity(RESOURCE_ENERGY) < thisLabStatus.amount * (LAB_BOOST_ENERGY / LAB_BOOST_MINERAL))));

    if (!labMemory.rip)
        return false;

    let reactionInfo = labMemory.rip;

    if (this.id == labMemory.inputLab1)
        return (!this.mineralType || (this.mineralType == reactionInfo.input1 && !mineralFull && mineralAmount < reactionInfo.outputAmount));

    if (this.id == labMemory.inputLab2)
        return (!this.mineralType || (this.mineralType == reactionInfo.input2 && !mineralFull && mineralAmount < reactionInfo.outputAmount));

    return false;
}


StructureLab.prototype.needsUnload = function()
{
    if (!this.mineralType)
        return false;

    let labMemory = Room.getBaseLabsMemory(this.room.name);
    if (!labMemory)
        return false;

    let labStatus = labMemory.labStatus;
    if (!labStatus)
        return false;

    let thisLabStatus = _.find(labStatus, ls => ls.id == this.id);
    if (!thisLabStatus)
        return false;

    if (thisLabStatus.boost)
        return (this.mineralType != thisLabStatus.boost);

    if (!labMemory.rip)
        return false;

    let reactionInfo = labMemory.rip;

    if (this.id == labMemory.inputLab1)
        return (this.mineralType != reactionInfo.input1);

    if (this.id == labMemory.inputLab2)
        return (this.mineralType != reactionInfo.input2);

    if (this.mineralType != reactionInfo.output)
        return true;

    return (this.store.getUsedCapacity(this.mineralType) >= LAB_MINERAL_CAPACITY * 0.5);
}
