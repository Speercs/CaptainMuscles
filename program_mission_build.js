'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Build extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'build', room: this.data.room });

        this.desiredSpawnType = 'worry';

        //console.log('Mission_Build.constructor - executing');
    }

    run()
    {
        super.run();
        //console.log('Mission_Build.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        let baseMemory = Room.getBaseMemory(this.data.room);

        this.memory.out = 0;

        let room = Game.rooms[this.data.room];
        let siteCount = _.filter(room.find(FIND_MY_CONSTRUCTION_SITES), site => site.structureType != STRUCTURE_ROAD && site.structureType != STRUCTURE_RAMPART).length;
        this.memory.siteCount = siteCount;
        if (siteCount <= 0)
        {
            if (!this.memory.siteLastSeen)
                this.memory.siteLastSeen = Game.time;

            if (Game.time - this.memory.siteLastSeen > 10)
            {
                this.layOffAllCreeps();
                return;
            }
        }
        else
        {
            this.memory.siteLastSeen = Game.time;
        }

        this.memory.out = (_.sum(this.getCreeps(), c => c.buildPower) || 0);
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (!this.room)
            return null;

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (!baseMemory)
            return null;

        if (this.memory.siteCount <= 0)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (!this.room.quickLinkPos)
            return null;

        let landmarkPos = this.room.quickLinkPos.toWorldPosition();
        if (creep)
            landmarkPos = creep.wpos;

        let sites = this.room.find(FIND_MY_CONSTRUCTION_SITES);
        if (sites.length <= 0)
            return null;
        let site = _.min(sites, s => landmarkPos.getManhattanDist(s.wpos));

        let utility = 0.0;
        if (this.room.isBootstrapping() && this.memory.creeps.length <= 0)
        {
            utility = 1.0;
        }
        else if (baseMemory.spendable >= BUILD_POWER)
        {
            let thisSpending = (_.sum(this.getSpawnedCreeps(), c => c.buildPower) || 0);
            utility = 1.0 - (thisSpending / baseMemory.spendable);
        }

        return { utility: utility, task: 'build', program: 'task_build', data: { t: site.id, x: site.pos.x, y: site.pos.y, r: site.room.name }};
    }
}

module.exports = Mission_Build
