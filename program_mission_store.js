'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Store extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'store', room: this.data.room });

        //console.log('Mission_Store.constructor - executing');
    }

    run()
    {
        super.run();

        //console.log('Mission_Store.run - ' + this.data.room + ' - executing');

        return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();
    }

    getDesiredSpawn(creep)
    {
        delete this.memory.desiredSpawn;

        let task = this.getTask(creep);
        if (!task)
            return null;

        this.memory.desiredSpawn = { utility: task.utility, task: task };
        return this.memory.desiredSpawn;
    }

    getTask(creep)
    {
        if (!creep)
            return null;

        if (!this.room)
            return null;

        let creepCarry = creep.getResourceAmount();
        //console.log('Mission_Store.getTask - ' + creep.name + ' - creepCarry: ' + creepCarry)
        if (creepCarry <= 0)
            return null;

        let dropOffPos = this.room.quickLinkPos;
        if (!dropOffPos)
            return null;

        return { utility: 0.001, task: 'store', program: 'task_store', data: { r: this.data.room } };
    }
}

module.exports = Mission_Store
