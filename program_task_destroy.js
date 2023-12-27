'use strict'

let Task = require('program_task');

class Task_Destroy extends Task
{
    constructor (...args)
    {
        super(...args);

        this.priority = PROCESS_PRIORITY_CIVILIAN_IMPORTANT;
    }

    doTask(creep)
    {
        super.doTask();

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let roomMemory = Room.getMemory(this.memory.r);
        if (!roomMemory || !roomMemory.hostiles || !roomMemory.hostiles.ic)
            return TASK_RESULT_COMPLETE;

        let target = Game.getObjectById(roomMemory.hostiles.ic);
        if (!target)
            return TASK_RESULT_COMPLETE;

        if (target)
        {
            let secondaryTarget = this.selectTargetBlockingTarget(creep, target);
            if (secondaryTarget)
                target = secondaryTarget;
        }

        return this.destroyTarget(target);
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

        for (let pathPosition of pathInfo.path)
        {
            let potentialTarget = _.find(pathPosition.lookFor(LOOK_STRUCTURES), st =>  st.attackInCombat() && st.isDemolishable());
            if (potentialTarget)
                return potentialTarget;
        }



        //kernel.scheduler.launchProcess('mission_claim', { room: this.memory.r });

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
    }
}

module.exports = Task_Destroy
