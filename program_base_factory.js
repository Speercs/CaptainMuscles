'use strict'

const constants = require('constants');

class Base_Factory extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base_Factory.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        this.room = Game.rooms[this.data.room];

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory.factory)
            baseMemory.factory = {};


        this.baseMemory = baseMemory;
        this.memory = baseMemory.factory;
    }

    run()
    {
        //console.log('Base_Factory.run - ' + this.data.room + ' - executing');

        if (this.room.controller.level < 7)
            return this.suicide();

        if (!this.room.factory || !this.room.factory.my)
        {
            this.sleep(100);
            return;
        }

        let factory = this.room.factory;

        if (factory.cooldown)
        {
            this.sleep(factory.cooldown);
            return;
        }

        this.checkForDesiredResources(factory);

        let result = this.produceStuff(factory);
        if (result)
            return;

        // let result = this.decompressResources(factory);
        // if (result)
        //     return;
        //
        // result = this.compressResources(factory);
        // if (result)
        //     return;

        // if (factory.store.getUsedCapacity(RESOURCE_BATTERY) >= 50)
        // {
        //     let result = factory.produce(RESOURCE_ENERGY);
        //     //console.log('Base_Factory.run - ' + this.data.room + ' attempting to produce energy from battery, result: ' + result);
        // }

        this.sleep(10);
        return;
    }

    checkForDesiredResources(factory)
    {
        if (!factory.level)
            return;

        this.memory.neededResources = {};

        for (let productType in COMMODITIES)
        {
            let recipe = COMMODITIES[productType];
            if (recipe.level && factory.level == recipe.level)
            {
                for (let inputType in recipe.components)
                {
                    let inputLevel = Room.getResourceAmountLevel(this.data.room, inputType);
                    if (inputLevel <= constants.RESOURCE_LEVEL_CRITICAL && !this.memory.neededResources[inputType])
                    {
                        this.memory.neededResources[inputType] = recipe.components[inputType];
                        //console.log('Base_Factory.run - ' + this.data.room + ' wants resource: ' + inputType);
                    }
                }
            }
        }
    }

    produceStuff(factory)
    {
        delete this.memory.product;

        let makeableProducts = [];

        //console.log(constants.FACTORY_INPUT_RESOURCES)
        for (let productType in COMMODITIES)
        {
            let recipe = COMMODITIES[productType];
            let canMake = (!recipe.level || (factory.level == recipe.level && this.room.isPowerCreepActive(PWR_OPERATE_FACTORY, recipe.level)));
            if (canMake)
            {
                let productLevel = Room.getResourceAmountLevel(this.data.room, productType);
                for (let inputType in recipe.components)
                {
                    let inputAmount = recipe.components[inputType];
                    let useResourceLevel = (!recipe.level || productType == RESOURCE_COMPOSITE || productType == RESOURCE_CRYSTAL || productType == RESOURCE_LIQUID);
                    if (useResourceLevel && Room.getResourceAmountLevel(this.data.room, inputType, -inputAmount) <= productLevel)
                    {
                        canMake = false;
                        break;
                    }

                    if (!useResourceLevel && factory.store.getUsedCapacity(inputType) < recipe.components[inputType])
                    {
                        canMake = false;
                        break;
                    }
                }
            }

            if (canMake)
                makeableProducts.push(productType);
        }

        if (makeableProducts.length > 0)
        {
            let productType = makeableProducts[Math.floor(Math.random()*makeableProducts.length)];
            let recipe = COMMODITIES[productType];

            if (recipe.level && factory.getEffectTicksRemaining(PWR_OPERATE_FACTORY) <= 0)
            {
                this.memory.needsEffect = recipe.level;
                //console.log('Base_Factory.produceStuff - ' + this.data.room + ' requesting power level ' + recipe.level);
                this.sleep(10);
            }
            else
            {
                delete this.memory.needsEffect;
                //console.log('Base_Factory.produceStuff - ' + this.data.room + ' producing ' + productType);
                factory.produce(productType);
                this.memory.product = productType;
                this.sleep(recipe.cooldown);
            }

            return true;
        }

        return false;
    }

    compressResources(factory)
    {
        for (let resourceType of constants.RESOURCES_TO_COMPRESS)
        {
            if (Room.wantToCompress(this.data.room, resourceType) && this.compressResource(factory, resourceType))
                return true;
        }

        return false;
    }

    decompressResources(factory)
    {
        for (let resourceType of constants.RESOURCES_TO_DECOMPRESS)
        {
            if (Room.wantToDecompress(this.data.room, resourceType) && this.decompressResource(factory, resourceType))
                return true;
        }

        return false;
    }

    compressResource(factory, resourceToCompress)
    {
        //console.log('Base_Factory.compressResource - ' + this.data.room + ' - want to compress ' + resourceToCompress);

        let product = constants.RESOURCE_COMPRESSES_TO[resourceToCompress];
        if (!product || !COMMODITIES[product] || !COMMODITIES[product].components)
            return false;

        //console.log('Base_Factory.compressResource - ' + this.data.room + ' - found product');

        let recipe = COMMODITIES[product];
        for (let component in recipe.components)
        {
            let amount = recipe.components[component];
            if (factory.store.getUsedCapacity(component) < amount)
                return false;
        }

        //console.log('Base_Factory.compressResource - ' + this.data.room + ' - found components');

        factory.produce(product);
        this.sleep(recipe.cooldown);
        return true;
    }

    decompressResource(factory, resourceToDecompress)
    {
        //console.log('Base_Factory.decompressResource - ' + this.data.room + ' - want to decompress ' + resourceToDecompress);

        let product = constants.RESOURCE_DECOMPRESSES_TO[resourceToDecompress];
        if (!product || !COMMODITIES[product] || !COMMODITIES[product].components)
            return false;

        //console.log('Base_Factory.decompressResource - ' + this.data.room + ' - found product');

        let recipe = COMMODITIES[product];
        for (let component in recipe.components)
        {
            let amount = recipe.components[component];
            if (factory.store.getUsedCapacity(component) < amount)
                return false;
        }

        //console.log('Base_Factory.decompressResource - ' + this.data.room + ' - found components');

        factory.produce(product);
        this.sleep(recipe.cooldown);
        return true;
    }
}

module.exports = Base_Factory;
