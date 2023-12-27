'use strict'

let Task = require('program_task');
let Mission_Creeps = require('program_mission_creeps');

class Task_Pave extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();
        //this.launchChildProcess(`fill_worker_${this.memory.target}`, 'mission_fill_worker', { room: this.memory.r, target: this.creep.id });

        this.memory.rooms = [ this.memory.r1 ];
        if (this.memory.r1 != this.memory.r2)
        {
            let route = Game.map.findRoute(this.memory.r1, this.memory.r2);

            if (route == ERR_NO_PATH)
            {
                console.log('Task_Pave.start - ' + this.memory.r1 + ' -> ' + this.memory.r2 + ' - could not find path');
                this.memory.rooms = [];
                return;
            }

            for (let routeInfo of route)
                this.memory.rooms.push(routeInfo.room);
        }
    }

    doTask(creep)
    {
        if (this.memory.finished)
            return TASK_RESULT_COMPLETE;

        if (creep.memory.job.source)
        {
            let sourceOrMineral = Game.getObjectById(creep.memory.job.source);

            if (sourceOrMineral && sourceOrMineral.lair)
            {
                let roomMemory = Room.getMemory(this.memory.r);
                if (roomMemory && !roomMemory.clear)
                    return TASK_RESULT_COMPLETE;
    
                let dismantleTarget = this.creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: s => s.hits && s.effects && s.effects.length > 0 && s.effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER) && (!s.store || s.store.getUsedCapacity() <= 0) });
                if (dismantleTarget)
                    return this.dismantleTarget(dismantleTarget);
                    
                if (this.avoidLair())
                    return TASK_RESULT_BREAK;
            }
        }

        if (!this.memory.rooms || this.memory.rooms.length < 1)
        {
            if (this.moveToRoom(this.memory.r2, 0))
                return TASK_RESULT_BREAK;

            let source = Game.getObjectById(this.memory.source);
            if (!source || source.link || (source.mineralType && source.room.isMyBase()))
            {
                this.markFinished();
                return TASK_RESULT_COMPLETE;
            }

            let target = source.container;

            if (!target)
                target = source.lookForFirstInRange(LOOK_CONSTRUCTION_SITES, 1, s => s.structureType == STRUCTURE_CONTAINER );
                //target = _.find(source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: s => s.structureType == STRUCTURE_CONTAINER }));

            if (!target)
            {
                let targetPos = source.containerPos;
                if (!targetPos)
                {
                    let pathStart = new RoomPosition(this.memory.x1, this.memory.y1, this.memory.r1);
                    let pathEnd = new RoomPosition(this.memory.x2, this.memory.y2, this.memory.r2);

                    let pathInfo = PathFinder.search(pathStart, {pos: pathEnd, range: 1}, {plainCost: 6, swampCost: 7, maxOps: 500000, roomCallback: this.makeCostMatrix});
                    if (pathInfo.incomplete)
                    {
                        console.log('Task_Pave.doTask - ' + this.memory.r1 + ' -> ' + this.memory.r2 + ' - could not find path for container');
                        this.markFinished();
                        return TASK_RESULT_COMPLETE;
                    }

                    if (!pathInfo.path || pathInfo.path.length < 1 || _.last(pathInfo.path).getRangeTo(pathEnd) > 1)
                    {
                        console.log('Task_Pave.doTask - ' + this.memory.r1 + ' -> ' + this.memory.r2 + ' - no valid points in path for container in room: '+ this.memory.r2);
                        this.markFinished();
                        return TASK_RESULT_COMPLETE;
                    }

                    targetPos = _.last(pathInfo.path)
                }


                //console.log('Task_Pave.doTask - ' + creep.name + ' - creating container site at: ' + targetPos);
                let result = targetPos.createConstructionSite(STRUCTURE_CONTAINER);
                if (result != OK)
                {
                    console.log('Task_Pave.doTask - ' + creep.name + ' - failed to create container site at: ' + targetPos);
                    return TASK_RESULT_COMPLETE;
                }

                return TASK_RESULT_BREAK;
            }

            if (target.hits && target.hits < target.hitsMax)
                return this.repairTarget(target, true);

            if (target.progressTotal)
                return this.buildTarget(target, (source.mineralType && !source.room.isMyBase()));

            this.markFinished();
            return TASK_RESULT_COMPLETE;
        }


        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        let creepCarry = creep.getResourceAmount();
        if (creepCarry > creepEnergy)
            return this.deliverResourceToStorage();
        if (creepEnergy <= 0)
            return this.getResourceNearest(RESOURCE_ENERGY);

        let nextRoomName = this.memory.rooms[0];
        if (this.moveToRoom(nextRoomName, 0))
            return TASK_RESULT_BREAK;

        let pathStart = new RoomPosition(this.memory.x1, this.memory.y1, this.memory.r1);
        let pathEnd = new RoomPosition(this.memory.x2, this.memory.y2, this.memory.r2);

        let pathInfo = PathFinder.search(pathStart, {pos: pathEnd, range: 1}, {plainCost: 6, swampCost: 7, maxOps: 500000, roomCallback: this.makeCostMatrix});
        if (pathInfo.incomplete)
        {
            console.log('Task_Pave.doTask - ' + this.memory.r1 + ' -> ' + this.memory.r2 + ' - could not find path');
            this.markFinished();
            return TASK_RESULT_COMPLETE;
        }

        let pathInRoom = _.filter(pathInfo.path, pp => pp.roomName == nextRoomName && !pp.nearEdge(0));
        if (pathInRoom.length < 1)
        {
            console.log('Task_Pave.doTask - ' + this.memory.r1 + ' -> ' + this.memory.r2 + ' - no valid points in path for room: '+ nextRoomName);
            this.memory.rooms.splice(0, 1);
            return TASK_RESULT_BREAK;
        }

        pathInRoom = _.sortBy(pathInRoom, pp => creep.wpos.getManhattanDist(pp.toWorldPosition()));

        while (pathInRoom.length > 0)
        {
            let nextPos = pathInRoom[0];
            let roadSite = _.find(nextPos.lookFor(LOOK_CONSTRUCTION_SITES), s => s.structureType == STRUCTURE_ROAD);
            if (roadSite)
                return this.buildTarget(roadSite);

            let road = _.find(nextPos.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_ROAD);
            if (road && road.hitsMax - road.hits >= creep.repairPower)
                return this.repairTarget(road);

            if (!road)
            {
                //console.log('Task_Pave.doTask - ' + creep.name + ' - creating road site at: ' + nextPos);
                let result = nextPos.createConstructionSite(STRUCTURE_ROAD);
                if (result != OK)
                {
                    console.log('Task_Pave.doTask - ' + creep.name + ' - failed to create road site at: ' + nextPos);
                    return TASK_RESULT_COMPLETE;
                }

                return TASK_RESULT_BREAK;
            }

            pathInRoom.splice(0, 1);
        }

        //console.log('Task_Pave.doTask - ' + creep.name + ' - splicing room: ' + this.memory.rooms[0]);

        this.memory.rooms.splice(0, 1);
        return TASK_RESULT_BREAK;
    }

    markFinished()
    {
        this.memory.finished = true;

        let paveKey = (this.memory.targetRoom || this.memory.source);
        Room.setPaveTime(this.memory.r2, paveKey, Game.time);
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

        room.find(FIND_CONSTRUCTION_SITES).forEach(function(site)
        {
            // Favor roads over plain tiles, but not too much, so bad road paths can be improved
            if (site.structureType === STRUCTURE_ROAD)
                costMatrix.set(site.pos.x, site.pos.y, roadCost);
            // Can't walk through non-walkable buildings
            else if (site.structureType !== STRUCTURE_CONTAINER && (site.structureType !== STRUCTURE_RAMPART || !site.my))
                costMatrix.set(site.pos.x, site.pos.y, 0xff);
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

module.exports = Task_Pave
