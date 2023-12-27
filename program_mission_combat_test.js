'use strict'

let Squad = require('squad');
let Mission_Creeps = require('program_mission_creeps');

class Mission_Combat_Test extends Mission_Creeps
{
    constructor (...args)
    {
        super(...args);

        this.frequency = 0;
    }

    refresh()
    {
        super.refresh();

        this.setMemory({ type: 'combat_test' });


        if (!this.memory.squads)
            this.memory.squads = [];

        this.memory.creeps = _.filter(this.memory.creeps, cn => Game.creeps[cn]);

        this.creeps = this.memory.creeps.map(cn => Game.creeps[cn]);

        this.flag = Game.flags['combatTest'];
    }

    creepAdded(creepName)
    {
        if (this.memory.creeps.indexOf(creepName) >= 0)
        {
            console.log('Mission_Combat_Test.creepAdded - attempted to add ' + creepName + ' to mission again');
            return;
        }

        this.memory.creeps.push(creepName);

        let squad = this.findSquadForCreep(creepName);
        squad.creeps.push(creepName);

        //console.log('Mission_Combat_Test.creepAdded - ' + creepName + ' added to squad');

        if (this.memory.creeps.length < 4)
            this.memory.wantSpawn = 1;
        else
            delete this.memory.wantSpawn;
    }

    creepRemoved(creepName, jobMemory)
    {
        {
            let creepIndex = this.memory.creeps.indexOf(creepName);
            if (creepIndex >= 0)
                this.memory.creeps.splice(creepIndex, 1);
        }

        let squad = _.find(this.memory.squads, s => s.creeps.indexOf(creepName) >= 0);
        if (squad)
        {
            let creepIndex = squad.creeps.indexOf(creepName);
            squad.creeps.splice(creepIndex, 1);

            //console.log('Mission_Combat_Test.creepAdded - ' + creepName + ' removed from squad');

            if (squad.creeps.length <= 0)
            {
                let squadIndex = this.memory.squads.indexOf(squad);
                this.memory.squads.splice(squadIndex, 1);

                console.log('Mission_Combat_Test.creepAdded - squad deleted');
            }
        }
    }

    findSquadForCreep(creepName)
    {
        for (let squad of this.memory.squads)
        {
            if (squad.creeps.length < 4)
                return squad;
        }

        let newSquad = { creeps: [] };
        this.memory.squads.push(newSquad);

        return newSquad;
    }

    run()
    {
        super.run();

        if (this.memory.creeps.length < 4 && this.flag)
            this.memory.wantSpawn = 1;
        else
            delete this.memory.wantSpawn;

        if (!this.flag)
            return;

        for (let squadData of this.memory.squads)
        {
            let squad = new Squad(squadData);

            if (!squad.leader)
                continue;

            let primaryTargetPos = this.selectPrimaryTargetPos(squad);
            squad.moveTo(primaryTargetPos, 2);
            this.doSquadActions(squad);
        }
    }

    selectPrimaryTargetPos(squad)
    {
        if (!this.flag.room)
            return this.flag.pos;

        let primaryTarget = this.selectPrimaryTarget(this.flag.room, squad.leader);
        if (!primaryTarget)
            return this.flag.pos;

        return primaryTarget.pos;
    }

    selectPrimaryTarget(room, creep)
    {
        let potentialTargets = [];

        // let myFlag = Game.flags[creep.name];
        // if (myFlag && myFlag.pos.roomName == creep.room.name)
        // {
        //     potentialTargets = myFlag.pos.lookFor(LOOK_CREEPS);
        //     potentialTargets = potentialTargets.concat(myFlag.pos.lookFor(LOOK_POWER_CREEPS));
        //     potentialTargets = potentialTargets.concat(myFlag.pos.lookFor(LOOK_STRUCTURES));
        //     if (potentialTargets.length > 0)
        //         return _.min(potentialTargets, t => t.hits);
        // }

        // let inTargetRoom = (creep.room.name == room.name);
        //
        // if (!inTargetRoom)
        // {
        //     potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: cr => !cr.pos.nearEdge(0) && cr.killOnSight() && _.find(cr.body, p => p.type == ATTACK || p.type == RANGED_ATTACK) });
        //     if (potentialTargets.length > 0)
        //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        //
        //     return null;
        // }

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && (st.structureType == STRUCTURE_STORAGE || st.structureType == STRUCTURE_TERMINAL) });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = room.find(FIND_HOSTILE_SPAWNS, { filter: st => st.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
        //
        // potentialTargets = creep.room.find(FIND_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: c => !c.pos.nearEdge(0) && c.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        return null;
    }

    doSquadActions(squad)
    {
        for (let creep of squad.creeps)
            this.doSquadCreepActions(creep, squad);
    }

    doSquadCreepActions(creep, squad)
    {
        let canDismantle = !!creep.memory[WORK];
        let canMelee = !!creep.memory[ATTACK];
        let canRanged = !!creep.memory[RANGED_ATTACK];
        let canHeal = !!creep.memory[HEAL];
        let canHealMelee = canHeal;
        let canHealRanged = canHeal;

        if (canDismantle)
        {
            let target = this.selectDismantleTarget(creep);
            if (target)
            {
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                creep.dismantle(target);
            }
        }

        if (canMelee)
        {
            let target = this.selectMeleeTarget(creep);
            if (target)
            {
                canDismantle = false;
                canMelee = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
                creep.attack(target);
            }
        }

        if (canHealMelee)
        {
            let target = this.selectHealMeleeTarget(creep);
            if (target)
            {
                canDismantle = false;
                canMelee = false;
                canHealMelee = false;
                creep.heal(target);
            }
        }

        if (canRanged)
        {
            let target = this.selectRangedTarget(creep);
            if (target)
            {
                canRanged = false;
                canHealRanged = false;

                if (creep.pos.getRangeTo(target <= 1))
                    creep.rangedMassAttack();
                else
                    creep.rangedAttack(target);
            }
        }

        if (canHealRanged)
        {
            let target = this.selectHealRangedTarget(creep);
            if (target)
            {
                canRanged = false;
                canHeal = false;
                canHealMelee = false;
                canHealRanged = false;
                creep.rangedHeal(target);
            }
        }
    }

    selectDismantleTarget(creep)
    {
        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let filter = (pt => pt.hits && pt.attackInCombat() && (isEnemyBase|| (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));
        let potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 1, filter);

        return _.min(potentialTargets, pt => pt.hits);
    }

    selectMeleeTarget(creep)
    {
        let creepFilter = (pt => pt.attackInCombat());
        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, 1, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, 1, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let structureFilter = (pt => pt.hits && pt.attackInCombat() && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

        potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 1, structureFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }

    selectRangedTarget(creep)
    {
        let range = 3;

        let creepFilter = (pt => pt.attackInCombat());
        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        let isEnemyBase = (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my);
        let structureFilter = (pt => pt.hits && pt.attackInCombat() && (isEnemyBase || (pt.structureType != STRUCTURE_WALL && pt.structureType != STRUCTURE_ROAD && pt.structureType != STRUCTURE_CONTAINER)));

        potentialTargets = creep.pos.lookForInRange(LOOK_STRUCTURES, 3, structureFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }

    selectHealMeleeTarget(creep)
    {
        let range = 1;

        let creepFilter = (pt => pt.healInCombat());
        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);


        return null;
    }

    selectHealRangedTarget(creep)
    {
        let range = 3;

        let creepFilter = (pt => pt.healInCombat());
        let potentialTargets = creep.pos.lookForInRange(LOOK_POWER_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, creepFilter);
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);


        return null;
    }
}

module.exports = Mission_Combat_Test
