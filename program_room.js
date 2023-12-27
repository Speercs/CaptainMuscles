'use strict'

class Room_Program extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Room_Program.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();

        this.memory = Room.getMemory(this.data.room);
        if (!this.memory)
            Memory.rooms[this.data.room] = this.memory = {};
        this.room = Game.rooms[this.data.room];
    }

    end()
    {
        super.end();

        //console.log('Room_Program.end - ' + this.data.room + ' - executing');

        // if (Memory.rooms && Memory.rooms[this.data.room])
        //     delete Memory.rooms[this.data.room];
    }

    run()
    {
        //console.log('Room_Program.run - ' + this.data.room + ' - executing');

        super.run();

        // let nearestBase = Room.getNearestBase(this.data.room);
        // if (nearestBase && global.distanceBetweenRooms(this.data.room, nearestBase.name) > global.MAX_SEARCH_RANGE)
        //     return this.suicide();

        return;

        if (this.memory.scout && !Game.creeps[this.memory.scout])
            delete this.memory.scout;

        if (this.room)
        {
            this.memory.seen = Game.time;
            this.memory.name = this.data.room;
            this.updateController(this.room, this.memory);
            this.updateSources(this.room, this.memory);
            this.updateMineral(this.room, this.memory);
            this.updateHostiles(this.room, this.memory);
            this.updateTerrain(this.room, this.memory);

            this.updatePortals(this.room, this.memory);
        }
        else
        {
            if (this.memory.seen && Game.time - this.memory.seen > CREEP_LIFE_TIME * 2)
            {
                if (Memory.rooms && Memory.rooms[this.data.room])
                    delete Memory.rooms[this.data.room];

                return this.suicide();
            }
        }

        this.updateMapVisuals();
    }

    updateController(room, roomMemory)
    {
        if (!room.controller)
            return;

        if (!roomMemory.controller)
        {
            roomMemory.controller = {};
            roomMemory.controller.x = room.controller.pos.x;
            roomMemory.controller.y = room.controller.pos.y;
        }

        if (room.controller.owner)
            roomMemory.controller.o = room.controller.owner.username;
        else
            delete roomMemory.controller.o;

        if (room.controller.reservation)
        {
            roomMemory.controller.r = room.controller.reservation.username;
            roomMemory.controller.rt = room.controller.reservation.ticksToEnd;
        }
        else
        {
            delete roomMemory.controller.r;
            delete roomMemory.controller.rt;
        }


        if (room.controller.safeMode)
            roomMemory.controller.sm = Game.time + room.controller.safeMode;
        else
            delete roomMemory.controller.sm;
    }

    updateSources(room, roomMemory)
    {
        if (!roomMemory.sources)
        {
            let sources = room.find(FIND_SOURCES);
            for (let source of sources)
            {
                // Force creation of source memory data
                let sourceMemory = source.memory;
            }

            // console.log('Room_Program.updateSources - ' + this.data.room + ' - creating sources - ' + JSON.stringify(roomMemory));
        }
    }

    updateMineral(room, roomMemory)
    {
        if (!roomMemory.mineral)
        {
            let mineral = room.mineral;
            if (mineral)
            {
                let mineralMemory = mineral.memory;
            }

            // console.log('Room_Program.updateMineral - ' + this.data.room + ' - creating mineral - ' + JSON.stringify(roomMemory));
        }
    }

    updateHostiles(room, roomMemory)
    {
        let wasInDanger = Room.inDanger(room.name);

        let hostileInfo = {};

        let foundHostile = false;

        let hostiles = _.filter(room.find(FIND_HOSTILE_CREEPS), c => c.killOnSight());
        if (hostiles.length > 0)
        {
            foundHostile = true;

            let totalPartCount = {};
            let maxPartCount = {};

            for (let hostile of hostiles)
            {
                let partCount = _.countBy(hostile.body, part => part.type);

                let hostileBody = hostile.body;
                for (let part of hostile.body)
                {
                    let additionalPartValue = 0;
                    if (part.boost)
                    {
                        let boostNameLength = part.boost.length;
                        if (boostNameLength == 2)
                            additionalPartValue = 1;
                        else if (boostNameLength == 4)
                            additionalPartValue = 2;
                        else if (boostNameLength == 5)
                            additionalPartValue = 3;
                    }
                    partCount[part.type] = (partCount[part.type] || 0) + additionalPartValue;
                }

                for (let part in partCount)
                {
                    let thisPartCount = partCount[part];
                    totalPartCount[part] = (totalPartCount[part] || 0) + thisPartCount;

                    if (!maxPartCount[part] || thisPartCount > maxPartCount[part])
                        maxPartCount[part] = thisPartCount;
                }
            }

            hostileInfo.hc = hostiles.length;

            hostileInfo.partCount = totalPartCount;
            hostileInfo.maxPartCount = maxPartCount;
        }

        let hostileStructures = _.filter(room.find(FIND_HOSTILE_STRUCTURES), c => c.killOnSight());
        if (hostileStructures.length > 0)
        {
            let invaderCore = _.find(hostileStructures, object => object.structureType == STRUCTURE_INVADER_CORE);

            if (invaderCore && !invaderCore.ticksToDeploy)
            {
                foundHostile = true;
                hostileInfo.ic = invaderCore.id;
            }
        }

        let nukes = room.find(FIND_NUKES);

        if (nukes.length > 0)
        {
            roomMemory.nukes = nukes.length;
            Game.map.visual.rect(new RoomPosition(3, 3, room.name), 46, 46, {fill: 'transparent', stroke: '#ffffff', strokeWidth: 5});
            if (room.isMyBase())
                console.log('Room_Program.updateHostiles - ' + room.name + ' - is being nuked!');
        }
        else
        {
            delete roomMemory.nukes;
        }

        if ((!room.controller || room.controller.owner) && hostileStructures.length > 0)
        {
            let towers = _.filter(hostileStructures, object => object.structureType == STRUCTURE_TOWER && object.store.getUsedCapacity(RESOURCE_ENERGY) >= TOWER_ENERGY_COST);

            if (towers.length > 0)
            {
                if (room.controller)
                    hostileInfo.tc = Math.min(CONTROLLER_STRUCTURES[STRUCTURE_TOWER][room.controller.level], towers.length);
                else
                    hostileInfo.tc = towers.length;

                foundHostile = (foundHostile || !!hostileInfo.tc);
            }
        }

        if (foundHostile)
        {
            roomMemory.hostiles = hostileInfo;
        }
        else
        {
            delete roomMemory.hostiles;
        }

        let isInDanger = Room.inDanger(room.name);

        if (isInDanger && !wasInDanger && !Room.isMyBase(room.name))
            Room.cancelCivilianJobs(room.name);

        let demolish = false;

        if (foundHostile && !hostileInfo.etc)
        {
            this.launchChildProcess('repel', 'mission_repel', { room: room.name });
        }
        else if (!hostileStructures || hostileStructures.length <= 0)
        {
            this.endChildProcess('repel');
        }

        if (!isInDanger)
        {
            let demolishableStructures = room.find(FIND_STRUCTURES, { filter: st => st.isDemolishable() && st.hits && st.attackInCombat() });
            if (demolishableStructures.length > 0)
                demolish = true;
        }

        if (demolish)
            roomMemory.demolish = 1;
        else
            delete roomMemory.demolish;
    }

    updateTerrain(room, roomMemory)
    {
        if (roomMemory.plains === undefined)
        {
            let totalSpots = 48 * 48;
            let plains = 0;
            let terrain = Game.map.getRoomTerrain(room.name);
            for (let i = 1; i < 49; ++i)
            {
                for (let j = 1; j < 49; ++j)
                {
                    if (!terrain.get(i, j))
                        plains += 1;
                }
            }

            roomMemory.plains = plains / totalSpots;
        }
    }

    updatePortals(room, roomMemory)
    {
        let portals = room.find(FIND_STRUCTURES, { filter: st => st.structureType == STRUCTURE_PORTAL });
        // if (portals.length > 0)
        //     console.log(JSON.stringify(portals))

        let interShardPortals = _.filter(portals, p => p.destination.shard);
        //let interRoomPortals = _.filter(portals, p => p.roomName);

        if (interShardPortals.length > 0)
        {
            //this.launchChildProcess('scout', 'mission_scout', { room: this.data.room });
            this.launchChildProcess('watch', 'mission_watch', { room: this.data.room });
        }
        else
        {
            this.endChildProcess('watch');
            if (!Room.isMyBase(this.data.room) && !Room.inDanger(this.data.room))
            {
                this.endChildProcess('scout');
            }
        }

        for (let portal of interShardPortals)
        {
            this.launchChildProcess(`portal_${portal.destination.shard}_${portal.destination.room}`, 'mission_portal', { room: this.data.room, id: portal.id, targetShard: portal.destination.shard, targetRoom: portal.destination.room });
        }
    }

    updateMapVisuals()
    {
        if (this.memory.sources)
        {
            Game.map.visual.text(Object.keys(this.memory.sources).length, new RoomPosition(5, 5, this.data.room), {color: '#FFFF00', fontSize: 8});
        }

        if (this.memory.mineral)
        {
            Game.map.visual.text(this.memory.mineral.type, new RoomPosition(10, 5, this.data.room), {color: '#c0c0c0', fontSize: 8});
        }

        if (Room.inDanger(this.data.room))
        {
            Game.map.visual.rect(new RoomPosition(0, 0, this.data.room), 50, 50, {fill: 'transparent', stroke: '#ff0000', strokeWidth: 1});
        }

        if (this.memory.demolish)
        {
            Game.map.visual.rect(new RoomPosition(2, 2, this.data.room), 46, 46, {fill: 'transparent', stroke: '#ffe56d', strokeWidth: 1});
        }

        if (this.room)
        {
            let baseMemory = Room.getBaseMemory(this.data.room)
            if (baseMemory)
            {
                let controller = this.room.controller;
                let controllerLevel = controller.level;
                if (controller.progressTotal)
                    controllerLevel = (controllerLevel + (controller.progress / controller.progressTotal)).toFixed(2);
                Game.map.visual.text(controllerLevel, new RoomPosition(49, 5, this.data.room), {color: '#ffffff', fontSize: 8, align: 'right'});
                if (baseMemory.shipTarget)
                {
                    let shipTargetCenter = new RoomPosition(25, 25, baseMemory.shipTarget);
                    Game.map.visual.line(new RoomPosition(25, 25, this.data.room), shipTargetCenter, {color: '#ffff00', lineStyle: 'dashed'});
                    Game.map.visual.circle(shipTargetCenter, {radius: 5, fill: '#ffff00', opacity: 0.25});
                }

            }
        }
    }
}

module.exports = Room_Program;
