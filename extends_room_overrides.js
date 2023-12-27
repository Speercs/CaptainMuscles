'use strict'

Room.prototype.createConstructionSiteOneAtATime = function (x, y, type)
{
    if (!Memory.empire || !Memory.empire.construction)
        return this.createConstructionSite(x, y, type);

    if (Memory.empire.construction.lastCreateTick == Game.time || _.find(Game.constructionSites, s => s.structureType == type))
        return 'wait';

    Memory.empire.construction.lastCreateTick = Game.time;
    return this.createConstructionSite(x, y, type);
}
