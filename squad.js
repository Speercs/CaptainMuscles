'use strict'

const WorldPosition = require("./WorldPosition");
const util_transforms = require('util_transforms');

class Squad
{
    constructor (memory)
    {
        //console.log('Squad.constructor - executing');
        this.memory = memory;

        this.memory.creeps = _.filter(this.memory.creeps, cn => Game.creeps[cn]);
        this.creeps = this.memory.creeps.map(cn => Game.creeps[cn]);
        this.spawnedCreeps = this.creeps.filter(c => !c.spawning);

        if (!this.memory.mode)
            this.memory.mode = 'formation';

        if (!this.memory.snakeOrder)
            this.memory.snakeOrder = [];
        if (!this.memory.formationOrder)
            this.memory.formationOrder = [];

        this.memory.snakeOrder = _.filter(this.memory.snakeOrder, cn => Game.creeps[cn]);
        this.memory.formationOrder = _.filter(this.memory.formationOrder, cn => Game.creeps[cn]);

        this.memory.leaderIndex = 0;

        if (this.creeps.length > 0)
            this.leader = this.creeps[0];

        //console.log('Squad.constructor - executing ');
    }

    getFormation(canChange)
    {
        this.memory.moveFormation = 'O';
        this.memory.lastFormation = this.memory.moveFormation;

        if (!this.memory.moveFormation)// || (Game.time % 10 == 0 && canChange))
        {
            let formations = ['L', 'J', 'T', 'S', 'Z', 'I', 'O'];
            this.memory.moveFormation = formations[Math.floor(Math.random()*formations.length)];
        }

        if (this.memory.lastFormation != this.memory.moveFormation)
        {
            this.memory.recalc = 1;
            //console.log('Squad.getFormation - changed formation');
        }


        let formation = null;

        switch(this.memory.moveFormation)
        {
            case 'L':
                formation = [0, 1, 5, 4];
                break;
            case 'J':
                formation = [0, 1, 5, 6];
                break;
            case 'T':
                formation = [0, 5, 7, 3];
                break;
            case 'S':
                formation = [0, 3, 5, 6];
                break;
            case 'Z':
                formation = [0, 7, 5, 4];
                break;
            case 'I':
                formation = [0, 1, 5, 55];
                break;
            case 'O':
            default:
                formation = [0, 3, 4, 5];
        }

        //if (!this.memory.formationRotation)
            this.memory.formationRotation = 0;

        // let oldRotation = this.memory.formationRotation;

        // if (canChange && this.memory.direction)
        // {
        //     switch (this.memory.direction)
        //     {
        //         case 1:
        //         case 2:
        //             this.memory.formationRotation = 4;
        //             break;
        //         case 3:
        //         case 4:
        //             this.memory.formationRotation = 6;
        //             break;
        //         case 5:
        //         case 6:
        //             this.memory.formationRotation = 0;
        //             break;
        //         case 7:
        //         case 8:
        //             this.memory.formationRotation = 2;
        //             break;
        //     }
        // }

        // if (canChange && Game.time % 4 == 0 && Game.time % 10 != 0)
        // {
        //     this.memory.formationRotation += 2;
        //     if (this.memory.formationRotation >= 8)
        //         this.memory.formationRotation = 0;
        //     this.memory.recalc = 1;
        //     //console.log('Squad.getFormation - rotated formation');
        // }

        // if (this.memory.moveFormation == 'O')
        // {

        // }
        // else
        {
            for (let formationIndex in formation)
            {
                let formationValue = this.rotateDirection(formation[formationIndex], this.memory.formationRotation);
                formation[formationIndex] = formationValue;
            }
        }

        //console.log('Squad.getFormation - ' + formation);

        return formation;
    }

    rotateDirection(direction, amount)
    {
        let parts = [];
        while (direction > 0)
        {
            let remainder = direction % 10;
            parts.push(remainder);
            direction = Math.floor(direction / 10);
        }

        let newDirection = 0;

        for (let partIndex in parts)
        {
            let part = parts[partIndex];
            part += amount;
            while (part > 8)
                part -= 8;
            while (part < 1)
                part += 8;
            newDirection = newDirection + (part * Math.pow(10, partIndex));
        }

        return newDirection;
    }

    getCreepCount()
    {
        return this.creeps.length;
    }

    move()
    {
        let leader = this.spawnedCreeps[0];
        if (this.memory.mode == 'snake' && this.memory.snakeOrder.length > 0)
            leader = Game.creeps[this.memory.snakeOrder[0]];

        if (!leader)
            return;

        this.memory.direction = 0;
        this.memory.thisPositionDanger = this.squadDanger(this.spawnedCreeps, 0);

        if (!this.memory.advanceUnlessWounded && this.memory.thisPositionDanger >= 1)
            this.memory.flee = 1;
        else if (!this.memory.advanceUnlessWounded && this.memory.mode != 'formation' && this.spawnedCreeps.length > 2 && (this.memory.thisPositionDanger > 0.5))
            this.memory.flee = 1;
        else if (this.spawnedCreeps.some(c => c.hitsPercent <= .9))
            this.memory.flee = 1;

        if (this.memory.flee && this.memory.fleePos)
        {
            let fleePos = new RoomPosition(this.memory.fleePos.x, this.memory.fleePos.y, this.memory.fleePos.roomName);
            this.moveTo(fleePos, 3);
            return;
        }
        
        if (this.moveTarget)
        {
            this.moveTo(this.moveTarget, this.moveRange);
            return;
        } 
    }

    moveTo(targetPos, range)
    {
        if (!targetPos)
            return;

        // if (this.leader)
        // {
        //     let secondaryTarget = this.selectTargetEnRouteToPrimaryTarget(this.leader, targetPos, range);
        //     if (secondaryTarget)
        //         targetPos = secondaryTarget.pos;

        //     if (secondaryTarget && (!secondaryTarget.hasParts || !secondaryTarget.hasParts(ATTACK)))
        //         range = 1;
        // }

        this.memory.desiredRange = (range || 0);

        let creeps = _.filter(this.creeps, c => !c.spawning);

        if (creeps.length != this.memory.snakeOrder.length)
        {
            this.calculateSnakeOrder(creeps, targetPos);
            delete this.memory.wayPoint;
        }

        if (creeps.length != this.memory.formationOrder.length)
        {
            this.calculateFormationOrder(creeps, targetPos);
            delete this.memory.wayPoint;
        }

        if (creeps.length > 4)
        {
            console.log('Squad.update - too many creeps!');
        }

        if (creeps.length <= 2)
            this.memory.mode = 'snake';

        if (creeps.length > 0)
        {
            if (this.memory.mode == 'longbow')
                this.doLongbowMode(creeps, targetPos);
            else if (this.memory.mode == 'blob')
                this.doBlobMode(creeps, targetPos);
            else if (this.memory.mode == 'snake')
                this.doSnakeMode(creeps, targetPos);
            else if (this.memory.mode == 'formation')
                this.doFormationMode(creeps, targetPos);
        }

        this.memory.lastFormation = this.memory.moveFormation;

        let leader = this.spawnedCreeps[0];
        if (leader && this.memory.thisPositionDanger && this.memory.nextPositionDanger)
        {
            leader.room.visual.text(this.memory.thisPositionDanger.toFixed(4), leader.pos.x, leader.pos.y - 0.3, {font: 0.25, stroke: "#000000", opacity: 1, color: "#ffffff"});
            leader.room.visual.text(this.memory.nextPositionDanger.toFixed(4), leader.pos.x, leader.pos.y + .0, {font: 0.25, stroke: "#000000", opacity: 1, color: "#ffffff"});
            leader.room.visual.text(this.memory.direction.toFixed(0)         , leader.pos.x, leader.pos.y + .3, {font: 0.25, stroke: "#000000", opacity: 1, color: "#ffffff"});
            leader.room.visual.text(this.memory.flee                         , leader.pos.x, leader.pos.y + .6, {font: 0.25, stroke: "#000000", opacity: 1, color: "#ffffff"});
            leader.room.visual.text(this.memory.desiredRange.toFixed(0)      , leader.pos.x, leader.pos.y + .9, {font: 0.25, stroke: "#000000", opacity: 1, color: "#ffffff"});
        }        

        // if (this.memory.wayPoint)
        // {
        //     let visual = new RoomVisual(this.memory.wayPoint.roomName);
        //     visual.circle(this.memory.wayPoint.x, this.memory.wayPoint.y,  {fill: 'transparent', radius: 0.55, stroke: 'red'});
        // }
    }

    drawMoveLine(creep, targetPos)
    {
        let lineColor = '#00ffff';

        if (creep.memory[WORK])
            lineColor = '#ffff00'
        else if (creep.memory[ATTACK])
            lineColor = '#ff0000'

        Game.map.visual.line(creep.pos, targetPos, {color: lineColor, lineStyle: 'dashed'});
        Game.map.visual.circle(targetPos, {radius: 1, fill: lineColor, opacity: 0.5});
    }

    selectTargetEnRouteToPrimaryTarget(creep, targetPos, range)
    {
        let pathInfo = PathFinder.search(creep.pos, {pos: targetPos, range: range}, {maxRooms: 1, plainCost: 1, swampCost: 5, maxOps: 500000, roomCallback: this.makeCostMatrix});
        if (!pathInfo.path)
        {
            console.log('Squad.selectTargetEnRouteToPrimaryTarget - ' + creep.pos + ' -> ' + targetPos + ' - could not find path at range: ' + range);
            return null;
        }

        for (let pathPosition of pathInfo.path)
        {
            let potentialTarget = _.find(pathPosition.lookFor(LOOK_STRUCTURES), st =>  st.attackInCombat() && st.hits && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_TERMINAL && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_CONTAINER);
            if (potentialTarget)
                return potentialTarget;
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
    }

    calculateSnakeOrder(creeps, targetPos)
    {
        this.memory.snakeOrder = [];

        let fronts = _.filter(creeps, c => c.memory.type == 'front');
        let backs = _.filter(creeps, c => c.memory.type == 'back');

        if (fronts.length > 0 || backs.length > 0)
        {
            let others = _.filter(creeps, c => c.memory.type != 'front' && c.memory.type != 'back');

            let creepsCopy = [];

            while (fronts.length > 0 || backs.length > 0 || others.length > 0)
            {
                if (fronts.length > 0)
                    creepsCopy.push(fronts.shift());
                if (others.length > 0)
                    creepsCopy.push(others.shift());
                if (backs.length > 0)
                    creepsCopy.push(backs.shift());
            }

            this.memory.snakeOrder = creepsCopy.map(c => c.name);
        }
        else
        {
            let creepsCopy = [...creeps];
        
            let waypoint = this.getWayPoint(targetPos);
    
            let prevCreep = _.min(creepsCopy, c => c.wpos.getRangeTo(waypoint.toWorldPosition()));
            creepsCopy.splice(creepsCopy.indexOf(prevCreep), 1);
            this.memory.snakeOrder.push(prevCreep.name);
    
            while (creepsCopy.length > 0)
            {
                prevCreep = _.min(creepsCopy, c => c.wpos.getRangeTo(prevCreep.wpos));
                creepsCopy.splice(creepsCopy.indexOf(prevCreep), 1);
                this.memory.snakeOrder.push(prevCreep.name);
            }
        }


        // for (let creepIndex in this.memory.snakeOrder)
        // {
        //     let creep = Game.creeps[this.memory.snakeOrder[creepIndex]];
        //     creep.room.visual.text(creepIndex, creep.pos.x, creep.pos.y + .2);
        // }

        //console.log('Squad.calculateSnakeOrder - ' + this.memory.snakeOrder);
    }

    calculateFormationOrder(creeps, targetPos)
    {
        if (creeps.length < 1)
        {
            this.memory.formationOrder = [];
            return;
        }

        let waypoint = this.getWayPoint(targetPos);
        let waypointWorld = waypoint.toWorldPosition();

        let fronts = _.filter(creeps, c => c.memory.type == 'front');
        let backs = _.filter(creeps, c => c.memory.type == 'back');

        if (fronts.length > 0 || backs.length > 0)
        {
            let leader = creeps[this.memory.leaderIndex];
            let leaderDirection = leader.wpos.getDirectionTo(targetPos.wpos);

            if (leaderDirection != 0)
            {
                let formationDirection = Math.floor(leaderDirection / 2) * 2;
                this.memory.formationRotation = formationDirection;
            }

            let others = _.filter(creeps, c => c.memory.type != 'front' && c.memory.type != 'back');

            let creepsCopy = fronts.concat(others.concat(backs));
            this.memory.formationOrder = creepsCopy.map(c => c.name);
        }
        else
        {
            let formation = this.getFormation();
            let worldPositions = formation.map(dir => waypoint.getPositionAtDirection(dir).toWorldPosition());
            worldPositions = worldPositions.slice(0, creeps.length);
    
            let counts = {};
            for (let creepIndex in creeps)
            {
                let creep = creeps[creepIndex];
                counts[creep.name] = 0;
                for (let worldPosition of worldPositions)
                {
                    if (creep.wpos.getRangeTo(worldPosition) <= 1)
                        counts[creep.name] += 1;
                }
            }
    
            let creepsByChoices = _.sortBy(creeps, c => counts[c.name]);
            let selectedPositions = {};
    
            // Select positions (furthest from all chooses first)
            for (let creepIndex in creepsByChoices)
            {
                let creep = creepsByChoices[creepIndex];
                let nearestPos = _.min(worldPositions, p => creep.wpos.getRangeTo(p));
                let posIndex = _.findIndex(worldPositions, p => p.isEqualTo(nearestPos));
                worldPositions.splice(posIndex, 1);
                selectedPositions[creep.name] = nearestPos;
    
                // creep.room.visual.line(creep.pos, nearestPos.toRoomPosition(), { color: '#ffffff' });
            }
    
            creepsByChoices = _.sortBy(creeps, c => formation.indexOf(waypointWorld.getDirectionTo(selectedPositions[c.name])));
    
            this.memory.formationOrder = creepsByChoices.map(c => c.name);
        }




        //console.log('Squad.calculateFormationOrder - ' + JSON.stringify(this.memory.formationOrder));

        // for (let creep of creeps)
        //     creep.cancelPathing();

        // for (let creepIndex in creepsByDistance)
        // {
        //     let creep = creepsByDistance[creepIndex];
        //     creep.room.visual.text(creepIndex, creep.pos.x, creep.pos.y + .2);
        //     console.log('Squad.calculateFormationOrder - ' + creep.name + ' - ' + creepIndex + ' - ' + distances[creep.name] + ' - ' + selectedPositions[creep.name] + ' - ' + waypointWorld.getDirectionTo(selectedPositions[creep.name]));
        // }

        //console.log('Squad.calculateFormationOrder - ' + this.memory.formationOrder);
    }

    getWayPoint(leadPos)
    {
        if (this.memory.wayPoint)
        {
            let waypoint = new RoomPosition(this.memory.wayPoint.x, this.memory.wayPoint.y, this.memory.wayPoint.roomName);
            let terrain = Game.map.getRoomTerrain(waypoint.roomName);
            if (terrain.get(waypoint.x, waypoint.y) != TERRAIN_MASK_WALL)
                return waypoint;
        }

        return leadPos;
    }

    selectFormation(creeps, targetPos, nextPos, direction, doImmediate)
    {
        // if (this.memory.formationChanged == Game.time)
        //     return true;

        // this.memory.formationChanged = Game.time

        this.memory.nextPos = nextPos;
        this.memory.targetPos = targetPos;

        let damageTaken = _.sum(creeps, c => c.hitsMax) - _.sum(creeps, c => c.hits);

        let leader = this.spawnedCreeps[0];
        if (this.memory.mode == 'snake')
            leader = Game.creeps[this.memory.snakeOrder[0]];

        // if (targetPos.roomName == "W48N35")
        //     console.log('Squad.selectFormation - targetPos: ' + targetPos + ', nextPos: ' + nextPos + ', direction: ' + direction);

        this.memory.thisPositionFormationPossible = this.formationPossibleAtPosition(creeps, leader.pos);
        this.memory.nextPositionFormationPossible = this.formationPossibleAtPosition(creeps, nextPos);
        this.memory.nextPositionDanger = this.squadDanger(this.spawnedCreeps, direction);
        this.memory.nextPositionObstructed = nextPos.isObstructed(this.spawnedCreeps);

        if (!this.memory.flee && this.moveTarget && this.moveTarget.nearEdge(0) && leader.wpos.getRangeTo(this.moveTarget.wpos) <= 3)
        {
            this.changeToLongbow(creeps, targetPos, doImmediate);
            return true;
        }

        if (this.moveTarget && this.moveTarget.roomName == leader.pos.roomName && targetPos.wpos.getRangeTo(nextPos.wpos) <= this.memory.desiredRange && (direction == 0 || this.memory.nextPositionObstructed || this.moveTarget.nearEdge(1)) && this.memory.nextPositionDanger < .5 && this.memory.thisPositionDanger < .5)
        {
            this.changeToBlob(creeps, targetPos, doImmediate);
            return true;
        }

        if (this.memory.mode != 'formation' && creeps.length > 2)
        {
            let rangeToTarget = targetPos.wpos.getRangeTo(nextPos.wpos);
            
            //console.log('Squad.selectFormation - targetPos: ' + targetPos + ', nextPos: ' + nextPos + ', nextPositionFormationPossible: ' + this.memory.nextPositionFormationPossible + ', rangeToTarget: ' + rangeToTarget + ', nextPositionDanger: ' + this.memory.nextPositionDanger + ', doImmediate: ' + doImmediate);
            
            if (this.memory.nextPositionFormationPossible && (Room.inDanger(leader.room.name) || damageTaken > 0 || /*rangeToTarget <= 3 ||*/ this.memory.nextPositionDanger > 0 || this.memory.thisPositionDanger > 0 || (direction == 0 || this.memory.nextPositionObstructed)))
            {
                this.changeToFormation(creeps, targetPos, doImmediate);
                return true;
            }
            else if (this.memory.thisPositionFormationPossible && (direction == 0 || this.memory.nextPositionObstructed))
            {
                this.changeToFormation(creeps, targetPos, doImmediate);
                return true;
            }
        }

        if (this.memory.mode != 'snake' &&
            (!this.memory.thisPositionFormationPossible ||
            (!Room.inDanger(leader.room.name) && this.memory.nextPositionDanger <= 0 && this.memory.thisPositionDanger <= 0) ||
            (!this.memory.nextPositionFormationPossible /*&& (this.memory.nextPositionDanger < .5 && this.memory.thisPositionDanger < .5)*/)))
        {
            this.changeToSnake(creeps, targetPos, doImmediate);
            return true;
        }
    }

    squadDanger(creeps, direction)
    {
        let maxDanger = 0;
        for (let creep of creeps)
        {
            let danger = this.positionDanger(creep, creep.pos.getPositionAtDirection(direction))
            maxDanger = Math.max(maxDanger, danger);
        }

        return maxDanger;
    }

    positionDanger(leader, targetPos)
    {
        if (!leader)
            return 0;

        let targetRoom = Game.rooms[targetPos.roomName];
        if (!targetRoom || !targetRoom.memory || (!targetRoom.memory.hostiles && !Room.isEnemyBase(targetPos.roomName)))
            return 0;

        let mapFlagName = 'mapRoom_' + leader.room.name;
        let mapFlag = Game.flags[mapFlagName];
        if (!mapFlag)
        {
            leader.pos.createFlag(mapFlagName);
            return 1;
        }
            
        let mapRoomProcess = kernel.scheduler.getProcessFromId(mapFlag.memory.pid);
        if (mapRoomProcess)
        {
            let healPower = this.calculateHealPower(leader.room, targetPos);

            let damageAt = mapRoomProcess.getDamageAt(targetPos);
            // leader.room.visual.text(healPower.toFixed(0), leader.pos.x, leader.pos.y - 0.2, {font: 0.25, stroke: "#000000", opacity: 0.5, color: "#00ff00"});
            // leader.room.visual.text(damageAt.toFixed(0), leader.pos.x, leader.pos.y + .2, {font: 0.25, stroke: "#000000", opacity: 0.5, color: "#ff0000"});

            if (healPower <= 0)
                return damageAt;

            return damageAt / healPower;
        }

        return 0;
    }

    //------ Snake mode

    doSnakeMode(creeps, targetPos)
    {
        this.memory.mode = 'snake';

        if (!this.inSnake(creeps))
        {
            this.getInSnake(creeps, targetPos);
            return;
        }

        if (_.find(creeps, c => c.fatigue))
            return;

        let snakeHead = this.getSnakeHead(creeps, targetPos);
        if (!snakeHead)
            return;

        let waypoint = this.getWayPoint(snakeHead.pos);
        let waypointWorld = waypoint.toWorldPosition();
        let setNewWaypoint = true;

        if (snakeHead.wpos.getRangeTo(waypointWorld) > this.memory.desiredRange)
        {
            targetPos = waypoint;
            setNewWaypoint = false;
        }


        this.planLeaderMovement(snakeHead, targetPos);
        this.memory.direction = snakeHead.nextMove;
        let snakeHeadNextPos = snakeHead.nextMovePos;
        if (setNewWaypoint)
        {
            this.memory.wayPoint = snakeHeadNextPos;
            //this.calculateSnakeOrder(creeps, targetPos)
        }

        if (this.memory.direction == 0 || snakeHeadNextPos.isObstructed(this.creeps))
        {
            this.selectFormation(creeps, targetPos, snakeHead.pos, this.memory.direction, false);
            return;
        }
        else
        {
            this.drawMoveLine(snakeHead, targetPos);
            this.moveSnake(snakeHead, creeps, this.memory.direction);
            this.selectFormation(creeps, targetPos, snakeHeadNextPos, this.memory.direction, false);
            return;
        }
    }

    getSnakeHead(creeps, targetPos)
    {
        for (let creepName of this.memory.snakeOrder)
        {
            let creep = Game.creeps[creepName];
            if (creep)
                return creep;
        }

        return null;
    }

    inSnake(creeps)
    {
        let prevCreep = null;
        for (let creepName of this.memory.snakeOrder)
        {
            let creep = Game.creeps[creepName];
            if (!creep)
                continue;

            let minRange = 1;
            if (creep.pos.nearEdge(0) || (prevCreep && prevCreep.pos.nearEdge(0)))
                minRange = 2;

            if (prevCreep && prevCreep.wpos.getRangeTo(creep.wpos) > minRange)
                return false;

            prevCreep = creep;
        }

        return true;
    }

    getInSnake(creeps, targetPos)
    {
        // for (let creep of creeps)
        // {
        //     if (!creep.currentTask.squad)
        //         continue;
        //     let furthest = _.max(creeps, o => creep.wpos.getRangeTo(o.wpos));
        //     creep.moveTo(furthest, { freshMatrix: true, routeCallback: global.soldierRouteCallback });
        // }
        let head = Game.creeps[this.memory.snakeOrder[0]];
        let headPos = head.pos;
        let maxDistance = 0;

        for (let creepIndex in this.memory.snakeOrder)
        {
            let creepName = this.memory.snakeOrder[creepIndex];
            let creep = Game.creeps[creepName];

            let distance = creep.wpos.getRangeTo(head.wpos);
            if (distance > maxDistance)
                maxDistance = distance;
        }

        if (maxDistance > creeps.length * 2)
        {
            let sumPos = { x: 0, y: 0 };
            for (let creepIndex in this.memory.snakeOrder)
            {
                let creepName = this.memory.snakeOrder[creepIndex];
                let creep = Game.creeps[creepName];
                let position = creep.wpos;
                sumPos.x += position.x;
                sumPos.y += position.y;
            }

            sumPos.x = Math.floor(sumPos.x / creeps.length);
            sumPos.y = Math.floor(sumPos.y / creeps.length);

            headPos = new WorldPosition(sumPos.x, sumPos.y).toRoomPosition();
        }

        let prevCreep = null;
        let prevCreepMoved = false;
        let draw = Game.flags.draw;
        for (let creepIndex in this.memory.snakeOrder)
        {
            let creepName = this.memory.snakeOrder[creepIndex];
            let creep = Game.creeps[creepName];
            if (!creep || !creep.currentTask)
                continue;

            if (!creep.currentTask.squad)
                continue;

            if (prevCreep && prevCreep.wpos.getRangeTo(creep.wpos) > 1)
            {
                this.drawMoveLine(creep, targetPos);

                if (prevCreepMoved)
                    creep.moveTo(prevCreep, { range: 0, freshMatrix: true, routeCallback: global.soldierRouteCallback });
                else
                    creep.moveTo(prevCreep, { range: 1, freshMatrix: true, routeCallback: global.soldierRouteCallback  });

                if (draw)
                {
                    let visY = creep.pos.y + .2 - 0.25;
                    creep.room.visual.text('gis' + creepIndex, creep.pos.x, visY, {opacity: 0.5, font: 0.25});
                }

                prevCreepMoved = true;
            }
            else if (creepIndex == 0)
            {
                if (creep.wpos.getRangeTo(headPos.toWorldPosition()) > 0)
                {
                    this.drawMoveLine(creep, targetPos);
                    creep.moveTo(headPos, { range: 0, freshMatrix: true, routeCallback: global.soldierRouteCallback })
                    prevCreepMoved = true;
                }
                else
                {
                    prevCreepMoved = false;
                }
            }

            prevCreep = creep;
        }
    }

    moveSnake(head, creeps, direction)
    {
        let travelData = head.memory._trav;
        travelData.path = travelData.path.substr(1);

        let prevCreep = null;
        let draw = Game.flags.draw;
        for (let creepIndex in this.memory.snakeOrder)
        {
            let creepName = this.memory.snakeOrder[creepIndex];
            let creep = Game.creeps[creepName];
            if (!creep)
                continue;

            if (!creep.currentTask.squad)
                continue;

            if (!prevCreep)
            {
                creep.move(direction);
            }
            else
            {
                let prevCreepDirection = creep.wpos.getDirectionTo(prevCreep.wpos);
                // if (prevCreep)
                //     prevCreep.pull(creep);
                creep.move(prevCreepDirection);

                // creep.room.visual.line(prevCreep.pos, creep.pos, { color: '#ff0000' });
            }

            if (draw)
            {
                let visY = creep.pos.y + .2 + 0.25;
                creep.room.visual.text('ms' + creepIndex, creep.pos.x, visY, {opacity: 0.5, font: 0.25});
            }

            prevCreep = creep;
        }
    }

    changeToFormation(creeps, targetPos, doImmediate)
    {
        this.calculateFormationOrder(creeps, targetPos);

        this.memory.mode = 'formation';
        if (doImmediate)
            this.doFormationMode(creeps, targetPos);
    }


    //------ Formation mode

    doFormationMode(creeps, targetPos)
    {
        this.memory.mode = 'formation';

        let formation = this.getFormation(true);

        
        if (this.memory.recalc)
        {
            delete this.memory.recalc;
            //console.log('Squad.doFormationMode - recalc');
            this.calculateFormationOrder(creeps, targetPos);
        }

        let leaderName = this.memory.formationOrder[this.memory.leaderIndex];
        let leader = Game.creeps[leaderName];
        if (!leader)
        {
            leader = creeps[0];
            leaderName = leader.name;
        }
        let waypoint = this.getWayPoint(leader.pos);
        let waypointWorld = waypoint.toWorldPosition();

        if (this.selectFormation(creeps, targetPos, waypoint, leader.wpos.getDirectionTo(waypointWorld), true))
            return;

        // leader.room.visual.rect(waypoint.x - 0.5, waypoint.y - 1.5, 2, 2, { fill: 'transparent', stroke: '#f00' });

        if (!this.inFormation(creeps))
        {
            //this.calculateFormationOrder(creeps, targetPos);
            this.getInFormation(creeps, waypoint, targetPos);
            return;
        }

        if (_.find(creeps, c => c.fatigue))
            return;        

        let setNewWaypoint = true;

        if (leader.wpos.getRangeTo(waypointWorld) > this.memory.desiredRange)
        {
            targetPos = waypoint;
            setNewWaypoint = false;
        }

        let targetWorldPos = targetPos.toWorldPosition();
        
        if (leader.wpos.getRangeTo(targetWorldPos) > this.memory.desiredRange)
            this.planLeaderMovement(leader, targetPos);

        this.memory.direction = leader.nextMove;
        let leaderNextPos = leader.nextMovePos;
        

        if (setNewWaypoint)
        {
            this.memory.wayPoint = leaderNextPos;
            leader.room.visual.rect(leaderNextPos.x - 1.5, leaderNextPos.y - 1.5, 3, 3, { fill: 'transparent', stroke: '#f00' });
        }

        if (leader.wpos.getRangeTo(targetWorldPos) <= this.memory.desiredRange)
        {
            return;
            this.memory.direction = leader.wpos.getDirectionTo(targetWorldPos);
            leaderNextPos = targetPos;
        }

        if (this.memory.direction == 0 || leaderNextPos.isObstructed(this.creeps))
        {
            this.selectFormation(creeps, targetPos, leader.pos, this.memory.direction, true);
            return;
        }
            

        if (this.selectFormation(creeps, targetPos, leaderNextPos, this.memory.direction, true))
            return;

        this.drawMoveLine(leader, targetPos);

        this.memory.nextPositionDanger = this.squadDanger(this.spawnedCreeps, this.memory.direction);

        if (!this.memory.advanceUnlessWounded && this.memory.thisPositionDanger < 1 && this.memory.nextPositionDanger >= 1)
            return;

        if (this.memory.nextPositionFormationPossible)
            this.moveFormation(creeps, this.memory.direction);
    }

    formationPossibleAtPosition(creeps, pos)
    {
        let roomMemory = Room.getMemory(pos.roomName);
        if (roomMemory && roomMemory.controller && roomMemory.controller.sm)
            return false;
            
        if (_.find(creeps, c => c.room.name != pos.roomName))
            return false;

        //this.calculateFormationOrder(creeps, pos);

        let terrain = Game.map.getRoomTerrain(pos.roomName);

        let formation = this.getFormation();
        this.memory.formationPositions = [];

        let result = true;

        for (let formationOffset of formation)
        {
            let desiredPosition = pos.getPositionAtDirection(formationOffset);
            this.memory.formationPositions.push(desiredPosition);
            if (desiredPosition.roomName != pos.roomName)
                return false;

            if (terrain.get(desiredPosition.x, desiredPosition.y) == TERRAIN_MASK_WALL)
                return false;

            if (desiredPosition.isObstructed(this.creeps))
                return false;
        }

        return result;
    }

    inFormation(creeps)
    {
        let leaderName = this.memory.formationOrder[this.memory.leaderIndex];
        let leader = Game.creeps[leaderName];

        let formation = this.getFormation();

        for (let creepIndex in this.memory.formationOrder)
        {
            let creepName = this.memory.formationOrder[creepIndex];
            if (creepName == leaderName)
                continue;

            let creep = Game.creeps[creepName];
            let formationOffset = formation[creepIndex];

            let desiredPosition = leader.pos.getPositionAtDirection(formationOffset);
            let minRange = 0;
            if (desiredPosition.nearEdge(0))
                minRange = 1;
            if (creep.wpos.getRangeTo(desiredPosition.toWorldPosition()) > minRange)
                return false;
        }

        return true;
    }

    getInFormation(creeps, waypoint, targetPos)
    {
        let leaderName = this.memory.formationOrder[this.memory.leaderIndex];
        let leader = Game.creeps[leaderName];

        let formation = this.getFormation();
        let maxDistance = 0;

        for (let creepIndex in this.memory.formationOrder)
        {
            let creepName = this.memory.formationOrder[creepIndex];
            let creep = Game.creeps[creepName];
            let formationOffset = formation[creepIndex];

            let desiredPosition = waypoint.getPositionAtDirection(formationOffset);
            let distance = creep.wpos.getRangeTo(desiredPosition.toWorldPosition());
            if (distance > maxDistance)
                maxDistance = distance;
        }

        let newWayPoint = waypoint;

        if (maxDistance > creeps.length)
        {
            let sumPos = { x: 0, y: 0 };
            for (let creepIndex in this.memory.formationOrder)
            {
                let creepName = this.memory.formationOrder[creepIndex];
                let creep = Game.creeps[creepName];
                let position = creep.wpos;
                sumPos.x += position.x;
                sumPos.y += position.y;
            }

            sumPos.x = Math.floor(sumPos.x / creeps.length);
            sumPos.y = Math.floor(sumPos.y / creeps.length);

            newWayPoint = new WorldPosition(sumPos.x, sumPos.y).toRoomPosition();
        }

        for (let creepIndex in this.memory.formationOrder)
        {
            let creepName = this.memory.formationOrder[creepIndex];
            let creep = Game.creeps[creepName];
            let formationOffset = formation[creepIndex];

            if (creepName == leaderName)
            {
                let desiredPosition = newWayPoint.getPositionAtDirection(formationOffset);
                if (creep.wpos.getRangeTo(desiredPosition.toWorldPosition()) > 0 && creep.currentTask.squad)
                {
                    creep.moveTo(desiredPosition, { range: 0, freshMatrix: true, routeCallback: global.soldierRouteCallback });
                    this.drawMoveLine(creep, targetPos);
                }
            }
            else
            {
                let desiredPosition = leader.pos.getPositionAtDirection(formationOffset);
                if (creep.wpos.getRangeTo(desiredPosition.toWorldPosition()) > 0 && creep.currentTask.squad)
                {
                    creep.moveTo(desiredPosition, { range: 0, freshMatrix: true, routeCallback: global.soldierRouteCallback });
                    this.drawMoveLine(creep, targetPos);
                }
            }
        }
    }

    //------ Blob mode

    doBlobMode(creeps, targetPos)
    {
        this.memory.mode = 'blob';

        if (!this.inBlob(creeps))
        {
            this.getInBlob(creeps);
            return;
        }

        if (_.find(creeps, c => c.fatigue))
            return;

        let blobHead = this.getSnakeHead(creeps, targetPos);
        if (!blobHead)
            return;

        let waypoint = this.getWayPoint(blobHead.pos);
        let waypointWorld = waypoint.toWorldPosition();
        let setNewWaypoint = true;

        if (blobHead.wpos.getRangeTo(waypointWorld) > this.memory.desiredRange)
        {
            targetPos = waypoint;
            setNewWaypoint = false;
        }

        this.planLeaderMovement(blobHead, targetPos);
        this.memory.direction = blobHead.nextMove;
        let blobHeadNextPos = blobHead.nextMovePos;
        if (setNewWaypoint)
        {
            this.memory.wayPoint = blobHeadNextPos;
            //this.calculateSnakeOrder(creeps, targetPos)
        }

        if (this.memory.direction == 0 || blobHeadNextPos.isObstructed(this.creeps))
        {
            this.moveBlob(blobHead, creeps, blobHeadNextPos);
            this.selectFormation(creeps, targetPos, blobHead.pos, this.memory.direction, false);
            return;
        }
        else
        {
            this.drawMoveLine(blobHead, targetPos);
            this.moveBlob(blobHead, creeps, blobHeadNextPos);
            if (this.selectFormation(creeps, targetPos, blobHeadNextPos, this.memory.direction, false))
                return;
        }
    }

    inBlob(creeps)
    {
        for (let creep of creeps)
        {
            if (!creeps.some(c => c.id != creep.id && c.room.name == creep.room.name && c.pos.getRangeTo(creep.pos) <= 1))
                return false;
        }

        return true;
    }

    getInBlob(creeps)
    {
        //console.log('Squad.getInBlob - ' + creeps[0].room.name + ' - getting in blob');
        for (let creep of creeps)
        {
            let nearestCreepNotAdjacent = creeps.find(c => c.id != creep.id && c.wpos.getRangeTo(creep.wpos) > 1);
            if (nearestCreepNotAdjacent)
                creep.moveTo(nearestCreepNotAdjacent, { freshMatrix: true, routeCallback: global.soldierRouteCallback });
        }
    }

    moveBlob(head, inCreeps, blobHeadNextPos)
    {
        //console.log('Squad.moveBlob - ' + head.pos.roomName + ' - attempting alternate movement');

        let prevCreep = head;
        let inLine = true;

        let creeps = [...inCreeps];
        creeps.sort((a, b) => a.wpos.getRangeTo(head) - b.wpos.getRangeTo(head));

        // for (let creep of creeps)
        // {
        //     if (creep.room.name != prevCreep.room.name || creep.pos.nearEdge(0) || creep.pos.getRangeTo(prevCreep.pos) > 1)
        //     {
        //         inLine = false;
        //         break;
        //     }
        //     prevCreep = creep;
        // }

        // if (inLine)
        //     return;

        let positionsToCheck = [];
        let openPositions = [];
        let positionsChecked = [];
        for (let creep of creeps)
        {
            positionsToCheck.push(creep.pos);
        }

        while (positionsToCheck.length > 0 && openPositions.length < creeps.length)
        {
            positionsToCheck.sort((a, b) => a.getRangeTo(blobHeadNextPos) - b.getRangeTo(blobHeadNextPos))
            let posToCheck = positionsToCheck.shift();

            for (let direction of global.DIRECTIONS)
            {
                let nearPos = posToCheck.getPositionAtDirection(direction);
                if (positionsChecked.find(o => o.isEqualTo(nearPos)))
                    continue;

                positionsChecked.push(nearPos);
                if (nearPos.roomName == head.pos.roomName && !nearPos.nearEdge(0) && !nearPos.isObstructed(creeps))
                {
                    openPositions.push(nearPos);
                    positionsToCheck.push(nearPos);
                }
            }
        }

        //console.log('Squad.moveBlob - ' + head.pos.roomName + ' - found ' + openPositions.length + ' open positions');

        let creepsToMove = [...creeps];

        // creepsToMove.sort((a, b) => _.sum(openPositions, p => b.wpos.getRangeTo(p.wpos)) - _.sum(openPositions, p => a.wpos.getRangeTo(p.wpos)));

        // for (let creep of creepsToMove)
        // {
        //     if (openPositions.length <= 0)
        //         break;

        //     let nearestPos = _.min(openPositions, p => creep.wpos.getRangeTo(p.wpos));
        //     creep.moveTo(nearestPos, { freshMatrix: true, routeCallback: global.soldierRouteCallback });

        //     openPositions.splice(openPositions.findIndex(p => p.isEqualTo(nearestPos)), 1);
        // }

        // creepsToMove = creepsToMove.filter(c => !openPositions.find(o => o.isEqualTo(c.pos)));
        // openPositions = openPositions.filter(o => !creeps.find(c => c.pos.isEqualTo(o)));
        

        //console.log('Squad.moveBlob - ' + head.pos.roomName + ' - found ' + openPositions.length + ' open positions not already taken');

        let creepCount = 0;
        for (let creepIndex in creepsToMove)
        {
            let creep = creepsToMove[creepIndex];
            if (creep.id == head.id)
                continue;

            if (creepCount > openPositions.length - 1)
                break;

            creep.moveTo(openPositions[creepCount], { freshMatrix: true, routeCallback: global.soldierRouteCallback });
            creep.room.visual.line(creep.pos, openPositions[creepCount], { color: '#ffffff' });
            creepCount += 1;
        }
    }

    //------ Longbow mode

    doLongbowMode(creeps, targetPos)
    {
        this.memory.mode = 'longbow';

        if (!this.moveTarget || !this.moveTarget.nearEdge(0) || this.memory.flee)
        {
            this.selectFormation(creeps, targetPos, targetPos, 0, true);
            return;
        }

        this.moveLongbow(creeps);
    }

    moveLongbow(inCreeps)
    {
        let creeps = [...inCreeps];
        creeps.sort((a, b) => a.wpos.getRangeTo(this.moveTarget.wpos) - b.wpos.getRangeTo(this.moveTarget.wpos));

        let positionsToCheck = [this.moveTarget];
        let openPositions = [];
        let positionsChecked = [this.moveTarget];

        if (!this.moveTarget.isObstructed(creeps))
            openPositions.push(this.moveTarget);

        while (positionsToCheck.length > 0 && openPositions.length < creeps.length)
        {
            let posToCheck = positionsToCheck.shift();

            for (let direction of global.DIRECTIONS)
            {
                let nearPos = posToCheck.getPositionAtDirection(direction);

                if (positionsChecked.find(o => o.isEqualTo(nearPos)))
                    continue;

                positionsChecked.push(nearPos);
                if (nearPos.nearEdge(0) && !nearPos.isObstructed(creeps))
                {
                    openPositions.push(nearPos);
                    positionsToCheck.push(nearPos);
                }
            }
        }

        let creepsToMove = [...creeps];

        let creepCount = 0;
        for (let creepIndex in creepsToMove)
        {
            let creep = creepsToMove[creepIndex];

            if (creepCount >= openPositions.length)
                break;

            creep.moveTo(openPositions[creepCount], { freshMatrix: true, routeCallback: global.soldierRouteCallback });
            creep.room.visual.line(creep.pos, openPositions[creepCount], { color: '#ffffff' });
            creepCount += 1;
        }
    }

    calculateHealPower(room, position)
    {
        let squadCreeps = this.spawnedCreeps;
        let myTowers = room.towers.filter(t => t.my && t.isActive());

        let healPower = _.sum(squadCreeps, c => c.healPower);
        let towerHealing = _.sum(myTowers, t => t.estimatedHealingAtPosition(position));

        let damageResistance = _.sum(squadCreeps, c => c.damageResistance) / squadCreeps.length;

        return (healPower + towerHealing) / ((2 + (1 - damageResistance)) / 3); 
    }

    planLeaderMovement(leader, target)
    {
        let additionalCreepCost = 20;
        let squadCreepCost = 1;
        if (this.memory.mode == 'snake')
            squadCreepCost = 50;

        let squadCreeps = this.spawnedCreeps;
        let doFormationPlan = ((this.memory.mode == 'formation' || this.memory.nextPositionDanger >= 0.5) && squadCreeps.length > 2);

        let healPower = this.calculateHealPower(leader.room, leader.pos);

        leader.moveTo(target, 
        { 
            range: this.memory.desiredRange,
            planOnly: 1,
            //repath: leader.pos.roomName == target.roomName ? 1 : 0,
            repath: 0.25,
            ignoreCreeps: leader.pos.roomName == target.roomName && !leader.pos.nearEdge(0),
            ignoreStructures: Room.isEnemyBase(leader.pos.roomName) && !Room.trusted(leader.pos.roomName),
            freshMatrix: true,
            routeCallback: global.soldierRouteCallback,
            roomCallback: function(roomName, costMatrix)
            {
                //console.log('Squad.planLeaderMovement - planning movement through: ' + roomName);

                if (!squadCreeps || squadCreeps.length <= 0)
                {
                    console.log('Squad.planLeaderMovement - no squadCreeps');
                    return;
                }

                let roomMapFlag = Game.flags['mapRoom_' + roomName];
                if (roomMapFlag)
                {
                    let roomMapProcess = kernel.scheduler.getProcessFromId(roomMapFlag.memory.pid);
                    if (roomMapProcess)
                    {
                        //console.log('Squad.planLeaderMovement - requesting costMatrix for: ' + roomName + ', healPower: ' + healPower + ', doFormationPlan: ' + doFormationPlan);
                        costMatrix = roomMapProcess.getCombatCostMatrix(healPower, doFormationPlan);
                    }

                    for (let creep of squadCreeps)
                    {
                        if (creep.room.name == roomName)
                            costMatrix.set(creep.pos.x, creep.pos.y, squadCreepCost);
                    }
                }
                else if (roomName == leader.room.name)
                {
                    let room = Game.rooms[roomName];
                    if (room)
                    {
                        let creeps = room.find(FIND_CREEPS);
                        for (let creep of creeps)
                            costMatrix.set(creep.pos.x, creep.pos.y, additionalCreepCost);
                    }

                    for (let creep of squadCreeps)
                    {
                        if (creep.room.name == roomName)
                            costMatrix.set(creep.pos.x, creep.pos.y, squadCreepCost);
                    }
                }
                else
                {
                    return null;
                }
                
                return costMatrix;
            }
        });
    }

    moveFormation(creeps, direction)
    {
        let leaderName = this.memory.formationOrder[this.memory.leaderIndex];
        let leader = Game.creeps[leaderName];

        let travelData = leader.memory._trav;
        travelData.path = travelData.path.substr(1);

        for (let creepIndex in creeps)
        {
            let creep = creeps[creepIndex];
            if (creep.currentTask.squad)
                creep.move(direction);
        }
    }

    changeToSnake(creeps, targetPos, doImmediate)
    {
        //console.log('Squad.changeToSnake - ' + creeps[0].room.name + ' - changing to snake');
        let changing = this.memory.mode != 'snake';
        this.memory.mode = 'snake';
        if (changing)
            this.calculateSnakeOrder(creeps, targetPos);
        if (doImmediate)
            this.doSnakeMode(creeps, targetPos);
    }

    inRoom(roomName)
    {
        return !!_.find(this.creeps, c => c.room.name == roomName);
    }

    changeToBlob(creeps, targetPos, doImmediate)
    {
        //console.log('Squad.changeToBlob - ' + creeps[0].room.name + ' - changing to blob');
        this.memory.mode = 'blob';
        if (doImmediate)
            this.doBlobMode(creeps, targetPos);
    }

    changeToLongbow(creeps, targetPos, doImmediate)
    {
        //console.log('Squad.changeToLongbow - ' + creeps[0].room.name + ' - changing to longbow');
        this.memory.mode = 'longbow';
        if (doImmediate)
            this.doLongbowMode(creeps, targetPos);
    }
}

module.exports = Squad;
