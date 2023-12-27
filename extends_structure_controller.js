'use strict'

StructureController.prototype.canSafeMode = function()
{
    if (!this.my)
        return false;

    if (!this.safeModeAvailable)
        return false;

    if (this.safeModeCooldown)
        return false;

    let allMyBases = Room.getMyBases();
    let allMyControllers = allMyBases.map(b => b.controller);

    if (_.find(allMyControllers, c => c.safeMode))
        return false;

    return true;
}


StructureController.prototype.reservedByMe = function()
{
    return this.reservation && this.reservation.username == ME;
}
