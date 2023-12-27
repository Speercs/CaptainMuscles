'use strict'

const constants = require('constants');
const Process = require('os_process')

class Mission_Creeps extends Process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Mission_Creeps.constructor - executing');

        this.frequency = 10;
    }

    refresh()
    {
        super.refresh();

        if (!Memory.missions)
            Memory.missions = {};

        if (this.data.room)
            this.room = Game.rooms[this.data.room];
    }

    static getMemory(missionInfo)
    {
		let missionKey = Mission_Creeps.getMissonKeyFromInfo(missionInfo);
        return Memory.missions[missionKey];
	}

    static getMissonKeyFromInfo(missionInfo)
    {
        let missionKey = missionInfo.type;
        if (missionInfo.room)
            missionKey = missionInfo.room + '_' + missionKey;

        if (missionInfo.targetShard && missionInfo.targetRoom)
            missionKey = missionKey + '_' + missionInfo.targetShard + '_' + missionInfo.targetRoom;
        else if (missionInfo.targetRoom)
            missionKey = missionKey + '_' + missionInfo.targetRoom;
        else if (missionInfo.source)
            missionKey = missionKey + '_' + missionInfo.source;
        else if (missionInfo.mineral)
            missionKey = missionKey + '_' + missionInfo.mineral;
        else if (missionInfo.target)
            missionKey = missionKey + '_' + missionInfo.target;

        return missionKey;
    }

    setMemory(missionInfo, missionKey)
    {
        if (!missionKey)
            missionKey = Mission_Creeps.getMissonKeyFromInfo(missionInfo);

        // if (constants.generalMissionPriority.indexOf(missionInfo.type) < 0)
        //     console.log('Mission_Creeps.setMemory - mission type ' + missionInfo.type + ' has not been given a priority!!!');

        if (Array.isArray(Memory.missions))
        {
            console.log('***********Mission_Creeps.setMemory - replacing mission array with mission object. All creeps must be reset');

            for (let creepName in Game.creeps)
            {
                Game.creeps[creepName].memory.unemployed = 1;
            }

            Memory.missions = {};
        }

        let missionMemory = Memory.missions[missionKey];
        if (!missionMemory)
        {
            console.log('Mission_Creeps.run - creating new mission - ' + JSON.stringify(missionInfo));

            missionMemory = missionInfo
            missionMemory.creeps = [];

            Memory.missions[missionKey] = missionMemory;
        }

        missionInfo.pid = this.id;
        missionMemory.pid = this.id;
        this.missionInfo = missionInfo;
        this.missionKey = missionKey;
        this.memory = missionMemory;
    }

    end()
    {
        super.end();

        if (Memory.missions[this.missionKey])
        {
            console.log('Mission_Creeps.run - ' + this.missionInfo.room + ' - ' + this.missionInfo.type + ' - deleting memory');
            delete Memory.missions[this.missionKey];
        }
    }

    run()
    {
        super.run();
        //console.log('Mission_Creeps.run - ' + this.data.room + ' - executing');
        this.updateInfo();
    }

    updateInfo()
    {

    }

    getCreeps()
    {
        return _.filter(this.memory.creeps.map(creepName => Game.creeps[creepName]), c => c);
    }

    getSpawnedCreeps()
    {
        return _.filter(this.memory.creeps.map(creepName => Game.creeps[creepName]), c => c && !c.spawning);
    }

    getTotalCreepCapacity()
    {
        return (_.sum(this.getCreeps().map(c => c.store.getCapacity())) || 0);
    }

    getTotalSpawnedCreepCapacity()
    {
        return (_.sum(this.getSpawnedCreeps().map(c => c.store.getCapacity())) || 0);
    }

    getIdleCreeps()
    {
        //return _.filter(this.getCreeps(), creep => !creep.spawning && !creep.hasTask());
        return _.filter(this.getCreeps(), creep => !creep.spawning && (!creep.hasTask() || creep.hasTask({ n: 'Idle' })));
    }

    getSpawningCreeps()
    {
        return _.filter(this.getCreeps(), creep => creep.spawning);
    }

    // layOffCreep(creep)
    // {
    //     let indexOfCreep = this.memory.creeps.indexOf(creep.name);
    //     if (indexOfCreep < 0)
    //         return false;
    //
    //     //console.log('Mission_Creeps.layOffCreep - ' + this.missionKey + ' - laying off ' + creep.name);
    //     this.memory.creeps.splice(indexOfCreep, 1);
    //
    //     if (creep.memory.pid)
    //         kernel.scheduler.callProcessFunction(creep.memory.pid, 'laidOff');
    //
    //     this.updateCreepInfo();
    // }

    // layOffAllCreeps()
    // {
    //     while (this.memory.creeps.length > 0)
    //     {
    //         let creepName = this.memory.creeps[0];
    //         let creep = Game.creeps[creepName];
    //
    //         this.memory.creeps.splice(0, 1);
    //
    //         if (creep && creep.memory.pid)
    //             kernel.scheduler.callProcessFunction(creep.memory.pid, 'laidOff');
    //     }
    //
    //     this.updateCreepInfo();
    // }
}

module.exports = Mission_Creeps
