'use strict'

RoomObject.prototype.isInvader = function()
{
    return (this.owner && this.owner.username == 'Invader');
}

RoomObject.prototype.isSourceKeeper = function()
{
    return (this.owner && this.owner.username == 'Source Keeper');
}

Object.defineProperty(RoomObject.prototype, "hitsPercent",
{
    configurable: true,
    get()
    {
        if (!this.hits)
            return 1;

        return this.hits / this.hitsMax;
    },
    set(value)
    {

    }
});

RoomObject.prototype.findInRange = function(typeOrObjects, range, opts)
{
    return this.pos.findInRange(typeOrObjects, range, opts);
}

RoomObject.prototype.isFull = function(resourceType)
{
    if (!this.store)
        return true;

    return this.store.getFreeCapacity(resourceType) > 0;
}

RoomObject.prototype.getPercentFull = function(resourceType)
{
    if (!this.store)
        return 1;

    return this.store.getUsedCapacity(resourceType) / this.store.getCapacity(resourceType);
}

RoomObject.prototype.getFreeSpace = function(resourceType)
{
    if (!this.store)
        return 0;

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

RoomObject.prototype.getResourceAmount = function(resourceType)
{
    if (!this.store)
        return 0;

    let resourceAmount = this.store.getUsedCapacity(resourceType);
    if (resourceAmount == null)
        resourceAmount = 0;
    if (this.gainedResourceType && (!resourceType || this.gainedResourceType == resourceType))
        resourceAmount += this.gainedResourceAmount;
    if (this.lostResourceType && (!resourceType || this.lostResourceType == resourceType))
        resourceAmount -= this.lostResourceAmount;
    if (resourceAmount < 0)
        resourceAmount = 0;
    return resourceAmount;
}

RoomObject.prototype.has = function(resourceType)
{
    if (!this.store)
        return false;

    let resourceAmount = this.store.getUsedCapacity(resourceType);
    if (resourceAmount == null)
        resourceAmount = 0;
    if (this.lostResourceType && (!resourceType || this.lostResourceType == resourceType))
        resourceAmount -= this.lostResourceAmount;
    return resourceAmount > 0;
}

RoomObject.prototype.lookForFirstInRange = function(lookType, range, filter)
{
    if (!this.room)
        return null;

    let minX = Math.max( 0, this.pos.x - range);
    let minY = Math.max( 0, this.pos.y - range);
    let maxX = Math.min(49, this.pos.x + range);
    let maxY = Math.min(49, this.pos.y + range);

    let results = this.room.lookForAtArea(lookType, minY, minX, maxY, maxX, true);
    //this.log('RoomObject.prototype.lookForFirstInRange', 'found ' + results.length + ' ' + lookType);

    let firstResult = _.find(results, o => o[lookType] && (!filter || filter(o[lookType])));
    if (firstResult)
        firstResult = firstResult[lookType];

    //this.log('RoomObject.prototype.lookForFirstInRange', 'found ' + JSON.stringify(firstResult));
    return firstResult;
}

RoomObject.prototype.lookForInRange = function(lookType, range, filter)
{
    if (!this.room)
        return [];

    let minX = Math.max( 0, this.pos.x - range);
    let minY = Math.max( 0, this.pos.y - range);
    let maxX = Math.min(49, this.pos.x + range);
    let maxY = Math.min(49, this.pos.y + range);

    let results = this.room.lookForAtArea(lookType, minY, minX, maxY, maxX, true);
    if (filter)
        results = _.filter(results, o => filter(o[lookType]));
    //this.log('RoomObject.prototype.lookForInRange', 'found ' + results.length + ' ' + lookType);

    results = results.map(r => r[lookType]);
    return results;
}
