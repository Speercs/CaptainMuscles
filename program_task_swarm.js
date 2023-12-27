'use strict'

let Task = require('program_task');

class Task_Swarm extends Task
{
    constructor (...args)
    {
        super(...args);

        this.cancelIfWounded = 0;

        this.priority = PROCESS_PRIORITY_DEFENSE;
    }

    refresh()
    {
        super.refresh();

        this.flag = Game.flags['swarm'];

        if (this.memory)
        {
            if (this.flag)
                this.memory.r = this.flag.pos.roomName;
            else
                delete this.memory.r;
        }
    }

    doTask(creep)
    {
        if (!this.flag)
            return TASK_RESULT_COMPLETE;

        if (!this.flag || (this.flag.color != COLOR_GREEN && this.flag.color != COLOR_YELLOW))
            return TASK_RESULT_BREAK;
        // let swarmers = Room.getJobSpawnedCreeps(this.memory.r, 'swarm');
        // if (swarmers.length < 20 && creep.ticksToLive > CREEP_LIFE_TIME / 2)
        //     return TASK_RESULT_BREAK;

        this.targetCenter = this.flag;
        if (this.flag.color == COLOR_YELLOW)
            this.targetCenter = creep;

        let primaryTarget = this.selectPrimaryTarget(creep);

        this.canDismantle = creep.memory[WORK];
        this.canAttack = creep.memory[ATTACK];
        this.canRangedAttack = creep.memory[RANGED_ATTACK];
        this.canHeal = creep.memory[HEAL];
        this.canRangedHeal = this.canHeal;
        
        let canMove = true;

        let melee = this.canAttack || this.canDismantle;

        let hitsPercent = creep.hitsPercent;

        // let targetRoomMemory = Room.getMemory(this.memory.r);
        // if (!targetRoomMemory || (targetRoomMemory.controller && targetRoomMemory.controller.sm && targetRoomMemory.controller.sm > Game.time))
        //     return TASK_RESULT_COMPLETE;

        // let inTargetRoom = (creep.room.name == this.memory.r);
        // if (inTargetRoom && creep.room.controller && creep.room.controller.safeMode)
        //     return TASK_RESULT_COMPLETE;

        let rangeToHostile = Infinity;

        // if (primaryTarget && hitsPercent < 1)
        //     return this.flee(creep, primaryTarget);

        if (primaryTarget)
        {
            rangeToHostile = creep.wpos.getRangeTo(primaryTarget.wpos);
            
            if (melee || rangeToHostile > 3)
            {
                let secondaryTarget = this.selectTargetEnRouteToPrimaryTarget(creep, primaryTarget);
                if (secondaryTarget)
                {
                    primaryTarget = secondaryTarget;
                    rangeToHostile = creep.wpos.getRangeTo(primaryTarget.wpos);
                }
            }
            
            Game.map.visual.line(creep.pos, primaryTarget.pos, {color: '#ff00ff', lineStyle: 'dashed'});
            Game.map.visual.circle(primaryTarget.pos, {radius: 1, fill: '#ff00ff', opacity: 1.0});
        }

        this.healSelf(creep, true);
        this.dismantleNearby(creep, primaryTarget);
        this.attackNearby(creep, primaryTarget);
        this.rangedAttackNearby(creep, primaryTarget);
        this.healNearby(creep);
        this.rangedHealNearby(creep);
        this.healSelf(creep, false);

        // if (this.fleeDanger(creep))
        //     return TASK_RESULT_BREAK;
        
        if (primaryTarget)
        {
            creep.room.visual.line(creep.pos, primaryTarget.pos);
            primaryTarget.room.visual.circle(primaryTarget.pos, { radius: .45, fill: "transparent", stroke: '#ffffff', strokeWidth: .15, opacity: 0.5 });
            
            if (primaryTarget.progress)
            {
                if (rangeToHostile > 0)
                {
                    this.gotoTarget(primaryTarget, 0, { ignoreCreeps: false })
                    canMove = false;
                }
            }
            else if (melee)
            {
                if (rangeToHostile > 1)
                {
                    this.gotoTarget(primaryTarget, 1, { ignoreCreeps: false })
                    canMove = false;
                }
                else
                {
                    if (primaryTarget.hits <= 5000)
                    {
                        creep.move(creep.pos.getDirectionTo(primaryTarget.pos))
                        canMove = false;
                    }
                }
            }
            else
            {
                if (rangeToHostile < 3)
                    return this.flee(creep, primaryTarget);

                if (rangeToHostile > 3)
                {
                    this.gotoTarget(primaryTarget, 3, { ignoreCreeps: false });
                    canMove = false;
                }
            }
        }

        // if (creep.memory.mission.flee)
        //     return this.flee(creep, primaryTarget);

        let targetRoomCenter = new RoomPosition(25, 25, this.memory.r);
        Game.map.visual.line(creep.pos, targetRoomCenter, {color: '#ff00ff', lineStyle: 'dashed'});
        Game.map.visual.circle(targetRoomCenter, {radius: 1, fill: '#ff00ff', opacity: 1.0});

        if (canMove && this.gotoRoom(this.memory.r, 0, { ignoreCreeps: false }))
            return TASK_RESULT_BREAK;

        if (!primaryTarget)
        {
            let desiredRange = 1;
            let distanceToFlag = creep.wpos.getRangeTo(this.flag.wpos);

            if (!this.memory.gotClose)
                this.memory.gotClose = (distanceToFlag <= 1);
            
            if (this.memory.gotClose && distanceToFlag > 10)
                this.memory.gotClose = false;

            if (this.memory.gotClose)
                desiredRange = 10;

            this.gotoTarget(this.flag, desiredRange);
            return TASK_RESULT_BREAK;
        }

        // if (!primaryTarget)
        //     return TASK_RESULT_COMPLETE;
        
        return TASK_RESULT_BREAK;
    }

    selectPrimaryTarget(creep)
    {
        let potentialTargets = [];

        let myFlag = Game.flags[creep.name];
        if (myFlag && myFlag.pos.roomName == creep.room.name)
        {
            potentialTargets = myFlag.pos.lookFor(LOOK_CREEPS);
            potentialTargets = potentialTargets.concat(myFlag.pos.lookFor(LOOK_POWER_CREEPS));
            potentialTargets = potentialTargets.concat(myFlag.pos.lookFor(LOOK_STRUCTURES));
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => t.hits);
        }

        let inTargetRoom = (creep.room.name == this.memory.r);

        if (!inTargetRoom)
        {
            let potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: cr => !cr.pos.nearEdge(1) && !cr.isInvader() && cr.killOnSight() && !_.find(cr.body, p => p.type == ATTACK || p.type == RANGED_ATTACK || p.type == HEAL) });
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

            return null;
            
        }

        let accessibleObjectFilter =
        (
            o =>
            {
                if (!o.hits && !o.progress)
                    return false;

                if (o.pos.nearEdge(0))
                    return false;

                if (o.spawning && !o.body)
                    return false;

                if (o.owner && !o.killOnSight())
                    return false;

                if (o.structureType == STRUCTURE_POWER_BANK || o.structureType == STRUCTURE_CONTROLLER || o.structureType == STRUCTURE_WALL)
                    return false;

                if (o.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART))
                    return false;

                //console.log('Mission_Repel.selectPrimaryTarget - ' + creep.name + ' - looking for mapRoom flag');

                let mapRoomFlag = Game.flags['mapRoom_' + creep.room.name];
                if (!mapRoomFlag)
                    return true;

                let mapRoomProcess = kernel.scheduler.getProcessFromId(mapRoomFlag.memory.pid);
                if (!mapRoomProcess)
                    return true;

                return mapRoomProcess.objectIsAccessible(creep, o);
            }
        );

        potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: accessibleObjectFilter })
                   .concat(creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: accessibleObjectFilter }))
                   .concat(creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES, { filter: accessibleObjectFilter }));

        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));


        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: accessibleObjectFilter });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => o.killOnSight() && (st.structureType == STRUCTURE_STORAGE || st.structureType == STRUCTURE_TERMINAL) });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && st.structureType == STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && st.structureType == STRUCTURE_STORAGE });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_SPAWNS, { filter: st => st.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.wpos.getRangeTo(t.wpos));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.structureType == STRUCTURE_INVADER_CORE });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.killOnSight() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_WALL});// && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));

        // potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.hits && st.killOnSight() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES, { filter: st => st.progress && st.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t.pos));
            
        potentialTargets = creep.room.find(FIND_STRUCTURES, { filter: st => st.hits && st.killOnSight() });// && st.structureType != STRUCTURE_CONTAINER && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL && st.structureType != STRUCTURE_ROAD });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));

        potentialTargets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: c => !c.pos.nearEdge(1) && c.killOnSight() });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => this.targetCenter.pos.getRangeTo(t));

        return null;
    }

    // selectBestTargetInRange(creep, range)
    // {
    //     let potentialTargets = [];

    //     let inTargetRoom = (creep.room.name == this.memory.r);

    //     if (!inTargetRoom)
    //         return this.selectNearestDangerousCreepInRange(creep, range);

    //     potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, (pt => !pt.spawning && pt.attackInCombat() && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART)));
    //     if (potentialTargets.length > 0)
    //         return _.min(potentialTargets, pt => pt.hits);

    // potentialTargets = creep.room.find(FIND_HOSTILE_SPAWNS, { filter: st => st.killOnSight() });
    // if (potentialTargets.length > 0)
    //     return _.min(potentialTargets, t => creep.wpos.getRangeTo(t.wpos));
            
    //         potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.structureType == STRUCTURE_INVADER_CORE });
    //     if (potentialTargets.length > 0)
    //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

    //     potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_TOWER });
    //     if (potentialTargets.length > 0)
    //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

    //     potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
    //     if (potentialTargets.length > 0)
    //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

    //     // potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
    //     // if (potentialTargets.length > 0)
    //     //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

    //     potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: c => !c.pos.nearEdge(0) && c.attackInCombat() });
    //     if (potentialTargets.length > 0)
    //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
            
    //     potentialTargets = creep.pos.findInRange(FIND_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_CONTAINER && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
    //     if (potentialTargets.length > 0)
    //         return _.min(potentialTargets, t => creep.pos.getRangeTo(t));

    //     return null;
    // }

    selectBestTargetInRange(creep, range)
    {
        let potentialTargets = [];

        let inTargetRoom = (creep.room.name == this.memory.r);

        if (!inTargetRoom)
        {
            potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: c => !c.spawning && c.attackInCombat()});
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, pt => pt.hits);
        }

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: (pt => !pt.spawning && pt.attackInCombat() && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART)) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: c => !c.spawning && c.attackInCombat()});
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && !st.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, (pt => !pt.spawning && pt.attackInCombat() && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART)));
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && (st.structureType == STRUCTURE_TERMINAL || st.structureType == STRUCTURE_STORAGE) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_SPAWNS, range, { filter: st => st.attackInCombat()});
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);
            
        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.structureType == STRUCTURE_INVADER_CORE });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_STORAGE });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        // potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
            
        potentialTargets = creep.pos.findInRange(FIND_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() });//&& st.structureType != STRUCTURE_CONTAINER && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_POWER_BANK });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }

    selectBestDismantleTargetInRange(creep, range)
    {
        let potentialTargets = [];

        let inTargetRoom = (creep.room.name == this.memory.r);
        if (!inTargetRoom)
            return null;

        let sortFunction = (t => creep.pos.getRangeTo(t));
        if (range <= 1)
            sortFunction = (t => t.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && (st.structureType == STRUCTURE_TERMINAL || st.structureType == STRUCTURE_STORAGE) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, sortFunction);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_SPAWNS, range, { filter: st => st.attackInCombat()});
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, sortFunction);
            
        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.structureType == STRUCTURE_INVADER_CORE });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, sortFunction);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, sortFunction);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, sortFunction);

        // potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, sortFunction);

        potentialTargets = creep.pos.findInRange(FIND_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() });// && st.structureType != STRUCTURE_CONTAINER && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_POWER_BANK });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, sortFunction);

        return null;
    }

    selectBestRangedAttackTargetInRange(creep, range)
    {
        let potentialTargets = [];

        let inTargetRoom = (creep.room.name == this.memory.r);

        if (!inTargetRoom)
        {
            potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: c => !c.spawning && c.attackInCombat()});
            if (potentialTargets.length > 0)
                return _.min(potentialTargets, pt => pt.hits);
        }

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: (pt => !pt.spawning && pt.attackInCombat() &&  !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART)) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: c => !c.spawning && c.attackInCombat()});
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && !st.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, range, (pt => !pt.spawning && pt.attackInCombat() && !pt.pos.lookForFirstAt(LOOK_STRUCTURES, opt => !opt.my && opt.structureType == STRUCTURE_RAMPART)));
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && (st.structureType == STRUCTURE_TERMINAL || st.structureType == STRUCTURE_STORAGE) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_SPAWNS, range, { filter: st => st.attackInCombat()});
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);
            
            potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.structureType == STRUCTURE_INVADER_CORE });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_TOWER });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_RAMPART && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        // potentialTargets = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL });
        // if (potentialTargets.length > 0)
        //     return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
            
        potentialTargets = creep.pos.findInRange(FIND_STRUCTURES, range, { filter: st => st.hits && st.attackInCombat() });// && st.structureType != STRUCTURE_CONTAINER && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_TERMINAL && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_POWER_BANK });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, pt => pt.hits);

        return null;
    }
    
    selectNearestDangerousCreepInRange(creep, range)
    {
        let roomMemory = Room.getMemory(this.memory.r);


        let potentialTargets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: cr => cr.killOnSight() && ((roomMemory && roomMemory.hostiles && roomMemory.hostiles.ic) || !cr.isInvader()) && !cr.pos.nearEdge(0) && _.find(cr.body, p => p.type == ATTACK || p.type == RANGED_ATTACK) });
        if (potentialTargets.length > 0)
            return _.min(potentialTargets, t => creep.pos.getRangeTo(t));
            
        return null;
    }
    

    selectTargetEnRouteToPrimaryTarget(creep, target)
    {
        let pathInfo = PathFinder.search(creep.pos, {pos: target.pos, range: 1}, {maxRooms: 1, plainCost: 1, swampCost: 5, maxOps: 500000, roomCallback: this.makeCostMatrix});
        if (pathInfo.incomplete)
        {
            console.log('Task_Swarm.selectTargetEnRouteToPrimaryTarget - ' + creep.pos + ' -> ' + target.pos + ' - could not find path');
            return null;
        }

        for (let pathPosition of pathInfo.path)
        {
            let potentialTarget = _.find(pathPosition.lookFor(LOOK_STRUCTURES), st =>  st.attackInCombat() && st.hits && st.structureType != STRUCTURE_ROAD && st.structureType != STRUCTURE_TERMINAL && st.structureType != STRUCTURE_STORAGE && st.structureType != STRUCTURE_CONTAINER);
            if (potentialTarget)
                return potentialTarget;
        }

        return null;
    }

    flee(creep, primaryTarget)
    {
        if (!primaryTarget && !creep.pos.nearEdge(5))
            return TASK_RESULT_BREAK;

        let nearestBase = Room.getNearestBase(creep.room.name);
        if (!nearestBase || nearestBase.name == creep.room.name)
        {
            creep.moveTo(primaryTarget, { range: 10, flee: true, ignoreCreeps: false });
            return TASK_RESULT_BREAK;
        }

        this.gotoTarget(nearestBase.controller, 5);
        return TASK_RESULT_BREAK;
    }

    makeCostMatrix(roomName)
    {
        let costMatrix = new PathFinder.CostMatrix;

        let roadCost = 1;
        let demolishableCost = 250;

        let room = Game.rooms[roomName];
        if (!room)
            return costMatrix;

        let structures = room.find(FIND_STRUCTURES);
        if (!structures || structures.length <= 0)
            return costMatrix;

        let maxHits = _.max(structures, s => s.hits).hits;

        structures.forEach(function(struct)
        {
            // Walk on roads
            if (struct.structureType === STRUCTURE_ROAD)
                costMatrix.set(struct.pos.x, struct.pos.y, roadCost);
            else if (!struct.attackInCombat() && struct.blocksMovement())
                costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
            // // Try to go around demolishable buildings
            // else if (struct.isDemolishable())
            //     costMatrix.set(struct.pos.x, struct.pos.y, demolishableCost);
            else if (!struct.my && (struct.structureType == STRUCTURE_RAMPART || struct.structureType == STRUCTURE_WALL))
                costMatrix.set(struct.pos.x, struct.pos.y, Math.max(1, (struct.hits / maxHits) * 250));
            else if (struct.blocksMovement())
                costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
        });

        return costMatrix;
    }

    
    healSelf(creep, checkHealth)
    {
        if (!this.canHeal)
            return false;

        if (checkHealth && creep.hitsMax - creep.hits < creep.healPower / 2)
            return false;

        creep.heal(creep);
        this.canHeal = false;
        this.canRangedHeal = false;
        this.canAttack = false;
        this.canDismantle = false;
        return true;
    }

    dismantleNearby(creep, primaryTarget)
    {
        if (!this.canDismantle)
            return false;

        let target = primaryTarget;
        if (!target || target.my || !target.structureType || creep.pos.getRangeTo(target) > 1)
            target = this.selectBestDismantleTargetInRange(creep, 1);

        if (!target || target.my || !target.structureType || creep.pos.getRangeTo(target) > 1)
            return false;

        target.room.visual.circle(target.pos, { radius: .45, fill: "transparent", stroke: '#ffff00', strokeWidth: .15, opacity: 0.5 });

        creep.dismantle(target);
        this.canDismantle = false;
        this.canAttack = false;
        this.canHeal = false;
        this.canRangedHeal = false;
        return true;
    }
    
    attackNearby(creep, primaryTarget)
    {
        if (!this.canAttack)
            return false;

        let target = primaryTarget;
        if (!target || target.my || creep.pos.getRangeTo(target) > 1)
            target = this.selectBestTargetInRange(creep, 1);

        if (!target || target.my || creep.pos.getRangeTo(target) > 1)
            return false;

        creep.attack(target);
        this.canAttack = false;
        this.canDismantle = false;
        this.canHeal = false;
        this.canRangedHeal = false;
        return true;
    }

    rangedAttackNearby(creep, primaryTarget)
    {
        if (!this.canRangedAttack)
            return false;

        let target = primaryTarget;
        // if (!target || target.my || creep.pos.getRangeTo(target) > 3)
            // target = this.selectBestRangedAttackTargetInRange(creep, 1);

            
        // if (!target || target.my)
            target = this.selectBestRangedAttackTargetInRange(creep, 3);

        if (!target || target.my)
            return false;

        if (target.owner && creep.pos.getRangeTo(target) <= 1)
            creep.rangedMassAttack();
        else
            creep.rangedAttack(target);

        this.canRangedAttack = false;
        this.canRangedHeal = false;
        return true;
    }

    healNearby(creep)
    {
        if (!this.canHeal)
            return false;

        let target;
        let potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, 1, (pt => !pt.spawning && pt.hits < pt.hitsMax && pt.healInCombat()));
        if (potentialTargets.length > 0)
            target = _.min(potentialTargets, pt => pt.hits);

        if (!target)
            return false;

        creep.heal(target);
        this.canAttack = false;
        this.canDismantle = false;
        this.canHeal = false;
        this.canRangedHeal = false;
        return true;
    }

    rangedHealNearby(creep)
    {
        if (!this.canRangedHeal)
            return false;

        let target;
        let potentialTargets = creep.pos.lookForInRange(LOOK_CREEPS, 3, (pt => !pt.spawning && pt.hits < pt.hitsMax && pt.healInCombat()));
        if (potentialTargets.length > 0)
            target = _.min(potentialTargets, pt => pt.hits);

        if (!target)
            return false;

        creep.rangedHeal(target);
        this.canAttack = false;
        this.canDismantle = false;
        this.canHeal = false;
        this.canRangedHeal = false;
        this.canRangedAttack = false;
        return true;
    }

    fleeDanger(creep)
    {
        let totalEnemyDamage = 0;
        let totalEnemyHealing = 0;
        let totalEnemyHealth = 0;

        let alliesNearby = creep.pos.lookForInRange(LOOK_CREEPS, 4, (pt => pt.my && !pt.spawning));
        let totalAllyDamage = _.sum(alliesNearby, pt => (pt.attackPower + pt.rangedAttackPower));
        let totalAllyHealing = _.sum(alliesNearby, pt => pt.healPower);
        let totalAllyHealth = _.sum(alliesNearby, pt => pt.hits / (1 - pt.damageResistance));

        let enemyTowers = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: st => st.attackInCombat() && st.structureType == STRUCTURE_TOWER && st.store.getUsedCapacity(RESOURCE_ENERGY) >= TOWER_ENERGY_COST && (!creep.room.controller || st.isActive()) });
        if (enemyTowers.length > 0)
        {
            for (let tower of enemyTowers)
                totalEnemyDamage += tower.estimatedDamageAtPosition(creep.pos);

            if (totalEnemyDamage > creep.healPower / (1 - creep.damageResistance) && creep.hitsMax - creep.hits >= (creep.memory[TOUGH] / 2) * 100)
                return this.fleeRoom(creep);
        }

        let potentialThreats = creep.pos.lookForInRange(LOOK_CREEPS, 4, (pt => !pt.spawning && pt.attackInCombat() && (pt.healPower || pt.rangedAttackPower || (pt.attackPower && creep.pos.getRangeTo(pt) <= 3))));
        if (potentialThreats.length > 0)
        {
            totalEnemyDamage += _.sum(potentialThreats, pt => (pt.attackPower + pt.rangedAttackPower));
            totalEnemyHealing += _.sum(potentialThreats, pt => pt.healPower);
            totalEnemyHealth += _.sum(potentialThreats, pt => pt.hits / (1 - pt.damageResistance));
        }



        let enemyNetDamage = (totalEnemyDamage - totalAllyHealing);
        let allyNetDamage = (totalAllyDamage - totalEnemyHealing);

        let timeToLive = Infinity;
        if (enemyNetDamage > 0)
            timeToLive = totalAllyHealth / enemyNetDamage;
        let timeToKill = Infinity;
        if (allyNetDamage > 0)
            timeToKill = totalEnemyHealth / allyNetDamage;

        //console.log('Task_Swarm.fleeDanger - ' + creep.name + ' - ' + creep.room.name + ' - evaluating enemy threats - totalEnemyDamage: ' + totalEnemyDamage + ', totalEnemyHealing: ' + totalEnemyHealing + ', totalEnemyHealth: '  + totalEnemyHealth + ' - totalAllyDamage: ' + totalAllyDamage + ', totalAllyHealing: ' + totalAllyHealing + ', totalAllyHealth: '  + totalAllyHealth + ', timeToLive: ' + timeToLive + ', timetoKill: ' + timeToKill);
        if (timeToLive < timeToKill)
        {
            if (creep.room.name == this.memory.r && creep.pos.nearEdge(3))
            {
                return this.fleeRoom(creep);
            }
            else if (potentialThreats.length > 0)
            {
                let nearestThreat = _.min(potentialThreats, c => creep.pos.getRangeTo(c));
                creep.moveTo(nearestThreat, { range: 10, flee: true, ignoreCreeps: false });
                return true;
            }
            else
            {
                return this.fleeRoom(creep);
            }
        }
    }

    fleeRoom(creep)
    {
        let nearestExit = creep.pos.findClosestByRange(FIND_EXIT);
        creep.moveTo(nearestExit);
        return true;
    }
}

module.exports = Task_Swarm
