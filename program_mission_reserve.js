'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Reserve extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'reserve', room: this.data.room });

        this.desiredSpawnType = 'reserve';

        //console.log('Mission_Reserve.constructor - executing');
    }

    run()
    {
        super.run();
        //console.log('Mission_Reserve.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        let room = Game.rooms[this.data.room];
        if (!room)
            return;

        let controller = room.controller;
        if (!room.controller)
            return;

        // if (controller.sign)
        //     console.log(JSON.stringify(controller.sign))

        if (controller.sign && controller.sign.username == 'Screeps')
        {
            //console.log('Mission_Reserve.updateInfo - ' + this.data.room + ' - adding remote status - ' + JSON.stringify(controller.sign));
            this.memory.remote = 1;
        }

        else if (this.memory.remote)
        {
            console.log('Mission_Reserve.updateInfo - ' + this.data.room + ' - removing remote status - ' + JSON.stringify(controller.sign));
            delete this.memory.remote;
        }
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: 5, dontBlockAllFill: 1, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (!this.room || !this.room.controller)
            return null;

        let controller = this.room.controller;

        var ticksToReserve = CONTROLLER_RESERVE_MAX;

        if (controller.reservedByMe())
            ticksToReserve -= controller.reservation.ticksToEnd;

        if (ticksToReserve < CONTROLLER_RESERVE_MAX / 2)
            return null;

        let claimSum = _.sum(this.getCreeps(), c => c.memory[CLAIM]);
        if (claimSum >= 2)
            return null;

        let nearestBase = Room.getNearestBase(this.data.room);
        let maxCreeps = 2;
        if (nearestBase && nearestBase.energyCapacityAvailable >= ((BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]) * 2))
            maxCreeps = 1;

        let neededCreeps = Math.min(controller.pos.getOpenSpotCount(), maxCreeps) - this.memory.creeps.length;
        if (neededCreeps <= 0)
            return null;

        let utility = (ticksToReserve / CONTROLLER_RESERVE_MAX);
        return { utility: utility, task: 'reserve', program: 'task_reserve', data: { t: controller.id, x: controller.pos.x, y: controller.pos.y, r: controller.room.name }};
    }
}

module.exports = Mission_Reserve
