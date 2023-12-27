'use strict'

const constants = require('constants');

class Empire_Market extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Empire_Market.constructor - ' + this.data.room + ' - executing');
        this.frequency = 10;
    }

    refresh()
    {
        super.refresh();

        if (!Memory.empire)
            Memory.empire = {};
        if (!Memory.empire.market)
            Memory.empire.market = {};

        this.memory = Memory.empire.market;

    }

    run()
    {
        //console.log('Empire_Market.run - ' + this.data.spawn + ' - executing');
        return;

        if (!constants.MARKET_EXISTS)
            return this.sleep(100);

        if (!this.memory.checkIndex)
            this.memory.checkIndex = 0;

        if (!this.memory.buyCosts)
        {
            this.memory.buyCosts = {};
            this.memory.buyCosts[RESOURCE_ENERGY] = this.getMinAdjustedBuyCost(RESOURCE_ENERGY);
        }

        if (!this.memory.sellValues)
        {
            this.memory.sellValues = {};
            this.memory.sellValues[RESOURCE_ENERGY] = this.getMaxAdjustedSellValue(RESOURCE_ENERGY);
        }

        if (!this.memory.componentBuyCost)
            this.memory.componentBuyCost = {};

        if (!this.memory.componentSellValue)
            this.memory.componentSellValue = {};

        if (!this.memory.buyAndProduceProfit)
            this.memory.buyAndProduceProfit = {};

        if (!this.memory.productProfit)
            this.memory.productProfit = {};

        if (!this.memory.buyProfit)
            this.memory.buyProfit = {};


        if (this.memory.checkIndex >= RESOURCES_ALL.length)
            this.memory.checkIndex = 0;

        let resourceToCheck = RESOURCES_ALL[this.memory.checkIndex];

        //for (let resourceToCheck of RESOURCES_ALL)
        {
            this.memory.buyCosts[resourceToCheck] = this.getMinAdjustedBuyCost(resourceToCheck);
            this.memory.sellValues[resourceToCheck] = this.getMaxAdjustedSellValue(resourceToCheck);

            if (this.memory.buyCosts[resourceToCheck] != undefined && this.memory.sellValues[resourceToCheck] != undefined)
                this.memory.buyProfit[resourceToCheck] = this.memory.sellValues[resourceToCheck] - this.memory.buyCosts[resourceToCheck];
            else
                delete this.memory.buyProfit[resourceToCheck];

            this.calculateFactoryProfits(resourceToCheck);
        }

        this.memory.checkIndex += 1;

        //this.updateMarketData(RESOURCE_ENERGY);
    }

    calculateFactoryProfits(resourceToCheck)
    {
        let recipe = COMMODITIES[resourceToCheck];
        if (recipe)
        {
            if (this.memory.sellValues[resourceToCheck] === undefined)
            {
                delete this.memory.componentBuyCost[resourceToCheck];
                delete this.memory.buyAndProduceProfit[resourceToCheck];
                delete this.memory.componentSellValue[resourceToCheck];
                delete this.memory.productProfit[resourceToCheck];
                return;
            }

            let buySumCalculated = true;
            let sellSumCalculated = true;
            let inputBuyCostSum = 0;
            let inputSellValueSum = 0;
            for (let inputType in recipe.components)
            {
                if (buySumCalculated)
                {
                    let inputBuyCost = this.memory.buyCosts[inputType];
                    if (inputBuyCost === undefined)
                    {
                        inputBuyCost = this.memory.buyCosts[inputType] = this.getMinAdjustedBuyCost(inputType);
                        if (inputBuyCost === undefined)
                            buySumCalculated = false;
                    }

                    if (buySumCalculated)
                    {
                        inputBuyCostSum += inputBuyCost * recipe.components[inputType];
                        //console.log('Empire_Market.run - ' + inputType + ' - inputBuyCost: ' + inputBuyCost + ', input amount: ' + recipe.components[inputType] + ', total cost: ' + inputBuyCost * recipe.components[inputType]);
                    }
                }

                if (sellSumCalculated)
                {
                    let inputSellValue = this.getMaxAdjustedSellValue(inputType);
                    if (inputSellValue === undefined)
                        sellSumCalculated = false;
                    else
                    {
                        inputSellValueSum += inputSellValue * recipe.components[inputType];
                        //console.log('Empire_Market.run - ' + inputType + ' - inputSellValue: ' + inputSellValue + ', input amount: ' + recipe.components[inputType] + ', total value: ' + inputSellValue * recipe.components[inputType]);
                    }

                }
            }

            //this.memory.componentSellValue

            if (buySumCalculated)
            {
                //console.log('Empire_Market.run - ' + resourceToCheck + ' - inputBuyCostSum: ' + inputBuyCostSum + ', recipe.amount: ' + recipe.amount);

                this.memory.componentBuyCost[resourceToCheck] = inputBuyCostSum / recipe.amount;
                this.memory.buyAndProduceProfit[resourceToCheck] = (this.memory.sellValues[resourceToCheck] - this.memory.componentBuyCost[resourceToCheck]);

                //console.log('Empire_Market.run - ' + resourceToCheck + ' - componentBuyCost: ' + this.memory.componentBuyCost[resourceToCheck] + ', buyAndProduceProfit: ' + this.memory.buyAndProduceProfit[resourceToCheck]);
            }
            else
            {
                delete this.memory.componentBuyCost[resourceToCheck];
                delete this.memory.buyAndProduceProfit[resourceToCheck];
            }

            if (sellSumCalculated)
            {
                //console.log('Empire_Market.run - ' + resourceToCheck + ' - inputSellValueSum: ' + inputSellValueSum + ', recipe.amount: ' + recipe.amount);

                this.memory.componentSellValue[resourceToCheck] = inputSellValueSum / recipe.amount;
                this.memory.productProfit[resourceToCheck] = (this.memory.sellValues[resourceToCheck] - this.memory.componentSellValue[resourceToCheck]);

                if (recipe.level == 5 && this.memory.productProfit[resourceToCheck] > 0)
                    this.sellProductImmediately(resourceToCheck);

                //console.log('Empire_Market.run - ' + resourceToCheck + ' - componentSellValue: ' + this.memory.componentSellValue[resourceToCheck] + ', sellValue: ' + this.memory.sellValues[resourceToCheck] + ', productProfit: ' + this.memory.productProfit[resourceToCheck]);
            }
            else
            {
                delete this.memory.componentSellValue[resourceToCheck];
                delete this.memory.productProfit[resourceToCheck];
            }
        }
    }

    sellProductImmediately(product)
    {
        let bases = Room.getMyBases();
        let basesWithProduct = _.filter(bases, b => b.terminal && b.terminal.my && b.terminal.store.getUsedCapacity(product) > 0);

        if (basesWithProduct.length <= 0)
            return;

        let terminalWithMostProduct = _.max(basesWithProduct.map(b => b.terminal), t => t.store.getUsedCapacity(product));

        let orders = Game.market.getAllOrders({type: ORDER_BUY, resourceType: product});
        let maxOrder = _.max(orders, o => o.price);
        if (!maxOrder)
            return;

        let amount = Math.min(maxOrder.amount, terminalWithMostProduct.store.getUsedCapacity(product));
        let result = Game.market.deal(maxOrder.id, amount, terminalWithMostProduct.room.name);

        console.log('Empire_Market.sellProductImmediately - ' + terminalWithMostProduct.room.name + ' - selling ' + amount + ' ' + product + ' for ' + maxOrder.price + ' each - result: ' + result);
    }

    getAverageValue(resourceType, orderType)
    {
        let sortOrder = 'asc';
        if (orderType == ORDER_BUY)
            sortOrder = 'desc';
        let orders = _.sortByOrder(Game.market.getAllOrders({type: orderType, resourceType: resourceType}), o => o.price, sortOrder);

        let totalAmount = _.sum(orders, o => o.amount);
        let amountToCheck = totalAmount / 10;

        let amountChecked = 0;
        let priceSumChecked = 0;
        while (orders.length > 0 && amountChecked < amountToCheck)
        {
            let order = orders.shift();
            amountChecked += order.amount;
            priceSumChecked += (order.amount * order.price);
        }
        let average = 0;
        if (amountChecked > 0)
            average = priceSumChecked / amountChecked;

        return average;
    }

    getMinPrice(resourceType, orderType)
    {
        let orders = Game.market.getAllOrders({type: orderType, resourceType: resourceType});
        let minOrder = _.min(orders, o => o.price);
        if (minOrder)
            return minOrder.price;

        return undefined;
    }

    getMaxPrice(resourceType, orderType)
    {
        let orders = Game.market.getAllOrders({type: orderType, resourceType: resourceType});
        let maxOrder = _.max(orders, o => o.price);
        if (maxOrder)
            return maxOrder.price;

        return undefined;
    }

    getMinAdjustedBuyCost(resourceType)
    {
        let myBases = Room.getMyBases();
        if (!myBases)
            return undefined;
        let orders = _.filter(Game.market.getAllOrders({type: ORDER_SELL, resourceType: resourceType}), o => o.roomName && !Room.isMyBase(o.roomName) && Room.getNearestBaseByLinearDistance(o.roomName, true));
        if (orders.length <= 0)
            return undefined;

        if (resourceType == RESOURCE_ENERGY)
        {
            let minOrder = _.min(orders, o => o.price + (o.price * (Game.market.calcTransactionCost(1000000, o.roomName, Room.getNearestBaseByLinearDistance(o.roomName, true).name) / 1000000)));
            if (minOrder)
                return minOrder.price + (minOrder.price * (Game.market.calcTransactionCost(1000000, minOrder.roomName, Room.getNearestBaseByLinearDistance(minOrder.roomName, true).name) / 1000000));
        }
        else
        {
            let minOrder = _.min(orders, o => o.price + (this.memory.buyCosts[RESOURCE_ENERGY] * (Game.market.calcTransactionCost(1000000, o.roomName, Room.getNearestBaseByLinearDistance(o.roomName, true).name) / 1000000)));
            if (minOrder)
            {
                //console.log('resourceType: ' + resourceType + ', minOrder: ' + minOrder + ' - ' + JSON.stringify(minOrder));
                return minOrder.price + (this.memory.buyCosts[RESOURCE_ENERGY] * (Game.market.calcTransactionCost(1000000, minOrder.roomName, Room.getNearestBaseByLinearDistance(minOrder.roomName, true).name) / 1000000));
            }

        }

        return undefined;
    }

    getMaxAdjustedSellValue(resourceType)
    {
        let myBases = Room.getMyBases();
        if (!myBases)
            return undefined;
        let orders = _.filter(Game.market.getAllOrders({type: ORDER_BUY, resourceType: resourceType}), o => o.roomName && !Room.isMyBase(o.roomName) && Room.getNearestBaseByLinearDistance(o.roomName, true));
        if (orders.length <= 0)
            return undefined;

        if (resourceType == RESOURCE_ENERGY)
        {
            let maxOrder = _.max(orders, o => o.price - (o.price * (Game.market.calcTransactionCost(1000000, o.roomName, Room.getNearestBaseByLinearDistance(o.roomName, true).name) / 1000000)));
            if (maxOrder)
                return maxOrder.price - (maxOrder.price * (Game.market.calcTransactionCost(1000000, maxOrder.roomName, Room.getNearestBaseByLinearDistance(maxOrder.roomName, true).name) / 1000000));
        }
        else
        {
            let maxOrder = _.max(orders, o => o.price - (this.memory.buyCosts[RESOURCE_ENERGY] * (Game.market.calcTransactionCost(1000000, o.roomName, Room.getNearestBaseByLinearDistance(o.roomName, true).name) / 1000000)));
            if (maxOrder)
            {
                //console.log('resourceType: ' + resourceType + ', maxOrder: ' + maxOrder + ' - ' + JSON.stringify(maxOrder));
                return maxOrder.price - (this.memory.buyCosts[RESOURCE_ENERGY] * (Game.market.calcTransactionCost(1000000, maxOrder.roomName, Room.getNearestBaseByLinearDistance(maxOrder.roomName, true).name) / 1000000));
            }
        }
        return undefined;
    }
}

module.exports = Empire_Market;
