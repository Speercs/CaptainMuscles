'use strict'

let Mission_Creeps = require('program_mission_creeps');
const util_transforms = require('util_transforms');

const TOWER_RAMPART_REPAIR_THRESHOLD = 1000;
const TOWER_RAMPART_REPAIR_THRESHOLD_DANGER = 10000;

class Mission_Defend extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        //console.log('Mission_Defend.constructor - executing ' + this.data.room);

        this.frequency = 1;
        this.priority = PROCESS_PRIORITY_DEFENSE;
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'defend', room: this.data.room });

        this.insidesDrawn = false;
    }

    onFail()
    {
        let room = Game.rooms[this.data.room];
        this.setRampartsPublic(room, false);
    }

    run()
    {
        super.run();
        //console.log('Mission_Defend.run - ' + this.data.room + ' - executing');

        this.scanRoom();
        this.fireTowers();
        this.activateSafeMode();

        if (this.nearestHostile && this.isInsideBase(this.nearestHostile))
        {
            this.memory.allowRanged = false;
            let defenders = Room.getJobSpawnedCreeps(this.data.room, 'defend');
            for (let defender of defenders)
            {
                if (defender.memory.type != 'defend' && defender.memory.pid)
                {
                    console.log('Mission_Defend.run - ' + this.data.room + ' - releasing ranged defender: ' + defender.name);
                    kernel.scheduler.callProcessFunction(defender.memory.pid, 'laidOff');
                }
            }
        }
        else
        {
            this.memory.allowRanged = true;
        }
    }

    scanRoom()
    {
        delete this.memory.playerAttacking;

        let room = Game.rooms[this.data.room];
        let roomMemory = Room.getMemory(this.data.room);

        let firedTowers = false;

        if (room && roomMemory)// && roomMemory.hostiles)
        {
            let hostiles = _.filter(room.find(FIND_HOSTILE_CREEPS), c => c.killOnSight());
            if (hostiles.length > 0)
            {
                this.memory.hostilesSeen = Game.time;

                //if (hostiles.some(c => !c.pos.nearEdge(0)))
                this.setRampartsPublic(room, false);

                let playerCreeps = _.filter(hostiles, c => !c.isInvader() && c.hitsMax > 100);

                if (playerCreeps.length > 0)
                {
                    this.memory.playerAttacking = 1;
                    console.log('*****************Mission_Defend.scanRoom - ' + room.name + ' - is being attacked by ' + playerCreeps[0].owner.username + '!*****************');
                }
                let fromPos = room.towerFillPos;

                hostiles.sort((a, b) => a.pos.getRangeTo(fromPos) - b.pos.getRangeTo(fromPos));
                this.hostiles = hostiles;
                
                this.nearestHostile = hostiles[0];
                this.memory.nearestHostile = this.nearestHostile.id;
            }
            else if (!this.memory.hostilesSeen || Game.time - this.memory.hostilesSeen > 10)
            {
                this.setRampartsPublic(room, true);
            }
        }
        else if (this.memory.hostilesSeen && Game.time - this.memory.hostilesSeen > 10)
        {
            delete this.memory.hostilesSeen;
            this.setRampartsPublic(room, true);
        }

        let testFlag = Game.flags['defenseTest'];
        if (testFlag && testFlag.pos.roomName == this.data.room)
        {
            this.memory.playerAttacking = 1;
            this.memory.testing = 1;
        }

        if (this.memory.playerAttacking && this.room.getStructures(STRUCTURE_TOWER).length > 0)
        {
            this.memory.wantSpawn = 1;
            if (_.isUndefined(this.memory.insides))
                this.calculateInsides();

            // if (this.memory.insides)
            //     this.drawInsides();
        }
        else
        {
            delete this.memory.insides;
            delete this.memory.wantSpawn;
            delete this.memory.testing;
        }
    }

    setRampartsPublic(room, bePublic)
    {
        let ramparts = room.ramparts;
        for (let rampart of ramparts)
        {
            if (rampart.isPublic != bePublic)
                rampart.setPublic(bePublic);
        }
    }

    fireTowers()
    {
        let room = Game.rooms[this.data.room];
        let roomMemory = Room.getMemory(this.data.room);

        if (!room || !roomMemory)
            return;

        //if (room.controller.level < 4)
        {
            let rampartThreshold = (!Room.inDanger(this.data.room)) ? TOWER_RAMPART_REPAIR_THRESHOLD : TOWER_RAMPART_REPAIR_THRESHOLD_DANGER;

            let lowRamparts = room.ramparts.filter(r => r.hits < rampartThreshold);
            if (lowRamparts.length > 0)
            {
                let lowestRampart = _.min(lowRamparts, r => r.hits);
                for (let tower of room.towers)
                    tower.repair(lowestRampart);
    
                return;
            }
        }


        let towersAttack = false;
        let towerTarget = this.nearestHostile;
        let attackableHostiles = [];
        let totalTotalDamage = 0;

        if (this.nearestHostile)
        {
            // console.log('Mission_Defend.FireTowers - ' + this.data.room + ' - ' + this.nearestHostile.pos);
            // return;
            //
            let defenders = Room.getJobSpawnedCreeps(this.data.room, 'defend');

            

            for (let hostile of this.hostiles)
            {
                towersAttack = (hostile.isInvader() || (defenders.length <= 0 && !hostile.pos.nearEdge(0) && hostile.hits < hostile.hitsMax));
                // if (!towersAttack && defenders.length > 0)
                // {
                //     towersAttack = (!defenders || defenders.length <= 0);
    
                //     if (!towersAttack)
                //     {
                //         let nearestDefenderToHostile = _.min(defenders, c => c.pos.getRangeTo(hostile));
                //         towersAttack = nearestDefenderToHostile.pos.getRangeTo(hostile) <= 3;
                //     }
                // }

                if (!towersAttack)
                {
                    let totalDamage = 0;
                    let expectedHealing = 0;
                    let totalTowerDamage = 0;
                    try
                    {
                        let enemySupport = hostile.pos.lookForInRange(LOOK_CREEPS, 3, c => c.killOnSight());
                        let enemyHealing = _.sum(enemySupport, c => c.healPower) || 0;
                        let damageResistance = hostile.damageResistance;
                        expectedHealing = (enemyHealing / (1 - damageResistance));
        
                        totalTowerDamage = _.sum(this.room.towers, t => t.estimatedDamageAtPosition(hostile.pos)) || 0;
                        let defenderAttackDamage = _.sum(defenders.filter(c => c.pos.getRangeTo(hostile) <= 1), c => c.attackPower) || 0;
                        let defenderRangedDamage = _.sum(defenders.filter(c => c.pos.getRangeTo(hostile) <= 3), c => c.rangedAttackPower) || 0;
        
                        totalDamage = totalTowerDamage + defenderAttackDamage + defenderRangedDamage;
                        // if (totalDamage > expectedHealing)
                        //     towersAttack = true;

                        hostile.potentialDamage = totalDamage;
                        totalTotalDamage += totalDamage;
                    }
                    catch (error)
                    {
                        console.log('Mission_Defend.fireTowers - error calculating damage against enemy - ' + error);
                    }

                    if (!hostile.getActiveBodyparts(MOVE))
                    {
                        towersAttack = true;
                    }  
                    // else if (totalDamage > totalTowerDamage)
                    // {
                    //     towersAttack = true;
                    // }
                    else if (totalDamage >= hostile.hits + expectedHealing)
                    {
                        towersAttack = true;
                    }
                    else if ((totalDamage > expectedHealing || hostile.hits < hostile.hitsMax) && room.ramparts.some(r => r.pos.getRangeTo(this.nearestHostile) <= 3))
                    {
                        towersAttack = true;
                    }
                    // else if (hostile.hits < hostile.hitsMax)
                    // {
                    //     //console.log('Mission_Defend.fireTowers - ' + hostile.name + ' - ' + hostile.hits + '/' + hostile.hitsMax);
                    //     towersAttack = true;
                    // }
                    else
                    {
                        let netDamage = totalDamage - expectedHealing;
                        
                        if (netDamage > 0)
                        {
                            //this.drawTowerDamage(hostile, netDamage);
                            let ticksToKill = hostile.hits / netDamage;
                            this.drawTowerDamage(hostile, Math.ceil(ticksToKill));
                            if (hostile.hits < hostile.hitsMax || (hostile.pos.distanceFromEdge() + 1) >= ticksToKill)
                                towersAttack = true;
                        }
                    }
                    // else if (!hostile.pos.nearEdge(0) && totalDamage >= expectedHealing * 2)
                    //     towersAttack = true;
                    // else if (hostile.hits < hostile.hitsMax && !hostile.pos.nearEdge(0))
                    //     towersAttack = true;
                    
                }


                if (towersAttack)
                {
                    attackableHostiles.push(hostile);
                }
            }

            
        }

        
        if (attackableHostiles.length > 0)
        {
            //console.log('Mission_Defend.fireTowers - ' + attackableHostiles.length + ' - valid targets');
            let lotteryNumber = Math.floor(Math.random() * totalTotalDamage);
            let accumulator = 0;

            //console.log('Mission_Defend.fireTowers - lotteryNumber: ' + lotteryNumber);
            for (let hostile of attackableHostiles)
            {
                //console.log('Mission_Defend.fireTowers - hostile.potentialDamage: ' + hostile.potentialDamage);
                accumulator += hostile.potentialDamage;
                if (lotteryNumber < accumulator)
                {
                    this.fireTowersAtTarget(hostile);
                    return;
                }
            }
            let randomHostile = attackableHostiles[Math.floor(Math.random() * attackableHostiles.length)];
            this.fireTowersAtTarget(randomHostile);
            return;
        }

        if (!room.towerFillPos)
            return;

        let roomInDanger = Room.inDanger(this.data.room);

        let wounded = room.find(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax && (!this.memory.playerAttacking || !c.isCivilian() || c.pos.getRangeTo(room.towerFillPos) <= TOWER_OPTIMAL_RANGE) });
        wounded = wounded.concat(room.find(FIND_MY_POWER_CREEPS, { filter: c => c.hits < c.hitsMax }));

        if (wounded.length > 0)
        {
            this.healTargetsWithTowers(wounded);
            return;
        }
            

    }

    drawTowerDamage(tower, amount)
    {
        this.room.visual.text(amount.toFixed(0), tower.pos.x, tower.pos.y + .2, {opacity: 2.0});
    }

    healTargetsWithTowers(targets)
    {
        targets = _.sortBy(targets, c => c.hits);
        let room = Game.rooms[this.data.room];

        let index = 0;
        let target = targets[index];
        let healingNeeded = target.hitsMax - target.hits;

        let towers = room.getStructures(STRUCTURE_TOWER);
        for (let tower of towers)
        {
            if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < TOWER_ENERGY_COST)
                continue;

            if (tower.pos.getRangeTo(target.pos) > 10)
                continue;

            let estimatedHealing = tower.estimatedHealingAtPosition(target.pos);
            healingNeeded -= estimatedHealing;
            this.drawTowerDamage(tower, estimatedHealing);
            tower.heal(target);

            if (healingNeeded < 0)
            {
                index += 1;
                if (index >= targets.length)
                    break;

                target = targets[index];
                healingNeeded = target.hitsMax - target.hits;
            }
        }
    }

    fireTowersAtTarget(target)
    {
        let room = Game.rooms[this.data.room];
        let towers = room.getStructures(STRUCTURE_TOWER);

        let totalDamage = 0;
        for (let tower of towers)
        {
            if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < TOWER_ENERGY_COST)
                continue;

            let estimatedDamage = tower.estimatedDamageAtPosition(target.pos);
            this.drawTowerDamage(tower, estimatedDamage);
            tower.attack(target);

            totalDamage += estimatedDamage;
            if (totalDamage >= target.hitsMax)
                return;
        }
    }

    activateSafeMode()
    {
        let room = Game.rooms[this.data.room];

        // if (this.nearestHostile)
        // {
        //     console.log('Mission_Defend.activateSafeMode - ' + this.data.room + ' - nearestHostile: ' + this.nearestHostile.pos + ', isInvader: ' + this.nearestHostile.isInvader() + ', isInsideBase: ' + this.isInsideBase(this.nearestHostile));
        //     console.log('Mission_Defend.activateSafeMode - ' + this.data.room + ' - playerAttacking: ' + this.memory.playerAttacking + ', - safeMode: ' + room.controller.safeMode + ', safeModeCooldown: ' + room.controller.safeModeCooldown + ', safeModeAvailable: ' + room.controller.safeModeAvailable);
        // }

        if (this.memory.playerAttacking &&
            !room.controller.safeMode &&
            !room.controller.safeModeCooldown &&
            !room.controller.upgradeBlocked &&
             room.controller.safeModeAvailable &&
             this.nearestHostile &&
            !this.nearestHostile.isInvader() &&
             this.isInsideBase(this.nearestHostile))
        {
            console.log('Mission_Defend.activateSafeMode - ' + this.data.room + ' - activating safe mode');
            room.controller.activateSafeMode();
        }
    }

    isInsideBase(target)
    {
        let targetPos = target;
        if (targetPos.pos)
            targetPos = targetPos.pos;

        if (_.isUndefined(this.memory.insides))
            this.calculateInsides();

        this.drawInsides();

        let index = (targetPos.x * 50) + targetPos.y;

        return (this.memory.insides[index] == '1');
    }

    calculateInsides()
    {
        let basePlan = Room.getBasePlanMemory(this.data.room);
        if (!basePlan || !basePlan.structures[STRUCTURE_RAMPART] || basePlan.structures[STRUCTURE_RAMPART].length <= 0)
        {
            this.memory.insides = '1'.repeat(2500);
            return;
        }

        let rampartPlan = Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_RAMPART);

        let rampartPositions = rampartPlan.map(ps => new RoomPosition(ps.x, ps.y, this.data.room));

        let insideTransform = util_transforms.insideBaseTransform(this.data.room, rampartPositions);

        //util_transforms.drawTransform(insideTransform, this.data.room, 1, true);

        this.memory.insides = "";

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (insideTransform[i][j] == 1)
                    this.memory.insides = this.memory.insides.concat('1');
                else
                    this.memory.insides = this.memory.insides.concat('0');
            }
        }
    }

    drawInsides()
    {
        if (this.insidesDrawn)
            return;

        this.insidesDrawn = true;

        let opacity = 0.25;

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                let index = (i * 50) + j;

                if (this.memory.insides[index] == '1')
                    this.room.visual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#0000ff", opacity: opacity})
                //this.room.visual.text(this.memory.insides[index], i, j + .2, {opacity: 0.5});
            }
        }
    }
}

module.exports = Mission_Defend
