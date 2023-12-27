'use strict'

const constants = require('constants');

class Base_Labs extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base_Labs.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        this.room = Game.rooms[this.data.room];

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory.labs)
            baseMemory.labs = this.setupLabMemory();

        this.memory = baseMemory.labs
    }

    start()
    {
        super.start();

        //this.launchChildProcess(`empty_labs`, 'mission_empty_labs', { room: this.data.room });

        if (this.memory.rip)
            this.cancelReactionInProgress();

        this.setupLabMemory();
    }

    run()
    {
        super.run();
        //console.log('Base_Labs.run - ' + this.data.room + ' - executing - ' + this.data.sleepReactions);

        if (this.room.controller.level < 6)
            return this.suicide();

        this.updateReactions();
        this.updateBoosts();
        this.updateStatus();

        //this.sleep(5);

        // let sleepTime = 100;

        // // if (this.data.sleepReactions && this.data.sleepReactions < sleepTime)
        // //     sleepTime = this.data.sleepReactions + 1;

        // let labs = this.room.labs;
        // if (labs)
        // {
        //     let maxLabCoolDown = -1
        //     for (let lab of labs)
        //     {
        //         if (lab.id == this.memory.inputLab1 || lab.id == this.memory.inputLab2)
        //             continue;

        //         if (lab.coolDown && lab.coolDown > maxLabCoolDown)
        //             maxLabCoolDown = lab.coolDown;
        //     }

        //     if (maxLabCoolDown > 0)
        //     {
        //         if (maxLabCoolDown + 1 < sleepTime)
        //             sleepTime = maxLabCoolDown + 1;
        //     }
        //     else if (this.memory.rip)
        //     {
        //         sleepTime = this.memory.rip.interval;
        //     }
        // }

        
        // let spawns = this.room.spawns;
        // if (spawns.length > 0)
        // {
        //     for (let spawn of spawns)
        //     {
        //         if (spawn.spawning && spawn.spawning.remainingTime && spawn.spawning.remainingTime + 1 < sleepTime)
        //             sleepTime = spawn.spawning.remainingTime + 1;
        //     }
        // }

        // //console.log('Base_Labs.run - ' + this.data.room + ' - sleeping labs for - sleepTime: ' + sleepTime + ', this.data.sleepReactions: ' + this.data.sleepReactions);
        // this.sleep(sleepTime);
    }

    updateReactions()
    {
        if (this.data.sleepReactions)
        {
            if (this.memory.rip)
            {
                this.data.sleepReactions -= 1;
                if (this.data.sleepReactions > 0)
                    return;
            }
        }

        if (Room.sendingAwayResources(this.data.room))
        {
            if (this.memory.rip)
                this.cancelReactionInProgress();
            this.sleepReactions(1000);
            return;
        }

        if (this.memory.rip)
        {
            if (this.memory.rip.timer <= 0 || this.memory.rip.outputAmount <= 0)
            {
                this.cancelReactionInProgress();
            }
            else
            {
                this.doReaction();
                return;
            }
        }

        if (!Memory.empire || !Memory.empire.accounting || !Memory.empire.accounting.projectedResources)
            return;

        this.memory = this.setupLabMemory();

        if (this.memory.labCount < 3)
        {
            this.sleepReactions(100);
            return;
        }

        if (Memory.empire && Memory.empire.accounting)
            this.startNextReaction();
    }

    sleepReactions(time)
    {
        this.data.sleepReactions = time;
    }

    cancelReactionInProgress()
    {
        delete this.memory.rip;
        if (this.memory.inputLab1)
            this.endChildProcess(`fill_lab_${this.memory.inputLab1}`);
        if (this.memory.inputLab2)
            this.endChildProcess(`fill_lab_${this.memory.inputLab2}`);
    }

    setupLabMemory()
    {
        if (this.memory)
            this.cancelReactionInProgress();

        let labMemory = {}

        labMemory.boostRequests = [];
        if (this.memory && this.memory.boostRequests)
            labMemory.boostRequests = this.memory.boostRequests;

        let labs = this.room.getStructures(STRUCTURE_LAB);
        labMemory.labCount = labs.length;

        labMemory.labStatus = [];
        for (let lab of labs)
        {
            labMemory.labStatus.push({ id: lab.id });
        }

        if (labMemory.labCount > 2)
        {
            // select input labs
            let labDistances = {};

            for (let lab of labs)
            {
                labDistances[lab.id] = 0;
                for (let otherLab of labs)
                    labDistances[lab.id] += otherLab.pos.getRangeTo(lab);
            }

            labs = _.sortBy(labs, lab => labDistances[lab.id]);

            labMemory.inputLab1 = labs[0].id;
            labMemory.inputLab2 = labs[1].id;
        }

        let baseMemory = Room.getBaseMemory(this.data.room);
        baseMemory.labs = labMemory;
        this.memory = labMemory;

        return labMemory;
    }

    startNextReaction()
    {
        this.cancelReactionInProgress();

        let priorityReactionProducts = constants.PRIORITY_COMPOUNDS;
        let baseCount = Room.getMyBases().length;

        for (let priorityReactionGroup of priorityReactionProducts)
        {
            let desiredAmount = priorityReactionGroup.a;
            let haveAmount = 0;
            for (let product of priorityReactionGroup.r)
            {
                let amount = Room.getStoredResourceAmount(this.data.room, product);
                if (amount > desiredAmount)
                    break;

                if (this.tryStartReaction(product, baseCount))
                    return;
            }
        }

        let products = this.selectNextReactionProducts();
        if (!products || products.length <= 0)
        {
            this.sleepReactions(100);
            return;
        }

        for (let product of products)
        {
            if (this.tryStartReaction(product, baseCount))
                return;
        }

        this.cancelReactionInProgress();
        this.sleepReactions(100);
        return;
    }

    tryStartReaction(product, baseCount)
    {
        let reactionInfo = {};

        reactionInfo.input1 = constants.BOOST_COMPONENTS[product][0];
        reactionInfo.input2 = constants.BOOST_COMPONENTS[product][1];
        reactionInfo.output = product;
        reactionInfo.interval = REACTION_TIME[product];

        let input1Count = Room.getStoredResourceAmount(this.data.room, reactionInfo.input1);
        let input2Count = Room.getStoredResourceAmount(this.data.room, reactionInfo.input2);
        let desiredProductAmount = Room.getDesiredResourceAmount(this.data.room, product);
        let output2Desired = ((desiredProductAmount * baseCount) - (Memory.empire.accounting.projectedResources[reactionInfo.output] || 0)) / baseCount;
        // if (output2Desired <= 0)
        //     return false;

        // Don't make any more than we can, or need
        let minimumInputAmount = Math.min(input1Count, input2Count, output2Desired);
        let numberOfCycles = Math.floor(minimumInputAmount / LAB_REACTION_AMOUNT);
        // Halve it so we reconsider our options before using all the inputs up
        numberOfCycles = Math.ceil(numberOfCycles / 2);
        let expectedReactionTime = numberOfCycles * reactionInfo.interval;

        //console.log("Base_Labs.startNextReaction - " + this.room.name + " - checking reaction: " + reactionInfo.input2 + " + " + reactionInfo.input1 + " => " + reactionInfo.output + ". Expected time: " + expectedReactionTime);

        if (expectedReactionTime <= 100 || 
            input1Count < 500 || 
            input2Count < 500)
            return false;

        reactionInfo.timer = expectedReactionTime;
        reactionInfo.labCount = this.memory.labCount;

        reactionInfo.outputAmount = numberOfCycles * LAB_REACTION_AMOUNT;

        //console.log(input1Count + ' - ' + input2Count + ' - ' + numberOfCycles + ' - ' + totalCycleTime + ' - ' + expectedReactionTime)

        console.log("Base_Labs.startNextReaction - " + this.room.name + " - selected reaction: " + reactionInfo.input2 + " + " + reactionInfo.input1 + " => " + reactionInfo.output + ". Expected time: " + expectedReactionTime);

        this.memory.rip = reactionInfo;

        // Update empire projections now in case multiple bases updating in one tick
        if (Memory.empire && Memory.empire.accounting && Memory.empire.accounting.projectedResources)
        {
            Memory.empire.accounting.projectedResources[reactionInfo.input1] = (Memory.empire.accounting.projectedResources[reactionInfo.input1] || 0) - reactionInfo.outputAmount;
            Memory.empire.accounting.projectedResources[reactionInfo.input2] = (Memory.empire.accounting.projectedResources[reactionInfo.input2] || 0) - reactionInfo.outputAmount;
            Memory.empire.accounting.projectedResources[reactionInfo.output] = (Memory.empire.accounting.projectedResources[reactionInfo.output] || 0) + reactionInfo.outputAmount;
        }

        this.sleepReactions(reactionInfo.interval);
        return true;
    }

    selectNextReactionProducts()
    {
        let productScores = [];
        for (let resourceType of constants.COMPOUNDS_TO_PRODUCE)
        {
            if (this.canMakeProduct(resourceType))
            {
                let haveAmount = Memory.empire.accounting.projectedResources[resourceType] || 0;
                let desiredAmount = Room.getDesiredResourceAmount(this.data.room, resourceType);
                productScores.push({ r: resourceType, s: haveAmount / (desiredAmount + 1) });
            }
        }

        if (productScores.length > 0)
        {
            productScores.sort((a, b) => a.s - b.s);
            return productScores.map(ps => ps.r);
        }

        return null;
    }

    canMakeProduct(product)
    {
        let total = Room.getStoredResourceAmount(this.data.room, product);
        let desiredProductAmount = Room.getDesiredResourceAmount(this.data.room, product);

        if (total < desiredProductAmount)
        {
            let componentAmounts = constants.BOOST_COMPONENTS[product].map(c => Room.getResourceAmountLevel(this.data.room, c));
            return (_.min(componentAmounts) >= constants.RESOURCE_LEVEL_CRITICAL);
        }

        return false;
    }

    doReaction()
    {
        if (!this.memory.rip)
            return;

        let reactionInfo = this.memory.rip;

        let labs = this.room.getStructures(STRUCTURE_LAB);
        let inputLab1 = Game.getObjectById(this.memory.inputLab1);
        let inputLab2 = Game.getObjectById(this.memory.inputLab2);

        if (!inputLab1 || !inputLab2)
        {
            this.cancelReactionInProgress();
            return;
        }

        let labCount = labs.length;

        if (labCount != this.memory.rip.labCount)
        {
            this.cancelReactionInProgress();
            return;
        }

        if (inputLab1.mineralType != reactionInfo.input1 || inputLab2.mineralType != reactionInfo.input2)
            return;


        for (let lab of labs)
        {
            if (lab.coolDown || lab.busy || lab.id == this.memory.inputLab1 || lab.id == this.memory.inputLab2)
                continue;
                
            if (this.memory.labStatus)
            {
                let thisLabStatus = _.find(this.memory.labStatus, ls => ls.id == lab.id);
                if (thisLabStatus && thisLabStatus.boost && thisLabStatus.boost != reactionInfo.output)
                    continue;
            }

            if (!lab.mineralType || lab.mineralType == reactionInfo.output)
            {
                let outputAmount = 5;
                let effectInfo = _.find(lab.effects, e => e.effect == PWR_OPERATE_LAB);
                if (effectInfo)
                    outputAmount += effectInfo.level * 2;

                lab.runReaction(inputLab1, inputLab2);
                this.memory.rip.timer -= reactionInfo.interval;
                reactionInfo.outputAmount -= outputAmount;
            }
        }

        this.sleepReactions(reactionInfo.interval);
    }

    updateBoosts()
    {
        if (!this.memory.boostRequests)
            this.memory.boostRequests = [];

        this.memory.boostRequests = _.filter(this.memory.boostRequests, br => Memory.creeps[br.creep]);

        let boostsDesired = this.sumBoostRequests();

        this.removeOldBoosts(boostsDesired);
        this.addNewBoosts(boostsDesired);
    }

    sumBoostRequests()
    {
        let boostsDesired = {};

        for (let boostRequest of this.memory.boostRequests)
        {
            if (!boostsDesired[boostRequest.boost])
                boostsDesired[boostRequest.boost] = 0;

            boostsDesired[boostRequest.boost] += boostRequest.amount;
        }

        return boostsDesired;
    }

    removeOldBoosts(boostsDesired)
    {
        for (let labStatus of this.memory.labStatus)
        {
            if (labStatus.boost && !boostsDesired[labStatus.boost])
            {
                delete labStatus.boost;
                delete labStatus.amount;
            }
        }
    }

    addNewBoosts(boostsDesired)
    {
        for (let desiredBoost in boostsDesired)
        {
            let boostActive = _.find(this.memory.labStatus, ls => ls.boost == desiredBoost);
            if (!boostActive)
            {
                let newBoost = _.findLast(this.memory.labStatus, ls => !ls.boost && !ls.input);
                if (!newBoost)
                    newBoost = _.findLast(this.memory.labStatus, ls => !ls.boost);
                if (newBoost)
                {
                    newBoost.boost = desiredBoost;
                    newBoost.amount = boostsDesired[desiredBoost];
                }
            }
            else
            {
                boostActive.amount = boostsDesired[desiredBoost];
            }
        }
    }

    updateStatus()
    {
        for (let labStatus of this.memory.labStatus)
        {
            let lab = Game.getObjectById(labStatus.id);

            let inputLab = 0;
            let inputResource = null;
            if (this.memory.rip && this.memory.inputLab1 == labStatus.id)
            {
                inputLab = 1;
                inputResource = this.memory.rip.input1;
            }
            else if (this.memory.rip && this.memory.inputLab2 == labStatus.id)
            {
                inputLab = 2;
                inputResource = this.memory.rip.input2;
            }

            if (inputLab)
            {
                labStatus.input = inputLab;
                labStatus.resource = inputResource;
            }
            else if (this.memory.rip)
            {
                delete labStatus.input;
                labStatus.resource = this.memory.rip.output;
            }
            else
            {
                delete labStatus.input;
                delete labStatus.resource;
            }

            // if (lab && labStatus.boost && (!lab.mineralType || (lab.mineralType == labStatus.boost && lab.store.getUsedCapacity(labStatus.boost) < labStatus.amount)))
            // {
            //     let amount = labStatus.amount;
            //     lab.room.requestResourceDropoff(lab, amount, labStatus.boost);
            // }
            // else if (lab && labStatus.boost && lab.store.getUsedCapacity(RESOURCE_ENERGY) < LAB_ENERGY_CAPACITY)
            // {
            //     let amount = LAB_ENERGY_CAPACITY;
            //     lab.room.requestResourceDropoff(lab, amount, RESOURCE_ENERGY);
            // }
            // else if (lab && inputLab && !labStatus.boost && (!lab.mineralType || (lab.mineralType == inputResource && lab.store.getUsedCapacity(inputResource) < this.memory.rip.outputAmount)))
            // {
            //     let amount = this.memory.rip.outputAmount;
            //     lab.room.requestResourceDropoff(lab, amount, inputResource);
            // }
            // else if (lab)
            // {
            //     lab.room.cancelResourceDropoff(lab);
            // }

            // if (lab && labStatus.boost && lab.mineralType && lab.mineralType != labStatus.boost)
            //     lab.room.requestResourcePickup(lab, lab.store.getUsedCapacity(lab.mineralType), 0, 0);
            // else if (lab && inputLab && !labStatus.boost && lab.mineralType && lab.mineralType != inputResource)
            //     lab.room.requestResourcePickup(lab, lab.store.getUsedCapacity(lab.mineralType), 0, 0);
            // else if (lab && !inputLab && !labStatus.boost && !this.memory.rip && lab.mineralType)
            //     lab.room.requestResourcePickup(lab, lab.store.getUsedCapacity(lab.mineralType), 0, 0);
            // else if (lab && !inputLab && !labStatus.boost && this.memory.rip && lab.mineralType && lab.mineralType != this.memory.rip.output)
            //     lab.room.requestResourcePickup(lab, lab.store.getUsedCapacity(lab.mineralType), 0, 0);
            // else if (lab && !inputLab && !labStatus.boost && this.memory.rip && lab.mineralType && lab.mineralType == this.memory.rip.output && lab.store.getUsedCapacity(lab.mineralType) >= LAB_MINERAL_CAPACITY * 0.75)
            //     lab.room.requestResourcePickup(lab, lab.store.getUsedCapacity(lab.mineralType), 0, 0);
            // else if (lab)
            //     Room.cancelResourcePickup(lab.room.name, lab.id);
        }


    }
}

module.exports = Base_Labs;
