'use strict'

const constants = require('constants');
let Task = require('program_task');

class Task_Demolish extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    end()
    {
        if (this.memory)
        {
            let isUnclaiming = Room.isUnclaiming(this.memory.r);
            if (!isUnclaiming)
            {
                let roomMemory = Room.getMemory(this.memory.r);
                let room = Game.rooms[this.memory.r];
                if (roomMemory && room && room.controller && room.controller.my)
                {
                    this.demolishRoom(room, roomMemory);
                }
            }
        }
    
        super.end();
    }

    doTask(creep)
    {
        super.doTask();

        let roomMemory = Room.getMemory(this.memory.r)
        if (!roomMemory)
            return TASK_RESULT_COMPLETE;

        if (roomMemory.controller && roomMemory.controller.sm && roomMemory.controller.sm > Game.time && roomMemory.controller.o != ME)
            return TASK_RESULT_COMPLETE;

        let isUnclaiming = Room.isUnclaiming(this.memory.r);

        if (!roomMemory.demolish && !isUnclaiming)
            return TASK_RESULT_COMPLETE;

        let room = Game.rooms[this.memory.r];
        if (room && room.controller && room.controller.my && !isUnclaiming)
            this.demolishRoom(room, roomMemory);

        if (this.moveToRoom(this.memory.r, 0, { c: constants.PART_COLORS.WORK }))
            return TASK_RESULT_BREAK;

        if (creep.store.getUsedCapacity() > 0)
        {
            for (let resource of RESOURCES_ALL)
            {
                if (creep.store.getUsedCapacity(resource) > 0)
                {
                    creep.drop(resource)
                    return TASK_RESULT_BREAK;
                }
            }
        }

        let target = this.selectTarget(creep);
        if (!target)
            return TASK_RESULT_COMPLETE;

        return this.dismantleTarget(target);
    }

    demolishRoom(room, roomMemory)
    {
        let hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0)
            return;

        let demolishableStructures = room.find(FIND_STRUCTURES, { filter: st => st.isDemolishable() });
        if (demolishableStructures.length <= 0)
        {
            delete roomMemory.demolish;
            room.controller.unclaim();
            return;
        }

        _.each(demolishableStructures, st => st.destroy());
    }

    selectTarget(creep)
    {
        let room = Game.rooms[this.memory.r];
        let roomMemory = Room.getMemory(creep.room.name);

        if (room && room.controller && room.controller.my && Room.isUnclaiming(this.memory.r))
        {
            if (room.nuker)
                return room.nuker;
            if (room.powerSpawn)
                return room.powerSpawn;
            if (room.factory)
                return room.factory;
            if (room.labs && room.labs.length > 0)
                return _.min(room.labs, o => o.pos.getRangeTo(creep));
            if (room.ramparts.length > 0)
            {
                if (room.terminal)
                    return _.min(room.ramparts, o => room.terminal.pos.getRangeTo(o));
                else
                    return _.min(room.ramparts, o => creep.pos.getRangeTo(o));
            }
            return null
        }

        let target = null;
        if ((creep.memory.n == 0 || (roomMemory && roomMemory.maxDemo && creep.memory.n < roomMemory.maxDemo)) && creep.room.controller && !creep.room.controller.my)
        {
            target = this.selectTargetBlockingTarget(creep, creep.room.controller);
            
            // if (target)
            //     console.log('Task_Demolish.selectTarget - ' + creep.name + ' - dismantling target at ' + target.pos + ' blocking controller in ' + creep.room.name);

            if (!target)
            {
                let demolishableStructures = creep.room.find(FIND_STRUCTURES, { filter: st => st.isDemolishable() && st.hits && st.attackInCombat() });
                let totalDemolishableHits = _.sum(demolishableStructures, st => st.hits);

                //console.log('Task_Demolish.selectTarget - ' + creep.name + ' - considering claim option. demolishableStructures: ' + demolishableStructures.length + ', totalDemolishableHits: ' + totalDemolishableHits);

                if (totalDemolishableHits > 1000000)
                {
                    let flagName = 'claim_' + this.memory.r;
                    if (!Game.flags[flagName])
                        creep.room.createFlag(creep.room.controller.pos, flagName);
                }
            }
            else
            {
                roomMemory.controllerBlocked = 1;
            }
        }


        if (!target)
        {
            target = this.selectBestTarget(creep);
            if (target)
            {
                let secondaryTarget = this.selectTargetBlockingTarget(creep, target);
                if (secondaryTarget)
                {
                    return secondaryTarget;
                }
                else
                {
                    let positionsNearby = _.filter(target.pos.getOpenSpots(), p => !p.isObstructed(null, false, true, false, false));
                    roomMemory.maxDemo = (positionsNearby.length || 1);
                }
            }
        }

        return target;
    }

    selectTargetBlockingTarget(creep, target)
    {
        let targetPos = target;
        if (target.pos)
            targetPos = target.pos;
        let pathInfo = PathFinder.search(creep.pos, {pos: targetPos, range: 1}, {maxRooms: 1, plainCost: 2, swampCost: 10, maxOps: 500000, roomCallback: this.makeCostMatrix});
        if (pathInfo.incomplete)
        {
            console.log('Task_Demolish.selectTargetBlockingTarget - ' + creep.pos + ' -> ' + targetPos + ' - could not find path');
            return null;
        }

        let previousPosition = creep.pos;
        for (let pathPosition of pathInfo.path)
        {
            let potentialTarget = _.find(pathPosition.lookFor(LOOK_STRUCTURES), st => st.attackInCombat() && st.isDemolishable(true));
            if (potentialTarget)
            {
                let positionsNearby = _.filter(pathPosition.getOpenSpots(), p => p.getRangeTo(previousPosition) <= 1 && !p.isObstructed(null, false, true, false, false));
                Room.getMemory(creep.room.name).maxDemo = (positionsNearby.length || 1);
                return potentialTarget;
            }
                

            previousPosition = pathPosition;
        }



        //kernel.scheduler.launchProcess('mission_claim', { room: this.memory.r });

        return null;
    }

    selectBestTarget(creep)
    {
        let potentialTargets = [];

        let myFlag = Game.flags[creep.name];
        if (myFlag && myFlag.pos.roomName == creep.room.name)
        {
            potentialTargets = myFlag.pos.lookFor(LOOK_STRUCTURES);
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => t.hits);
        }

        potentialTargets = creep.room.find(FIND_HOSTILE_SPAWNS, { filter: st => st.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        if (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my)
        {
            potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.attackInCombat() && (st.structureType == STRUCTURE_STORAGE || st.structureType == STRUCTURE_TERMINAL) });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

            potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

            potentialTargets = creep.room.find(FIND_STRUCTURES, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_CONTAINER });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

            potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

            potentialTargets = creep.room.find(FIND_STRUCTURES, { filter: st => st.attackInCombat() && (st.structureType == STRUCTURE_CONTAINER || st.structureType == STRUCTURE_WALL) });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        }
        else
        {
            potentialTargets = creep.room.find(FIND_STRUCTURES, { filter: st => st.isDemolishable() && st.hits && st.attackInCombat() });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        }

        return null;
    }

    makeCostMatrix(roomName)
    {
        let costMatrix = new PathFinder.CostMatrix;

        let roadCost = 1;
        let demolishableCost = 250;

        let room = Game.rooms[roomName];
        if (!room)
            return costMatrix;

        let structures = room.find(FIND_STRUCTURES);
        if (!structures || structures.length <= 0)
            return costMatrix;

        let maxHits = _.max(structures, s => s.hits).hits;

        structures.forEach(function(struct)
        {
            // Walk on roads
            if (struct.structureType === STRUCTURE_ROAD)
                costMatrix.set(struct.pos.x, struct.pos.y, roadCost);
            else if (!struct.attackInCombat() && struct.blocksMovement())
                costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
            // // Try to go around demolishable buildings
            // else if (struct.isDemolishable())
            //     costMatrix.set(struct.pos.x, struct.pos.y, demolishableCost);
            else if (!struct.my && (struct.structureType == STRUCTURE_RAMPART || struct.structureType == STRUCTURE_WALL))
                costMatrix.set(struct.pos.x, struct.pos.y, Math.max(1, (struct.hits / maxHits) * 250));
            else if (struct.blocksMovement())
                costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
        });

        return costMatrix;

        // let costMatrix = new PathFinder.CostMatrix;

        // let roadCost = 1;
        // let demolishableCost = 25;

        // let room = Game.rooms[roomName];
        // if (!room)
        //     return costMatrix;

        // room.find(FIND_STRUCTURES).forEach(function(struct)
        // {
        //     // Walk on roads
        //     if (struct.structureType === STRUCTURE_ROAD)
        //         costMatrix.set(struct.pos.x, struct.pos.y, roadCost);
        //     // Try to go around demolishable buildings
        //     else if (struct.isDemolishable())
        //         costMatrix.set(struct.pos.x, struct.pos.y, demolishableCost);
        //     else if (struct.structureType !== STRUCTURE_CONTAINER && (struct.structureType !== STRUCTURE_RAMPART || !struct.my))
        //         costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
        // });

        // return costMatrix;
    }
}

module.exports = Task_Demolish
