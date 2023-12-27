'use strict'

const constants = require('constants');

RoomObject.prototype.aggressionRating = function()
{
    if (this.my)
        return constants.AGGRESSION_LEVEL_ALLY;
        
    if (!this.owner)
        return constants.AGGRESSION_LEVEL_NEUTRAL;

    // if (Memory && Memory.empire && Memory.empire.warfare && Memory.empire.warfare.targets && Memory.empire.warfare.targets.length > 0 && Memory.empire.warfare.targets[0] == this.owner.username)
    //     return constants.AGGRESSION_LEVEL_ENEMY;

    if (Memory && Memory.empire && Memory.empire.nextClaim && Memory.empire.nextClaim == this.room.name && this.partCount && this.partCount(CLAIM))
        return constants.AGGRESSION_LEVEL_ENEMY;

    if (!Memory.diplomacy || !Memory.diplomacy.ratings || !Memory.diplomacy.ratings[this.owner.username])
        return constants.AGGRESSION_LEVEL_NEUTRAL;

    return Memory.diplomacy.ratings[this.owner.username];
}

RoomObject.prototype.attackInCombat = function()
{
    if (this.my)
        return false;

    if (!this.owner && this.structureType != STRUCTURE_CONTROLLER && (!this.room.controller || !this.room.controller.attackInCombat()))
        return false;

    let minimumAggressionLevel = constants.AGGRESSION_LEVEL_NEUTRAL;
    if (Room.isMyBase(this.room.name))
        minimumAggressionLevel = constants.AGGRESSION_LEVEL_FRIENDLY;

    return (this.isSourceKeeper() || this.isInvader() || this.aggressionRating() >= minimumAggressionLevel);
}

RoomObject.prototype.healInCombat = function()
{
    if (this.my)
        return true;

    let maximumAggressionLevel = constants.AGGRESSION_LEVEL_FRIENDLY;
    if (Room.isMyBase(this.room.name))
        maximumAggressionLevel = constants.AGGRESSION_LEVEL_ALLY;

    return (!this.isSourceKeeper() && !this.isInvader() && this.aggressionRating() <= maximumAggressionLevel);
}

RoomObject.prototype.killOnSight = function()
{
    if (this.my)
        return false;

    if (!this.owner && !Room.killOnSight(this.room.name))
        return false;

    if (!Room.isMyBase(this.room.name) && this.body && !this.body.some(bp => bp.type != MOVE))
        return false;
    
    let minimumAggressionLevel = constants.AGGRESSION_LEVEL_NEUTRAL;
    if (Room.isMyBase(this.room.name))
        minimumAggressionLevel = constants.AGGRESSION_LEVEL_FRIENDLY;

    return (!this.isSourceKeeper() && (this.isInvader() || this.aggressionRating() >= minimumAggressionLevel));
}

RoomObject.prototype.killRemotely = function()
{
    if (this.my)
        return false;
    
    let minimumAggressionLevel = constants.AGGRESSION_LEVEL_ENEMY;

    if (this.body && !this.body.some(bp => bp.type != MOVE))
        return false;

    return (!this.isSourceKeeper() && !this.isInvader() && this.aggressionRating() >= minimumAggressionLevel);
}


Room.aggressionRating = function(roomName)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.controller || (!roomMemory.controller.o && !roomMemory.controller.r))
        return constants.AGGRESSION_LEVEL_NEUTRAL;

    // if (Memory && Memory.empire && Memory.empire.warfare && Memory.empire.warfare.targets && Memory.empire.warfare.targets.length > 0 && (Memory.empire.warfare.targets[0] == roomMemory.controller.o || Memory.empire.warfare.targets[0] == roomMemory.controller.r))
    //     return constants.AGGRESSION_LEVEL_ENEMY;

    if (!Memory.diplomacy || !Memory.diplomacy.ratings || (!Memory.diplomacy.ratings[roomMemory.controller.o] && !Memory.diplomacy.ratings[roomMemory.controller.r]))
        return constants.AGGRESSION_LEVEL_NEUTRAL;

    return Memory.diplomacy.ratings[roomMemory.controller.o] || Memory.diplomacy.ratings[roomMemory.controller.r];
}

Room.trusted = function(roomName)
{
    let maximumAggressionLevel = constants.AGGRESSION_LEVEL_ALLY;

    return (Room.aggressionRating(roomName) <= maximumAggressionLevel);
}

Room.friendly = function(roomName)
{
    let maximumAggressionLevel = constants.AGGRESSION_LEVEL_FRIENDLY;

    return (Room.aggressionRating(roomName) <= maximumAggressionLevel);
}

Room.killOnSight = function (roomName)
{
    let minimumAggressionLevel = constants.AGGRESSION_LEVEL_NEUTRAL;

    return (Room.aggressionRating(roomName) >= minimumAggressionLevel);
}

Room.killRemotely = function (roomName)
{
    let minimumAggressionLevel = constants.AGGRESSION_LEVEL_ENEMY;

    return (Room.aggressionRating(roomName) >= minimumAggressionLevel);
}