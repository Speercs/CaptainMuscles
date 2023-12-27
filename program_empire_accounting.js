'use strict'

const constants = require('constants');

class Empire_Accounting extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Empire_Accounting.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        if (!Memory.empire)
            Memory.empire = {};
        if (!Memory.empire.accounting)
            Memory.empire.accounting = {};

        this.memory = Memory.empire.accounting;
    }

    run()
    {
        //console.log('Empire_Accounting.run - ' + this.data.spawn + ' - executing');

        this.memory.credits = Game.market.credits;

        this.memory.totalIn = 0;
        this.memory.totalOut = 0;
        this.memory.totalCostPerTick = 0;
        delete this.memory.heldEnergy;

        this.memory.resources = {};
        this.memory.projectedResources = {};
        this.memory.mineralTypes = {};

        for (let mineralType of constants.RESOURCES_MINERAL)
        {
            this.memory.mineralTypes[mineralType] = 0;
        }

        const bases = Room.getMyBases();

        for (let base of bases)
        {
            let baseMemory = Room.getBaseMemory(base.name);
            if (!baseMemory)
                continue;

            this.memory.totalIn += (baseMemory.totalIn || 0);
            this.memory.totalOut += (baseMemory.totalOut || 0);
            this.memory.totalCostPerTick += (baseMemory.totalCostPerTick || 0);

            if (baseMemory.accounting && baseMemory.accounting.resources)
            {
                this.memory.mineralTypes[baseMemory.accounting.mineralType] = (this.memory.mineralTypes[baseMemory.accounting.mineralType] || 0) + 1;
                for (let resourceType of RESOURCES_ALL)
                {
                    this.memory.resources[resourceType] = (this.memory.resources[resourceType] || 0);
                    if (!baseMemory.accounting.resources[resourceType])
                        continue;
                    this.memory.resources[resourceType] += baseMemory.accounting.resources[resourceType];
                    this.memory.projectedResources[resourceType] = this.memory.resources[resourceType];
                }
            }

            if (baseMemory.labs && baseMemory.labs.rip)
            {
                let reactionInfo = baseMemory.labs.rip;
                this.memory.projectedResources[reactionInfo.input1] = (this.memory.projectedResources[reactionInfo.input1] || 0) - reactionInfo.outputAmount;
                this.memory.projectedResources[reactionInfo.input2] = (this.memory.projectedResources[reactionInfo.input2] || 0) - reactionInfo.outputAmount;
                this.memory.projectedResources[reactionInfo.output] = (this.memory.projectedResources[reactionInfo.output] || 0) + reactionInfo.outputAmount;
            }
        }

        let mostMineralType = RESOURCE_HYDROGEN;
        let mostMineralAmount = this.memory.mineralTypes[mostMineralType] || 0;
        for (let mineralType of constants.RESOURCES_MINERAL)
        {
            let empireMineralAmount = this.memory.resources[mineralType] || 0;
            if (empireMineralAmount > mostMineralAmount)
            {
                mostMineralType = mineralType;
                mostMineralAmount = empireMineralAmount;
            }
        }

        this.memory.mineralValues = {};
        for (let mineralType of constants.RESOURCES_MINERAL)
        {
            let empireMineralAmount = this.memory.resources[mineralType] || 0;
            let relativeMineralAmount = empireMineralAmount / (mostMineralAmount || 0);

            let mineralValue = constants.BASE_MINERAL_VALUE[mineralType];
            if (empireMineralAmount == 0)
                mineralValue = constants.BASE_MINERAL_PRIORITY[mineralType];

            this.memory.mineralValues[mineralType] = (1 - relativeMineralAmount) * mineralValue;
            //this.memory.mineralValues[mineralType] = (this.memory.mineralTypes[mostMineralType] - this.memory.mineralTypes[mineralType]) * constants.BASE_MINERAL_VALUE[mineralType];
        }
            
    }
}

module.exports = Empire_Accounting;
