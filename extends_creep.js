'use strict'

Creep.prototype.isCivilian = function()
{
    return !(this.memory[ATTACK] || this.memory[RANGED_ATTACK] || this.memory[HEAL]);
}

Creep.prototype.hasParts = function(partType)
{
    if (this.my)
        return this.memory[partType];

    return !!_.find(this.body, bp => bp.type == partType);
}

Creep.prototype.partCount = function(partType, checkHits = true)
{
    let partCount = 0;
    for (let part of this.body)
    {
        if (part.type != partType)
            continue;

        if (checkHits && part.hits <= 0)
            continue;

        partCount += 1
    }
    
    return partCount;
}

Creep.prototype.partCountBoosted = function(partType, checkHits = true)
{
    let partCount = 0;
    for (let part of this.body)
    {
        if (partType && part.type != partType)
            continue;

        if (checkHits && part.hits <= 0)
            continue;

        let additionalPartValue = 1;
        if (part.boost)
        {
            let boostNameLength = part.boost.length;
            if (boostNameLength == 2)
                additionalPartValue = 2;
            else if (boostNameLength == 4)
                additionalPartValue = 3;
            else if (boostNameLength == 5)
                additionalPartValue = 4;
        }

        partCount += additionalPartValue
    }
    
    return partCount;
}

Creep.prototype.partCountsBoosted = function(partType)
{
    let partCounts = _.countBy(this.body, part => part.type);

    let hostileBody = this.body;
    for (let part of hostileBody)
    {
        let additionalPartValue = 0;
        if (part.boost)
        {
            let boostNameLength = part.boost.length;
            if (boostNameLength == 2)
                additionalPartValue = 1;
            else if (boostNameLength == 4)
                additionalPartValue = 2;
            else if (boostNameLength == 5)
                additionalPartValue = 3;
        }
        partCounts[part.type] = (partCounts[part.type] || 0) + additionalPartValue;
    }

    return partCounts;
}

Object.defineProperty(Creep.prototype, "hitsPercent",
{
    configurable: true,
    get()
    {
        if (!this.hits)
            return 1;

        return this.hits / this.hitsMax;
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "attackPower",
{
    configurable: true,
    get()
    {
        if (!this.my || this.hits < this.hitsMax)
            return this.partCountBoosted(ATTACK) * ATTACK_POWER;

        let attackParts = this.memory[ATTACK] || 0;
        if (attackParts > 0 && this.hasBoost('XUH2O'))
            attackParts *= 4;
        else if (attackParts > 0 && this.hasBoost('UH2O'))
            attackParts *= 3;
        else if (attackParts > 0 && this.hasBoost('UH'))
            attackParts *= 2;

        return attackParts * ATTACK_POWER;
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "buildPower",
{
    configurable: true,
    get()
    {
        return this.memory.work * BUILD_POWER;
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "damageResistance",
{
    configurable: true,
    get()
    {
        if (!this.my || this.hits < this.hitsMax)
        {
            let boostedTough = this.body.find(bp => bp.type == TOUGH && bp.hits > 0 && bp.boost)
            if (!boostedTough)
                return 0.0;

            if (boostedTough.boost.length == 5)
                return 0.7;
            else if (boostedTough.boost.length == 4)
                return 0.5;
            else if (boostedTough.boost.length == 2)
                return 0.3;

            return 0.0;
        }

        if (this.hasBoost('XGHO2'))
            return 0.7;
        else if (this.hasBoost('GHO2'))
            return 0.5;
        else if (this.hasBoost('GO'))
            return 0.3;

        return 0.0;
        
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "harvestPower",
{
    configurable: true,
    get()
    {
        return this.memory.work * HARVEST_POWER;
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "healPower",
{
    configurable: true,
    get()
    {
        if (this._healPower)
            return this._healPower;

        if (!this.my || this.hits < this.hitsMax)
            return this.partCountBoosted(HEAL) * HEAL_POWER;

        let healParts = this.memory[HEAL] || 0;
        if (healParts > 0)
        {
            if (this.hasBoost('XLHO2'))
                healParts *= 4;
            else if (this.hasBoost('LHO2'))
                healParts *= 3;
            else if (this.hasBoost('LO'))
                healParts *= 2;
        }
            
        this._healPower = healParts * HEAL_POWER;
        return this._healPower;
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "rangedAttackPower",
{
    configurable: true,
    get()
    {
        if (!this.my || this.hits < this.hitsMax)
            return this.partCountBoosted(RANGED_ATTACK) * RANGED_ATTACK_POWER

        let attackParts = this.memory[RANGED_ATTACK] || 0;
        if (attackParts > 0 && this.hasBoost('XKHO2'))
            attackParts *= 4;
        else if (attackParts > 0 && this.hasBoost('KHO2'))
            attackParts *= 3;
        else if (attackParts > 0 && this.hasBoost('KO'))
            attackParts *= 2;

        return attackParts * RANGED_ATTACK_POWER;
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "repairPower",
{
    configurable: true,
    get()
    {
        return this.memory.work * REPAIR_POWER;
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "upgradePower",
{
    configurable: true,
    get()
    {
        return this.memory.work * UPGRADE_CONTROLLER_POWER;
    },
    set(value)
    {

    }
});

Creep.generateName = function (type)
{
    let counter = 0;

    let name = type + counter;
    while(Memory.creeps[name])
    {
        counter += 1;
        name = type + counter;
    }

    return name;
}

Creep.prototype.moveRandom = function()
{
    this.move(Math.ceil(Math.random() * 8) + 1);
}

Creep.prototype.ticksToSpawn = function()
{
    return this.body.length * CREEP_SPAWN_TIME;
}

Creep.prototype.isIdle = function()
{
    return (!this.spawning && (!this.memory.job || !this.hasTask() || this.hasTask({ n: 'Idle' })));
}

// -----------------------

Creep.prototype.hasBoost = function(boost)
{
    return (this.memory.boosts && this.memory.boosts.indexOf(boost) >= 0);
}

//------------------------

Creep.prototype.gotoTarget = function(target, range, options)
{
    let targetPos = target;
    if (target.pos)
        targetPos = target.pos;

    if ((target.roomName && target.roomName != this.room.name) || this.pos.getRangeTo(target) > range)
    {
        if (!_.isUndefined(range))
        {
            if (!options)
                options = {};

            options.range = range;
        }

        this.moveTo(target, options);
        return true;
    }

    return false;
}

// -----------------------

Creep.prototype._build = Creep.prototype.build;

Creep.prototype.build = function(target)
{
    this.cantBuild = true;
    this.lostResourceAmount = Math.min(this.buildPower, this.store.getUsedCapacity(RESOURCE_ENERGY));
    this.lostResourceType = RESOURCE_ENERGY;
    return this._build(target);
}

Creep.prototype._drop = function(resourceType, amount)
{
    if (!resourceType)
        resourceType = _.first(Object.keys(this.store));
    if (!amount)
        amount = this.store.getUsedCapacity(resourceType);

    if (amount <= 0)
        return ERR_NOT_ENOUGH_RESOURCES;

    this.cantDrop = true;
    this.lostResourceAmount = amount;
    this.lostResourceType = resourceType;

    return this.drop(resourceType, amount);
}

// Creep.prototype._move = Creep.prototype.move;
//
// Creep.prototype.move = function(direction)
// {
//     this.canMove = false;
//     return this._move(direction);
// }

Creep.prototype._pickup = Creep.prototype.pickup;

Creep.prototype.pickup = function(target)
{
    this.cantPickup = true;
    this.gainedResourceAmount = target.amount;
    this.gainedResourceType = target.resourceType;
    this.takeTarget = target.id;
    return this._pickup(target);
}

Creep.prototype._transfer = function(target, resourceType, amount)
{
    if (!resourceType)
        resourceType = _.first(Object.keys(this.store));
    if (!amount)
        amount = Math.min(target.store.getFreeCapacity(resourceType), this.store.getUsedCapacity(resourceType));

    if (amount <= 0)
        return ERR_NOT_ENOUGH_RESOURCES;

    this.cantTransfer = true;
    this.lostResourceAmount = amount;
    this.lostResourceType = resourceType;
    if (target instanceof Creep)
    {
        target.gainedResourceAmount = amount;
        target.gainedResourceType = resourceType;
        target.cantTransfer = true;
    }
    this.giveTarget = target.id;
    return this.transfer(target, resourceType, amount);
}

Creep.prototype._withdraw = function(target, resourceType, amount)
{
    if (!target.store)
    {
        console.log('Creep._withdraw - ' + this.name + ' given invalid target: ' + target);
        return ERR_INVALID_TARGET;
    }
        

    if (!amount)
        amount = Math.min(this.store.getFreeCapacity(resourceType), target.store.getUsedCapacity(resourceType));

    if (amount <= 0)
        return ERR_NOT_ENOUGH_RESOURCES;

    this.cantWithdraw = true;
    this.gainedResourceAmount = amount;
    this.gainedResourceType = resourceType;
    this.takeTarget = target.id;

    let result = this.withdraw(target, resourceType, amount);

    return result;
}
