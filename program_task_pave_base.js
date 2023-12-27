'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Pave_Base extends Task
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

        let repairIds = [];
        if (room.controllerCan)
            repairIds.push(room.controllerCan.id);

        let damagedStructures = room.find(FIND_STRUCTURES, { filter: st => st.hits && st.hits <= st.hitsMax - repairPower && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_WALL && st.structureType != STRUCTURE_RAMPART });
        for (let structure of damagedStructures)
        {
            let structurePlan = Room.getBasePlanMemoryStructuresSpots(this.memory.r, structure.structureType);
            if (structurePlan && _.find(structurePlan, ps => ps.x == structure.pos.x && ps.y == structure.pos.y))
                repairIds.push(structure.id);
        }

        if (room.mineral && room.mineral.container && room.mineral.container.hits && room.mineral.container.hits <= room.mineral.container.hitsMax - repairPower)
            repairIds.push(room.mineral.container.id);

        this.memory.repairIds = repairIds;

        let roadPlan = Room.getBasePlanMemoryStructuresSpots(this.memory.r, STRUCTURE_ROAD);

        if (roadPlan)
        {
            this.memory.roadPositions = roadPlan.map(ps => new RoomPosition(ps.x, ps.y, this.memory.r));
            if (!room.terminal || !room.terminal.my)
            {
                let structures = room.find(FIND_STRUCTURES, { filter: st => st.hits && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_WALL && st.structureType != STRUCTURE_RAMPART });
                this.memory.roadPositions = this.memory.roadPositions.filter(rp => structures.some(s => rp.getRangeTo(s.pos) <= 1));
            }
        }
    }

    doTask(creep)
    {
        if (!this.memory.repairIds)
        {
            console.log('Task_Pave_Base.doTask - ' + creep.name + ' - ' + this.memory.r + ' - no repairIds found! Ending task.')
            return TASK_RESULT_COMPLETE;
        }
        
        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        if (creepEnergy <= 0)
            return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        let room = Game.rooms[this.memory.r];
        let repairables = this.memory.repairIds.map(rid => Game.getObjectById(rid));
        repairables = _.filter(repairables, r => r && r.hits <= r.hitsMax - creep.repairPower);
        repairables = _.sortBy(repairables, r => r.wpos.getRangeTo(creep.wpos));
        this.memory.repairIds = repairables.map(r => r.id);

        if (repairables.length > 0)
            return this.repairTarget(repairables[0]);

        if (this.memory.roadPositions)
            this.memory.roadPositions = _.sortBy(this.memory.roadPositions.map(rp => new RoomPosition(rp.x, rp.y, this.memory.r)), rp => creep.pos.getRangeTo(rp));

        while (this.memory.roadPositions && this.memory.roadPositions.length > 0)
        {
            let nextPos = this.memory.roadPositions[0];
            let roadSite = _.find(nextPos.lookFor(LOOK_CONSTRUCTION_SITES), s => s.structureType == STRUCTURE_ROAD);
            if (roadSite)
                return this.buildTarget(roadSite);

            let road = _.find(nextPos.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_ROAD);
            if (road && road.hitsMax - road.hits >= creep.repairPower)
                return this.repairTarget(road);

            if (!road)
            {
                nextPos.createConstructionSite(STRUCTURE_ROAD);
                return TASK_RESULT_BREAK;
            }

            this.memory.roadPositions.splice(0, 1);
        }

        this.memory.finished = true;

        Room.setPaveTime(this.memory.r, this.memory.r, Game.time);

        console.log('Task_Pave_Base.doTask - ' + creep.name + ' - finished');
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

module.exports = Task_Pave_Base
