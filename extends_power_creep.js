'use strict'

// PowerCreep.prototype._move = PowerCreep.prototype.move;
//
// PowerCreep.prototype.move = function(direction)
// {
//     this.canMove = false;
//     return this._move(direction);
// }

PowerCreep.prototype.hasPower = function(powerName)
{
    let powerInfo = this.powers[powerName];
    if (!powerInfo)
        return false;
    return true;
}

PowerCreep.prototype.hasPowerLevel = function(powerName, powerLevel, exact = false)
{
    let powerInfo = this.powers[powerName];
    if (!powerInfo)
        return false;
    return ((!exact && powerInfo.level >= powerLevel) || (exact && powerInfo.level == powerLevel));
}
