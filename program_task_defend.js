'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Defend extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_DEFENSE;
    }

    doTask(creep)
    {
        if (creep.memory.boosts && creep.ticksToLive < CREEP_LIFE_TIME / 10)
            return this.recycle('reclaiming');

        let missionMemory = Mission_Creeps.getMemory({ type: 'defend', room: this.memory.r });
        if (!missionMemory)
            return TASK_RESULT_COMPLETE;

        let roomMemory = Room.getMemory(this.memory.r);
        if ((!roomMemory || !roomMemory.hostiles) && creep.memory.type != 'defend')
            return TASK_RESULT_COMPLETE;

        let defenders = Room.getJobSpawnedCreeps(this.memory.r, 'defend');

        let canHeal = creep.memory[HEAL];
        let canRangedAttack = creep.memory[RANGED_ATTACK];
        let canMove = true;
        let canMelee = creep.memory[ATTACK];

        let hitsPercent = creep.hitsPercent;
        if (canHeal && hitsPercent < 1)
        {
            creep.heal(creep);
            canHeal = false;
            canMelee = false;
        }

        let allowNearEdge = (creep.room.name == this.memory.r);

        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS, { filter: cr => cr.killOnSight() && (allowNearEdge || !cr.pos.nearEdge(0)) });
        hostiles.sort((a, b) => a.ticksToLive - b.ticksToLive);
        let enemyTarget = null;
        if (defenders.length > 0)
        {
            let ratio = hostiles.length / defenders.length;
            let hostileIndex = Math.ceil(ratio * creep.memory.n);
            if (hostileIndex < hostiles.length)
                enemyTarget = hostiles[hostileIndex];
        }

        // if (!enemyTarget && hostiles.length > creep.memory.n)
        //     enemyTarget = hostiles[creep.memory.n];
        if (!enemyTarget && hostiles.length > 0)
            enemyTarget = _.min(hostiles, h => creep.wpos.getRangeTo(h.wpos));
        if (!enemyTarget && Game.flags['defenseTest'] && Game.flags['defenseTest'].pos.roomName == creep.room.name)
            enemyTarget = Game.flags['defenseTest'];

        let rangeToHostile = Infinity;
        if (!enemyTarget)
        {
            let hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
            if (hostiles.length > 0)
                enemyTarget = _.min(hostileStructures, h => creep.wpos.getRangeTo(h.wpos));
        }

        let hostilesInRange = hostiles.filter(c => c.pos.getRangeTo(creep.pos) <= 3);

        let moveTarget = enemyTarget;
        let attackTarget = enemyTarget;
        if (hostilesInRange.length > 0)
        {
            let hostilesAdjacent = hostiles.filter(c => c.pos.getRangeTo(creep.pos) <= 1);
            if (hostilesAdjacent.length > 0)
                attackTarget = _.min(hostilesAdjacent, c => c.hits);
            else
                attackTarget = _.min(hostilesInRange, c => c.hits);
        }
            

        if (attackTarget != null && !attackTarget.pos)
            console.log(JSON.stringify(attackTarget))

        if (attackTarget != null)
        {
            rangeToHostile = creep.pos.getRangeTo(attackTarget.pos);
            Game.map.visual.line(creep.pos, attackTarget.pos, {color: '#00ffff', lineStyle: 'dashed'});
            Game.map.visual.circle(attackTarget.pos, {radius: 1, fill: '#00ffff', opacity: 0.5});
        }

        if (attackTarget != null && canRangedAttack && attackTarget.pos.roomName == creep.pos.roomName)
        {
            if (rangeToHostile <= 1)
            {
                creep.rangedMassAttack();
                canRangedAttack = false;
            }
            else if (rangeToHostile <= 3)
            {
                creep.rangedAttack(attackTarget);
                canRangedAttack = false;
            }
        }

        if (moveTarget)
        {
            if (this.gotoTargetSpot(creep, moveTarget))
                canMove = false;

            if (canMelee && attackTarget != null && rangeToHostile <= 1)
            {
                creep.attack(attackTarget);
                canMelee = false;
                canHeal = false;
            }
        }
        
        if (moveTarget && canMove)
        {
            if (canMelee)
            {
                if (rangeToHostile > 1)
                {
                    this.gotoTarget(moveTarget, 1, { ignoreCreeps: false })
                    canMove = false;
                }
                else if (attackTarget != null && canMelee)
                {
                    creep.attack(attackTarget);
                    canMelee = false;
                    canHeal = false;
                }
            }
            else if (canRangedAttack)
            {
                if (rangeToHostile < 3)
                    return this.flee(creep, moveTarget);

                this.gotoTarget(moveTarget, 3, { ignoreCreeps: false });
                canMove = false;
            }
        }

        if (canHeal)
        {
            let healTarget = null;
            if (attackTarget)
                healTarget = creep.pos.findInRange(FIND_MY_CREEPS, 3, { filter: c => c.hits < c.hitsMax });
            else
                healTarget = creep.pos.findClosestByRange(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax });

            if (healTarget)
            {
                let rangeToHealTarget = creep.pos.getRangeTo(healTarget);

                if (rangeToHealTarget <= 1)
                {
                    creep.heal(healTarget);
                    canHeal = false;
                    canMelee = false;
                }
                else if (rangeToHealTarget <= 3 && canHeal && canRangedAttack)
                {
                    creep.rangedHeal(healTarget);
                    canHeal = false;
                    canRangedAttack = false;
                }
            }
        }

        // if (creep.memory.mission.flee)
        //     return this.flee(creep, attackTarget);

        let targetRoomCenter = new RoomPosition(25, 25, this.memory.r);
        Game.map.visual.line(creep.pos, targetRoomCenter, {color: '#00ffff', lineStyle: 'dashed'});
        Game.map.visual.circle(targetRoomCenter, {radius: 1, fill: '#00ffff', opacity: 0.5});

        if (this.gotoRoom(this.memory.r, 0, { ignoreCreeps: false }))
            return TASK_RESULT_BREAK;

        return TASK_RESULT_BREAK;
    }

    gotoTargetSpot(creep, enemyTarget)
    {
        let costMatrix = this.makeCostMatrix(this.memory.r);

        let ramparts = _.filter(creep.room.getStructures(STRUCTURE_RAMPART), st => (st.pos.isEqualTo(creep.pos) || !st.pos.isObstructed()));// costMatrix.get(st.pos.x, st.pos.y) != 0xff));
        let bestRampart = _.min(ramparts, r => r.wpos.getManhattanDist(enemyTarget.wpos));

        if (bestRampart && bestRampart.pos)
        {
            this.gotoTarget(bestRampart, 0, { ignoreCreeps: true, plainCost: 4, swampCost: 20, roomCallback: rn => costMatrix });
            return true;
        }
    }

    makeCostMatrix(roomName)
    {
        let room = Game.rooms[roomName];
        if (!room)
            return new PathFinder.CostMatrix;

        if (global.costMatrices && global.costMatrices[roomName] && global.costMatrices[roomName].timeStamp == Game.time)
            return global.costMatrices[roomName].matrix;

        let costMatrix = new PathFinder.CostMatrix;

        let roadCost = 4;

        room.find(FIND_STRUCTURES).forEach(function(struct)
        {
            let existingCost = costMatrix.get(struct.pos.x, struct.pos.y);
            let newCost = existingCost;

            if (struct.structureType === STRUCTURE_ROAD)
                newCost = Math.min(existingCost, roadCost);
            else if (struct.blocksMovement())
                newCost = 0xff;
            else if (struct.my && struct.structureType == STRUCTURE_RAMPART)
                newCost = 1;

            costMatrix.set(struct.pos.x, struct.pos.y, newCost);
        });

        room.find(FIND_HOSTILE_CREEPS).forEach(function(cr)
        {
            costMatrix.set(cr.pos.x, cr.pos.y, 0xff);
        });

        room.find(FIND_HOSTILE_POWER_CREEPS).forEach(function(cr)
        {
            costMatrix.set(cr.pos.x, cr.pos.y, 0xff);
        });

        let missionMemory = Mission_Creeps.getMemory({ type: 'defend', room: this.memory.r });
        if (missionMemory && missionMemory.insides)
        {
            for (var i = 0; i < 50; ++i)
            {
                for (var j = 0; j < 50; ++j)
                {
                    let index = (i * 50) + j;

                    if (missionMemory.insides[index] == '0')
                        costMatrix.set(i, j, 0xff);

                    //room.visual.text(costMatrix.get(i, j), i, j + .2, {opacity: 0.5});
                }
            }
        }

        if (!global.costMatrices)
            global.costMatrices = {};
        if (!global.costMatrices[roomName])
            global.costMatrices[roomName] = { timeStamp: Game.time, matrix: costMatrix };

        return costMatrix;
    }

    flee(creep, enemyTarget)
    {
        if (!enemyTarget && ! creep.pos.nearEdge(5))
            return TASK_RESULT_BREAK;

        let nearestBase = Room.getNearestBase(creep.room.name);
        if (!nearestBase || nearestBase.name == creep.room.name)
        {
            creep.moveTo(enemyTarget, { range: 10, flee: true, ignoreCreeps: false });
            return TASK_RESULT_BREAK;
        }

        this.gotoTarget(nearestBase.controller, 5);
        return TASK_RESULT_BREAK;
    }
}

module.exports = Task_Defend
