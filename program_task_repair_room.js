'use strict'

let Task = require('program_task');

class Task_Repair_Room extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();
        //this.launchChildProcess(`fill_worker_${this.memory.target}`, 'mission_fill_worker', { room: this.memory.r, target: this.creep.id });

        let room = Game.rooms[this.memory.r];
        if (!room)
            return null;

        let basePlan = Room.getBasePlanMemory(this.memory.r);
        if (!basePlan || !basePlan.structures)
            return null;

        let repairPower = this.creep.repairPower;

        let targetIds = [];

        let structures = room.find(FIND_STRUCTURES, { filter: st => st.hits && st.hits <= st.hitsMax - repairPower && st.structureType != STRUCTURE_RAMPART && (st.structureType == STRUCTURE_ROAD || st.structureType == STRUCTURE_CONTAINER || st.my) });
        for (let structure of structures)
        {
            let structurePlan = Room.getBasePlanMemoryStructuresSpots(this.memory.r, structure.structureType);
            if (structurePlan && _.find(structurePlan, ps => ps.x == structure.pos.x && ps.y == structure.pos.y))
                targetIds.push(structure.id);
        }

        this.memory.targetIds = targetIds;
    }

    end()
    {
        super.end();

        if (this.creep && this.creep.memory)
            delete this.creep.memory.ept;
    }

    doTask(creep)
    {
        if (this.creep)
            this.creep.memory.ept = this.creep.memory.work;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();
        if (creepEnergy <= 0)
            return this.getResourceNearest(RESOURCE_ENERGY);

        if (!this.memory.targetIds || this.memory.targetIds.length < 1)
            return TASK_RESULT_COMPLETE;

        while (this.memory.targetIds.length > 0)
        {
            let target = Game.getObjectById(this.memory.targetIds[0]);

            if (target && target.hits <= target.hitsMax - creep.repairPower)
                return this.repairTarget(target);

            this.memory.targetIds.splice(0, 1);
        }

        return TASK_RESULT_COMPLETE;
    }

    makeCostMatrix(roomName)
    {
        let costMatrix = new PathFinder.CostMatrix;

        let roadCost = 3;

        for (let siteId in Game.constructionSites)
        {
            let site = Game.constructionSites[siteId];
            if (site.pos.roomName == roomName)
                costMatrix.set(site.pos.x, site.pos.y, roadCost);
        }

        let room = Game.rooms[roomName];
        if (!room)
            return costMatrix;

        room.find(FIND_STRUCTURES).forEach(function(struct)
        {
            // Favor roads over plain tiles, but not too much, so bad road paths can be improved
            if (struct.structureType === STRUCTURE_ROAD)
                costMatrix.set(struct.pos.x, struct.pos.y, roadCost);
            // Can't walk through non-walkable buildings
            else if (struct.structureType !== STRUCTURE_CONTAINER && (struct.structureType !== STRUCTURE_RAMPART || !struct.my))
                costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
        });

        if (room.isMyBase())
        {
            let basePlan = Room.getBasePlanMemory(room.name);
            if (!basePlan || !basePlan.structures || !basePlan.structures[STRUCTURE_ROAD])
                return costMatrix;

            let roadPlan = Room.getBasePlanMemoryStructuresSpots(room.name, STRUCTURE_ROAD);

            for (let plannedRoad of roadPlan)
                costMatrix.set(plannedRoad.x, plannedRoad.y, roadCost);
        }

        return costMatrix;
    }
}

module.exports = Task_Repair_Room
