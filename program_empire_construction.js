'use strict'

const constants = require('constants');

class Empire_Construction extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Empire_Construction.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        if (Memory.empire)
        {
            if (!Memory.empire.construction)
                Memory.empire.construction = { sites: {}, c: 0 };

            this.memory = Memory.empire.construction;
        }
    }

    run()
    {
        //console.log('Empire_Construction.run - ' + this.data.spawn + ' - executing');
        if (!this.memory)
            return;

        this.updateSites();
        this.checkPlanVersion();

        if (this.memory.replanList && this.memory.replanList.length > 0)
            this.doReplanning();
    }

    updateSites()
    {
        let staleTime = 50000;


        let siteIds = Object.keys(Game.constructionSites);

        let tooOld = Game.time - (staleTime / (siteIds.length + 1));

        if (Object.keys(this.memory.sites).length > siteIds.length)
        {
            for (var siteID in this.memory.sites)
            {
                if (!Game.getObjectById(siteID))
                {
                    delete this.memory.sites[siteID];
                }
            }
        }

        let count = 0;

        for (let siteID in Game.constructionSites)
        {
            let site = Game.getObjectById(siteID);
            let siteMemory = this.memory.sites[siteID];
            count += 1;

            if (!siteMemory)
            {
                siteMemory = {p: site.progress, t: site.progressTotal, c: Game.time};
                this.memory.sites[siteID] = siteMemory;
            }
            else if (site.progress != siteMemory.p)
            {
                siteMemory.p = site.progress;
                siteMemory.c = Game.time;
            }
            else if (siteMemory.c < tooOld)
            {
                site.remove();
            }
        }

        this.memory.c = count;
    }

    checkPlanVersion()
    {
        if (!Memory.empire.bases)
            return;

        if (this.memory.replanList)
        {
            if (this.memory.replanList.length == 0)
                delete this.memory.replanList;
            else
                return;
        }

        if (!this.memory.version)
            this.memory.version = 1;

        let baseMemories = Memory.empire.bases;
        let replanList = [];

        for (let baseName in baseMemories)
        {
            let basePlanMemory = Room.getBasePlanMemory(baseName);
            if (basePlanMemory && basePlanMemory.planComplete && basePlanMemory.version != this.memory.version)
            {
                replanList.push(baseName);
            }
        }

        if (replanList.length > 0)
            this.memory.replanList = replanList;
        else
            delete this.memory.replanList;
    }

    doReplanning()
    {
        let baseMemories = Memory.empire.bases;
        let nextReplanMemory = Room.getBaseMemory(this.memory.replanList[0]);
        let nextBasePlanMemory = Room.getBasePlanMemory(this.memory.replanList[0]);
        let nextReplanBase = Game.rooms[this.memory.replanList[0]];

        while (!Room.isMyBase(this.memory.replanList[0]) || (nextBasePlanMemory && nextBasePlanMemory.planComplete && nextBasePlanMemory.version == this.memory.version))
        {
            if (Room.isMyBase(this.memory.replanList[0]))
            {
                if (!nextReplanBase.structures ||
                    !nextReplanBase.structures[STRUCTURE_SPAWN] ||
                     nextReplanBase.structures[STRUCTURE_SPAWN].length < CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][nextReplanBase.controller.level] ||
                    (nextReplanBase.controller.level >= 6 && (!nextReplanBase.terminal || !nextReplanBase.terminal.my)))
                     return;
            }

            this.memory.replanList.shift();
            if (this.memory.replanList.length > 0)
            {
                nextReplanMemory = baseMemories[this.memory.replanList[0]];
                nextBasePlanMemory = Room.getBasePlanMemory(this.memory.replanList[0]);
                nextReplanBase = Game.rooms[this.memory.replanList[0]]
            }
            else
            {
                nextReplanMemory = null;
                delete this.memory.replanList;
            }
        }

        if (!nextReplanMemory)
            return;

        if (!nextReplanMemory.replan)
        {
            console.log('Empire_Construction.doReplanning - beginning replanning on base ' + this.memory.replanList[0]);
            nextReplanMemory.replan = 1;
        }

    }
}

module.exports = Empire_Construction;
