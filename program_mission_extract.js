'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Extract extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'extract', room: this.data.room, mineral: this.data.mineral });

        this.desiredSpawnType = 'worky';

        //console.log('Mission_Extract.constructor - executing');
    }

    run()
    {
        //console.log('Mission_Extract.run - executing');
        super.run();

        //return this.suicide();

        let baseMemory = Room.getBaseMemory(this.data.room);
        if (baseMemory && baseMemory.level < 6)
            return this.suicide();

        let roomMemory = Room.getMemory(this.data.room);
        if (!roomMemory || !this.room || !this.room.coreLink || !this.room.mineral)
            return null;

        let container = this.room.mineral.container;
        if (!container)
        {
            let path = this.room.coreLink.pos.findPathTo(this.room.mineral.pos, { range: 1, ignoreCreeps: true, maxOps: 20000, maxRooms: 1 });
            if (path.length)
            {
                var lastPoint = path[path.length - 1];
                this.room.createConstructionSite(lastPoint.x, lastPoint.y, STRUCTURE_CONTAINER);
            }
        }

        if (this.memory.creeps.length > 0)
        {
            let nearestBase = Room.getNearestBase(this.data.room);
            let reserved = (roomMemory.controller && roomMemory.controller.r)
            let reservedByOther = (reserved && roomMemory.controller.r != ME);

            let paveable = (!reservedByOther && nearestBase && !nearestBase.isBootstrapping() && nearestBase.controller.level >= 4 && nearestBase.storage && nearestBase.storage.my);
            // if (paveable)
            //     this.launchChildProcess(`pave_${this.data.mineral}`, 'mission_pave', { room: this.data.room, source: this.data.mineral });
            //this.launchChildProcess(`collect_${this.data.mineral}`, 'mission_collect', { room: this.data.room, source: this.data.mineral });
        }
        else
        {
            this.endChildProcess(`pave_${this.data.mineral}`);
            this.endChildProcess(`collect_${this.data.mineral}`);
        }
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;
        //return null;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, noLowerLevel: 1, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (creep && this.desiredSpawnType != creep.memory.type)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.memory.creeps.length > 0)
            return null;

        if (!this.room)
            return null;

        let mineral = this.room.mineral;
        if (!mineral)
        {
            //console.log('Mission_Extract.getTask - ' + this.data.room + ' - no mineral');
            return null;
        }

        if (mineral.ticksToRegeneration)
        {
            //console.log('Mission_Extract.getTask - ' + this.data.room + ' - still regenerating');
            return null;
        }

        if (!mineral.extractor)
        {
            //console.log('Mission_Extract.getTask - ' + this.data.room + ' - no extractor');
            return null;
        }

        if (!mineral.container || !mineral.container.store)
        {
            //console.log('Mission_Extract.getTask - ' + this.data.room + ' - no container');
            return null;
        }

        if (mineral.container.store.getFreeCapacity() <= 0)
        {
            //console.log('Mission_Extract.getTask - ' + this.data.room + ' - container full');
            return null;
        }

        let terminalAction = Room.selectTerminalAction(this.data.room, mineral.mineralType);

        //console.log('Mission_Extract.getTask - ' + this.data.room + ' - terminalAction: ' + terminalAction);

        if (terminalAction == TERMINAL_ACTION_SELL || terminalAction == TERMINAL_ACTION_DUMP)
            return null;

        return { utility: 0.001, task: 'extract', program: 'task_extract', data: { t: this.data.mineral, x: mineral.pos.x, y: mineral.pos.y, r: this.data.room }};
    }
}

module.exports = Mission_Extract
