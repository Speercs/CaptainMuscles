'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_PowerBank extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 1;
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'powerBank', room: this.data.room, target: this.data.t });
    }

    run()
    {
        super.run();
        //console.log('Mission_PowerBank.run - ' + this.data.room + ' - executing');

        if (!this.data.room)
            return this.suicide();

        if (this.room && !Game.getObjectById(this.data.t))
        {
            if (this.room.memory && this.room.memory.powerBanks && this.room.memory.powerBanks[this.data.t])
            {
                delete this.room.memory.powerBanks[this.data.t];
                if (Object.keys(this.room.memory.powerBanks).length <= 0)
                    delete this.room.memory.powerBanks;
            }
            return this.suicide();
        }

        let roomMemory = Room.getMemory(this.data.r);
        if (!roomMemory || !roomMemory.powerBanks)
            return this.suicide();

        let powerBankMemory = roomMemory.powerBanks[this.data.t];
        if (!powerBankMemory)
            return this.suicide();

        if (powerBankMemory.os <= 1)
            this.memory.wantBoosts = 1;
        else
            delete this.memory.wantBoosts;


        this.updateCreeps();
    }

    updateCreeps()
    {
        let target = this.getTarget();
        if (!target)
            return null;

        let attackCreeps = _.sortBy(_.filter(Room.getJobCreeps(this.data.room, 'power_attack_' + this.data.t), c => !c.memory.boostRequests), c => c.ticksToLive);
        let healCreeps   = _.sortBy(_.filter(Room.getJobCreeps(this.data.room, 'power_heal_'   + this.data.t), c => !c.memory.boostRequests), c => c.ticksToLive);

        //console.log('Mission_PowerBank.updateCreeps - ' + this.data.room + ' - attackCreeps: ' + attackCreeps.length + ', healCreeps: ' + healCreeps.length);

        let i = 0;
        for (; i < attackCreeps.length; ++i)
        {
            let attacker = attackCreeps[i];
            let healer = null;
            if (healCreeps.length > i)
                healer = healCreeps[i];

            this.updateDuo(attacker, healer, target);
        }

        for (; i < healCreeps.length; ++i)
        {
            let healer = healCreeps[i];
            this.updateExtraHealer(healer);
        }
    }

    updateDuo(attacker, healer, target)
    {
        // if (attacker)
        //     console.log('Mission_PowerBank.updateDuo - updating attacker: ' + attacker.name + ' at: '  + attacker.pos);
        // if (healer)
        //     console.log('Mission_PowerBank.updateDuo - updating healer: ' + healer.name + ' at: ' + healer.pos);

        let powerBankPos = this.getTargetPos();

        let attackerInRoom = (attacker.room.name == this.data.room);
        let healerInRoom = (healer && healer.room.name == this.data.room);
        let bothInSameRoom = (attacker && healer && healer.room.name == attacker.room.name);

        let attackerInPlace = (attackerInRoom && attacker.pos.getRangeTo(powerBankPos) <= 1);
        let healerInPlace = (healer && healer.room.name == attacker.room.name && healer.pos.getRangeTo(attacker) <= 1);

        let attackerCanMove = !attacker.fatigue;
        let attackerMoving = false;
        let attackerFighting = false;

        // Try and take out the competition
        if (attackerCanMove && healerInPlace && attackerInRoom)
        {
            let enemyCreepsNearby = _.filter(attacker.pos.findInRange(FIND_HOSTILE_CREEPS, 5), c => c.killOnSight());
            let enemyTargets = _.filter(enemyCreepsNearby, c => !_.find(c.body, p => p.type == ATTACK || p.type == RANGED_ATTACK));
            if (enemyTargets.length <= 0)
                enemyTargets = _.filter(enemyCreepsNearby, c => _.find(c.body, p => p.type == ATTACK));
            if (enemyTargets.length > 0)
            {
                console.log('Mission_PowerBank.updateDuo - ' + this.data.room + ' - power bank attacker going after enemy creeps');
                let enemyTarget = _.min(enemyTargets, c => attacker.pos.getRangeTo(c));
                attackerCanMove = false;
                attackerMoving = true;
                attackerFighting = true;

                if (attacker.pos.getRangeTo(enemyTarget) <= 1)
                {
                    if (attacker.hitsPercent > 0.5)
                    {
                        attacker.move(attacker.pos.getDirectionTo(enemyTarget.pos));
                        attacker.attack(enemyTarget);
                    }
                }
                else
                {
                    attacker.moveTo(enemyTarget, { range: 1, ignoreCreeps: false });
                }
            }
        }

        // Move to the powerBank
        if (attackerCanMove)
        {
            if (attacker.hits < attacker.hitsMax && healer && !healerInPlace)
            {
                attackerInPlace = false;
                attackerCanMove = false;
                attackerMoving = true;
                attacker.moveTo(healer, { range: 1 });
            }
            else if (attacker.hits < attacker.hitsMax && !healer)
            {
                let nearestBase = Room.getNearestBase(attacker.room.name);
                if (nearestBase)
                {
                    attackerInPlace = false;
                    attackerCanMove = false;
                    attackerMoving = true;
                    attacker.moveTo(nearestBase.controller, { range: 1 });
                }
            }
            else
            {
                let targetPos = powerBankPos;
                let openSpots = targetPos.getOpenSpots();
                let desiredRange = 1;
                if (openSpots.length > attacker.memory.n)
                {
                    targetPos = openSpots[attacker.memory.n];
                    desiredRange = 0;
                }

                //console.log('Mission_PowerBank.updateDuo - ' + attacker.name + ' - targetPos: ' + targetPos + ', openSpots.length: ' + openSpots.length);

                if (attacker.pos.getRangeTo(targetPos) > desiredRange)
                {
                    attackerCanMove = false;
                    attackerMoving = true;
                    attacker.moveTo(targetPos, { range: desiredRange, ignoreCreeps: false });
                }
            }
        }

        if (!attackerFighting && attackerInPlace && healerInPlace && attacker.hitsPercent > 0.5)
        {
            attackerFighting = true;
            attacker.attack(target);
        }

        if (healer)
        {
            if (!healerInPlace && !bothInSameRoom)
                healer.moveTo(target, { range: 3 } );
            else if (attackerInPlace)
                healer.moveTo(attacker.pos.getPositionAtDirection(target.pos.getDirectionTo(attacker)), { range: 0 });
            else if (!healerInPlace)
                healer.moveTo(attacker);
            else if (attackerMoving && !attacker.fatigue && !healer.fatigue)
                healer.move(healer.pos.getDirectionTo(attacker));

                //healer.moveTo(target, { flee: true, range: 2 });

            if (healerInPlace)
            {
                if (healer.hitsPercent < attacker.hitsPercent)
                    healer.heal(healer);
                else if (attackerFighting || attacker.hits < attacker.hitsMax)
                    healer.heal(attacker);
            }
        }
    }

    updateExtraHealer(healer)
    {
        // console.log('Mission_PowerBank.updateExtraHealer - updating healer: ' + healer.name + ' at: ' + healer.pos);

        let healerInPlace = true;

        let targetPos = this.getTargetPos();
        if (targetPos.roomName != healer.room.name || healer.pos.getRangeTo(targetPos) > 2)
            healerInPlace = false;

        if (!healerInPlace)
            healer.moveTo(targetPos);

        if (healer.hits < healer.hitsMax)
        {
            healer.heal(healer);
        }
        else
        {
            let woundedNearby = _.min(healer.pos.findInRange(FIND_MY_CREEPS, 3, { filter: c => c.hits < c.hitsMax }), c => c.hitsPercent);
            if (woundedNearby)
            {
                if (healer.pos.getRangeTo(woundedNearby) <= 1)
                    healer.heal(woundedNearby);
                else
                    healer.rangedHeal(woundedNearby);
            }
        }
    }

    getTarget()
    {
        let target = null;
        if (this.data.t)
        {
            target = Game.getObjectById(this.data.t);
            if (target)
                return target;
            else if (Game.rooms[this.data.r])
                return null;
        }

        if (this.data.r)
            return new RoomPosition(this.data.x, this.data.y, this.data.r);

        return null;
    }

    getTargetPos()
    {
        let target = this.getTarget();
        if (!target)
            return null;
        if (target.pos)
            return target.pos;
        return target;
    }
}

module.exports = Mission_PowerBank
