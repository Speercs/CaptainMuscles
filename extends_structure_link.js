'use strict'

StructureLink.prototype.requestEnergy = function()
{
    //console.log('StructureLink.requestEnergy - link ' + this.id + ' - ' + this.pos + ' - requesting energy')
    this.room.requestEnergyForLink(this);
}

StructureLink.prototype.sendEnergy = function()
{
    this.room.offerEnergyFromLink(this);
}
