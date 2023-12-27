'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Claim extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'claim', room: this.data.room });

        //console.log('Mission_Claim.constructor - executing');

        this.desiredSpawnType = 'claim';

        this.frequency = 1;
    }

    run()
    {
        super.run();
        //console.log('Mission_Claim.run - ' + this.data.room + ' - executing');

        return this.suicide();

        let room = Game.rooms[this.data.room];
        if (room && room.controller && room.controller.my)
        {
            if (Game.flags['claim'] && Game.flags['claim'].pos.roomName == this.data.room)
                Game.flags['claim'].remove();
            return this.suicide();
        }
        //
        // if (Memory.empire && (!Memory.empire.nextClaim || Memory.empire.nextClaim != this.data.room))
        // {
        //     if (!Game.flags['claim'] || Game.flags['claim'].pos.roomName != this.data.room)
        //         return this.suicide();
        // }

        Game.map.visual.rect(new RoomPosition(1, 1, this.data.room), 48, 48, {fill: 'transparent', stroke: '#b99cfb', strokeWidth: 1});
    }

    updateInfo()
    {
        super.updateInfo();

        this.memory.remote = 1;
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: 1, dontBlockAllFill: 1, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.memory.creeps.length > 0)
            return null;

        return { utility: 1.0, task: 'claim', program: 'task_claim', data: { r: this.data.room }};
    }
}

module.exports = Mission_Claim
