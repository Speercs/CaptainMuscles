/**
 * To start using Traveler, require it in main.js:
 * Example: var Traveler = require('Traveler.js');
 */

//var allies = require('allies');

const constants = require('constants');

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Traveler {
    /**
     * move creep to destination
     * @param creep
     * @param destination
     * @param options
     * @returns {number}
     */
    static travelTo(creep, destination, options = {}) {
        if (creep.memory._mt == Game.time) {
            return OK;
        }

        delete creep.memory.moving;
        // uncomment if you would like to register hostile rooms entered
        // this.updateRoomStatus(creep.room);
        if (!destination)
        {
            return ERR_INVALID_ARGS;
        }

        destination = this.normalizePos(destination);

        if (options.c)
        {
            Game.map.visual.line(creep.pos, destination, {color: options.c, lineStyle: 'dashed'});
            Game.map.visual.circle(destination, {radius: 1, fill: options.c, opacity: 0.5});
        }

        if (creep.fatigue > 0 && !options.planOnly)
        {
            Traveler.circle(creep.pos, "aqua", .3);
            return ERR_BUSY;
        }

        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);
        if (!_.isUndefined(options.range))
        {
            if (!options.flee && rangeToDestination <= options.range)
                return OK;
            // if (options.flee && rangeToDestination >= options.range)
            //     return OK;
        }
        else if ((_.isUndefined(options.range) || options.range == 1) && rangeToDestination <= 1)
        {
            if (rangeToDestination === 1 && _.isUndefined(options.range) && !options.planOnly)
            {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData)
                {
                    options.returnData.direction = direction;
                    options.returnData.nextPos = destination;
                    options.returnData.path = direction.toString();
                }
                creep.memory._mt = Game.time;
                creep.memory.moving = direction
                return creep.move(direction);
            }
            return OK;
        }
        // initialize data object
        if (!creep.memory._trav) {
            delete creep.memory._travel;
            creep.memory._trav = {};
        }
        let travelData = creep.memory._trav;
        let state = this.deserializeState(travelData, destination, options.flee);
        // uncomment to visualize destination
        this.circle(destination, "orange");
        // check if creep is stuck

        if (this.isStuck(creep, state)) {
            state.stuckCount++;
            Traveler.circle(creep.pos, "magenta", state.stuckCount * .2);
        }
        else {
            state.stuckCount = 0;
        }
        // handle case where creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE;
        }
        if (state.stuckCount >= options.stuckValue)// && Math.random() > .5)
        {
            options.ignoreCreeps = false;
            options.freshMatrix = true;
            delete travelData.path;
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {
            if (options.movingTarget && state.destination.isNearTo(destination)) {
                travelData.path += state.destination.getDirectionTo(destination);
                state.destination = destination;
            }
            else {
                delete travelData.path;
            }
        }
        if (options.repath && Math.random() < options.repath) {
            // add some chance that you will find a new path randomly
            delete travelData.path;
        }

        if (!!options.flee != !!state.flee)
            delete travelData.path;

        // pathfinding
        let newPath = false;
        if ((options.ignoreCreeps || _.isUndefined(options.ignoreCreeps)) && creep.pos.nearEdge(0))
        {
            let nextPos = creep.nextMovePos;

            if (nextPos && !nextPos.isEqualTo(creep.pos) && nextPos.roomName == creep.pos.roomName)
            {
                let blocker = _.find(nextPos.lookFor(LOOK_CREEPS), c => c.my);
                if (blocker)
                {
                    options.ignoreCreeps = false;
                    options.freshMatrix = true;
                    delete travelData.path;
                    //console.log('TRAVELER: ' + creep.name + ' - ' + creep.room.name + ' - avoiding blocking creep');
                }
            }
        }
        if (!travelData.path) {
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();
            let ret = this.findTravelPath(creep.pos, destination, options);
            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            if (state.cpu > REPORT_CPU_THRESHOLD) {
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
            }
            let color = "orange";
            if (ret.incomplete) {
                // uncommenting this is a great way to diagnose creep behavior issues
                // console.log(`TRAVELER: incomplete path for ${creep.name}`);
                state.stuckCount += 1;
                color = "red";
                if (!travelData.fail)
                    travelData.fail = 1;
                else
                    travelData.fail += 1;

                if (travelData.fail >= 10 && !creep.memory[ATTACK] && !creep.memory[RANGED_ATTACK] && !creep.memory[HEAL])
                {
                    console.log('TRAVELER: ' + creep.name + ' - ' + creep.room.name + ' - emergency self-destruct sequence activated after ' + travelData.fail + ' failed pathing attempts');
                    creep.suicide();
                    return ERR_NO_PATH;
                }
            }
            else
            {
                delete travelData.fail;
                state.stuckCount = 0;
            }
            if (options.returnData) {
                options.returnData.pathfinderReturn = ret;
            }
            travelData.path = Traveler.serializePath(creep.pos, ret.path, color);
            if (options.ignoreCreeps && options.usePaths)
                Traveler.updateCachedPath(creep, ret.path);
        }
        this.serializeState(creep, destination, state, travelData, options.flee);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }

        if (options.planOnly)
            return OK;

        // consume path
        if (state.stuckCount === 0 && !newPath) {
            travelData.path = travelData.path.substr(1);
        }
        let nextDirection = parseInt(travelData.path[0], 10);
        if (nextDirection && (creep.memory.type == 'carry' || state.stuckCount > 0 ))//|| creep.currentTask && creep.currentTask.squad))
        {
            //console.log('TRAVELER: looking for still creep at ' + nextDirection);
            let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
            if (nextPos) {
                //console.log('TRAVELER: looking for still creep at ' + nextPos);
                var stillCreep = _.find(nextPos.lookFor(LOOK_CREEPS), (cr)=>(cr.my && !cr.fatigue && (!cr.memory._mt || cr.memory._mt < Game.time - 1)));
                if (stillCreep) {
                    //console.log('TRAVELER: found still creep at ' + nextPos);
                    let moveDir = stillCreep.pos.getDirectionTo(creep)
                    stillCreep.move(moveDir);
                    stillCreep.memory.moving = moveDir;
                    stillCreep.memory._mt = Game.time;
                    if (stillCreep.memory._trav && stillCreep.memory._trav.path) {
                        delete stillCreep.memory._trav.path;
                        //stillCreep.memory._trav.path = nextDirection.toString().concat(stillCreep.memory._trav.path);
                        //stillCreep.memory._trav.state[STATE_PREV_X] = creep.pos.x;
                        //stillCreep.memory._trav.state[STATE_PREV_Y] = creep.pos.y;
                        Traveler.circle(stillCreep.pos, "yellow");
                        //stillCreep.say('.');
                    }
                }
                else
                {
                    var stillCreep = _.find(nextPos.lookFor(LOOK_POWER_CREEPS), (cr)=>(cr.my && !cr.fatigue && (!cr.memory._mt || cr.memory._mt < Game.time - 1)));
                    if (stillCreep) {
                        //console.log('TRAVELER: found still creep at ' + nextPos);
                        let moveDir = stillCreep.pos.getDirectionTo(creep)
                        stillCreep.move(moveDir);
                        stillCreep.memory.moving = moveDir;
                        stillCreep.memory._mt = Game.time;
                        if (stillCreep.memory._trav && stillCreep.memory._trav.path) {
                            delete stillCreep.memory._trav.path;
                            //stillCreep.memory._trav.path = nextDirection.toString().concat(stillCreep.memory._trav.path);
                            //stillCreep.memory._trav.state[STATE_PREV_X] = creep.pos.x;
                            //stillCreep.memory._trav.state[STATE_PREV_Y] = creep.pos.y;
                            Traveler.circle(stillCreep.pos, "yellow");
                            //stillCreep.say('.');
                        }
                    }
                }
            }
        }
        if (options.returnData) {
            if (nextDirection) {
                options.returnData.direction = nextDirection;
                let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }
        creep.memory._mt = Game.time;
        creep.memory.moving = nextDirection;
        return creep.move(nextDirection);
    }
    /**
     * make position objects consistent so that either can be used as an argument
     * @param destination
     * @returns {any}
     */
    static normalizePos(destination) {
        if (!(destination instanceof RoomPosition)) {
            return destination.pos;
        }
        return destination;
    }
    /**
     * check if room should be avoided by findRoute algorithm
     * @param roomName
     * @returns {RoomMemory|number}
     */
    static checkAvoid(roomName) {
        return Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].avoid;
    }
    /**
     * check if a position is an exit
     * @param pos
     * @returns {boolean}
     */
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    /**
     * check two coordinates match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    /**
     * check if two positions match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */
    static circle(pos, color, opacity) {
        new RoomVisual(pos.roomName).circle(pos, {
            radius: .45, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity
        });
    }
    /**
     * update memory on whether a room should be avoided based on controller owner
     * @param room
     */
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (room.controller) {
            if (room.controller.owner && !room.controller.my) {
                room.memory.avoid = 1;
            }
            else {
                delete room.memory.avoid;
            }
        }
    }
    /**
     * find a path from origin to destination
     * @param origin
     * @param destination
     * @param options
     * @returns {PathfinderReturn}
     */
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;

        // if (originRoomName == destRoomName && options.range == 0 && origin.getRangeTo(destination) == 1)
        //     return [destination];
        // check to see whether findRoute should be used
        let allowedRooms = options.route;
        let roomDistance;
        if (allowedRooms)
            roomDistance = allowedRooms.length;
        else
            roomDistance = global.distanceBetweenRooms(origin.roomName, destination.roomName)//, options.civilian);

        // if (Game.shard.name == 'shard2')
        //     console.log('TRAVELER.findTravelPath - about to call findRoute ' + allowedRooms + ' - ' + options.useFindRoute);

        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && roomDistance > 2))) {

            let route = this.findRoute(origin.roomName, destination.roomName, options);
            if (route) {
                allowedRooms = route;
            }
        }
        let roomsSearched = 0;
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            }
            else if (!options.allowHostile && Traveler.checkAvoid(roomName)
                && roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            roomsSearched++;
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix);
                    }
                }
                else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix, options.avoidStructures);
                }
                else {
                    matrix = this.getCreepMatrix(room, options.avoidStructures);
                }
                if (options.obstacles) {
                    matrix = matrix.clone();
                    for (let obstacle of options.obstacles) {
                        if (obstacle.pos.roomName !== roomName) {
                            continue;
                        }
                        matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                    }
                }
            }
            if (options.roomCallback) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                let outcome = options.roomCallback(roomName, matrix.clone());
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            if (options.costCallback)
            {
                let newMatrix = options.costCallback(roomName, matrix);
                if (newMatrix)
                    matrix = newMatrix;
            }
            return matrix;
        };
        global.pathfindingOptions = options;
        let ret = PathFinder.search(origin, { pos: destination, range: options.range }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.offRoad ? 1 : options.plainCost ? options.plainCost : options.ignoreRoads ? 1 : 2,
            swampCost: options.offRoad ? 1 : options.swampCost ? options.swampCost : options.ignoreRoads ? 5 : 10,
            roomCallback: callback,
            flee: options.flee,
        });
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                    return ret;
                }
                // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
            }
            else {
            }
        }
        return ret;
    }
    /**
     * find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
     * @param origin
     * @param destination
     * @param options
     * @returns {{}}
     */
    static findRoute(origin, destination, options = {}) {
        let restrictDistance = options.restrictDistance || global.distanceBetweenRooms(origin, destination) + 10;
        let allowedRooms = { [origin]: true, [destination]: true };
        let highwayBias = 1;
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName, fromRoomName) => {
                // if (Game.shard.name == 'shard2')
                //     console.log('TRAVELER.findTravelPath - options.routeCallback check');
                if (options.routeCallback) {
                    // if (Game.shard.name == 'shard2')
                    //     console.log('TRAVELER.findTravelPath - using routeCallback');
                    let outcome = options.routeCallback(roomName, origin);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                let rangeToRoom = global.distanceBetweenRooms(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }
                if (!options.allowHostile && Traveler.checkAvoid(roomName) &&
                    roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                    return Number.POSITIVE_INFINITY;
                }
                let parsed;
                if (options.preferHighway) {
                    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                    if (isHighway) {
                        return 1;
                    }
                }
                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                if (!options.allowSK && !Game.rooms[roomName]) {
                    if (!parsed) {
                        parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    }
                    let fMod = parsed[1] % 10;
                    let sMod = parsed[2] % 10;
                    let isSK = !(fMod === 5 && sMod === 5) &&
                        ((fMod >= 4) && (fMod <= 6)) &&
                        ((sMod >= 4) && (sMod <= 6));
                    if (isSK) {
                        return 10 * highwayBias;
                    }
                }
                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
            console.log(`TRAVELER: couldnt findRoute from ${origin} to ${destination}`);
            return;
        }
        for (let value of ret) {
            allowedRooms[value.room] = true;
        }
        return allowedRooms;
    }
    /**
     * check how many rooms were included in a route returned by findRoute
     * @param origin
     * @param destination
     * @returns {number}
     */
    static routeDistance(origin, destination) {
        let linearDistance = global.distanceBetweenRooms(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    /**
     * build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
     * @param room
     * @param freshMatrix
     * @returns {any}
     */
    static getStructureMatrix(room, freshMatrix, avoidStructures) {
        if (!this.structureMatrixCache[room.name] || (freshMatrix && Game.time !== this.structureMatrixTick)) {
            this.structureMatrixTick = Game.time;
            let matrix = new PathFinder.CostMatrix();
            matrix = Traveler.addStructuresToMatrix(room, matrix, 1, avoidStructures);
            this.structureMatrixCache[room.name] = matrix.serialize();
            return matrix;
        }
        return PathFinder.CostMatrix.deserialize(this.structureMatrixCache[room.name]);
    }
    /**
     * build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
     * @param room
     * @returns {any}
     */
    static getCreepMatrix(room, avoidStructures) {
        if (!this.creepMatrixCache[room.name] || Game.time !== this.creepMatrixTick) {
            this.creepMatrixTick = Game.time;
            let matrix = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room, true, avoidStructures).clone());
            this.creepMatrixCache[room.name] = matrix.serialize();
            return matrix;
        }
        return PathFinder.CostMatrix.deserialize(this.creepMatrixCache[room.name]);
    }
    /**
     * add structures to matrix so that impassible structures can be avoided and roads given a lower cost
     * @param room
     * @param matrix
     * @param roadCost
     * @returns {CostMatrix}
     */
    static addStructuresToMatrix(room, matrix, roadCost, avoidStructures) {
        let structureCost = 0xff;
        if (avoidStructures)
            structureCost = 40;

        let myBase = (room && room.controller && room.controller.my);

        let reallyAvoidStructures = myBase;// || allies.ownedByAlly(room.controller)));
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            }
            else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, roadCost);
            }
            else if (structure instanceof StructureContainer) {
                matrix.set(structure.pos.x, structure.pos.y, 5);
            }
            else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_CONSTRUCTION_SITES)) {
            if (site.killOnSight())
                continue;
            if (!site.my && !site.progress)
                continue;
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
        }
        for (let structure of impassibleStructures) {
            if (structure.my || reallyAvoidStructures)
                matrix.set(structure.pos.x, structure.pos.y, 0xff);
            else
                matrix.set(structure.pos.x, structure.pos.y, structureCost);
        }
        return matrix;
    }
    /**
     * add creeps to matrix so that they will be avoided by other creeps
     * @param room
     * @param matrix
     * @returns {CostMatrix}
     */
    static addCreepsToMatrix(room, matrix) {
        //console.log(`TRAVELER: avoiding creeps in room ` + room.name);
        room.find(FIND_CREEPS).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
        room.find(FIND_POWER_CREEPS).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
        return matrix;
    }
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */
    static serializePath(startPos, path, color = "orange") {
        let serializedPath = "";
        let lastPosition = startPos;
        this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, { color: color, lineStyle: "dashed" });
                serializedPath += lastPosition.getDirectionTo(position);
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    /**
     * returns a position at a direction relative to origin
     * @param origin
     * @param direction
     * @returns {RoomPosition}
     */
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    /**
     * convert room avoidance memory from the old pattern to the one currently used
     * @param cleanup
     */
    static patchMemory(cleanup = false) {
        if (!Memory.empire) {
            return;
        }
        if (!Memory.empire.hostileRooms) {
            return;
        }
        let count = 0;
        for (let roomName in Memory.empire.hostileRooms) {
            if (Memory.empire.hostileRooms[roomName]) {
                if (!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {};
                }
                Memory.rooms[roomName].avoid = 1;
                count++;
            }
            if (cleanup) {
                delete Memory.empire.hostileRooms[roomName];
            }
        }
        if (cleanup) {
            delete Memory.empire.hostileRooms;
        }
        console.log(`TRAVELER: room avoidance data patched for ${count} rooms`);
    }
    static deserializeState(travelData, destination, flee) {
        let state = {};
        if (travelData.state && travelData.state[STATE_DEST_ROOMNAME].length) {
            state.lastCoord = { x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y] };
            state.cpu = travelData.state[STATE_CPU];
            state.stuckCount = travelData.state[STATE_STUCK];
            state.destination = new RoomPosition(travelData.state[STATE_DEST_X], travelData.state[STATE_DEST_Y], travelData.state[STATE_DEST_ROOMNAME]);
            state.flee = travelData.state[STATE_FLEE];
        }
        else {
            state.cpu = 0;
            state.destination = destination;
            state.flee = flee ? 1 : 0;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData, flee) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, flee ? 1: 0, destination.x, destination.y,
            destination.roomName];
    }
    static isStuck(creep, state) {
        let stuck = false;
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                stuck = true;
            }
            else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                stuck = true;
            }
        }
        return stuck;
    }

    static updateCachedPath(creep, path)
    {
        if (!global.cachedPaths)
            global.cachedPaths = {};

        for (let pathRoom in global.cachedPaths)
        {
            if (global.cachedPaths[pathRoom][creep.name])
                delete global.cachedPaths[pathRoom][creep.name];
        }

        for (let pathPos of path)
        {
            if (!global.cachedPaths[pathPos.roomName])
                global.cachedPaths[pathPos.roomName] = {};
            if (!global.cachedPaths[pathPos.roomName][creep.name])
                global.cachedPaths[pathPos.roomName][creep.name] = [];

            global.cachedPaths[pathPos.roomName][creep.name].push(pathPos);
        }
    }
}
Traveler.structureMatrixCache = {};
Traveler.creepMatrixCache = {};
exports.Traveler = Traveler;
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD = 1000;
const DEFAULT_MAXOPS = 20000;
const DEFAULT_STUCK_VALUE = 2;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_FLEE = 4;
const STATE_DEST_X = 5;
const STATE_DEST_Y = 6;
const STATE_DEST_ROOMNAME = 7;

// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = function (destination, options) {
    return Traveler.travelTo(this, destination, options);
};

PowerCreep.prototype.travelTo = function (destination, options) {
    return Traveler.travelTo(this, destination, options);
};

Creep.prototype._moveTo = Creep.prototype.moveTo;

Creep.prototype.moveTo = function(myArg1, myArg2, myArg3)
{
    myArg2 = myArg2 || {};

    if (Game.flags[this.name])
    {
        myArg1 = Game.flags[this.name].pos;
        myArg2.range = 0;
    }


    if (this.memory.type == 'carry')
    {
        //console.log('Creep.moveTo - ' + this.name + ' - using paths')
        myArg2.usePaths = 1;
    }


    //if (!this.memory[ATTACK] && !this.memory[RANGED_ATTACK] && !this.memory[HEAL])
    {
        //if (Game.cpu.bucket > 1000 && Game.cpu.getUsed() < Game.cpu.tickLimit * 0.8)
        {
            if (!myArg2.roomCallback)
                myArg2.roomCallback = global.avoidStuffCallback;
            if (!myArg2.routeCallback)
                myArg2.routeCallback = global.civilianRouteCallback;
            if (!myArg2.useFindRoute)
                myArg2.useFindRoute = true;
        }
    }
    // else
    // {
    //     //if (Game.cpu.bucket > 1000 && Game.cpu.getUsed() < Game.cpu.tickLimit * 0.8)
    //     {
    //         if (!myArg2.roomCallback)
    //         {
    //             // let targetingSKRoom = false;
    //             // let targetRoom = myArg1.roomName;
    //             // if (!targetRoom)
    //             //     targetRoom = myArg1.pos.roomName;
    //             // if (Room.isSourceKeeperRoom(targetRoom))
    //             //     targetingSKRoom = true;
    //             //
    //             // if (!targetingSKRoom)
    //                 myArg2.roomCallback = global.avoidStuffCallback;
    //         }
    //
    //         myArg2.routeCallback = global.soldierRouteCallback;
    //     }
    // }

    return this.travelTo(myArg1, myArg2);
};

PowerCreep.prototype._moveTo = PowerCreep.prototype.moveTo;

PowerCreep.prototype.moveTo = function(myArg1, myArg2, myArg3)
{
    myArg2 = myArg2 || {};
    
    myArg2.offRoad = true;

    if (!myArg2.c)
        myArg2.c = "#ffffff";

    //if (!this.memory[ATTACK] && !this.memory[RANGED_ATTACK] && !this.memory[HEAL])
    {
        //if (Game.cpu.bucket > 1000 && Game.cpu.getUsed() < Game.cpu.tickLimit * 0.8)
        {
            if (!myArg2.roomCallback)
                myArg2.roomCallback = global.avoidStuffCallback;
            myArg2.routeCallback = global.civilianRouteCallback;
            myArg2.useFindRoute = true;
        }
    }
    // else
    // {
    //     //if (Game.cpu.bucket > 1000 && Game.cpu.getUsed() < Game.cpu.tickLimit * 0.8)
    //     {
    //         if (!myArg2.roomCallback)
    //         {
    //             // let targetingSKRoom = false;
    //             // let targetRoom = myArg1.roomName;
    //             // if (!targetRoom)
    //             //     targetRoom = myArg1.pos.roomName;
    //             // if (Room.isSourceKeeperRoom(targetRoom))
    //             //     targetingSKRoom = true;
    //             //
    //             // if (!targetingSKRoom)
    //                 myArg2.roomCallback = global.avoidStuffCallback;
    //         }
    //
    //         myArg2.routeCallback = global.soldierRouteCallback;
    //     }
    // }

    return this.travelTo(myArg1, myArg2);
};

global.avoidStuffCallback = function(roomName, costMatrix)
{
    var avoidCost = 10;

    // Favor cached paths
    if (constants.BUCKET_BRIGADE && global.pathfindingOptions && global.pathfindingOptions.usePaths && global.cachedPaths && global.cachedPaths[roomName])
    {
        for (let creepName in global.cachedPaths[roomName])
        {
            for (let pathPos of global.cachedPaths[roomName][creepName])
            {
                if (costMatrix.get(pathPos.x, pathPos.y) != 255)
                    costMatrix.set(pathPos.x, pathPos.y, global.pathfindingOptions.usePaths);
            }
        }
    }


    var room = Game.rooms[roomName];

    if (room)
    {
        if (room.isMyBase())
        {
            let stockerPos = room.stockerPos;
            if (stockerPos)
            {
                costMatrix.set(stockerPos.x, stockerPos.y, avoidCost);

                let openSpots = stockerPos.getOpenSpots();
                for (let openSpot of openSpots)
                {
                    if (costMatrix.get(openSpot.x, openSpot.y) != 255)
                        costMatrix.set(openSpot.x, openSpot.y, avoidCost);
                }
            }

            let quickLinkPos = room.quickLinkPos;
            if (quickLinkPos)
            {
                let openSpots = quickLinkPos.getOpenPositionsInRange(2, true, true);
                for (let openSpot of openSpots)
                {
                    if (costMatrix.get(openSpot.x, openSpot.y) != 255)
                        costMatrix.set(openSpot.x, openSpot.y, avoidCost);
                }
            }
        }

        // // Avoid walking directly next to sources
        // let sources = room.find(FIND_SOURCES);
        // for (let source of sources)
        // {
        //     let openSpots = source.pos.getOpenSpots();
        //     for (let openSpot of openSpots)
        //     {
        //         if (costMatrix.get(openSpot.x, openSpot.y) != 255)
        //             costMatrix.set(openSpot.x, openSpot.y, avoidCost);
        //     }
        // }
    }

    let roomMemory = Room.getMemory(roomName);

    // Avoid source keepers
    if (roomMemory && Room.isSourceKeeperRoom(roomName) && roomMemory.sources)
    {
        var avoidRange = 5;
        let roomTerrain = Game.map.getRoomTerrain(roomName);

        for (let sourceId in roomMemory.sources)
        {
            let sourceMemory = roomMemory.sources[sourceId];
            let sourcePos = new RoomPosition(sourceMemory.x, sourceMemory.y, roomName);

            if (room && sourceMemory.l)
            {
                let lair = Game.getObjectById(sourceMemory.l);
                if (lair && lair.ticksToSpawn && roomMemory.clear)
                {
                    //console.log('global.avoidStuffCallback - ' + roomName + ' - skipping lair')
                    continue;
                }
            }

            for (var i = -avoidRange; i <= avoidRange; ++i)
            {
                var ex = sourcePos.x + i;

                if (ex >= 0 && ex <= 49)
                {
                    for (var j = -avoidRange; j <= avoidRange; ++j)
                    {
                        var wy = sourcePos.y + j;
                        if (wy >= 0 && wy <= 49)
                        {
                            let costHere = costMatrix.get(ex, wy);
                            if (costHere != 255 && roomTerrain.get(ex, wy) != TERRAIN_MASK_WALL)
                                costMatrix.set(ex, wy, avoidCost + costHere);
                        }
                    }
                }
            }
        }

        if (roomMemory.mineral)
        {
            let sourceMemory = roomMemory.mineral;
            let skip = false;

            if (room && sourceMemory.l)
            {
                let lair = Game.getObjectById(sourceMemory.l);
                if (lair && lair.ticksToSpawn && roomMemory.clear)
                {
                    //console.log('global.avoidStuffCallback - ' + roomName + ' - skipping lair')
                    skip = true;
                }
            }

            if (!skip)
            {
                let sourcePos = new RoomPosition(sourceMemory.x, sourceMemory.y, roomName);
            
                for (var i = -avoidRange; i <= avoidRange; ++i)
                {
                    var ex = sourcePos.x + i;
    
                    if (ex >= 0 && ex <= 49)
                    {
                        for (var j = -avoidRange; j <= avoidRange; ++j)
                        {
                            var wy = sourcePos.y + j;
                            if (wy >= 0 && wy <= 49)
                            {
                                if (costMatrix.get(ex, wy) != 255 && roomTerrain.get(ex, wy) != TERRAIN_MASK_WALL)
                                    costMatrix.set(ex, wy, avoidCost);
                            }
                        }
                    }
                }
            }
        }
    }
    return costMatrix;
};

Object.defineProperty(Creep.prototype, "nextMove",
{
    configurable: true,
    get()
    {
        if (this.memory._trav && this.memory._trav.path && this.memory._trav.path.length > 0)
        {
            return parseInt(this.memory._trav.path[0], 10);
        }
        else
        {
            return 0;
        }
    },
    set(value)
    {

    }
});

Object.defineProperty(Creep.prototype, "nextMovePos",
{
    configurable: true,
    get()
    {
        if (this.memory._trav && this.memory._trav.path && this.memory._trav.path.length > 0)
        {
            let nextDirection = parseInt(this.memory._trav.path[0], 10);
            return this.pos.getPositionAtDirection(nextDirection);
        }
        else
        {
            return this.pos;
        }
    },
    set(value)
    {

    }
});

Creep.prototype.isMovingToward = function(target)
{
    if (target.pos)
        target = target.pos;

    return (this.memory._trav && this.memory._trav.state && this.memory._trav.state[STATE_DEST_X] == target.x && this.memory._trav.state[STATE_DEST_Y] == target.y && this.memory._trav.state[STATE_DEST_ROOMNAME] == target.roomName);
}

Creep.prototype.cancelPathing = function()
{
    if (this.memory._trav)
        delete this.memory._trav;

    if (!global.cachedPaths)
        return;

    for (let pathRoom in global.cachedPaths)
    {
        if (global.cachedPaths[pathRoom][this.name])
            delete global.cachedPaths[pathRoom][this.name];
    }
}
