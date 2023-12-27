'use strict'

let Mission_Creeps = require('program_mission_creeps');

class Mission_Power_Attack extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.setMemory({ type: 'power_attack', room: this.data.room, target: this.data.t });

        this.desiredSpawnType = 'destroy';

        //console.log('Mission_Power_Attack.constructor - executing ' + this.data.room);
    }

    run()
    {
        super.run();
        //console.log('Mission_Power_Attack.run - ' + this.data.room + ' - executing');

        if (this.room && !Game.getObjectById(this.data.t))
            return this.suicide();
    }

    updateInfo()
    {
        super.updateInfo();

        //console.log('Mission_Power_Attack.updateInfo - ' + this.data.room + ' - checking');

        this.memory.remote = 1;
    }

    getDesiredSpawn(creep)
    {
        //console.log('Mission_Power_Attack.getDesiredSpawn - ' + this.data.room + ' - checking');

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
        //console.log('Mission_Power_Attack.getTask - ' + this.data.room + ' - checking');

        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        if (!creep && this.memory.creeps.length > 0)
            return null;

        //console.log('Mission_Power_Attack.getTask - ' + this.data.room + ' - returning task');

        return { utility: 1.0, task: 'power_attack', program: 'task_power_attack', data: { t: this.data.t, x: this.data.x, y: this.data.y, r: this.data.room }};
    }
}

module.exports = Mission_Power_Attack
