'use strict'

let Task = require('program_task');
const constants = require('constants');

class Task_Fortify extends Task
{
    constructor (...args)
    {
        super(...args);
    }

    start()
    {
        super.start();

        //this.launchChildProcess(`fill_worker_${this.memory.target}`, 'mission_fill_worker', { room: this.memory.r, target: this.creep.id });

        let room = Game.rooms[this.memory.r];
        if (!room)
            return null;

        let basePlan = Room.getBasePlanMemory(this.memory.r);
        if (!basePlan || !basePlan.structures)
            return null;

        let rampartPlan = '';
        if (basePlan.structures[STRUCTURE_RAMPART])
            rampartPlan = rampartPlan.concat(basePlan.structures[STRUCTURE_RAMPART]);
        //console.log('Task_Fortify.start - ' + this.memory.r + ' - ' + JSON.stringify(rampartPlan));

        if (Room.beingNuked(this.memory.r))
        {
            let additionalPositions = [];

            if (room.coreLink)
                additionalPositions.push(room.coreLink.pos);
            if (room.storage && room.storage.my)
                additionalPositions.push(room.storage.pos);
            if (room.terminal && room.terminal.my)
                additionalPositions.push(room.terminal.pos);
            if (room.factory && room.factory.my)
                additionalPositions.push(room.factory.pos);
            if (room.powerSpawn && room.powerSpawn.my)
                additionalPositions.push(room.powerSpawn.pos);
            if (room.nuker && room.nuker.my)
                additionalPositions.push(room.nuker.pos);

            if (room.quickLinkPos)
                additionalPositions.push(room.quickLinkPos);
            if (room.controllerCanPos)
                additionalPositions.push(room.controllerCanPos);
            if (room.quickCanPos1)
                additionalPositions.push(room.quickCanPos1);
            if (room.quickCanPos2)
                additionalPositions.push(room.quickCanPos2);

            additionalPositions = additionalPositions.concat(room.spawns.map(st => st.pos));
            additionalPositions = additionalPositions.concat(room.towers.map(st => st.pos));
            additionalPositions = additionalPositions.concat(room.labs.map(st => st.pos));

            let nukes = room.nukes;
            additionalPositions = additionalPositions.filter(ap => nukes.some(n => n.pos.getRangeTo(ap) <= 2));
            additionalPositions = additionalPositions.map(ap => global.spotToChinese(ap));
            
            for (let ap of additionalPositions)
                rampartPlan = rampartPlan.concat(ap);
        }

        this.memory.rampartPositions = rampartPlan;

        //console.log('Task_Fortify.start - ' + this.memory.r + ' - ' + JSON.stringify(rampartPlan));
    }

    end()
    {
        super.end();

        if (this.creep && this.creep.memory)
            delete this.creep.memory.ept;
    }

    doTask(creep)
    {
        if (this.memory.inDanger && !Room.inDanger(this.memory.r))
            return TASK_RESULT_COMPLETE;
            
        if (this.creep)
            this.creep.memory.ept = this.creep.memory.work;

        if (Array.isArray(this.memory.rampartPositions))
        {
            console.log('Task_Fortify.doTask - ' + this.memory.r + ' - rampartPositions is an array, quitting');
            return TASK_RESULT_COMPLETE;
        }
            

        if (!this.memory.rampartPositions || this.memory.rampartPositions.length <= 0)
            return TASK_RESULT_COMPLETE;

        let creepEnergy = creep.getResourceAmount(RESOURCE_ENERGY);
        if (creepEnergy <= 0)
            return this.getResourceNearest(RESOURCE_ENERGY);
            //return TASK_RESULT_COMPLETE;

        if (this.moveToRoom(this.memory.r, 0))
            return TASK_RESULT_BREAK;

        if (!Room.inDanger(this.memory.r))
        {
            let maxIndex = 0;
            if (Room.beingNuked(this.memory.r))
                maxIndex = 2;

            if (creep.memory.n > maxIndex)
            {
                let nearestBase = Room.getNearestBase(this.memory.r);
                if (nearestBase)
                {
                    let nearestBaseMemory = Room.getBaseMemory(this.memory.r);
                    if (nearestBaseMemory)
                    {
                        if ((nearestBaseMemory.spendable || 0) < 0 - creep.memory[WORK])
                            return TASK_RESULT_COMPLETE;
                    }
                }
            }
        }


        let room = Game.rooms[this.memory.r];

        let madeSite = false;
        let ramparts = [];
        let sites = [];

        for (let rampartPositionCharacter of this.memory.rampartPositions)
        {
            let rampartPosition = global.chineseToSpot(rampartPositionCharacter);
            if (rampartPosition.x < 0 || rampartPosition.x > 49 || rampartPosition.y < 0 || rampartPosition.y > 49)
            {
                console.log('Task_Fortify.doTask - ' + creep.name + ' - ' + creep.pos + ' - rampartPosition out of bounds: ' + rampartPosition.x + ', ' + rampartPosition.y + ', ' + this.memory.r);
                continue;
            }
            let rampartHere = _.find(room.lookForAt(LOOK_STRUCTURES, rampartPosition.x, rampartPosition.y), s => s.my && s.structureType == STRUCTURE_RAMPART);
            if (rampartHere)
            {
                ramparts.push(rampartHere);
            }
            else
            {
                let siteHere = _.find(room.lookForAt(LOOK_CONSTRUCTION_SITES, rampartPosition.x, rampartPosition.y), s => s.my);
                if (siteHere)
                {
                    sites.push(siteHere);
                }
                else
                {
                    let result = room.createConstructionSite(rampartPosition.x, rampartPosition.y, STRUCTURE_RAMPART);
                    if (result == OK)
                        madeSite = true;
                }
            }
        }

        if (madeSite)
            return TASK_RESULT_BREAK;

        if (sites.length > 0)
        {
            let target = _.min(sites, s => creep.wpos.getRangeTo(s.wpos));
            this.launchChildProcess('build_ramparts', 'task_build_ramparts',  { creep: this.creep.name, t: target.id, x: target.pos.x, y: target.pos.y, r: target.pos.roomName }, true);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        if (ramparts.length > 0)
        {
            let target = _.min(ramparts, r => r.hits);
            if (target.hits > target.hitsMax * constants.MIN_RAMPART_PERCENT * 0.5 && Room.beingNuked(this.memory.r))
            {
                let protectionTarget = this.selectRampartNeedingNukeProtection(room, ramparts);
                if (protectionTarget)
                {
                    if (this.repairTarget(protectionTarget, true, false))
                        return TASK_RESULT_CONTINUE_NEXT;
                }
            }
            this.launchChildProcess('fortify_nearby', 'task_fortify_nearby',  { creep: this.creep.name, x: target.pos.x, y: target.pos.y, r: target.pos.roomName, positions: this.memory.rampartPositions }, true);
            return TASK_RESULT_CONTINUE_NEXT;
        }

        console.log('Task_Fortify.doTask - ' + this.memory.r + ' - quitting just because?');
        return TASK_RESULT_COMPLETE;
    }


    selectRampartNeedingNukeProtection(room, ramparts)
    {
        let nukes = room.find(FIND_NUKES);
        let nukedRamparts = [];
        let baseRampartHits = constants.MIN_RAMPART_HITS;

        for (let rampart of ramparts)
        {
            let expectedNukeDamage = 0;
            for (let nuke of nukes)
            {
                let distance = rampart.pos.getRangeTo(nuke.pos);
                if (distance > 2)
                    continue;
                if (distance <= 0)
                    expectedNukeDamage += NUKE_DAMAGE[0];
                else
                    expectedNukeDamage += NUKE_DAMAGE[2];
            }

            if (expectedNukeDamage <= 0)
                continue;

            rampart.expectedNukeDamage = expectedNukeDamage;
            rampart.protectionNeeded = (expectedNukeDamage + baseRampartHits) - rampart.hits;
            if (rampart.hits < rampart.hitsMax && rampart.protectionNeeded > 0)
                nukedRamparts.push(rampart);

            //console.log('Task_Fortify.selectRampartNeedingNukeProtection - ' + this.memory.r + ' - ' + rampart.pos + ' - expectedNukeDamage: ' + expectedNukeDamage + ', hits: ' + rampart.hits + ', protectionNeeded: ' + rampart.protectionNeeded);
        }

        if (nukedRamparts.length <= 0)
            return null;
        
        let rampart = _.min(nukedRamparts, r => r.protectionNeeded);

        console.log('Task_Fortify.selectRampartNeedingNukeProtection - ' + this.memory.r + ' - selected rampart: ' + rampart.pos + ' - expectedNukeDamage: ' + rampart.expectedNukeDamage + ', hits: ' + rampart.hits + ', protectionNeeded: ' + rampart.protectionNeeded);
        return rampart;
    }
}

module.exports = Task_Fortify
