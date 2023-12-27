'use strict'

const constants = require('constants');

const COM_SEGMENT_NUMBER = 98;

const requestTypes = 
{
    RESOURCE: 0,
    DEFENSE: 1,
    ATTACK: 2,
    EXECUTE: 3,
    HATE: 4,
    FUNNEL:5,
};

const funnelGoalType = 
{
    GCL: 0,
    RCL7: 1,
    RCL8: 2,
};

const DEFAULT_REQUEST_TIME = 1000;

class Program_Empire_SWC_Allies extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Program_Empire_SWC_Allies.constructor - executing');

        this.frequency = 100;
        this.priority = global.PROCESS_PRIORITY_MONITOR;

        if (!this.data.allyIndex)
            this.data.allyIndex = 0;

        if (!this.data.requests)
            this.data.requests = [];

        this.allies = ["CaptainMuscles"]//, "AliceBot", "EmmaBot", "JackBot", "MichaelBot", "Saruss", "Yoner", "RayderBlitz", "Mirroar"];
    }

    refresh()
    {
        super.refresh();
    }

    run()
    {
        super.run();

        if (this.allies.length <= 0)
            return this.sleep(100);

        this.setupSegments();

        this.checkAllyRequests();
        this.data.allyIndex += 1;

        if (this.data.allyIndex >= this.allies.length)
        {
            this.data.allyIndex = 0;
            this.queueAllyForeignSegment();

            this.fullfillRequests();
            this.makeRequests();

            return this.sleep(100);
        }
        
        this.queueAllyForeignSegment();
        return this.sleep(1);
    }

    setupSegments()
    {
        RawMemory.setActiveSegments([COM_SEGMENT_NUMBER])
        RawMemory.setPublicSegments([COM_SEGMENT_NUMBER]);
        RawMemory.setDefaultPublicSegment(COM_SEGMENT_NUMBER);
    }

    queueAllyForeignSegment()
    {
        if (this.data.allyIndex >= this.allies.length)
            return;

        let allyName = this.allies[this.data.allyIndex];
        if (allyName == ME)
            RawMemory.setActiveForeignSegment(null);
        else
            RawMemory.setActiveForeignSegment(allyName, COM_SEGMENT_NUMBER);
    }

    checkAllyRequests()
    {
        if (!RawMemory.foreignSegment || RawMemory.foreignSegment.username == ME || !RawMemory.foreignSegment.data)
            return;

        let requests = JSON.parse(RawMemory.foreignSegment.data);

        console.log('***************Program_Empire_SWC_Allies.checkAllyRequests - requests from ' + RawMemory.foreignSegment.username + ' - ' + RawMemory.foreignSegment.data);

        if (!Array.isArray(requests))
            return;

        this.data.requests = this.data.requests.concat(requests);
    }

    // utility
    desiredResourceAmount(bases, resourceType)
    {
        let amount = (Memory.empire.accounting.resources[resourceType] || 0);
        let desiredMaxAmount = (constants.DESIRED_RESOURCE_AMOUNT[resourceType] || 0) * constants.LOW_RESOURCE_THRESHOLD * bases.length;
        let desiredAmount = desiredMaxAmount - amount;

        return desiredAmount;
    }

    // fullfillRequests() ----------------------------------------------------
    fullfillRequests()
    {
        this.checkResourceRequests();
        this.checkFunnelRequests();
        this.checkDefenseRequests();
        this.checkAttackRequests();
        this.data.requests = [];
    }

    checkResourceRequests()
    {
        let resourceRequests = this.data.requests.filter(r => r.requestType == requestTypes.RESOURCE && r.priority && r.priority > 0 && r.roomName && r.resourceType && r.maxAmount && (!r.timeout || r.timeout > Game.time));
        if (resourceRequests.length <= 0)
            return;

        console.log('***************Program_Empire_SWC_Allies.checkResourceRequests - ' + resourceRequests.length + ' RESOURCE requests received');

        let bases = Room.getMyBases();
        let myBasesWithTerminals = bases.filter(b => b.controller.level >= 6 && b.terminal && b.terminal.my);
        let mySendableBases = myBasesWithTerminals.filter(b => Room.getResourceAmountLevel(b.name, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_LOW);
        if (myBasesWithTerminals.length <= 0 || mySendableBases.length <= 0)
        {
            //console.log('***************Program_Empire_SWC_Allies.checkResourceRequests - no bases that can send resources');
            return;
        }

        resourceRequests = _.sortByOrder(resourceRequests, 
            [r => r.maxAmount, 
             r => r.priority],
            ['asc', 'desc']);

        // for (let resourceRequest of resourceRequests)
        // {
        //     this.fullfillResourceRequest(resourceRequest, bases, myBasesWithTerminals);
        // }
    }

    fullfillResourceRequest(request, bases, mySendableBases)
    {
        //console.log('***************Program_Empire_SWC_Allies.fullfillResourceRequest - attempting to fulfill request: ' + JSON.stringify(request));

        mySendableBases = mySendableBases.filter(b => Room.getResourceAmountLevel(b.name, request.resourceType) > constants.RESOURCE_LEVEL_LOW);
        if (mySendableBases.length <= 0)
        {
            //console.log('***************Program_Empire_SWC_Allies.fullfillResourceRequest - no bases that can send ' + request.resourceType);
            return false;
        }

        let amount = (Memory.empire.accounting.resources[request.resourceType] || 0);
        let desiredMaxAmount = (constants.DESIRED_RESOURCE_AMOUNT[request.resourceType] || 0) * constants.LOW_RESOURCE_THRESHOLD * bases.length;
        let desiredAmount = desiredMaxAmount - amount;

        if (desiredAmount > request.maxAmount)
        {
            console.log('***************Program_Empire_SWC_Allies.fullfillResourceRequest - more ' + request.resourceType + ' needed than requested');
            return false;
        }
            

        let baseToSend = _.min(mySendableBases, b => Game.map.getRoomLinearDistance(b.name, request.roomName, true));
        let amountToSend = (Math.min(baseToSend.terminal.store.getUsedCapacity(RESOURCE_ENERGY), baseToSend.terminal.store.getUsedCapacity(request.resourceType)) / 2) * request.priority;
        let sendCost = Game.market.calcTransactionCost(amountToSend, baseToSend.name, request.roomName);
        if (amountToSend <= 1 || amountToSend < sendCost)
            return;

        if (amountToSend > request.maxAmount)
            amountToSend = request.maxAmount;

        console.log('Program_Empire_SWC_Allies.fullfillResourceRequest - want to send ' + amountToSend + ' ' + request.resourceType + ' from ' + baseToSend.name + ' to ' + request.roomName);

        Room.makeTradeRequest(baseToSend.name, request.roomName, request.resourceType, amountToSend);

        return true;
    }

    checkFunnelRequests()
    {
        let funnelRequests = this.data.requests.filter(r => r.requestType == requestTypes.FUNNEL && r.priority && r.priority > 0 && r.roomName && r.maxAmount && r.timeout > Game.time);
        if (funnelRequests.length <= 0)
            return;

        console.log('***************Program_Empire_SWC_Allies.checkFunnelRequests - ' + funnelRequests.length + ' FUNNEL requests received');

        let myBasesWithTerminals = Room.getMyBases().filter(b => b.controller.level >= 6 && b.terminal && b.terminal.my);
        let mySendableBases = myBasesWithTerminals.filter(b => Room.getResourceAmountLevel(b.name, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_MODERATE);

        if (myBasesWithTerminals.length <= 0 || mySendableBases.length <= 0)
        {
            console.log('***************Program_Empire_SWC_Allies.checkFunnelRequests - no bases that can send energy');
            return;
        }
            
        let highestPriorityRequest = _.min(funnelRequests, r => r.maxAmount);

        let myBasesNeedingEnergy = myBasesWithTerminals.filter(b => b.controller.level < 8);
        if (myBasesNeedingEnergy.length <= 0)
        {
            this.fullfillFunnelRequest(highestPriorityRequest, mySendableBases);
            return;
        }

        let myBaseMostNeedingEnergy = _.min(myBasesNeedingEnergy, b => b.controller.progressTotal - b.controller.progress);

        let progressRemaining = myBaseMostNeedingEnergy.controller.progressTotal - myBaseMostNeedingEnergy.controller.progress;
        let gclProgressRemaining = Game.gcl.progressTotal - Game.gcl.progress;

        if (progressRemaining <= highestPriorityRequest.maxAmount || gclProgressRemaining <= highestPriorityRequest.maxAmount)
            return;

        // let optimalEnergyAmount = (Room.getDesiredResourceAmount(myBaseMostNeedingEnergy.name, RESOURCE_ENERGY) * constants.NORMAL_RESOURCE_THRESHOLD);
        // let energyAmount = Room.getStoredResourceAmount(myBaseMostNeedingEnergy.name, RESOURCE_ENERGY)

        // let myPriority = 1 - (energyAmount / optimalEnergyAmount);

        // console.log('***************Program_Empire_SWC_Allies.checkFunnelRequests - my progress priority: ' + myPriority);

        // if (myPriority >= highestPriorityRequest.priority)
        //     return;

        this.fullfillFunnelRequest(highestPriorityRequest, mySendableBases);
    }

    fullfillFunnelRequest(request, mySendableBases)
    {
        //return false;
        console.log('***************Program_Empire_SWC_Allies.fullfillFunnelRequest - attempting to fulfill request: ' + JSON.stringify(request));

        let baseToSend = _.min(mySendableBases, b => Game.map.getRoomLinearDistance(b.name, request.roomName, true));
        let amountToSend = (baseToSend.terminal.store.getUsedCapacity(RESOURCE_ENERGY) / 2) * request.priority;
        let sendCost = Game.market.calcTransactionCost(amountToSend, baseToSend.name, request.roomName);
        if (amountToSend <= 1 || amountToSend < sendCost)
            return false;

        if (amountToSend > request.maxAmount)
            amountToSend = request.maxAmount;

        console.log('Program_Empire_SWC_Allies.fullfillFunnelRequest - want to send ' + amountToSend + ' energy from ' + baseToSend.name + ' to ' + request.roomName);

        Room.makeTradeRequest(baseToSend.name, request.roomName, RESOURCE_ENERGY, amountToSend);

        return true;
    }

    checkDefenseRequests()
    {
        let defenseRequests = this.data.requests.filter(r => (r.requestType == requestTypes.DEFENSE || r.requestType == requestTypes.ATTACK) && r.roomName);
        if (defenseRequests.length <= 0)
            return;

        console.log('***************Program_Empire_SWC_Allies.checkDefenseRequests - ' + defenseRequests.length + ' DEFENSE/ATTACK requests received');

        for (let defenseRequest of defenseRequests)
        {
            let roomMemory = Room.getMemory(defenseRequest.roomName);
            if (roomMemory)
            {
                //roomMemory.defendUntil = Game.time + (this.frequency * 2);
                console.log('***************Program_Empire_SWC_Allies.checkDefenseRequests - defending - ' + defenseRequest.roomName + ' - priority - ' + defenseRequest.priority);
            }
        }
    }

    checkAttackRequests()
    {

    }

    // makeRequests() ----------------------------------------------------
    makeRequests()
    {
        let requests = [];

        let resourceRequests = this.makeResourceRequest();
        let funnelRequests = this.makeFunnelRequest();

        if (resourceRequests)
            requests = requests.concat(resourceRequests);
        if (funnelRequests)
            requests = requests.concat(funnelRequests);

        let requestsString = JSON.stringify(requests)

        console.log('***************Program_Empire_SWC_Allies.makeRequests - outgoing requests: ' + requestsString);

        RawMemory.segments[COM_SEGMENT_NUMBER] = requestsString;
    }

    makeResourceRequest()
    {
        if (!Memory.empire || !Memory.empire.accounting || !Memory.empire.accounting.resources || !Memory.empire.accounting.mineralValues)
            return null;

        let bases = Room.getMyBases();
        let myBasesWithTerminals = bases.filter(b => b.controller.level >= 6 && b.terminal && b.terminal.my);

        if (myBasesWithTerminals.length <= 0)
            return null;

        let requests = [];

        for (let resourceType of constants.RESOURCES_MINERAL)
        {
            let amount = (Memory.empire.accounting.resources[resourceType] || 0);
            let desiredMaxAmount = _.sum(bases, b => Room.getDesiredResourceAmount(b.name, resourceType)) * constants.LOW_RESOURCE_THRESHOLD;
            let desiredAmount = desiredMaxAmount - amount;
    
            if (desiredAmount <= 0)
                continue;
    
            myBasesWithTerminals = _.sortByOrder(myBasesWithTerminals, 
                [b => b.controller.level, 
                 b => Room.getStoredResourceAmount(b.name, resourceType)],
                  ['desc', 'asc']);
    
            let requestingBase = myBasesWithTerminals[0];
            let priority = (1 - (amount / desiredMaxAmount)).toFixed(2);
    
            let request = { requestType: requestTypes.RESOURCE, roomName: requestingBase.name, resourceType: resourceType, maxAmount: desiredAmount, timeout: Game.time + DEFAULT_REQUEST_TIME, priority: priority }
    
            //console.log('***************Program_Empire_SWC_Allies.makeResourceRequest - requesting ' + JSON.stringify(request));
            requests.push(request);
        }

        return requests;

    }

    makeFunnelRequest()
    {
        let bases = Room.getMyBases().filter(b => b.controller.level >= 6 && b.controller.level < 8 && b.terminal && b.terminal.my && Room.getStoredResourceAmount(b.name, RESOURCE_ENERGY) < Room.getDesiredResourceAmount(b.name, RESOURCE_ENERGY) * constants.NORMAL_RESOURCE_THRESHOLD);
        if (bases.length <= 0)
            return null;

        let base = _.min(bases, b => b.controller.progressTotal - b.controller.progress);

        let progressRemaining = base.controller.progressTotal - base.controller.progress;
        let gclProgressRemaining = Game.gcl.progressTotal - Game.gcl.progress;

        let optimalEnergyAmount = (Room.getDesiredResourceAmount(base.name, RESOURCE_ENERGY) / constants.SPENDABLE_MULTIPLIER);
        let energyAmount = Room.getStoredResourceAmount(base.name, RESOURCE_ENERGY)
        let optimalEnergyNeeded = optimalEnergyAmount - energyAmount;

        if (optimalEnergyNeeded <= 0)
            return null;

        let maxAmount = progressRemaining;
        let goalType = (base.controller.level == 6) ? funnelGoalType.RCL7 : funnelGoalType.RCL8;
        let priority = 1 - (energyAmount / optimalEnergyAmount);

        if (gclProgressRemaining < progressRemaining)
        {
            goalType = funnelGoalType.GCL;
            maxAmount = gclProgressRemaining;
        }

        maxAmount = maxAmount.toFixed(0);
        priority = priority.toFixed(2);

        if (maxAmount <= 0 || priority <= 0.0)
            return null;

        return [{ requestType: requestTypes.FUNNEL, roomName: base.name, maxAmount: maxAmount, goalType: goalType, timeout: Game.time + DEFAULT_REQUEST_TIME, priority: priority }]
    }
}

module.exports = Program_Empire_SWC_Allies
