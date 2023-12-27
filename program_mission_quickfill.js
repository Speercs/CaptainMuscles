'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_QuickFill extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'quickfill', room: this.data.room });

        //console.log('Mission_QuickFill.constructor - executing');
        this.frequency = 10;

        this.desiredSpawnType = 'transfer';
    }

    run()
    {
        super.run();

        return this.suicide();
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        let task = this.getTask(creep);
        if (!task)
            return null;

        let room = Game.rooms[this.data.room];

        let maxParts = 4;
        // if (room.controller.level >= 8)
        //     maxParts = 16;
        // else if (room.controller.level >= 7)
        //     maxParts = 8;

        this.memory.desiredSpawn = { utility: task.utility, type: this.desiredSpawnType, maxParts: maxParts, task: task };
        return this.memory.desiredSpawn;
    }

    employNewCreep(creepName, creepMemory)
    {
        super.employNewCreep(creepName, creepMemory);

        let existingCreepNumbers = [];
        for (let creepName of this.memory.creeps)
        {
            let creepMemory = Memory.creeps[creepName];
            if (creepMemory && creepMemory.mission && !_.isUndefined(creepMemory.mission.spot))
                existingCreepNumbers.push(creepMemory.mission.spot);
        }

        let creepNumber = 0;
        while (existingCreepNumbers.indexOf(creepNumber) >= 0)
            creepNumber += 1;

        creepMemory.mission.spot = creepNumber;
    }

    getTask(creep)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let room = Game.rooms[this.data.room];
        let controllerLevel = room.controller.level;
        let desiredCount = 4;
        // if (controllerLevel <= 2)
        //     desiredCount = 1;
        // else if (controllerLevel == 3)
        //     desiredCount = 2;

        if (controllerLevel < 4)
            desiredCount = controllerLevel;

        if (room && this.memory.creeps.length < desiredCount &&
           (room.quickLink ||
           (room.quickCan1 && room.quickCan1.store.getUsedCapacity(RESOURCE_ENERGY) > 0) ||
           (room.quickCan2 && room.quickCan2.store.getUsedCapacity(RESOURCE_ENERGY) > 0) ||
            room.bonfire))// && room.find(FIND_MY_SPAWNS).length > 0)
        {
            // let existingSpotNumbers = [];
            // let fillers = this.getCreeps();
            // for (let filler of fillers)
            // {
            //     let fillerTask = filler.currentTask;
            //     if (fillerTask && fillerTask.n == 'quickfill')
            //         existingSpotNumbers.push(fillerTask.spot);
            // }
            //
            // let creepSpotNumber = 0;
            // for (let i = 0; i < desiredCount; ++i)
            // {
            //     if (existingSpotNumbers.indexOf(i) < 0)
            //     {
            //         creepSpotNumber = i;
            //         break;
            //     }
            // }
            //
            // return { utility: 1.0, task: 'quickfill', program: 'task_quickfill', data: { r: this.data.room, spot: creepSpotNumber }};
            return { utility: 1.0, task: 'quickfill', program: 'task_quickfill', data: { r: this.data.room }};
        }

        return null;
    }
}

module.exports = Mission_QuickFill
