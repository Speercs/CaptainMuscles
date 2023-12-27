'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Pave extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'pave', room: this.data.room, source: this.data.source, targetRoom: this.data.targetRoom });

        //console.log('Mission_Pave.constructor - executing');

        this.desiredSpawnType = 'worry';
    }

    run()
    {
        super.run();
        //console.log('Mission_Pave.run - ' + this.data.room + ' - executing');

        return this.suicide();

        if (this.data.targetRoom)
        {
            let baseMemory = Room.getBaseMemory(this.data.room);

            if (!baseMemory || !baseMemory.neighbors || !_.find(baseMemory.neighbors, n => n == this.data.targetRoom))
                return this.suicide();
        }
    }

    updateInfo()
    {
        super.updateInfo();

        this.memory.out = 0;

        let creepOutputPerWork = BUILD_POWER;
        if (this.memory.finishTime)
            creepOutputPerWork = 1;

        let creepCount = 0;
        while (creepCount < this.memory.creeps.length)
        {
            let creep = Game.creeps[this.memory.creeps[creepCount]];
            if (!creep)
            {
                this.memory.creeps.splice(creepCount, 1);
            }
            else
            {
                this.memory.out += (creepOutputPerWork * creep.memory.work);
                ++creepCount;
            }
        }

        let roomMemory = Room.getMemory(this.data.room);

        if (this.data.source)
        {
            if (!roomMemory || !roomMemory.sources || !roomMemory.sources[this.data.source])
                return;

            let sourceMemory = roomMemory.sources[this.data.source];
            if (sourceMemory.l && !roomMemory.clear)
                this.layOffAllCreeps();
        }

        if (roomMemory && roomMemory.controller && ((roomMemory.controller.r && roomMemory.controller.r != ME) || (roomMemory.controller.o && roomMemory.controller.o != ME)))
        {
            this.layOffAllCreeps();
        }
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        // if (!creep)
        //     console.log('Mission_Pave.getDesiredSpawn - ' + this.data.room + ' - checking');

        let task = this.getTask(creep);
        if (!task)
        {
            // if (!creep)
            //     console.log('Mission_Pave.getDesiredSpawn - ' + this.data.room + ' - no task found');
            return null;
        }


        let nearestBase = Room.getNearestBase(this.data.room);
        if (!nearestBase)
        {
            //console.log('Mission_Pave.getDesiredSpawn - ' + this.data.room + ' - no nearestBase found');
            return null;
        }

        let baseMemory = Room.getBaseMemory(nearestBase.name);
        if (!baseMemory || !baseMemory.spendable || baseMemory.spendable <= 0)
        {
            //console.log('Mission_Pave.getDesiredSpawn - ' + this.data.room + ' - no baseMemory found or baseMemory.spendable not valid');
            return null;
        }

        let totalProfit = baseMemory.spendable;
        let creepOutputPerWork = BUILD_POWER;
        if (this.memory.finishTime)
            creepOutputPerWork = 1;

        let maxParts = Math.floor(totalProfit / creepOutputPerWork);

        //console.log('Mission_Pave.getTask - ' + this.data.room + ' - uhhhhh');

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task, memory: { wept: !!this.memory.finishTime} };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (creep && creep.memory.boosts)
            return null;

        if (creep && this.getSpawnedCreeps().length > 0)
            return null;

        if (!creep && this.memory.creeps.length > 0)
            return null;

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let nearestBase = Room.getNearestBase(this.data.room);
        if (!nearestBase)
        {
            //console.log('Mission_Pave.getTask - ' + this.data.room + ' - no nearestBase found');
            return null;
        }


        let baseMemory = Room.getBaseMemory(nearestBase.name);
        if (!baseMemory || !baseMemory.spendable || baseMemory.spendable <= 0)
        {
            //console.log('Mission_Pave.getTask - ' + this.data.room + ' - no baseMemory found or baseMemory.spendable not valid');
            return null;
        }


        let totalProfit = baseMemory.spendable;
        let creepOutputPerWork = BUILD_POWER;
        if (this.memory.finishTime)
            creepOutputPerWork = 1;

        if (totalProfit < creepOutputPerWork)
        {
            //console.log('Mission_Pave.getTask - ' + this.data.room + ' - total profit too low');
            return null;
        }

        let pathEnd;

        if (this.data.source)
        {
            let roomMemory = Room.getMemory(this.data.room);
            if (!roomMemory || !roomMemory.sources)
                return null;
            let sourceMemory = roomMemory.sources[this.data.source];
            if (!sourceMemory)
                sourceMemory = roomMemory.mineral;
            if (sourceMemory && sourceMemory.l && !roomMemory.clear)
            {
                //console.log('Mission_Pave.getTask - ' + this.data.room + ' - not cleared');
                return null;
            }


            pathEnd = new RoomPosition(sourceMemory.x, sourceMemory.y, this.data.room);
        }

        if (this.memory.finishTime)
        {
            let decayTime = (CONTAINER_HITS / CONTAINER_DECAY);
            if (!this.room || !this.room.isMyBase())
                decayTime *= CONTAINER_DECAY_TIME;
            else
                decayTime *= CONTAINER_DECAY_TIME_OWNED;

            decayTime /= 3;

            if (this.memory.interrupted)
                decayTime /= 2;

            let remainingWaitTIme = Math.floor((this.memory.finishTime + decayTime) - Game.time);
            //console.log('Mission_Pave.getTask - ' + this.data.room + ' - remainingWaitTIme: ' + remainingWaitTIme);
            if (remainingWaitTIme > 0)
            {
                //console.log('Mission_Pave.getTask - ' + this.data.room + ' - remainingWaitTIme');
                return null;
            }
        }

        if (!nearestBase.coreLinkPos || nearestBase.isBootstrapping() || nearestBase.controller.level < 3 || _.filter(nearestBase.find(FIND_MY_CONSTRUCTION_SITES), site => site.structureType != STRUCTURE_ROAD).length > 0)
        {
            //console.log('Mission_Pave.getTask - ' + this.data.room + ' - nearestBase invalid');
            return null;
        }

        if (this.data.targetRoom)
        {
            let sisterMissionKey = this.data.targetRoom + '_pave_' + this.data.room;
            let sisterMission = Memory.missions[sisterMissionKey];
            if (sisterMission)
            {
                //console.log('Mission_Pave.updateInfo - ' + this.data.room + ' - found sister mission');
                if (sisterMission.creeps.length > 0)
                {
                    console.log('Mission_Pave.updateInfo - ' + this.data.room + ' - sister mission has creeps, no spawn desired');
                    this.memory.finishTime = Game.time;
                    return null;
                }
            }

            let targetRoom = Game.rooms[this.data.targetRoom];
            pathEnd = targetRoom.coreLinkPos;
        }

        let utility = 1.0 - (this.memory.out / totalProfit);

        if (!this.data.source && !this.data.targetRoom)
            return { utility: utility, task: 'pave_base', program: 'task_pave_base', data: { r: this.data.room }};

        if (!pathEnd)
            return null;

        let pathStart = nearestBase.coreLinkPos;
        return { utility: utility, task: 'pave', program: 'task_pave', data: { x1: pathStart.x, y1: pathStart.y, r1: pathStart.roomName,
                                                                               x2:   pathEnd.x, y2:   pathEnd.y, r2:   pathEnd.roomName}};
    }

    employNewCreep(creepName, creepMemory)
    {
        super.employNewCreep(creepName, creepMemory);

        let creepOutputPerWork = BUILD_POWER;
        if (this.memory.finishTime)
            creepOutputPerWork = 1;

        creepMemory.mission.ept = creepOutputPerWork;
    }
}

module.exports = Mission_Pave
