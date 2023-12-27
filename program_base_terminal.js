'use strict'

const constants = require('constants');

class Base_Terminal extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base_Terminal.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        this.room = Game.rooms[this.data.room];

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory.terminal)
            baseMemory.terminal = { tradeRequests: [] };

        this.baseMemory = baseMemory;
        this.memory = baseMemory.terminal;

    }

    run()
    {
        if (this.data.room == 'W37N24')
            console.log('Base_Terminal.run - ' + this.data.room + ' - executing');
            
        if (!this.room)
            return;

        //this.drawInfo();

        if (this.room.controller.level < 6)
            return this.suicide();

        if (!this.room.terminal || !this.room.terminal.my)
        {
            delete this.memory.sent;
            this.sleep(1000);
            return;
        }

        //return;

        if (this.room.terminal.coolDown)
        {
            this.sleep(this.room.terminal.coolDown);
            return;
        }

        delete this.memory.sent;

        if (this.memory.tradeRequests.length > 0)// && this.room.constructionSites.length <= 0)
        {
            if (this.executeNextTradeRequest())
            {
                this.sleep(TERMINAL_COOLDOWN);
                return;
            }
        }

        if (Room.sendingAwayResources(this.data.room))
        {
            if (Room.getStoredResourceAmount(this.data.room, RESOURCE_ENERGY) < 1000)
                this.requestResource(RESOURCE_ENERGY, constants.RESOURCE_LEVEL_LOW);
            this.cancelOldOrders();
            this.sendAwayAll();
            this.sleep(TERMINAL_COOLDOWN);
            return;
        }

        if (Game.flags['sellAll_' + this.data.room] || (Game.flags['sellAll'] && Game.flags['sellAll'].pos.roomName == this.data.room))
        {
            this.cancelOldOrders();
            this.dumpAll();
            this.sleep(TERMINAL_COOLDOWN);
            return;
        }

        this.requestFactoryResources();

        let energyCritical = (Room.getResourceAmountLevel(this.data.room, RESOURCE_ENERGY) <= constants.RESOURCE_LEVEL_CRITICAL);

        let terminalEnergy = this.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY);
        let terminalFull = this.room.terminal.store.getFreeCapacity() <= 10000;
        let storageFull = (!this.room.storage || !this.room.storage.my || this.room.storage.store.getFreeCapacity() <= 10000);


        
        let tookAction = false;
        for (let resourceToTrade of RESOURCES_ALL)
        {
            // if (constants.RESOURCES_TO_BUY_NOW.indexOf(resourceToTrade) >= 0)
            //     console.log('Base_Terminal.run - ' + this.data.room + ' - considering ' + resourceToTrade + '.');

            let desiredAmount = Room.getDesiredResourceAmount(this.data.room, resourceToTrade);
            if (!desiredAmount)
                continue;

            let resourceFlag = Game.flags[resourceToTrade];
            if (resourceFlag)
            {
                if (resourceFlag.pos.roomName == this.data.room)
                    tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_CRITICAL, true);
                    
                continue;
            }
            

            let resourceLevel = Room.getResourceAmountLevel(this.data.room, resourceToTrade);

            if (resourceLevel <= constants.RESOURCE_LEVEL_LOW && Room.needsResource(this.data.room, resourceToTrade))
            {
                tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_LOW);
                // if (constants.RESOURCES_TO_BUY_NOW.indexOf(resourceToTrade) >= 0)
                //     console.log('Base_Terminal.run - ' + this.data.room + ' - needs ' + resourceToTrade + '. tookAction: ' + tookAction);
            }
            // else if (resourceToTrade == RESOURCE_ENERGY && this.room.controller.level < 8)
            // {
            //     switch (resourceLevel)
            //     {
            //         case constants.RESOURCE_LEVEL_NONE:
            //             tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_CRITICAL);
            //             break;
            //         case constants.RESOURCE_LEVEL_CRITICAL:
            //             tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_LOW);
            //             break;
            //         case constants.RESOURCE_LEVEL_LOW:
            //             tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_MODERATE);
            //             break;
            //         case constants.RESOURCE_LEVEL_MODERATE:
            //             tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_NORMAL);
            //             break;
            //         case constants.RESOURCE_LEVEL_NORMAL:
            //             tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_HIGH);
            //             break;
            //         case constants.RESOURCE_LEVEL_HIGH:
            //             tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_EXCESS);
            //             break;
            //         case constants.RESOURCE_LEVEL_EXCESS:
            //             break;
            //     }
            // }
            else
            {
                switch (resourceLevel)
                {
                    case constants.RESOURCE_LEVEL_NONE:
                        tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_LOW);
                        break;
                    case constants.RESOURCE_LEVEL_CRITICAL:
                        tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_MODERATE);
                        break;
                    case constants.RESOURCE_LEVEL_LOW:
                        tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_NORMAL);
                        break;
                    case constants.RESOURCE_LEVEL_MODERATE:
                        tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_HIGH);
                        break;
                    case constants.RESOURCE_LEVEL_NORMAL:
                        tookAction = this.requestResource(resourceToTrade, constants.RESOURCE_LEVEL_EXCESS);
                        break;
                    case constants.RESOURCE_LEVEL_HIGH:
                        break;
                    case constants.RESOURCE_LEVEL_EXCESS:
                        break;
                }
            }

            // if (tookAction && constants.RESOURCES_TO_BUY_NOW.indexOf(resourceToTrade) >= 0)
            //     console.log('Base_Terminal.run - ' + this.data.room + ' - already took action on ' + resourceToTrade);

            if (tookAction || (resourceToTrade != RESOURCE_ENERGY && energyCritical))
                continue;

            let choice = Room.selectTerminalAction(this.data.room, resourceToTrade);
            // if (choice != TERMINAL_ACTION_HOLD && resourceToTrade == RESOURCE_ENERGY)
            //     console.log('Base_Terminal.run - ' + this.data.room + ' - wants to ' + choice + ' ' + resourceToTrade);

            // if (constants.RESOURCES_TO_BUY_NOW.indexOf(resourceToTrade) >= 0)
            //     console.log('Base_Terminal.run - ' + this.data.room + ' - wants to ' + choice + ' ' + resourceToTrade);

            // if (this.data.room == 'E13N5')
            //     console.log('Base_Terminal.run - ' + this.data.room + ' - considering ' + resourceToTrade + '. Terminal action: ' + choice);
            
            switch (choice)
            {
                case TERMINAL_ACTION_BUY_NOW:
                    tookAction = this.buyNowResource(resourceToTrade, terminalEnergy, desiredAmount * constants.LOW_RESOURCE_THRESHOLD);
                    break;
                case TERMINAL_ACTION_BUY:
                    tookAction = this.buyResource(resourceToTrade, terminalEnergy);
                    break;
                case TERMINAL_ACTION_SELL:
                    if (terminalFull && storageFull)
                        tookAction = this.sendAwayResource(resourceToTrade, terminalEnergy, desiredAmount);
                    break;
                case TERMINAL_ACTION_DUMP:
                    if (terminalFull && storageFull)
                        tookAction = this.sendAwayResource(resourceToTrade, terminalEnergy, desiredAmount);
                    if (!tookAction)
                        tookAction = this.sellNowResource(resourceToTrade, terminalEnergy, desiredAmount * constants.HIGH_RESOURCE_THRESHOLD);
                    break;
                case TERMINAL_ACTION_DISTRIBUTE:
                    desiredAmount = desiredAmount * constants.LOW_RESOURCE_THRESHOLD;
                    if (terminalFull && storageFull)
                        tookAction = this.sendAwayResource(resourceToTrade, terminalEnergy, desiredAmount);
                    break;
            }

            if (tookAction)
                break;
        }

        // if (!tookAction)
        // {
        //     if (Room.getResourceAmountLevel(this.data.room, RESOURCE_ENERGY) >= constants.RESOURCE_LEVEL_MODERATE && terminalEnergy >= 10000 && this.baseMemory.shipTarget && !Room.needsResource(this.data.room, RESOURCE_ENERGY))
        //     {
        //         let shipToRoom = Game.rooms[this.baseMemory.shipTarget];
        //         if (shipToRoom && (!Room.sendingAwayResources(shipToRoom.name) || Room.getStoredResourceAmount(shipToRoom.name, RESOURCE_ENERGY) < 1000) && shipToRoom.terminal && shipToRoom.terminal.my && Room.getResourceAmountLevel(shipToRoom.name, RESOURCE_ENERGY) < constants.RESOURCE_LEVEL_EXCESS && this.room.constructionSites.length <= 0)
        //         {
        //             let result = this.room.terminal.send(RESOURCE_ENERGY, terminalEnergy / 2, this.baseMemory.shipTarget);
        //             //if (this.data.room == 'W49N32' || this.baseMemory.shipTarget == 'W49N32')
        //                 console.log('Base_Terminal.run - ' + this.data.room + ' - shipping energy to ' + this.baseMemory.shipTarget + ' - result: ' + result);
        //             this.sleep(TERMINAL_COOLDOWN);
        //             return;
        //         }
        //     }
        // }

        if (!tookAction)
        {
            this.cancelOldOrders();
        }

        if (tookAction)
            this.sleep(TERMINAL_COOLDOWN);
        else
            this.sleep(TERMINAL_COOLDOWN + Math.floor(Math.random() * TERMINAL_COOLDOWN));
    }

    cancelOldOrders()
    {
        let myOldOrders = _.filter(Game.market.orders, o => o.remainingAmount < 1 && o.roomName == this.data.room)

        if (myOldOrders.length > 0)
        {
            //console.log('Base_Terminal.cancelOldOrders - ' + this.data.room + ' cancelling ' + myOldOrders.length + ' fulfilled orders');

            for (let order of myOldOrders)
            {
                Game.market.cancelOrder(order.id);
            }
        }
    }

    dumpAll()
    {
        let terminalEnergy = this.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY);
        let resourceList = RESOURCES_ALL.slice().reverse();
        for (let resourceType of resourceList)
        {
            let tookAction = this.sellNowResource(resourceType, terminalEnergy, 0);
            if (tookAction)
                return true;
        }

        return false;
    }

    sendAwayAll()
    {
        let terminalEnergy = this.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY);
        let resourceList = RESOURCES_ALL.slice().reverse();
        for (let resourceType of resourceList)
        {
            let tookAction = this.sendAwayResource(resourceType, terminalEnergy, 0, true);
            if (tookAction)
                return true;
        }

        return false;
    }

    requestFactoryResources()
    {
        let factoryMemory = this.baseMemory.factory;
        if (!factoryMemory)
            return;

        if (!factoryMemory.neededResources)
            return;

        for (let resourceType in factoryMemory.neededResources)
        {
            let neededAmount = factoryMemory.neededResources[resourceType];
            let myBases = Room.getMyBases();
            // Bases with terminals that have the resource needed
            myBases = _.filter(myBases, b => b.name != this.data.room && b.controller.level >= 6 && b.terminal && b.terminal.store.getUsedCapacity(resourceType) >= neededAmount * 2 && Room.getResourceAmountLevel(b.name, RESOURCE_ENERGY) > constants.RESOURCE_LEVEL_CRITICAL);
            // Bases that don't need this resource for their factories
            myBases = _.filter(myBases, b => Room.getBaseMemory(b.name) && (!Room.getBaseMemory(b.name).factory || !Room.getBaseMemory(b.name).factory.neededResources || !!Room.getBaseMemory(b.name).factory.neededResources[resourceType]));

            if (myBases.length <= 0)
                continue;

            let targetBase = _.max(myBases, b => b.terminal.store.getUsedCapacity(resourceType));
            let amountToSend = (targetBase.terminal.store.getUsedCapacity(resourceType) / 2);

            //console.log('Base_Factory.requestFactoryResources - ' + this.data.room + ' - requesting ' + resourceType + ' from ' + targetBase.name);
            Room.makeTradeRequest(targetBase.name, this.data.room, resourceType, amountToSend);
        }
    }


    requestResource(resourceType, senderMinimumResourceLevel, sendAll)
    {
        let myBases = Room.getMyBases();
        // Bases that have the resource needed
        //myBases = _.filter(myBases, b => b.name != this.data.room && b.controller.level >= 6 && !Room.needsResource(b.name, resourceType) && (b.controller.level == 8 || b.controller.progressTotal - b.controller.progress > this.room.controller.progressTotal - this.room.controller.progress) && b.terminal && b.terminal.my && Room.getResourceAmountLevel(b.name, resourceType) >= senderMinimumResourceLevel);
        myBases = _.filter(myBases, b => b.name != this.data.room && b.controller.level >= 6 && !Room.needsResource(b.name, resourceType) && (b.terminal && b.terminal.my && Room.getResourceAmountLevel(b.name, resourceType) >= senderMinimumResourceLevel));

        // if (resourceType == RESOURCE_ENERGY)
        //     myBases = _.filter(myBases, b => (b.controller.level == 8 || b.controller.progressTotal - b.controller.progress > this.room.controller.progressTotal - this.room.controller.progress));
        
        // if (resourceType == RESOURCE_ENERGY && this.baseMemory.shipTarget)
        //     myBases = _.filter(myBases, b => b.name != this.baseMemory.shipTarget);
        // if (this.data.room == 'W37N24')
        //     console.log('Base_Terminal.requestResource - ' + this.data.room + ' - checking resource: ' + resourceType + ', senderMinimumResourceLevel: ' + senderMinimumResourceLevel + ', bases: ' + myBases.length);

        if (myBases.length <= 0)
            return false;

        let targetBase = _.max(myBases, b => b.terminal.store.getUsedCapacity(resourceType));
        let amountToSend = targetBase.terminal.store.getUsedCapacity(resourceType);
        if (!sendAll)
            amountToSend /= 2;
        
        let sendCost = Game.market.calcTransactionCost(amountToSend, this.data.room, targetBase.name);
        if (targetBase.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < sendCost)
            return false;

        if (amountToSend < 1)
            return false;

        console.log('Base_Terminal.requestResource - ' + this.data.room + ' - requesting ' + resourceType + ' from ' + targetBase.name);
        Room.makeTradeRequest(targetBase.name, this.data.room, resourceType, amountToSend);
        return true;
    }

    buyNowResource(resourceType, terminalEnergy, desiredAmount, bestOrder)
    {
        //console.log('Base_Terminal.buyNowResource - ' + this.data.room + ' - want to buy ' + resourceType + ' now');

        if (!constants.MARKET_EXISTS)
            return false;

        let resourceTotal = Room.getStoredResourceAmount(this.data.room, resourceType);

        let buyAmount = desiredAmount - resourceTotal;

        if (buyAmount >= 100)
        {
            if (!bestOrder)
                bestOrder = this.findBestBuy(resourceType);

            if (resourceType == RESOURCE_ENERGY && this.room.controller.level >= 7 && Room.getPracticalResourceAmount(this.room.name, RESOURCE_ENERGY) < desiredAmount)
            {
                let bestBatteryOrder = this.findBestBuy(RESOURCE_BATTERY);
                if (bestBatteryOrder && bestBatteryOrder.price / 10 < bestOrder.price)
                {
                    resourceType = RESOURCE_BATTERY;
                    bestOrder = bestBatteryOrder;
                    buyAmount /= 10;

                    //console.log('Base_Terminal.buyNowResource - ' + this.data.room + ' - found better direct buy rate for ' + RESOURCE_BATTERY);
                }
            }

            if (bestOrder)
            {
                return this.buyFromSellOrder(bestOrder, resourceType, buyAmount, terminalEnergy)
            }
        }
        
        return false;
    }

    buyFromSellOrder(order, resourceType, amount, terminalEnergy)
    {
        let transactionCost = Math.ceil(order.transationCostPerUnit * order.amount);
        if (resourceType == RESOURCE_ENERGY)
            amount += transactionCost;
        let maxBuyable = Math.floor(order.transationCostPerUnit * terminalEnergy);
        amount = Math.min(order.amount, amount, maxBuyable, Game.market.credits / order.price);
        if (amount >= 1)
        {
            transactionCost = amount * order.transationCostPerUnit;
            let result = Game.market.deal(order.id, amount, this.room.name);
            console.log('Base_Terminal.buyFromSellOrder - ' + this.data.room + ' - buying ' + amount + ' ' + resourceType + ' for ' + order.price + ' credits each (' + (amount * order.price) + '), at a cost of ' + transactionCost + ' energy. result: ' + result);
            if (result == OK)
                return true;
        }

        return false;
    }

    findBestBuy(resourceType)
    {
        let orders = Game.market.getAllOrders(order => order.type == ORDER_SELL && order.resourceType == resourceType);

        if (orders.length <= 0)
            return null;

        for (let order of orders)
        {
            let transactionCost = Game.market.calcTransactionCost(order.amount, this.data.room, order.roomName);
            let totalPrice = order.price * order.amount;
            order.transationCostPerUnit = transactionCost / order.amount;
            if (resourceType == RESOURCE_ENERGY)
            {
                order.finalAmount = order.amount - transactionCost;
                order.finalPrice = (totalPrice / order.finalAmount).toFixed(3);
            }
            else
            {
                order.finalAmount = order.amount;
                order.finalPrice = order.price;
            }
        }

        let validOrders = _.filter(orders, order => order.finalAmount > 0);
        if (validOrders.length <= 0)
            return null;

        let bestOrder = _.min(orders, order =>  order.finalPrice);
        return bestOrder;
    }

    buyResource(resourceType, terminalEnergy)
    {
        if (!constants.MARKET_EXISTS)
            return false;

        let resourceTotal = Room.getStoredResourceAmount(this.data.room, resourceType);
        let desiredAmount = Room.getDesiredResourceAmount(this.data.room, resourceType);
        let buyAmount = desiredAmount - resourceTotal;
        //if (resourceType != RESOURCE_ENERGY)
            buyAmount = (desiredAmount * constants.BUY_TO_THRESHOLD) - resourceTotal;

        if (buyAmount >= 100)
        {
            let buyOrders = _.sortByOrder(Game.market.getAllOrders(o => o.type == ORDER_BUY && o.resourceType == resourceType && !Room.isMyBase(o.roomName)), o => o.price, 'desc');
            if (buyOrders.length <= 0)
            {
                //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - no buy orders found for ' + resourceType);
                return false;
            }

            let maxPrice = buyOrders[0].price;

            let otherOrderTotalAmount = buyAmount;
            while (buyOrders.length > 0 && otherOrderTotalAmount - buyOrders[0].amount > 0)
            {
                let firstBuyOrder = buyOrders.shift();
                otherOrderTotalAmount -= firstBuyOrder.amount;
            }

            if (buyOrders.length <= 0)
            {
                //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - not enough buy order data for ' + resourceType);
                return false;
            }

            let adjustedMaxPrice = buyOrders[0].price;
            if (maxPrice / adjustedMaxPrice > 1.05)
            {
                //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - adjusting buy price of ' + resourceType + ' from ' + maxPrice + ' to ' + adjustedMaxPrice);
                maxPrice = adjustedMaxPrice;
            }

            let myPrice = maxPrice + 0.001;

            let bestSellOrder = this.findBestBuy(resourceType)

            if (bestSellOrder && bestSellOrder.finalPrice < myPrice)
            {
                //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - found better direct buy rate for ' + resourceType);
                return this.buyFromSellOrder(bestSellOrder, resourceType, buyAmount, terminalEnergy);
            }

            if (bestSellOrder && resourceType == RESOURCE_ENERGY && this.room.controller.level >= 7)
            {
                let bestBatteryOrder = this.findBestBuy(RESOURCE_BATTERY);
                if (bestBatteryOrder && bestBatteryOrder.price / 10 < myPrice)
                {
                    bestSellOrder = bestBatteryOrder;
                    buyAmount /= 10;

                    console.log('Base_Terminal.buyResource - ' + this.data.room + ' - found better direct buy rate for ' + RESOURCE_BATTERY);
                    return this.buyFromSellOrder(bestSellOrder, RESOURCE_BATTERY, buyAmount, terminalEnergy);
                }
            }

            if (Game.market.credits < myPrice * buyAmount * 1.05)
            {
                //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - cant afford to buy ' + buyAmount + ' ' + resourceType + ' for ' + myPrice + ' - each');
                return false;
            }

            let existingOrder = _.find(Game.market.orders, o => o.roomName == this.data.room && o.resourceType == resourceType);

            if (existingOrder)
            {
                if (existingOrder.remainingAmount <= 0)
                {
                    let result = Game.market.changeOrderPrice(existingOrder.id, myPrice);

                    if (result == OK)
                    {
                        result = Game.market.extendOrder(existingOrder.id, buyAmount);

                        //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - extending order for ' + buyAmount + ' ' + resourceType + ' for ' + myPrice + '. result: ' + result);

                        return (result == OK);
                    }
                    else
                    {
                        //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - could not increase buy price for ' + resourceType + ' from ' + oldPrice + ' to ' + myPrice + '. result: ' + result);
                        return false;
                    }
                }
                else if (myPrice - existingOrder.price >= 0.001)
                {
                    let oldPrice = existingOrder.price;
                    let result = Game.market.changeOrderPrice(existingOrder.id, myPrice);

                    //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - increasing buy price for ' + buyAmount + ' ' + resourceType + ' from ' + oldPrice + ' to ' + myPrice + '. result: ' + result);

                    return (result == OK);
                }
                else
                {
                    //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - already buying ' + resourceType + ' for ' + existingOrder.price + ' rather than ' + myPrice);
                    return false;
                }
            }
            else
            {
                let result = Game.market.createOrder({ type: ORDER_BUY, resourceType: resourceType, price: myPrice, totalAmount: buyAmount, roomName: this.data.room });

                //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - want to buy ' + buyAmount + ' ' + resourceType + ' for ' + myPrice + '. result: ' + result);

                return (result == OK);
            }
        }

        //console.log('Base_Terminal.buyResource - ' + this.data.room + ' - dont want to buy ' + resourceType);

        return false;
    }

    sellNowResource(resourceType, terminalEnergy, desiredAmount, bestOrder)
    {
        if (!constants.MARKET_EXISTS)
            return false;
            
        let resourceTotal = Room.getStoredResourceAmount(this.data.room, resourceType);

        let sellAmount = resourceTotal - desiredAmount;

        if (sellAmount >= 100)
        {
            if (!bestOrder)
                bestOrder = this.findBestSell(resourceType);

            if (bestOrder)
                return this.sellToBuyOrder(bestOrder, resourceType, sellAmount, terminalEnergy)
        }

        return false;
    }

    findBestSell(resourceType)
    {
        let orders = Game.market.getAllOrders(order => order.type == ORDER_BUY && order.resourceType == resourceType);

        if (orders.length <= 0)
            return null;

        for (let order of orders)
        {
            let transactionCost = Game.market.calcTransactionCost(order.amount, this.data.room, order.roomName);
            let totalPrice = order.price * order.amount;
            if (Memory.empire && Memory.empire.market && Memory.empire.market.sellValues && Memory.empire.market.sellValues[RESOURCE_ENERGY])
            {
                totalPrice -= (transactionCost * Memory.empire.market.sellValues[RESOURCE_ENERGY]);
                console.log("Program_Base_Terminal.findBestSell - " + this.data.room + " - sell value of " + resourceType + " adjusted. Final value: " + totalPrice);
            }

            order.transationCostPerUnit = transactionCost / order.amount;
            order.totalPrice = totalPrice;

            if (resourceType == RESOURCE_ENERGY)
                order.finalAmount = order.amount - transactionCost;
            else
                order.finalAmount = order.amount;

            order.finalPrice = (totalPrice / order.finalAmount).toFixed(3);
        }

        let validOrders = _.filter(orders, order => order.finalPrice > 0);
        if (validOrders.length <= 0)
            return null;

        let bestOrder = _.max(orders, order => order.finalPrice);
        return bestOrder;
    }

    sellToBuyOrder(order, resourceType, amount, terminalEnergy)
    {
        let transactionCost = Math.ceil(order.transationCostPerUnit * order.amount);
        let maxSellable = Math.floor(order.transationCostPerUnit * terminalEnergy);
        amount = Math.min(order.amount, amount, maxSellable, this.room.terminal.store.getUsedCapacity(resourceType));
        if (amount > 0)
        {
            transactionCost = amount * order.transationCostPerUnit;
            let result = Game.market.deal(order.id, amount, this.room.name);
            console.log('Base_Terminal.run - ' + this.data.room + ' - selling ' + amount + ' ' + resourceType + ' for ' + order.price + ' credits each (' + (amount * order.price) + '), at a cost of ' + transactionCost + ' energy. result: ' + result);
            if (result == OK)
                return true;
        }

        return false;
    }

    sendAwayResource(resourceType, terminalEnergy, desiredAmount, sendAll)
    {
        let resourceTotal = Room.getStoredResourceAmount(this.data.room, resourceType);
        if (!Room.isUnclaiming(this.data.room) && this.room.controller.level < 8 && (resourceType == RESOURCE_ENERGY || resourceType == 'XGH2O'))
            resourceTotal = Math.ceil(resourceTotal / 2);

        let sendAmount = resourceTotal - desiredAmount;
        let terminalAmount = this.room.terminal.store.getUsedCapacity(resourceType);

        if (sendAmount > 0)
        {
            let isFactoryResource = (constants.RESOURCES_FACTORY.indexOf(resourceType) >= 0);

            let bases = _.filter(Room.getMyBases(), base => 
            {
                if (base.name == this.data.room)
                    return false;

                if (!base.terminal || !base.terminal.my || base.controller.level < 6)
                    return false;

                if (Room.sendingAwayResources(base.name))
                    return false;

                if (isFactoryResource && (!base.factory || !base.factory.my))
                    return false;

                if (base.controller.level < this.room.controller.level && resourceType != RESOURCE_ENERGY && resourceType != 'XGH2O')
                    return false;

                return true;
            });
            
            if (bases.length > 0)
            {
                let lowestBase = _.min(bases, b =>
                {
                    if (b.controller.level < 8 && this.room.controller.level >= 8 && (resourceType == RESOURCE_ENERGY || resourceType == 'XGH2O'))
                        return Room.getStoredResourceAmount(b.name, resourceType) / 2;

                    return Room.getStoredResourceAmount(b.name, resourceType)
                });
                let lowestBaseAmount = Room.getStoredResourceAmount(lowestBase.name, resourceType);
                if (lowestBase.controller.level < 8 && this.room.controller.level >= 8 && (resourceType == RESOURCE_ENERGY || resourceType == 'XGH2O'))
                    lowestBaseAmount /= 2;

                let resourceDifference = resourceTotal - lowestBaseAmount;
                let resourcePercentDifference = (resourceTotal / lowestBaseAmount) - 1.0;
                if (sendAll || resourcePercentDifference > constants.MIN_RESOURCE_PERCENT_DIFFERENCE_TO_BALANCE)
                {
                    let transactionCost = Game.market.calcTransactionCost(1, this.data.room, lowestBase.name);
                    let maxSendable = Math.floor(transactionCost * terminalEnergy) / 2;
                    let amount = sendAmount;
                    if (!sendAll)
                        amount = Math.floor(resourceDifference / 2);

                    let otherFreeCapacity = lowestBase.terminal.store.getFreeCapacity(resourceType);

                    //console.log('Base_Terminal.sendAwayResource - ' + this.data.room + ' -> ' + lowestBase.name + ' - ' + resourceType + ' - amount: ' + amount + ', maxSendable: ' + maxSendable + ', terminalAmount: ' + terminalAmount + ', otherFreeCapacity: ' + otherFreeCapacity);
                    amount = Math.min(amount, maxSendable, terminalAmount, otherFreeCapacity);

                    if (sendAll || amount > constants.MIN_RESOURCE_AMOUNT_TO_BALANCE)
                    {
                        if (!lowestBase.terminal.coolDown)
                        {
                            let result = this.room.terminal.send(resourceType, amount, lowestBase.name);
                            if (result == OK)
                                this.memory.sent = { r: resourceType, to: lowestBase.name };
                            //console.log('Base_Terminal.sendAwayResource - ' + this.data.room + ' - sending ' + amount + ' ' + resourceType + ' to ' + lowestBase.name + '. result: ' + result);
                            return (result == OK);
                        }
                        else
                        {
                            Room.makeTradeRequest(this.data.room, lowestBase.name, resourceType, amount);
                            //console.log('Base_Terminal.sendAwayResource - ' + this.data.room + ' - queueing trade request for ' + amount + ' ' + resourceType + ' with ' + lowestBase.name + '.');
                            return true;
                        }
                    }
                }
            }
        }

        //console.log('Base_Terminal.sendAwayResource - ' + this.data.room + ' - dont want to send away ' + resourceType);

        return false;
    }

    executeNextTradeRequest()
    {
        let nextRequest = this.memory.tradeRequests.shift();
        if (this.room.terminal.coolDown)
        {
            this.memory.tradeRequests.push(nextRequest);
            return true;
        }

        let otherRoom = Game.rooms[nextRequest.room];
        let otherRoomMemory = Room.getBaseMemory(nextRequest.room);

        let requestAmount = nextRequest.amount;

        if (nextRequest.amount < 0)
        {
            this.doTrade(this.data.room, nextRequest.room, nextRequest.res, -requestAmount);
            if (otherRoomMemory && otherRoomMemory.terminal)
                otherRoomMemory.terminal.tradeRequests = _.filter(otherRoomMemory.terminal.tradeRequests, r => r.room != this.data.room || r.res != nextRequest.res);
            return true;
        }

        if (otherRoom && otherRoom.terminal && otherRoom.terminal.my && otherRoomMemory && otherRoomMemory.terminal)
        {
            if (otherRoom.terminal.coolDown)
            {
                this.memory.tradeRequests.push(nextRequest);
                return false;
            }

            this.doTrade(nextRequest.room, this.data.room, nextRequest.res, requestAmount);
            otherRoomMemory.terminal.tradeRequests = _.filter(otherRoomMemory.terminal.tradeRequests, r => r.room != this.data.room || r.res != nextRequest.res);
        }

        return false;
    }
    
    doTrade(fromRoomName, toRoomName, resourceType, amount)
    {
        let fromRoom = Game.rooms[fromRoomName];
        let toRoom = Game.rooms[toRoomName];
        
        if (fromRoom.terminal.cooldown)
            return false;
        
        amount = _.min([amount, fromRoom.terminal.store.getUsedCapacity(resourceType)]);
        if (amount <= 0)
            return false;
        let sendCost = Game.market.calcTransactionCost(amount, fromRoomName, toRoomName);
        if (resourceType == RESOURCE_ENERGY)
            sendCost += amount;
        if (fromRoom.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < sendCost)
            return false;
            
        let result = fromRoom.terminal.send(resourceType, amount, toRoomName);
        if (result == OK)
            this.memory.sent = { r: resourceType, to: toRoomName, amount: amount };

            console.log('Base_Terminal.doTrade - ' + fromRoomName + ' - sending ' + amount + ' ' + resourceType + ' to ' + toRoomName + '. result: ' + result + ', actualAmount: ' + fromRoom.terminal.store[resourceType]);
            
        return true;
    }
}

module.exports = Base_Terminal;
