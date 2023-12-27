'use strict'

const constants = require('constants');

const util_mincut = require('util_mincut');
const util_transforms = require('util_transforms');

global.STRUCTURE_PRIORITY =
{
    1: [STRUCTURE_SPAWN],
    2: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
    3: [STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
    4: [STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_STORAGE, STRUCTURE_WALL, STRUCTURE_RAMPART],
    5: [STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_STORAGE, STRUCTURE_LINK,
        STRUCTURE_WALL, STRUCTURE_RAMPART],
    6: [STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_TERMINAL,STRUCTURE_EXTENSION, STRUCTURE_STORAGE, STRUCTURE_LINK, 
        STRUCTURE_CONTAINER, STRUCTURE_EXTRACTOR, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_LAB],
    7: [STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_TERMINAL,STRUCTURE_EXTENSION, STRUCTURE_STORAGE, STRUCTURE_LINK, //STRUCTURE_FACTORY,
        STRUCTURE_CONTAINER, STRUCTURE_EXTRACTOR, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_LAB],
    8: [STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_TERMINAL,STRUCTURE_EXTENSION, STRUCTURE_STORAGE, STRUCTURE_LINK, STRUCTURE_POWER_SPAWN, 
        STRUCTURE_FACTORY, STRUCTURE_NUKER, STRUCTURE_CONTAINER, STRUCTURE_EXTRACTOR,
        STRUCTURE_OBSERVER, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_LAB]
}

class Base_Planner extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Base_Planner.constructor - ' + this.data.room + ' - executing');
    }

    refresh()
    {
        super.refresh();
        
        let planMemory = Room.getBasePlanMemory(this.data.room);
        if (planMemory && !planMemory.structures)
            planMemory.structures = {};

        this.memory = planMemory;
        this.room = Game.rooms[this.data.room];

        this.memory.room = this.data.room;

        this.roomMemory = Room.getMemory(this.data.room);
        this.baseMemory = Room.getBaseMemory(this.data.room);
    }

    run()
    {
        if (!this.room || !this.room.isMyBase())
        {
            console.log('Base_Planner.run - ' + this.data.room + ' - is no longer a base. Ending process.');
            return this.suicide();
        }

        if (Game.flags.draw && Game.flags.draw.pos.roomName == this.data.room)
            this.drawPlan();

        if (Room.shouldAbandon(this.data.room) || Room.isUnclaiming(this.data.room))
            return;

        if (this.memory.planComplete && this.baseMemory.replan && !this.roomMemory.hostiles && (!this.room.terminal || !this.room.terminal.my || _.sum(Room.getStoredResourceAmounts(this.data.room)) < 1000))
        {
            console.log('Base_Planner.run - ' + this.data.room + ' - ready to replan');
            delete this.memory.planComplete;
        }

        while (!this.memory.planComplete && Game.cpu.bucket > 1000 && Game.cpu.getUsed() < Game.cpu.tickLimit * .8)
        {
            let myBases = Room.getMyBases();
            let planningBases = _.filter(myBases, b => Room.getBasePlanMemory(b.name) && !Room.getBasePlanMemory(b.name).planComplete);
            if (planningBases.length > 0 && planningBases[0].name == this.data.room)
            {
                //console.log('Base_Planner.run - ' + this.data.room + ' - planning');
                this.plan();
            }

        }
        //while (!this.memory.planComplete && Game.cpu.getUsed() < global.MAX_CPU_USAGE)
        //if (Game.cpu.bucket > 5000 && Game.cpu.getUsed() < Game.cpu.tickLimit / 2)


        if (this.memory.planComplete)
        {
            this.followPlan();
            //this.sleep(10);
        }

        // if (this.memory.planComplete && !this.memory.insides)
        //     this.calculateInsides();

        // if (this.memory.insides)
        //     this.drawInsides();

        //console.log('Base_Planner.run - ' + this.data.room + ' - executing');
    }

    calculateInsides()
    {
        let ramparts = Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_RAMPART);

        let insideTransform = util_transforms.insideBaseTransform(this.data.room, ramparts);

        util_transforms.drawTransform(insideTransform, this.data.room, 1, true);

        this.memory.insides = "";

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (insideTransform[i][j] == 1)
                    this.memory.insides = this.memory.insides.concat('1');
                else
                    this.memory.insides = this.memory.insides.concat('0');
            }
        }
    }

    drawInsides()
    {
        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                let index = (i * 50) + j;

                this.room.visual.text(this.memory.insides[index], i, j + .2, {opacity: 0.5});
            }
        }


    }

    followPlan()
    {
        let checkFrequency = 100;
        let checkPlan = false;
        let controllerLevel = this.room.controller.level;
        if (!this.memory.controllerLevel || this.memory.controllerLevel != controllerLevel)
            checkPlan = true;

        let structureCount = this.room.find(FIND_STRUCTURES).length;
        if (!this.memory.structureCount || this.memory.structureCount != structureCount)
            checkPlan = true;

        this.memory.structureCount = structureCount;
        this.memory.controllerLevel = controllerLevel;

        if (!checkPlan && this.memory.checkTime && Game.time - this.memory.checkTime < checkFrequency)
            return;

        this.memory.checkTime = Game.time;

        if (_.filter(this.room.find(FIND_MY_CONSTRUCTION_SITES), site => site.structureType != STRUCTURE_ROAD && site.structureType != STRUCTURE_WALL && site.structureType != STRUCTURE_RAMPART).length > 0)
            return false;

        if (!this.followPlanTowers())
            return false;

        if (!this.followPlanSpawns())
            return false;

        if (!this.followPlanPrimaryContainers())
            return false;

        if (!this.followPlanLinks())
            return false;

        // if (!this.followPlanStructureList(STRUCTURE_EXTENSION, Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_EXTENSION)))
        //     return false;

        // if (!this.followPlanStructureList(STRUCTURE_STORAGE, Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_STORAGE)))
        //     return false;

        if (!this.followPlanSecondaryContainers())
            return false;

        for (let structureType of global.STRUCTURE_PRIORITY[controllerLevel])
        {
            if (structureType == STRUCTURE_EXTENSION)
            {
                // If are within 5 of the desired amount of extensions, save the rest for the end so we can get special structures
                //   that replace extensions built
                if (controllerLevel >= 6 && this.room.extensions.length >= CONTROLLER_STRUCTURES[structureType][controllerLevel - 1])
                    continue;
            }
            // Roads are made by pavers
            if (structureType == STRUCTURE_ROAD)
                continue;

            // Containers have special logic
            // TODO: what about mineral can?
            if (structureType == STRUCTURE_CONTAINER)
                continue;

            // Walls not yet implemented
            if (structureType == STRUCTURE_WALL)
                continue;

            // Spawns, Towers handled earlier by special logic
            if (structureType == STRUCTURE_SPAWN || structureType == STRUCTURE_TOWER)
                continue;

            // Labs handled later by special logic
            if (structureType == STRUCTURE_LAB)
                continue;

            if (structureType == STRUCTURE_FACTORY && !constants.USE_FACTORY)
                continue;

            if (structureType == STRUCTURE_POWER_SPAWN && !constants.USE_POWER)
                continue;

            if (structureType == STRUCTURE_RAMPART && Room.getStoredResourceAmount(this.data.room, RESOURCE_ENERGY) < 10000)
                continue;

            if (structureType == STRUCTURE_NUKER && (Room.getResourceAmountLevel(this.data.room, RESOURCE_ENERGY) < constants.RESOURCE_LEVEL_NORMAL || Room.getResourceAmountLevel(this.data.room, RESOURCE_GHODIUM) < constants.RESOURCE_LEVEL_NORMAL))
                continue;

            if (structureType == STRUCTURE_EXTRACTOR && !this.followPlanExtractor())
                return false;

            let structureList = Room.getBasePlanMemoryStructuresSpots(this.data.room, structureType);

            if (!this.followPlanStructureList(structureType, structureList))
                return false;
        }

        if (!this.followPlanStructureList(STRUCTURE_EXTENSION, Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_EXTENSION)))
            return false;

        if (!this.followPlanExtraExtensions())
            return false;

        let buildLabs = (Room.getMyBases().some(b => b.controller.level >= 6) && _.sum(constants.RESOURCES_MINERAL, r => this.baseMemory.accounting.resources[r] || 0) > this.baseMemory.accounting.resources[_.max(constants.RESOURCES_MINERAL, r => this.baseMemory.accounting.resources[r] || 0)] || 0);
        if (buildLabs)
        {
            if (!this.followPlanLabs())
                return false;

            if (!this.followPlanStructureList(STRUCTURE_LAB, Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_LAB)))
                return false;
        }

        // if (this.room.controller.level >= 4)
        // {
        //     if (!this.followPlanStructureList(STRUCTURE_ROAD, this.memory.structures[STRUCTURE_ROAD]))
        //         return false;
        // }
    }

    followPlanStructureList(structureType, structureList)
    {
        if (structureType == STRUCTURE_RAMPART)
        {
            let towers = this.room.towers.filter(t => t.my);
            let doFortify = (towers.length > 0 && (!this.room.controller.safeMode || this.room.controller.safeModeCooldown || this.room.controller.safeMode < 1000 || Room.getMyBases().length > 1));
    
            if (!doFortify)
                return true;
        }

        let controllerLevel = this.room.controller.level;

        let existingCount = _.filter(this.room.find(FIND_STRUCTURES), object => object.structureType == structureType).length;
        if (existingCount >= CONTROLLER_STRUCTURES[structureType][controllerLevel])
            return true;

        for (let planSpotIndex in structureList)
        {
            let planSpot = structureList[planSpotIndex];
            let result = this.followPlanStructure(structureType, planSpot);
            if (!result)
                return false;
        }
        return true;
    }

    followPlanSpawns()
    {
        let result = this.followPlanStructureList(STRUCTURE_SPAWN, Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_SPAWN));
        if (!result)
            return false;
        return true;
    }

    followPlanPrimaryContainers()
    {
        if (!this.room.quickCan1)
        {
            return this.followPlanStructure(STRUCTURE_CONTAINER, this.room.quickCanPos1);
        }

        if (!this.room.controllerCan && !this.room.controllerLink && this.room.controller.level < 5)
        {
            return this.followPlanStructure(STRUCTURE_CONTAINER, this.room.controllerCanPos);
        }

        if (!this.room.quickCan2 && this.room.controller.level >= 2 && this.room.structures[STRUCTURE_EXTENSION] && this.room.structures[STRUCTURE_EXTENSION].length >= 5)
        {
            return this.followPlanStructure(STRUCTURE_CONTAINER, this.room.quickCanPos2);
        }

        return true;
    }

    followPlanSecondaryContainers()
    {
        if (!this.room.controllerCan && !this.room.controllerLink)
        {
            return this.followPlanStructure(STRUCTURE_CONTAINER, this.room.controllerCanPos);
        }

        if (this.room.controller.level >= 6)
        {
            if (this.room.thorium && this.room.thorium.mineralAmount)
            {
                if (!this.room.thorium.containerPos)
                    console.log('Base_Planner.followPlanSecondaryContainers - ' + this.data.room + ' has no thorium container pos');
                else if (!this.room.thorium.container)
                    return this.followPlanStructure(STRUCTURE_CONTAINER, this.room.thorium.containerPos);
            }

            if (!this.room.mineral.containerPos)
                console.log('Base_Planner.followPlanSecondaryContainers - ' + this.data.room + ' has no mineral container pos');
            else if (!this.room.mineral.container)
                return this.followPlanStructure(STRUCTURE_CONTAINER, this.room.mineral.containerPos);
        }

        return true;
    }

    followPlanExtractor()
    {
        if (this.room.controller.level >= 6)
        {
            if (this.room.thorium)
            {
                if (!this.room.thorium.mineralAmount && this.room.thorium.extractor)
                {
                    this.room.thorium.extractor.destroy();
                    return false;
                }

                if (this.room.thorium.mineralAmount && !this.room.thorium.extractor)
                {
                    return this.followPlanStructure(STRUCTURE_EXTRACTOR, this.room.thorium.pos);
                }
            }

            if (this.room.mineral)
            {
                if (this.room.thorium && this.room.thorium.mineralAmount)
                {
                    if (this.room.mineral.extractor)
                    {
                        this.room.mineral.extractor.destroy();
                        return false;
                    }
                        
                    return true;
                }

                if (!this.room.thorium && !this.room.mineral.extractor && this.room.extractor)
                {
                    this.room.extractor.destroy();
                    return false;
                }

                if (this.room.mineral.mineralAmount && !this.room.mineral.extractor)
                {
                    return this.followPlanStructure(STRUCTURE_EXTRACTOR, this.room.mineral.pos);
                }
            }
        }

        return true;
    }

    followPlanTowers()
    {
        if (this.room.controller.level > 2 && this.room.controller.level < 5 && this.room.quickLinkPos)
        {
            let planSpot = this.room.quickLinkPos;
            let result = this.followPlanStructure(STRUCTURE_TOWER, planSpot);
            if (!result)
                return false;
        }
        else
        {
            let result = this.followPlanStructureList(STRUCTURE_TOWER, Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_TOWER));
            if (!result)
                return false;
        }

        return true;
    }

    followPlanLinks()
    {
        if (this.room.controller.level >= 5)
        {
            let existingStructures = (this.room.structures[STRUCTURE_LINK] || []);
            if (CONTROLLER_STRUCTURES[STRUCTURE_LINK][this.room.controller.level] <= existingStructures.length)
                return true;

            let planSpot = this.room.coreLinkPos;
            let result = this.followPlanStructure(STRUCTURE_LINK, planSpot);
            if (!result)
                return false;

            // planSpot = this.room.controllerCanPos;
            // result = this.followPlanStructure(STRUCTURE_LINK, planSpot);
            // if (!result)
            //     return false;
            
            // planSpot = this.room.quickLinkPos;
            // result = this.followPlanStructure(STRUCTURE_LINK, planSpot);
            // if (!result)
            //     return false;

            let linkList = Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_LINK);
            let linkPoses = linkList.map(sp => new RoomPosition(sp.x, sp.y, this.data.room));
            linkPoses = _.sortByOrder(linkPoses, p => planSpot.getRangeTo(p), 'desc');

            let controllerFillPos = this.room.controllerCanPos;
            let controllerLinkPos = _.min(linkPoses, lp => lp.getRangeTo(controllerFillPos));
            let indexOfControllerLinkPos = linkPoses.findIndex(p => p.x == controllerLinkPos.x && p.y == controllerLinkPos.y);
            let removedPos = linkPoses.splice(indexOfControllerLinkPos, 1);
            linkPoses = linkPoses.concat(removedPos);

            let towerFillPos = this.room.towerFillPos;
            let towerLinkPos = _.min(linkPoses, lp => lp.getRangeTo(towerFillPos));
            let indexOfTowerLinkPos = linkPoses.findIndex(p => p.x == towerLinkPos.x && p.y == towerLinkPos.y);
            removedPos = linkPoses.splice(indexOfTowerLinkPos, 1);
            linkPoses = linkPoses.concat(removedPos);

            if (!this.followPlanStructureList(STRUCTURE_LINK, linkPoses))
                return false;
        }

        return true;
    }

    followPlanExtraExtensions()
    {
        if (this.room.controller.level >= 5)
        {
            let extensions = this.room.structures[STRUCTURE_EXTENSION];
            if (!extensions || extensions.length < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.room.controller.level])
            {
                for (let source of this.room.sources)
                {
                    let containerPos = source.containerPos;
                    if (!containerPos)
                        continue;

                    let nearbySpots = containerPos.getOpenSpots();

                    for (let spot of nearbySpots)
                    {
                        let existingStructures = this.room.lookForAt(LOOK_STRUCTURES, spot.x, spot.y);
                        if (existingStructures.length <= 0)
                        {
                            let result = this.followPlanStructure(STRUCTURE_EXTENSION, spot);
                            if (!result)
                                return false;
                        }
                    }
                }
            }
        }

        return true;
    }

    followPlanLabs()
    {
        if (this.room.controller.level >= 6)
        {
            let labs = (this.room.structures[STRUCTURE_LAB] || []);
            if (labs.length > 0 && CONTROLLER_STRUCTURES[STRUCTURE_LAB][this.room.controller.level] > labs.length)
            {
                let labDistances = {};

                let planPositions = Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_LAB).map(s => new RoomPosition(s.x, s.y, this.room.name));

                for (let posIndex in planPositions)
                {
                    labDistances[posIndex] = 0;
                    let spotPos = planPositions[posIndex];

                    for (let lab of labs)
                        labDistances[posIndex] += spotPos.getRangeTo(lab);
                }

                planPositions = _.sortBy(planPositions, p => labDistances[planPositions.indexOf(p)]);

                for (let spotPos of planPositions)
                {
                    let result = this.followPlanStructure(STRUCTURE_LAB, spotPos);
                    if (!result)
                        return false;
                }
            }
        }

        return true;
    }

    followPlanStructure(structureType, spot)
    {
        let structuresAtSpot = this.room.lookForAt(LOOK_STRUCTURES, spot.x, spot.y);

        let plannedObject = _.find(structuresAtSpot, object => object.structureType == structureType);
        if (!plannedObject)
        {
            if (structureType == STRUCTURE_ROAD || structureType == STRUCTURE_RAMPART)
            {
                let result = this.room.createConstructionSite(spot.x, spot.y, structureType);
                console.log('Base_Planner.followPlanStructure - ' + this.room.name + ' planning ' + structureType + ' at ' + spot.x + ', ' + spot.y + ' - ' + result );
                return (result != OK)
            }
            
            let unplannedObject = _.find(structuresAtSpot, object => object.structureType != STRUCTURE_ROAD && object.structureType != STRUCTURE_RAMPART);
            if (unplannedObject && structureType == STRUCTURE_EXTENSION)
            {
                return true;
            }
            else if (unplannedObject)
            {
                console.log('Base_Planner.followPlanStructure - ' + this.room.name + ' destroying ' + unplannedObject.structureType + ' to build a ' + structureType + ' at ' + spot.x + ', ' + spot.y );
                unplannedObject.destroy();
                return false;
            }
            else
            {
                let result = this.room.createConstructionSite(spot.x, spot.y, structureType);
                console.log('Base_Planner.followPlanStructure - ' + this.room.name + ' planning ' + structureType + ' at ' + spot.x + ', ' + spot.y + ' - ' + result );
                return (result != OK)
            }
        }
        else
        {
            return true;
        }
    }

    drawPlan()
    {
        for (let structureType in this.memory.structures)
        {
            let structureList = Room.getBasePlanMemoryStructuresSpots(this.data.room, structureType);
            //let maxCount = Math.min(structureList.length, CONTROLLER_STRUCTURES[structureType][this.room.controller.level]);
            for (let planSpot of structureList)
                this.room.visual.structure(planSpot.x, planSpot.y, structureType, { opacity: 0.25 });
        }
    }

    plan()
    {
        if (Memory.empire.construction && Memory.empire.construction.version)
            this.memory.version = Memory.empire.construction.version;

        if (!this.memory.planStep)
            this.memory.planStep = 0;

        let planSteps = [];

        this.memory.planSpawnFirst = 1;

        // let spawnCount = this.room.find(FIND_MY_SPAWNS).length;
        // if (spawnCount > 0)
        //     this.memory.planSpawnFirst = 1;
        // else
        //     delete this.memory.planSpawnFirst;

        // if (!this.memory.planSpawnFirst)
        // {
        //     planSteps = [() => this.planPrep(),
        //                  () => this.planStructurePrep(),
        //                  () => this.planControllerCan(),
        //                  () => this.planMinCut(),
        //                  () => this.planCoreStructures(),
        //                  () => this.planMinCut(),
        //                  () => this.planQuickFillStructures(),
        //                  () => this.planTempExtensions(),
        //                  () => this.planMinCut(),
        //                  () => this.planLabs(),
        //                  () => this.planBaseRoads(),
        //                  () => this.planMinCut(),
        //                  () => this.planRemainingStructures(),
        //                  () => this.planMinCutForTowers(),
        //                  () => this.planTowers(),
        //                  () => this.planMinCutForTowers(),
        //                  () => this.planRamparts(),
        //
        //                  () => this.planStructurePrep(),
        //                  () => this.planControllerCan(),
        //                  () => this.planMinCut(),
        //                  () => this.planCoreStructures(),
        //                  () => this.planMinCut(),
        //                  () => this.planTowers(),
        //                  () => this.planMinCut(),
        //                  () => this.planQuickFillStructures(),
        //                  () => this.planTempExtensions(),
        //                  () => this.planMinCut(),
        //                  () => this.planLabs(),
        //                  () => this.planBaseRoads(),
        //                  () => this.planMinCut(),
        //                  () => this.planRemainingStructures(),
        //                  () => this.planMinCutForTowers(),
        //                  () => this.planRamparts(),
        //
        //                  () => this.planStructurePrep(),
        //                  () => this.planControllerCan(),
        //                  () => this.planMinCut(),
        //                  () => this.planCoreStructures(),
        //                  () => this.planMinCut(),
        //                  () => this.planTowers(),
        //                  () => this.planMinCut(),
        //                  () => this.planQuickFillStructures(),
        //                  () => this.planTempExtensions(),
        //                  () => this.planMinCut(),
        //                  () => this.planLabs(),
        //                  () => this.planBaseRoads(),
        //                  () => this.planMinCut(),
        //                  () => this.planRemainingStructures(),
        //                  () => this.planMinCutForTowers(),
        //                  () => this.planRamparts(),
        //
        //                  () => this.planCleanup()]
        // }
        // else
        {
            planSteps = [() => this.planPrep(),
                         () => this.planStructurePrep(),
                         () => this.planControllerCan(),
                         () => this.planMinCut(),
                         () => this.planQuickFillStructures(),
                         () => this.planMinCut(),
                         () => this.planCoreStructures(),
                         () => this.planMinCut(),
                         () => this.planTempExtensions(),
                         () => this.planLabs(),
                         () => this.planBaseRoads(),
                         () => this.planMinCut(),
                         () => this.planRemainingStructures(),
                         () => this.planMinCutForTowers(),
                         //() => this.planTowers(),
                         //() => this.planMinCutForTowers(),
                         () => this.planRamparts(),
                         //() => this.planBaseRoads(),

                         () => this.planStructurePrep(),
                         () => this.planControllerCan(),
                         () => this.planMinCut(),
                         () => this.planQuickFillStructures(),
                         () => this.planMinCut(),
                         () => this.planCoreStructures(),
                         () => this.planMinCut(),
                         () => this.planTowers(),
                         () => this.planMinCut(),
                         () => this.planTempExtensions(),
                         () => this.planLabs(),
                         () => this.planBaseRoads(),
                         () => this.planMinCut(),
                         () => this.planRemainingStructures(),
                         () => this.planMinCutForTowers(),
                         () => this.planRamparts(),
                         //() => this.planBaseRoads(),

                         () => this.planStructurePrep(),
                         () => this.planControllerCan(),
                         () => this.planMinCut(),
                         () => this.planQuickFillStructures(),
                         () => this.planMinCut(),
                         () => this.planCoreStructures(),
                         () => this.planMinCut(),
                         () => this.planTowers(),
                         () => this.planMinCut(),
                         () => this.planTempExtensions(),
                         () => this.planLabs(),
                         () => this.planBaseRoads(),
                         () => this.planMinCut(),
                         () => this.planRemainingStructures(),
                         () => this.planMinCutForTowers(),
                         () => this.planRamparts(),
                         //() => this.planBaseRoads(),

                         () => this.planCleanup()]
        }

        if (this.memory.planStep < planSteps.length)
        {
            //console.log('Base_Planner.plan - executing step ' + this.memory.planStep);
            let result = planSteps[this.memory.planStep]();
            if (result)
                this.memory.planStep += 1;
        }
        else
        {
            if (this.baseMemory && this.baseMemory.replan)
                delete this.baseMemory.replan;
            this.memory.planComplete = 1;
            delete this.memory.planStep;
        }
    }

    planPrep()
    {
        console.log('Base_Planner.plan - ' + this.room.name + ' planning *********************');
        this.memory.temp = {};

        delete this.memory.insides;

        this.distanceFromControllerTransform();
        this.distanceFromControllerThroughWallsTransform();
        this.distanceFromExitTransform();
        this.distanceFromWallTransform();
        this.verticalGapTransform();
        this.horizontalGapTransform();

        return true;
    }

    planStructurePrep()
    {
        this.memory.structures = {};

        delete this.memory.temp.nextCellsToVisit;
        delete this.memory.temp.visitedCells;
        delete this.memory.temp.placeableCells;
        delete this.memory.temp.newRoadCells;
        delete this.memory.temp.sinkTiles;
        this.memory.temp.protectSpots = [];

        delete this.memory.temp.transforms.distanceFromCore;
        delete this.memory.temp.transforms.distanceFromQuickfill;
        delete this.memory.temp.transforms.distanceFromBaseStructure;

        // 13 extensions in quick fill
        //this.memory.temp.stuffToPlace = [[STRUCTURE_STORAGE, 1], [STRUCTURE_LINK, 1], [STRUCTURE_TOWER, 6], [STRUCTURE_NUKER, 1], [STRUCTURE_SPAWN, 3], [STRUCTURE_POWER_SPAWN, 1], [STRUCTURE_FACTORY, 1], [STRUCTURE_EXTENSION, 60], [STRUCTURE_OBSERVER, 1]];
        //this.memory.temp.stuffToPlace = [[STRUCTURE_TOWER, 6], [STRUCTURE_SPAWN, 1], [STRUCTURE_EXTENSION, 47], [STRUCTURE_OBSERVER, 1]];
        this.memory.temp.stuffToPlace = [[STRUCTURE_EXTENSION, 45], [STRUCTURE_OBSERVER, 1]];

        return true;
    }

    planControllerCan()
    {
        global.roadCostMatrix = new PathFinder.CostMatrix;

        this.memory.structures = {};

        let controller = this.room.controller;

        let controllerPositionsAt2 = _.filter(controller.pos.getOpenPositionsAtRange(2), pos => this.memory.temp.transforms.distanceFromExit[pos.x][pos.y] >= 4);
        controllerPositionsAt2 = _.sortByOrder(controllerPositionsAt2, [pos => pos.getOpenSpotCount(), pos => this.memory.temp.transforms.distanceFromExit[pos.x][pos.y]], ['desc', 'desc']);
        let linkPos = controllerPositionsAt2[0];
        this.room.controllerCanPos = linkPos;
        this.memory.cx = linkPos.x;
        this.memory.cy = linkPos.y;
        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);

        this.memory.temp.offsetCore = 1;
        this.initializeRoadCostMatrix(centralPos);

        this.planStructure(linkPos, STRUCTURE_LINK, true);

        let posAroundCentral = centralPos.getOpenSpots();
        for (let nextToCenter of posAroundCentral)
            this.planStructure(nextToCenter, STRUCTURE_ROAD, true);

        this.distanceFromControllerCanTransform();

        this.distanceFromBaseStructureAverageTransform();

        this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();

        return true;
    }

    planCoreStructures()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);

        let centralPos = this.room.controllerCanPos;

        let coreStamp =
        [
            [ -1            , STRUCTURE_ROAD   , STRUCTURE_ROAD       , -1                , -1            ],
            [ STRUCTURE_ROAD, STRUCTURE_STORAGE, STRUCTURE_EXTENSION  , STRUCTURE_ROAD    , -1            ],
            [ STRUCTURE_ROAD, STRUCTURE_LINK   , STRUCTURE_ROAD       , STRUCTURE_NUKER   , STRUCTURE_ROAD],
            [ STRUCTURE_ROAD, STRUCTURE_FACTORY, STRUCTURE_POWER_SPAWN, STRUCTURE_TERMINAL, STRUCTURE_ROAD],
            [ -1            , STRUCTURE_ROAD   , STRUCTURE_ROAD       , STRUCTURE_ROAD    , -1            ]
        ];

        let controller = this.room.controller;

        let coreStampSpot = this.findBestPlaceForStamp(coreStamp, this.memory.temp.transforms.distanceFromControllerCan, this.memory.temp.transforms.distanceFromExit, centralPos, false);
        if (!coreStampSpot)
            coreStampSpot = this.findBestPlaceForStamp(coreStamp, this.memory.temp.transforms.distanceFromControllerCan, this.memory.temp.transforms.distanceFromExit, centralPos, true);
        this.planStamp(coreStampSpot, coreStamp, coreStampSpot.offset, true);

        let ex = coreStampSpot.x + (2 * coreStampSpot.offset.dx) + coreStampSpot.offset.x;
        let wy = coreStampSpot.y + (2 * coreStampSpot.offset.dy) + coreStampSpot.offset.y;

        this.room.coreLinkPos = { x: ex - coreStampSpot.offset.dx, y: wy };

        let corePos = new RoomPosition(ex, wy, this.room.name);
        this.room.stockerPos = corePos;

        this.planRoad(centralPos, corePos, 1, true);

        this.distanceFromCoreTransform();
        this.finalFormTransform();
        this.distanceFromBaseStructureAverageTransform();

        this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();



        return true;
    }

    bestTerminalPosFromCorePos(pos)
    {
        let controller = this.room.controller;
        return _.first(_.sortByOrder(_.filter(pos.getOpenSpots(), neighbour => neighbour.getRangeTo(controller.pos) == 2), [neighbour => neighbour.getOpenSpotCount(), neighbour => this.memory.temp.transforms.distanceFromExit[neighbour.x][neighbour.y]], ['desc', 'desc']));
    }

    terminalPosScore(pos)
    {
        let terminalPos = this.bestTerminalPosFromCorePos(pos);
        if (!terminalPos)
            return 0;
        else
            return terminalPos.getOpenSpotCount();
    }

    planBaseRoads()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);
        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);

        let pathToControllerCan = this.room.coreLinkPos.findPathTo(this.room.controllerCanPos);
        let pathToQuickLink = this.room.coreLinkPos.findPathTo(this.room.quickLinkPos);
        if (pathToControllerCan.length > pathToQuickLink.length)
            this.memory.controllerLinkFirst = 1;

        this.prePlanBaseRoads(centralPos);

        this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();

        return true;
    }

    planLabs()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);
        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);

        let labStamp =
        [
            [ -1            , -1            , STRUCTURE_ROAD, STRUCTURE_ROAD, -1            , -1            ],
            [ -1            , STRUCTURE_ROAD, STRUCTURE_LAB , STRUCTURE_LAB , STRUCTURE_ROAD, -1            ],
            [ STRUCTURE_ROAD, STRUCTURE_LAB , STRUCTURE_ROAD, STRUCTURE_LAB , STRUCTURE_LAB , STRUCTURE_ROAD],
            [ STRUCTURE_ROAD, STRUCTURE_LAB , STRUCTURE_LAB , STRUCTURE_ROAD, STRUCTURE_LAB , STRUCTURE_ROAD],
            [ -1            , STRUCTURE_ROAD, STRUCTURE_LAB , STRUCTURE_LAB , STRUCTURE_ROAD, -1            ],
            [ -1            , -1            , STRUCTURE_ROAD, STRUCTURE_ROAD, -1            , -1            ]
        ];

        let labStampSpot = this.findBestPlaceForStamp(labStamp, this.memory.temp.transforms.distanceFromCore, this.memory.temp.transforms.distanceFromExit, centralPos, false);
        if (!labStampSpot)
            labStampSpot = this.findBestPlaceForStamp(labStamp, this.memory.temp.transforms.distanceFromCore, this.memory.temp.transforms.distanceFromExit, centralPos, true);

        if (labStampSpot)
        {
            this.planStamp(labStampSpot, labStamp, labStampSpot.offset, true);
            let stampPos = new RoomPosition(labStampSpot.x + (1 * labStampSpot.offset.dx) + labStampSpot.offset.x, labStampSpot.y + (1 * labStampSpot.offset.dy) + labStampSpot.offset.y, this.data.room);
            this.planRoad(centralPos, stampPos, 1, true);
        }

        this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();

        this.distanceFromBaseStructureAverageTransform();

        return true;
    }

    planQuickFillStructures()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);
        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);

        let quickFillStamp =
        [   [ -1                 , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , -1              ],
            [ STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_SPAWN    , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_LINK     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , STRUCTURE_SPAWN    , STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_SPAWN    , STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD  ],
            [ -1                 , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_ROAD     , -1              ]
        ];

        let spawns = this.room.find(FIND_MY_SPAWNS);
        let planSpawnFlag = Game.flags['planSpawn'];
        let firstSpawnPos;
        
        if (planSpawnFlag && planSpawnFlag.pos.roomName == this.data.room)
        {
            firstSpawnPos = new RoomPosition(planSpawnFlag.pos.x, planSpawnFlag.pos.y, this.data.room);
            let quickFillStampSpot = planSpawnFlag.pos;
            quickFillStampSpot.x -= 1;
            quickFillStampSpot.y -= 4;
            this.planQuickFillStamp(quickFillStampSpot, { x: 0, y: 0, dx: 1, dy: 1 });
        }
        else if (spawns.length == 1)
        {
            firstSpawnPos = new RoomPosition(spawns[0].pos.x, spawns[0].pos.y, this.data.room);
            let quickFillStampSpot = spawns[0].pos;
            quickFillStampSpot.x -= 1;
            quickFillStampSpot.y -= 4;
            this.planQuickFillStamp(quickFillStampSpot, { x: 0, y: 0, dx: 1, dy: 1 });
        }
        else
        {
            let primaryTransform = this.memory.temp.transforms.distanceFromCore;
            if (!primaryTransform)
                primaryTransform = this.memory.temp.transforms.distanceFromControllerThroughWalls;
            let quickFillStampSpot = this.findBestPlaceForStamp(quickFillStamp, primaryTransform, this.memory.temp.transforms.distanceFromExit, centralPos, false);
            if (!quickFillStampSpot)
                quickFillStampSpot = this.findBestPlaceForStamp(quickFillStamp, primaryTransform, this.memory.temp.transforms.distanceFromExit, centralPos, true);

            this.planQuickFillStamp(quickFillStampSpot, quickFillStampSpot.offset);
            firstSpawnPos = new RoomPosition(quickFillStampSpot.x + (1 * quickFillStampSpot.offset.dx) + quickFillStampSpot.offset.x, quickFillStampSpot.y + (4 * quickFillStampSpot.offset.dy) + quickFillStampSpot.offset.y, this.data.room);
        }

        this.distanceFromPosTransform(firstSpawnPos);

        let quickFillRoadPos = new RoomPosition(this.memory.qfx - 2, this.memory.qfy, this.room.name);
        let corePos = centralPos;
        corePos.x -= 1;
        corePos.y -= 1;
        this.planRoad(corePos, quickFillRoadPos, 1, true);

        this.distanceFromQuickfillTransform();
        this.finalFormTransform();

        this.distanceFromBaseStructureAverageTransform();

        this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();


        return true;
    }

    planTempExtensions()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);
        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);

        this.memory.structures[STRUCTURE_EXTENSION] = this.memory.structures[STRUCTURE_EXTENSION].concat(this.memory.structures[STRUCTURE_NUKER][0]);
        this.memory.structures[STRUCTURE_EXTENSION] = this.memory.structures[STRUCTURE_EXTENSION].concat(this.memory.structures[STRUCTURE_FACTORY][0]);
        this.memory.structures[STRUCTURE_EXTENSION] = this.memory.structures[STRUCTURE_EXTENSION].concat(this.memory.structures[STRUCTURE_POWER_SPAWN][0]);
        this.memory.structures[STRUCTURE_EXTENSION] = this.memory.structures[STRUCTURE_EXTENSION].concat(this.memory.structures[STRUCTURE_TERMINAL][0]);
        this.memory.structures[STRUCTURE_EXTENSION] = this.memory.structures[STRUCTURE_EXTENSION].concat(global.spotToChinese({ x: this.room.coreLinkPos.x, y: this.room.coreLinkPos.y }));

        if (!this.memory.temp.planSpawnFirst)
        {
            let firstExtension = this.memory.structures[STRUCTURE_EXTENSION][0];
            this.memory.structures[STRUCTURE_EXTENSION] = this.memory.structures[STRUCTURE_EXTENSION].slice(1).concat(firstExtension);
        }

        this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();

        return true;
    }


    planMinCut()
    {
        this.memory.temp.sinkTiles = [];

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (this.memory.temp.transforms.distanceFromExit[i][j] < 2)
                    this.memory.temp.sinkTiles.push({x: i, y: j});
            }
        }

        this.doPlanMinCut();
        return true;
    }

    planRemainingStructures()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);
        let useTransform = this.memory.temp.transforms.distanceFromCore;
        if (this.memory.temp.towerIsBaseStructure)
            useTransform = this.memory.temp.transforms.distanceFromTowers;
        while (this.memory.temp.stuffToPlace && Game.cpu.bucket > 500 && Game.cpu.getUsed() < Game.cpu.tickLimit * 0.8)
        {
            var objectType = this.memory.temp.stuffToPlace[0][0];
            let result = this.planSomething(objectType, useTransform);
            this.distanceFromBaseStructureAverageTransform();

            if (result == 'retry')
                continue;
            if (result || (this.memory.temp.nextCellsToVisit && this.memory.temp.nextCellsToVisit.length <= 0 && this.memory.temp.placeableCells.length <= 0 && this.memory.temp.newRoadCells.length <= 0))
            {
                if (!result)
                    console.log('Base_Planner.plan - ' + this.room.name + ' - could not place ' + objectType);

                // else
                //     console.log('Base_Planner.plan - placed ' + objectType + ' at ' + result);

                this.memory.temp.stuffToPlace[0][1] -= 1;
                if (this.memory.temp.stuffToPlace[0][1] <= 0)
                {
                    this.memory.temp.stuffToPlace.shift();
                    if (this.memory.temp.stuffToPlace.length < 1)
                        delete this.memory.temp.stuffToPlace;
                }
            }
            this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();



            return false;
        }

        if (!this.memory.temp.stuffToPlace)
        {
            //this.initProtectSpots();
            delete this.memory.temp.firstCrossCut;
            return true;
        }
    }

    planMinCutForTowers()
    {
        this.doPlanMinCut(true);

        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);
        let stockerPos = new RoomPosition(this.memory.stx, this.memory.sty, this.room.name);
        if (this.canReachExitFrom(stockerPos, this.memory.temp.cut))
            this.memory.temp.cut = [];


        if (this.memory.temp.cut.length <= 0)
        {
            if (this.memory.temp.bestCut)
                this.memory.temp.cut = this.memory.temp.bestCut;

            delete this.memory.temp.bestCutScore;
            delete this.memory.temp.bestCut;
            delete this.memory.temp.sinkTiles;

            this.outsideCutTransform();
            this.distanceFromMedianCutTransform();

            return true;
        }

        let xMin = 50;
        let yMin = 50;
        let xMax = 0;
        let yMax = 0;

        for (let cutSpot of this.memory.temp.cut)
        {
            if (cutSpot.x < xMin)
                xMin = cutSpot.x;
            if (cutSpot.y < yMin)
                yMin = cutSpot.y;
            if (cutSpot.x > xMax)
                xMax = cutSpot.x;
            if (cutSpot.y > yMax)
                yMax = cutSpot.y;
        }

        let medianX = Math.ceil((xMin + xMax) / 2);
        let medianY = Math.ceil((yMin + yMax) / 2);
        let medianPos = new RoomPosition(medianX, medianY, this.room.name);
        if (this.memory.temp.tx)
            medianPos = new RoomPosition(this.memory.temp.tx, this.memory.temp.ty, this.room.name);

        let cutScore = 0;
        for (let cutSpot of this.memory.temp.cut)
        {
            let cutPos = new RoomPosition(cutSpot.x, cutSpot.y, this.room.name);
            cutScore += Math.max(0, medianPos.getRangeTo(cutPos) - 5);

            if (cutSpot.x < xMin)
                xMin = cutSpot.x;
            if (cutSpot.y < yMin)
                yMin = cutSpot.y;
            if (cutSpot.x > xMax)
                xMax = cutSpot.x;
            if (cutSpot.y > yMax)
                yMax = cutSpot.y;
        }

        // cutScore /= this.memory.temp.cut.length;
        // cutScore /= this.memory.temp.cut.length;

        //console.log('Base_Planner.planMinCutForTowers - tower cut iteration - ' + this.memory.temp.cut.length + ' - ' + cutScore);

        //let cutScore = (xMax - xMin) + (yMax - yMin);
        //let cutScore = (xMax - medianX) + (medianX - xMin) + (yMax - medianY) + (medianY - yMin);
        if (this.memory.temp.cut.length > 0 && (!this.memory.temp.bestCutScore || cutScore < this.memory.temp.bestCutScore || (cutScore == this.memory.temp.bestCutScore && this.memory.temp.cut.length < this.memory.temp.bestCut.length)))
        {
            this.memory.temp.bestCutScore = cutScore;
            this.memory.temp.bestCut = this.memory.temp.cut;
        }

        if (!this.memory.temp.sinkTiles)
        {
            this.memory.temp.sinkTiles = [];

            for (var i = 0; i < 50; ++i)
            {
                for (var j = 0; j < 50; ++j)
                {
                    if (this.memory.temp.transforms.distanceFromExit[i][j] < 2)
                        this.memory.temp.sinkTiles.push({x: i, y: j});
                }
            }
        }


        let sortedCut = _.sortBy(this.memory.temp.cut, tile => medianPos.getRangeTo(new RoomPosition(tile.x, tile.y, this.room.name)));
        let newSink = this.memory.temp.cut[this.memory.temp.cut.length - 1];
        //console.log('Base_Planner.planMinCutForTowers - adding ' + newSink.x + ', ' + newSink.y + ' to sink tiles');
        this.memory.temp.sinkTiles.push(newSink);

        // if (xMax - xMin <= 20 && yMax - yMin <= 20)
        //     return true;

        this.distanceFromMedianCutTransform();

        return false;
    }

    planTowers()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);
        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);
        let towerStamp =
        [
            [ -1            , -1             , STRUCTURE_ROAD , STRUCTURE_ROAD , -1             ],
            [ -1            , STRUCTURE_ROAD , STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_ROAD ],
            [ STRUCTURE_ROAD, STRUCTURE_TOWER, STRUCTURE_ROAD , STRUCTURE_TOWER, STRUCTURE_ROAD ],
            [ STRUCTURE_ROAD, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_LINK , STRUCTURE_ROAD ],
            [ -1            , STRUCTURE_ROAD , STRUCTURE_ROAD , STRUCTURE_ROAD , -1             ]
        ];

        //this.initProtectSpots();

        let towerStampSpot = this.findBestPlaceForStamp(towerStamp, this.memory.temp.transforms.distanceFromMedianCut, this.memory.temp.transforms.distanceFromExit, centralPos, false);
        if (!towerStampSpot)
            towerStampSpot = this.findBestPlaceForStamp(towerStamp, this.memory.temp.transforms.distanceFromMedianCut, this.memory.temp.transforms.distanceFromExit, centralPos, true);

        if (towerStampSpot)
        {
            this.planStamp(towerStampSpot, towerStamp, towerStampSpot.offset, true);
            let stampPos = new RoomPosition(towerStampSpot.x + (2 * towerStampSpot.offset.dx) + towerStampSpot.offset.x, towerStampSpot.y + (2 * towerStampSpot.offset.dy) + towerStampSpot.offset.y, this.data.room);
            this.planRoad(centralPos, stampPos, 1, true);
            this.memory.temp.tx = stampPos.x;
            this.memory.temp.ty = stampPos.y;

            this.room.towerFillPos = stampPos;

            let towerPos = new RoomPosition(this.memory.temp.tx, this.memory.temp.ty, this.room.name);
            if (towerPos.getRangeTo(this.room.coreLinkPos) <= 10)
                this.memory.temp.towerIsBaseStructure = 1;
            else
                delete this.memory.temp.towerIsBaseStructure;

            // let path = this.room.findPath(centralPos, stampPos, { ignoreCreeps: true, ignoreRoads: true, range: 1, costCallback: this.costCallback });
            // for (let pathPos of path)
            //     this.memory.temp.protectSpots.push(pathPos);
        }

        if (this.memory.temp.towerIsBaseStructure)
        {
            this.distanceFromBaseStructureAverageTransform();
            this.distanceFromTowersTransform();
        }

        this.memory.temp.roadCostMatrix = global.roadCostMatrix.serialize();

        return true;
    }

    planRamparts()
    {
        global.roadCostMatrix = PathFinder.CostMatrix.deserialize(this.memory.temp.roadCostMatrix);
        console.log('Base_Planner.planRamparts - ' + this.room.name);
        //return false;
        this.distanceFromBaseStructure2Transform();

        let terrain = Game.map.getRoomTerrain(this.room.name);

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (this.memory.temp.transforms.outsideCut[i][j] == 1)
                    global.roadCostMatrix.set(i, j, 255);
            }
        }

        let roadSpots = Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_ROAD);
        roadSpots = _.filter(roadSpots, spot => this.memory.temp.transforms.outsideCut[spot.x][spot.y] != 1);

        Room.setBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_ROAD, roadSpots);

        for (let cutSpot of this.memory.temp.cut)
        {
            if (terrain.get(cutSpot.x, cutSpot.y) != TERRAIN_MASK_WALL && this.memory.temp.transforms.distanceFromBaseStructure2[cutSpot.x][cutSpot.y] == 1)
            {
                this.planStructure(cutSpot, STRUCTURE_RAMPART);
                this.planStructure(cutSpot, STRUCTURE_ROAD);
            }
        }

        for (let cutSpot of this.memory.temp.cut)
        {
            if (this.memory.temp.transforms.distanceFromBaseStructure2[cutSpot.x][cutSpot.y] == 1)
            {
                this.planRoad(this.room.stockerPos, new RoomPosition(cutSpot.x, cutSpot.y, this.data.room), 1, true);
            }
        }

        this.distanceFromRampartTransform();

        for (let structureType in this.memory.structures)
        {
            if (structureType == STRUCTURE_RAMPART)
                continue;

            for (let spot of Room.getBasePlanMemoryStructuresSpots(this.data.room, structureType))
            {
                if (terrain.get(spot.x, spot.y) != TERRAIN_MASK_WALL && this.memory.temp.transforms.distanceFromRampart[spot.x][spot.y] <= 2 && this.memory.temp.transforms.outsideCut[spot.x][spot.y] != 1)
                {
                    this.planStructure(new RoomPosition(spot.x, spot.y, this.data.room), STRUCTURE_RAMPART);
                }
            }
        }

        return true;
    }

    planCleanup()
    {
        let hostiles = this.room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0)
            return false;

        this.destroyUnplanned();

        delete this.memory.temp;
        delete this.memory.planSpawnFirst;
        return true;
    }

    destroyUnplanned()
    {
        let structures = this.room.find(FIND_STRUCTURES);

        for (let structure of structures)
        {
            let structureType = structure.structureType;
            if (structureType == STRUCTURE_ROAD)
                continue;

            if (structureType == STRUCTURE_RAMPART && structure.my)
                continue;

            if ((structureType == STRUCTURE_STORAGE || structureType == STRUCTURE_TERMINAL) && structure.store.getUsedCapacity() >= 1000)
                continue;

            if (structure.owner && !structure.my)
            {
                //console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - destroying ' + structureType + ' at ' + structure.pos);
                structure.destroy();
                continue;
            }

            let structureList = Room.getBasePlanMemoryStructuresSpots(this.room.name, structureType)
            if (!structureList)
            {
                //console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - destroying ' + structureType + ' at ' + structure.pos);
                structure.destroy();
                continue;
            }

            let structurePos = structure.pos;

            let existingPlanSpot = _.find(structureList, slSpot => slSpot.x == structurePos.x && slSpot.y == structurePos.y);
            if (!existingPlanSpot && structureType == STRUCTURE_CONTAINER)
            {
                if (structurePos.x == this.room.controllerCanPos.x && structurePos.y == this.room.controllerCanPos.y)
                {
                    console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - leaving controller can alone');
                    existingPlanSpot = true;
                }
                else
                {
                     for (let source of this.room.sources)
                     {
                         if (source.containerPos && structurePos.x == source.containerPos.x && structurePos.y == source.containerPos.y)
                         {
                             console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - leaving source can alone');
                             existingPlanSpot = true;
                         }
                     }
                }
            }
            if (!existingPlanSpot && structureType == STRUCTURE_TOWER)
            {
                if (structurePos.x == this.room.quickLinkPos.x && structurePos.y == this.room.quickLinkPos.y)
                {
                    console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - leaving quick tower alone');
                    existingPlanSpot = true;
                }

            }

            if (!existingPlanSpot)
            {
                console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - destroying ' + structureType + ' at ' + structurePos);
                structure.destroy();
            }
        }

        let sites = this.room.find(FIND_CONSTRUCTION_SITES);

        for (let site of sites)
        {
            if (!site.my)
            {
                site.remove();
                continue;
            }

            let structureType = site.structureType;
            if (structureType == STRUCTURE_RAMPART)
                continue;

            let structureList = Room.getBasePlanMemoryStructuresSpots(this.data.room, structureType);
            if (!structureList)
            {
                //console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - destroying ' + structureType + ' site at ' + structure.pos);
                site.remove();
                continue;
            }

            let sitePos = site.pos;

            let existingPlanSpot = _.find(structureList, slSpot => slSpot.x == sitePos.x && slSpot.y == sitePos.y);
            if (!existingPlanSpot && structureType == STRUCTURE_CONTAINER)
            {
                if (sitePos.x == this.room.controllerCanPos.x && sitePos.y == this.room.controllerCanPos.y)
                {
                    console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - leaving controller can site alone');
                    existingPlanSpot = true;
                }
                else
                {
                     for (let source of this.room.sources)
                     {
                         if (source.containerPos && sitePos.x == source.containerPos.x && sitePos.y == source.containerPos.y)
                         {
                             console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - leaving source can site alone');
                             existingPlanSpot = true;
                         }
                     }
                }
            }
            if (!existingPlanSpot && structureType == STRUCTURE_TOWER)
            {
                if (sitePos.x == this.room.quickLinkPos.x && sitePos.y == this.room.quickLinkPos.y)
                {
                    console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - leaving quick tower site alone');
                    existingPlanSpot = true;
                }

            }

            if (!existingPlanSpot)
            {
                console.log('Base_Planner.destroyUnplanned - ' + this.room.name + ' - removing ' + structureType + ' site at ' + sitePos);
                site.remove();
            }
        }
    }

    initProtectSpots()
    {
        this.memory.temp.protectSpots = [];
        if (this.room.quickCanPos1)
            this.memory.temp.protectSpots.push(this.room.quickCanPos1);
        if (this.room.quickCanPos2)
            this.memory.temp.protectSpots.push(this.room.quickCanPos2);
        if (this.room.controllerCanPos)
            this.memory.temp.protectSpots.push(this.room.controllerCanPos);
    }

    canReachExitFrom(startPos, blockers)
    {
        if (!blockers || blockers.length <= 0)
            return true;

        let cellsToVisit = [];
        let visitedCells = {};
        let terrain = Game.map.getRoomTerrain(this.room.name);

        cellsToVisit.push(startPos);

        while (cellsToVisit.length > 0)
        {
            let cellInfo = cellsToVisit.shift()
            let key = cellInfo.x + "_" + cellInfo.y;
            if (visitedCells[key])
                continue;
            visitedCells[key] = 1;

            for (let k = -1; k <= 1; ++k)
            {
                for (let l = -1; l <= 1; ++l)
                {
                    if (k == 0 && l == 0)
                        continue;

                    let ex = cellInfo.x + k;
                    let wy = cellInfo.y + l;

                    if (terrain.get(ex, wy) == TERRAIN_MASK_WALL)
                        continue;

                    if (ex == 0 || wy == 0 || ex == 49 || wy == 49)
                        return true;

                    let crossesRampart = _.find(blockers, rCell => rCell.x == ex && rCell.y == wy);
                    if (crossesRampart)
                        continue;

                    let ze = cellInfo.z + 1;

                    cellsToVisit.push({x: ex, y: wy, z: ze});
                }
            }
        }

        return false;
    }

    initializeRoadCostMatrix(centralPos)
    {
        global.roadCostMatrix = new PathFinder.CostMatrix;
        let terrain = Game.map.getRoomTerrain(this.room.name);

        var edgeCost = 64;
        var offGridMultiplier = 4;

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                var value = 0;

                if (i == 0 || i == 49 || j == 0 || j == 49)
                {
                    value = edgeCost;
                }
                else
                {
                    let spotTerrain = terrain.get(i, j);
                    if (spotTerrain == TERRAIN_MASK_WALL)
                        value = 255;
                    else if (spotTerrain == TERRAIN_MASK_SWAMP)
                        value = 3;
                    else
                        value = 2;
                }

                let wantRoad = this.wantRoadHere({x: i, y: j}, centralPos);

                if (value < edgeCost / offGridMultiplier && centralPos && !wantRoad)
                    value *= offGridMultiplier;

                global.roadCostMatrix.set(i, j, value);
            }
        }
    }

    prePlanBaseRoads(centralPos)
    {
        let sources = this.room.sources;

        for (var source of sources)
        {
            let path = this.planContainerablePath(source, centralPos);

            if (path.length > 0)
            {
                for (var pathIndex in path)
                {
                    var pathPoint = path[pathIndex];
                    //global.roadCostMatrix.set(pathPoint.x, pathPoint.y, 1);
                    this.planStructure(pathPoint, STRUCTURE_ROAD);
                }

                var lastPoint = path[path.length - 1];

                var secondLastPoint = null;
                if (path.length > 1)
                    secondLastPoint = path[path.length - 2];

                var potentialSpots = [];
                var searchRange = 1;

                // this.drawCostMatrix(global.roadCostMatrix);
                // console.log('Base_Planner.prePlanBaseRoads - ' + this.data.room + ' - ' + JSON.stringify(lastPoint));

                for (var i = -searchRange; i <= searchRange; ++i)
                {
                    for (var j = -searchRange; j <= searchRange; ++j)
                    {
                        var ex = lastPoint.x + i;
                        var wy = lastPoint.y + j;

                        if (ex > 1 && ex < 48 && wy > 1 && wy < 48)
                        {
                            var spot = new RoomPosition(ex, wy, this.room.name);

                            var spotCost = global.roadCostMatrix.get(spot.x, spot.y);

                            if ((i != 0 || j != 0) && spotCost != 255 && spotCost != 1 && (!secondLastPoint || spot.x != secondLastPoint.x || spot.y != secondLastPoint.y))
                            {
                                potentialSpots.push({s: spot, d: spot.getRangeTo(centralPos)});
                            }
                        }
                    }
                }

                if (potentialSpots.length <= 0)
                    continue;

                potentialSpots.sort((a,b) => (a.d - b.d));

                var linkSpot = potentialSpots[0].s;

                this.planStructure(linkSpot, STRUCTURE_LINK);

                source.memory.lx = linkSpot.x;
                source.memory.ly = linkSpot.y;

                source.containerPos = lastPoint;
            }
        }

        let minerals = this.room.find(FIND_MINERALS);

        for (var mineral of minerals)
        {
            let path = this.planContainerablePath(mineral, centralPos);

            if (path.length > 0)
            {
                for (var pathIndex in path)
                {
                    var pathPoint = path[pathIndex];
                    //global.roadCostMatrix.set(pathPoint.x, pathPoint.y, 1);
                    this.planStructure(pathPoint, STRUCTURE_ROAD);
                }

                var pathPoint = path[path.length - 1];
                //this.planStructure(pathPoint, STRUCTURE_CONTAINER);
                var lastPoint = path[path.length - 1];
                mineral.containerPos = lastPoint;
            }
        }
    }

    planContainerablePath(target, centralPos)
    {
        let targetPos = target;
        if (target.pos)
            targetPos = target.pos;

        let targetRange = 1;

        if (targetPos.nearEdge(1))
        {
            var potentialSpots = [];
            var searchRange = 1;

            for (var i = -searchRange; i <= searchRange; ++i)
            {
                for (var j = -searchRange; j <= searchRange; ++j)
                {
                    var ex = targetPos.x + i;
                    var wy = targetPos.y + j;
                    if (ex >= 1 && ex <= 48 && wy >= 1 && wy <= 48)
                    {
                        var spot = new RoomPosition(ex, wy, room.name);
                        var spotCost = global.roadCostMatrix.get(spot.x, spot.y);

                        if ((i != 0 || j != 0) && spotCost != 255 && spotCost != 1 && this.roomMemory.transforms.distanceFromExit[ex][wy] > 1)
                        {
                            potentialSpots.push({s: spot, d: spot.getRangeTo(centralPos)});
                        }
                    }
                }
            }

            potentialSpots.sort((a,b) => (a.d - b.d));

            targetPos = potentialSpots[0].s;
            targetRange = 0;
        }

        return centralPos.findPathTo(targetPos, {range: targetRange, ignoreCreeps: true, maxOps: 20000, maxRooms: 1, costCallback: (roomName, costMatrix)=>{ if (roomName == this.room.name) return global.roadCostMatrix; else return costMatrix;}});
    }

    costCallback(roomName, costMatrix)
    {
        return global.roadCostMatrix;
    }

    planRoad(fromPos, toPos, range, protect)
    {
        if (_.isUndefined(range))
            range = 1;

        let path = this.room.findPath(fromPos, toPos, { ignoreCreeps: true, ignoreRoads: true, range: range, costCallback: this.costCallback });
        //console.log('Base_Planner.planRoad - from: ' + fromPos + ', to: ' + toPos + ', length: ' + path.length);
        for (let pathPos of path)
            this.planStructure(pathPos, STRUCTURE_ROAD, protect);
    }

    planSomething(objectType, transform, startCell)
    {
        //return
        //startPoint, costMatrix, stamp, baseStructure, sortByDistance, drawDist

        let centralPos = new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);
        let tempPlanMemory = this.memory.temp;

        var startPoint = centralPos;//new RoomPosition(this.memory.cx, this.memory.cy, this.room.name);
        var cellsToVisit = [];

        var newRoadCells = [];
        var placeableCells = [];
        var visitedCells = {};

        var nextCellsToVisit = [{x: this.memory.stx, y: this.memory.sty, roomName: this.room.name, depth: 0, dist: 0, dx: 0, dy: 0, first: true}];

        if (!tempPlanMemory.nextCellsToVisit)
            tempPlanMemory.nextCellsToVisit = nextCellsToVisit;

        if (!tempPlanMemory.visitedCells)
            tempPlanMemory.visitedCells = visitedCells;

        if (!tempPlanMemory.placeableCells)
            tempPlanMemory.placeableCells = placeableCells;

        if (!tempPlanMemory.newRoadCells)
            tempPlanMemory.newRoadCells = newRoadCells;

        //console.log("==================")

        while (Game.cpu.getUsed() < Game.cpu.tickLimit * 0.8 && tempPlanMemory.nextCellsToVisit.length > 0)
        {
            var isRoad = false;
            var placedStructure = false;
            let cellInfo = tempPlanMemory.nextCellsToVisit.shift()

            //let crossesCut = _.find(tempPlanMemory.cut, cCell => cCell.x == cellInfo.x && cCell.y == cellInfo.y);
            let crossesCut = _.find(tempPlanMemory.cut, cCell => Math.abs(cCell.x - cellInfo.x) < 3 && Math.abs(cCell.y - cellInfo.y) < 3);
            if (crossesCut && tempPlanMemory.transforms.distanceFromExit[cellInfo.x][cellInfo.y] < 5)// && !this.wantRoadHere(cellInfo, centralPos))
            {
                if (!tempPlanMemory.firstCrossCut)
                {
                    //console.log(JSON.stringify(crossesCut));
                    tempPlanMemory.firstCrossCut = cellInfo;
                    if (!tempPlanMemory.protectSpots)
                        tempPlanMemory.protectSpots = [];
                    tempPlanMemory.protectSpots.push(cellInfo);
                }

                continue;
            }

            //console.log(this.room.name + " - " + cellInfo.x + "_" + cellInfo.y)
            if (tempPlanMemory.visitedCells[cellInfo.x + "_" + cellInfo.y])
                continue;

            tempPlanMemory.visitedCells[cellInfo.x + "_" + cellInfo.y] = 1;

            var spotCost = global.roadCostMatrix.get(cellInfo.x, cellInfo.y);

			if (spotCost == 1)
            {
                isRoad = true;
            }
            else if (spotCost != 255)
            {
                if (this.wantRoadHere(cellInfo, centralPos))
                {
                    tempPlanMemory.newRoadCells.push(cellInfo);
                }
                else
                {
                    tempPlanMemory.placeableCells.push(cellInfo);
                }
            }

            if (isRoad || cellInfo.first)
            {
                this.pushNextCellsToVisit(cellInfo, centralPos);
            }
        }

        if (tempPlanMemory.cut && tempPlanMemory.nextCellsToVisit.length == 0 && tempPlanMemory.placeableCells.length == 0 && tempPlanMemory.newRoadCells.length == 0)
        {
            console.log('Base_Planner.planSomething - ' + this.data.room + ' - ran out of cells while planning ' + objectType + ', visitedCells.length: ' + Object.keys(this.memory.temp.visitedCells).length)
            this.doPlanMinCut();
            delete this.memory.temp.nextCellsToVisit;
            delete this.memory.temp.visitedCells;
            delete this.memory.temp.placeableCells;
            delete this.memory.temp.newRoadCells;
            return 'retry';
        }

        if (tempPlanMemory.nextCellsToVisit.length == 0)
        {
            tempPlanMemory.placeableCells.sort((cell1, cell2)=>{ return (transform[cell2.x][cell2.y]) - (transform[cell1.x][cell1.y]); });
            tempPlanMemory.newRoadCells.sort((cell1, cell2)=>{ return (transform[cell2.x][cell2.y]) - (transform[cell1.x][cell1.y]); });

            // tempPlanMemory.placeableCells.sort((cell1, cell2)=>{ if (cell1.depth == cell2.depth) return cell1.dist - cell2.dist; else return cell1.depth - cell2.depth; });
            // tempPlanMemory.newRoadCells.sort((cell1, cell2)=>{ if (cell1.depth == cell2.depth) return cell1.dist - cell2.dist; else return cell1.depth - cell2.depth; });

            let placeRoad = true;
            if (tempPlanMemory.placeableCells.length > 0 && tempPlanMemory.newRoadCells.length > 0)
            {
                let pCell = tempPlanMemory.placeableCells[0];
                let rCell = tempPlanMemory.newRoadCells[0];

                //if (pCell.depth < rCell.depth || (pCell.depth == rCell.depth && pCell.dist <= rCell.dist))
                if (transform[pCell.x][pCell.y] >= transform[rCell.x][rCell.y])
                {
                    placeRoad = false;
                }
            }
            else if (tempPlanMemory.placeableCells.length > 0)
            {
                placeRoad = false;
            }

            if (placeRoad && tempPlanMemory.newRoadCells.length > 0)
            {
                let cellInfo = tempPlanMemory.newRoadCells.shift();

                if (tempPlanMemory.transforms.distanceFromExit[cellInfo.x][cellInfo.y] > 5)
                {
                    this.planStructure(cellInfo, STRUCTURE_ROAD, true);
                }


                this.pushNextCellsToVisit(cellInfo, centralPos);
            }
            else if (tempPlanMemory.placeableCells.length > 0)
            {
                let cellInfo = tempPlanMemory.placeableCells.shift();

                if (tempPlanMemory.transforms.distanceFromExit[cellInfo.x][cellInfo.y] > 5)
                {
                    this.planStructure(cellInfo, objectType, true);
                    return [cellInfo.x, cellInfo.y];
                }
            }
        }

        return false;
    }

    pushNextCellsToVisit(cellInfo, startPoint)
    {
        for (var k = -1; k <= 1; ++k)
        {
            for (var l = -1; l <= 1; ++l)
            {
                if (k == 0 && l == 0)
                    continue;

                var ex = cellInfo.x + k;
                var wy = cellInfo.y + l;

                var spotCost = global.roadCostMatrix.get(ex, wy);
                if (spotCost == 255)
                    continue;

                if ((this.memory.temp.transforms.distanceFromExit[ex][wy] >= 1 || spotCost == 1) && !this.memory.temp.visitedCells[ex + "_" + wy])
                {
                    var dist = Math.sqrt(Math.pow(startPoint.x - ex, 2) + Math.pow(startPoint.y - wy, 2));

                    var newCell = {x: ex, y: wy, roomName: this.room.name, depth: cellInfo.depth + 1, dist: dist, dx: k, dy: l, first: false };
                    this.memory.temp.nextCellsToVisit.push(newCell);

                    //console.log(room.name + " --- " + ex + "_" + wy)
                }
            }
        }
    }

    wantRoadHere(spot, centralPos)
    {
        let tempMemory = this.memory.temp;
        var placeRoad = false;
        var dX = spot.x - centralPos.x;
        var dY = spot.y - centralPos.y;

        if (this.memory.temp.offsetCore)
            dX += 2;

        // if (tempMemory.transforms.verticalGap[spot.x][spot.y] == 1 || tempMemory.transforms.horizontalGap[spot.x][spot.y] == 1)
        // {
        //     placeRoad = true;
        // }
        // Check if horizontalGap of 3 or less actually blocked
        /*else */
        if (tempMemory.transforms.horizontalGap[spot.x][spot.y] <= 3)
        {
            if (spot.x > 0 && spot.x < 49 && spot.y > 0 && spot.y < 49 &&
                ((global.roadCostMatrix.get(spot.x - 1, spot.y - 1) == 255 &&
                  global.roadCostMatrix.get(spot.x    , spot.y - 1) == 255 &&
                  global.roadCostMatrix.get(spot.x + 1, spot.y - 1) == 255) ||
                 (global.roadCostMatrix.get(spot.x - 1, spot.y + 1) == 255 &&
                  global.roadCostMatrix.get(spot.x    , spot.y + 1) == 255 &&
                  global.roadCostMatrix.get(spot.x + 1, spot.y + 1) == 255)))
             {
                 // no path above or no path below, normal
                 placeRoad = (((dY - dX) % 4) == 0 || ((dY + dX) % 4) == 0);
             }
             else
             {
                 // blocking something
                 placeRoad = ((dX + dY) % 2 == 0);
             }
        }
        // Check if verticalGap of 3 or less actually blocked
        else if (tempMemory.transforms.verticalGap[spot.x][spot.y] <= 3)
        {
            if (spot.x > 0 && spot.x < 49 && spot.y > 0 && spot.y < 49 &&
                ((global.roadCostMatrix.get(spot.x - 1, spot.y - 1) == 255 &&
                  global.roadCostMatrix.get(spot.x - 1, spot.y    ) == 255 &&
                  global.roadCostMatrix.get(spot.x - 1, spot.y + 1) == 255) ||
                 (global.roadCostMatrix.get(spot.x + 1, spot.y - 1) == 255 &&
                  global.roadCostMatrix.get(spot.x + 1, spot.y    ) == 255 &&
                  global.roadCostMatrix.get(spot.x + 1, spot.y + 1) == 255)))
             {
                 // no path left or no path right, normal
                 placeRoad = (((dY - dX) % 4) == 0 || ((dY + dX) % 4) == 0);
             }
             else
             {
                 // blocking something
                 placeRoad = ((dX + dY) % 2 == 0);
             }
        }
        // else if (                 tempMemory.transforms.verticalGap[spot.x    ][spot.y    ] <= 3 || tempMemory.transforms.horizontalGap[spot.x    ][spot.y    ] <= 3 ||
        //          (spot.x > 0  && (tempMemory.transforms.verticalGap[spot.x - 1][spot.y    ] <= 2 || tempMemory.transforms.horizontalGap[spot.x - 1][spot.y    ] <= 2)) ||
        //          (spot.x < 49 && (tempMemory.transforms.verticalGap[spot.x + 1][spot.y    ] <= 2 || tempMemory.transforms.horizontalGap[spot.x + 1][spot.y    ] <= 2)) ||
        //          (spot.y > 0  && (tempMemory.transforms.verticalGap[spot.x    ][spot.y - 1] <= 2 || tempMemory.transforms.horizontalGap[spot.x    ][spot.y - 1] <= 2)) ||
        //          (spot.y < 49 && (tempMemory.transforms.verticalGap[spot.x    ][spot.y + 1] <= 2 || tempMemory.transforms.horizontalGap[spot.x    ][spot.y + 1] <= 2)))
        // {
        //     placeRoad = ((dX + dY) % 2 == 0);
        // }
        else
        {
            placeRoad = (((dY - dX) % 4) == 0 || ((dY + dX) % 4) == 0);
        }

        return placeRoad;
    }

    planStructure(pos, type, protect)
    {
        let existingCost = global.roadCostMatrix.get(pos.x, pos.y);
        if (existingCost == 255 && type != STRUCTURE_RAMPART)
        {
            console.log('Base_Planner.planStructure - ' + this.room.name + ' - planning ' + type + ' - structure already found at pos: ' + pos.x + ', ' + pos.y);
            return;
        }
        if (type == STRUCTURE_ROAD && existingCost == 1)
            return;

        if (type == STRUCTURE_ROAD)
            global.roadCostMatrix.set(pos.x, pos.y, 1);
        else if (type != STRUCTURE_CONTAINER && type != STRUCTURE_RAMPART)
            global.roadCostMatrix.set(pos.x, pos.y, 255);

        if (!this.memory.structures[type])
            this.memory.structures[type] = '';

        this.memory.structures[type] = this.memory.structures[type].concat(global.spotToChinese({ x: pos.x, y: pos.y }));

        if (type == STRUCTURE_SPAWN)
        {
            if (!this.memory.structures[STRUCTURE_EXTENSION])
                this.memory.structures[STRUCTURE_EXTENSION] = '';

            this.memory.structures[STRUCTURE_EXTENSION] = this.memory.structures[STRUCTURE_EXTENSION].concat(global.spotToChinese({ x: pos.x, y: pos.y }));
        }

        if (protect)
        {
            let existingProtection = _.find(this.memory.temp.protectSpots, sp => sp.x == pos.x && sp.y == pos.y);
            if (!existingProtection)
                this.memory.temp.protectSpots.push({ x: pos.x, y: pos.y });
        }
    }

    findBestPlaceForStamp(stamp, transform, secondaryTransform, centralPos, allowCrossCut)
    {
        let potentialSpots = [];
        for (let i = 1; i < 49; ++i)
        {
            for (let j = 1; j < 49; ++j)
            {
                if (this.memory.temp.transforms.distanceFromExit[i][j] > 5)
                {
                    potentialSpots.push({x: i, y: j});
                }
            }
        }

        //console.log('Base_Planner.findBestPlaceForStamp - checking ' + potentialSpots.length + ' spots for stamp placement')
        if (!secondaryTransform)
            potentialSpots = _.sortByOrder(potentialSpots, c => transform[c.x][c.y], 'desc');
        else
            potentialSpots = _.sortByOrder(potentialSpots, [c => transform[c.x][c.y], c => secondaryTransform[c.x][c.y]], ['desc', 'desc']);

        for (let potentialSpot of potentialSpots)
        {
            let offset = this.canPlaceStamp(potentialSpot, stamp, centralPos, allowCrossCut);
            if (offset)
            {
                potentialSpot.offset = offset;
                return potentialSpot;
            }
        }
    }

    canPlaceStamp(stampSpot, stamp, centralPos, allowCrossCut)
    {
        let width = stamp[0].length;
        let height = stamp.length;

        if (this.canPlaceStampWithOffset(stampSpot, stamp, centralPos,  1,  1, 0, 0, allowCrossCut))
            return { x: 0, y: 0, dx:  1, dy:  1 };

        if (this.canPlaceStampWithOffset(stampSpot, stamp, centralPos,  1, -1, 0, 0, allowCrossCut))
            return { x: 0, y: 0, dx:  1, dy: -1 };

        if (this.canPlaceStampWithOffset(stampSpot, stamp, centralPos, -1,  1, 0, 0, allowCrossCut))
            return { x: 0, y: 0, dx: -1, dy:  1 };

        if (this.canPlaceStampWithOffset(stampSpot, stamp, centralPos, -1, -1, 0, 0, allowCrossCut))
            return { x: 0, y: 0, dx: -1, dy: -1 };

        return false;
    }

    canPlaceStampWithOffset(stampSpot, stamp, centralPos, dx, dy, offsetX, offsetY, allowCrossCut)
    {
        if (dx == 0 || dy == 0)
            return false;

        if (dx >= 0)
            dx = 1;
        else
            dx = -1;

        if (dy >= 0)
            dy = 1;
        else
            dy = -1;

        //dx = 1;
        //dy = 1;

        //offsetX = 0;
        //offsetY = 0;

        let room = Game.rooms[this.data.room];

        let width = stamp[0].length;
        let height = stamp.length;

        for (let i = 0; i < width; ++i)
        {
            for (let j = 0; j < height; ++j)
            {
                // let ex = stampSpot.x + i + offsetX;
                // let wy = stampSpot.y + j + offsetY;

                var ex = stampSpot.x + (i * dx) + offsetX;
                var wy = stampSpot.y + (j * dy) + offsetY;

                if (ex <= 0 || wy <= 0 || ex >= 49 || wy >= 49)
                    return false;

                if (!allowCrossCut)
                {
                    let crossesCut = _.find(this.memory.temp.cut, cCell => Math.abs(cCell.x - ex) < 3 && Math.abs(cCell.y - wy) < 3);
                    if (crossesCut || this.memory.temp.transforms.outsideCut[ex][wy] == 1)
                        return false;
                }

                if (stamp[j][i] != -1 && this.memory.temp.transforms.distanceFromExit[ex][wy] < 2)
                    return false;

                var cost = global.roadCostMatrix.get(ex, wy);

                if (stamp[j][i] == STRUCTURE_ROAD)
                {
                    if (cost == 255)
                        return false;
                    // if (cost != 1 && !this.wantRoadHere({x: ex, y: wy}, centralPos))
                    //     return false;
                }
                else if (stamp[j][i] == 0 && cost == 255)
                {
                    return false;
                }
                else if (stamp[j][i] != -1 && (cost == 1 || cost == 255))// || this.wantRoadHere({x: ex, y: wy}, centralPos)))
                {
                    return false;
                }

                let checkPos = new RoomPosition(ex, wy, this.data.room);

                for (let source of room.sources)
                {
                    if (checkPos.getRangeTo(source.pos) <= 1)
                        return false;
                }

                if (room.mineral && checkPos.getRangeTo(room.mineral.pos) <= 1)
                    return false;
                if (room.thorium && checkPos.getRangeTo(room.thorium.pos) <= 1)
                    return false;
                if (checkPos.getRangeTo(room.controller.pos) <= 1)
                    return false;
            }
        }

        return true;
    }

    planStamp(stampSpot, stamp, offset, protect)
    {

        // if (offset)
        //     console.log('Base_Planner.planStamp - ' + this.room.name + ' - placing stamp at ' + stampSpot.x + ', ' + stampSpot.y + ' with offset ' + offset.x + ', ' + offset.y + ', ' + offset.dx + ', ' + offset.dy);
        // else
        //     console.log('Base_Planner.planStamp - ' + this.room.name + ' - placing stamp at ' + stampSpot.x + ', ' + stampSpot.y);
        var dx = 1;
        var dy = 1;

        if (offset && offset.dx < 0)
            dx = -1;
        if (offset && offset.dy < 0)
            dy = -1;

        let offsetX = 0;
        let offsetY = 0;
        if (offset)
        {
            offsetX = offset.x;
            offsetY = offset.y;
        }

        let width = stamp[0].length;
        let height = stamp.length;

        for (let i = 0; i < width; ++i)
        {
            for (let j = 0; j < height; ++j)
            {
                var ex = stampSpot.x + (i * dx) + offsetX;
                var wy = stampSpot.y + (j * dy) + offsetY;

                if (stamp[j][i] != -1 && stamp[j][i] != 0)
                    this.planStructure({ x: ex, y: wy }, stamp[j][i], protect);
            }
        }
    }

    planQuickFillStamp(stampSpot, offset)
    {
        let stampPos = { x: stampSpot.x + offset.x, y: stampSpot.y + offset.y };
        this.room.quickCanPos1 = { x: stampPos.x + (1 * offset.dx), y: stampPos.y + (3 * offset.dy) };
        this.room.quickCanPos2 = { x: stampPos.x + (5 * offset.dx), y: stampPos.y + (3 * offset.dy) };

        this.room.quickLinkPos = { x: stampPos.x + (3 * offset.dx), y: stampPos.y + (3 * offset.dy) };

        this.room.quickCreepPos1 = { x: this.room.quickCanPos1.x + (1 * offset.dx), y: this.room.quickCanPos1.y + (1 * offset.dy) };
        this.room.quickCreepPos2 = { x: this.room.quickCanPos2.x - (1 * offset.dx), y: this.room.quickCanPos1.y + (1 * offset.dy) };
        this.room.quickCreepPos3 = { x: this.room.quickCanPos1.x + (1 * offset.dx), y: this.room.quickCanPos1.y - (1 * offset.dy) };
        this.room.quickCreepPos4 = { x: this.room.quickCanPos2.x - (1 * offset.dx), y: this.room.quickCanPos1.y - (1 * offset.dy) };


        this.planStructure(this.room.quickCanPos1, STRUCTURE_CONTAINER, true);
        this.planStructure(this.room.quickCanPos2, STRUCTURE_CONTAINER, true);

        // let quickFillStampEmpty =
        // [   [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ]
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ]
        // ];
        //
        // let quickFillStamp =
        // [   [ -1                 , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , -1              ]
        //     [ STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD  ],
        //     [ STRUCTURE_ROAD     , STRUCTURE_SPAWN    , STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD  ],
        //     [ STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_SPAWN    , STRUCTURE_LINK     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_ROAD  ],
        //     [ STRUCTURE_ROAD     , STRUCTURE_SPAWN    , STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_ROAD  ],
        //     [ STRUCTURE_ROAD     , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD  ],
        //     [ -1                 , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , -1              ]
        // ];

        let quickFillStamp1 =
        [   [ -1                 , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , -1              ],
            [ STRUCTURE_ROAD     , -1                 , -1                 , -1                 , -1                 , -1                 , STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , -1                 , STRUCTURE_ROAD     , -1                 , STRUCTURE_ROAD     , -1                 , STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , STRUCTURE_ROAD     , -1                 , STRUCTURE_LINK     , -1                 , STRUCTURE_ROAD     , STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , -1                 , STRUCTURE_ROAD     , -1                 , STRUCTURE_ROAD     , -1                 , STRUCTURE_ROAD  ],
            [ STRUCTURE_ROAD     , -1                 , -1                 , -1                 , -1                 , -1                 , STRUCTURE_ROAD  ],
            [ -1                 , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , STRUCTURE_ROAD     , -1              ]
        ];

        // let quickFillStampEmpty =
        // [   [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ]
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
        //     [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ]
        // ];

        let quickFillStamp2 =
        [   [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , STRUCTURE_EXTENSION, -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , STRUCTURE_SPAWN    , -1                 , STRUCTURE_EXTENSION, -1                 , -1                 , -1                 ],
            [ -1                 , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ]
        ];

        let quickFillStamp3 =
        [   [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , STRUCTURE_EXTENSION, -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , STRUCTURE_SPAWN    , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ]
        ];

        let quickFillStamp4 =
        [   [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_SPAWN    , STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, -1                 ],
            [ -1                 , STRUCTURE_EXTENSION, -1                 , STRUCTURE_EXTENSION, -1                 , STRUCTURE_EXTENSION, -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ],
            [ -1                 , -1                 , -1                 , -1                 , -1                 , -1                 , -1                 ]
        ];

        this.planStamp({ x: stampSpot.x, y: stampSpot.y }, quickFillStamp1, offset, true);
        this.planStamp({ x: stampSpot.x, y: stampSpot.y }, quickFillStamp2, offset, true);
        this.planStamp({ x: stampSpot.x, y: stampSpot.y }, quickFillStamp3, offset, true);
        this.planStamp({ x: stampSpot.x, y: stampSpot.y }, quickFillStamp4, offset, true);

        this.memory.qfx = stampPos.x + (3 * offset.dx);
        this.memory.qfy = stampPos.y + (3 * offset.dy);
    }

    doPlanMinCut(final)
    {
        //console.log('Base_Planner.doPlanMinCut - doing cut')
        let rect_array = [];
        let protectRange = 3;
        if (final)
            protectRange = 3;

        if (this.memory.temp.protectSpots)
        {

            for (let protectSpot of this.memory.temp.protectSpots)
            {
                if (this.memory.temp.transforms.distanceFromExit[protectSpot.x][protectSpot.y] <= 3)
                    continue;
                let actualProtectRange = protectRange;
                if (this.memory.temp.transforms.distanceFromExit[protectSpot.x][protectSpot.y] <= 6)
                    actualProtectRange = Math.max(1, this.memory.temp.transforms.distanceFromExit[protectSpot.x][protectSpot.y] - 3);
                rect_array.push({x1: Math.max(1, protectSpot.x - actualProtectRange), y1: Math.max(1, protectSpot.y - actualProtectRange), x2: Math.min(48, protectSpot.x + actualProtectRange), y2: Math.min(48, protectSpot.y + actualProtectRange)});
            }
        }

        if (this.memory.temp.firstCrossCut)
        {
            let crossSpot = this.memory.temp.firstCrossCut;
            let actualProtectRange = protectRange;
            if (this.memory.temp.transforms.distanceFromExit[crossSpot.x][crossSpot.y] <= 7)
                actualProtectRange = Math.max(1, this.memory.temp.transforms.distanceFromExit[crossSpot.x][crossSpot.y] - 4);
            //console.log('Base_Planner.doPlanMinCut - ' + this.room.name + ' - protecting cross-cut: ' + crossSpot.x + ', ' + crossSpot.y);
            rect_array.push({x1: Math.max(1, crossSpot.x - actualProtectRange), y1: Math.max(1, crossSpot.y - actualProtectRange), x2: Math.min(48, crossSpot.x + actualProtectRange), y2: Math.min(48, crossSpot.y + actualProtectRange)});
            delete this.memory.temp.firstCrossCut;
        }

        // if (this.memory.temp.cut)
        // {
        //     for (let oldCutSpot of this.memory.temp.cut)
        //         rect_array.push({x1: Math.max(1, oldCutSpot.x - protectRange), y1: Math.max(1, oldCutSpot.y - protectRange), x2: Math.min(48, oldCutSpot.x + protectRange), y2: Math.min(48, oldCutSpot.y + protectRange)});
        // }

        if (this.memory.temp.cut)
            this.memory.temp.lastCut = this.memory.temp.cut;

        // Get Min cut
        let positions = util_mincut.GetCutTiles(this.room.name, rect_array, this.memory.temp.sinkTiles); // Positions is an array where to build walls/ramparts
        this.memory.temp.cut = positions;

        this.outsideCutTransform();
    }

    distanceFromPosTransform(pos, draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromPos', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        transform[pos.x][pos.y] = 0;

        var depthCount = this.floodFillDistance(transform);

        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromControllerCanTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromControllerCan', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        transform[this.memory.cx][this.memory.cy] = 0;

        var depthCount = this.floodFillDistance(transform);

        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromCoreTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromCore', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        let stockerPos = this.room.stockerPos;
        transform[stockerPos.x][stockerPos.y] = 0;

        var depthCount = this.floodFillDistance(transform);

        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromQuickfillTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromQuickfill', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        transform[this.memory.qfx][this.memory.qfy] = 0;

        var depthCount = this.floodFillDistance(transform);

        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromTowersTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromTowers', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        transform[this.memory.temp.tx][this.memory.temp.ty] = 0;

        var depthCount = this.floodFillDistance(transform);

        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromControllerTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromController', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        _.forEach(this.room.find(FIND_STRUCTURES, {filter: (st)=>(st.structureType == STRUCTURE_CONTROLLER)}), (source) => (transform[source.pos.x][source.pos.y] = 0))

        var depthCount = this.floodFillDistance(transform);

        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromControllerThroughWallsTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromControllerThroughWalls', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);

        _.forEach(this.room.find(FIND_STRUCTURES, {filter: (st)=>(st.structureType == STRUCTURE_CONTROLLER)}), (source) => (transform[source.pos.x][source.pos.y] = 0))

        var depthCount = this.floodFillDistance(transform);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromExitTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromExit', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        _.forEach(this.room.find(FIND_EXIT), (exit) => (transform[exit.x][exit.y] = 0))

        var depthCount = this.floodFillDistance(transform);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

	distanceFromWallTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromWall', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), 0);

        var depthCount = this.floodFillDistance(transform);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromRampartTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromRampart', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);
        let rampartSpots = Room.getBasePlanMemoryStructuresSpots(this.data.room, STRUCTURE_RAMPART);
        this.fillTransformValues(transform, (i, j) => (_.find(rampartSpots, s => s.x == i && s.y == j)), 0);

        var depthCount = this.floodFillDistance(transform);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromBaseStructureTransform(draw, showNumbers)
    {
        let maxDepth = 50;
        var transform = this.createTransform('distanceFromBaseStructure', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        if (this.memory.temp.protectSpots)
        {
            for (let protectSpot of this.memory.temp.protectSpots)
            {
                transform[protectSpot.x][protectSpot.y] = 0;
            }
        }

        this.invertTransform(transform, maxDepth);

        if (draw)
            this.drawTransform(transform, maxDepth, showNumbers);
    }

    distanceFromBaseStructureAverageTransform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromBaseStructureAverage', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        //this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);


        let averageX = 0;
        let averageY = 0;

        for (let protectSpot of this.memory.temp.protectSpots)
        {
            averageX += protectSpot.x;
            averageY += protectSpot.y;
        }

        averageX = Math.round(averageX / this.memory.temp.protectSpots.length);
        averageY = Math.round(averageY / this.memory.temp.protectSpots.length);
        transform[averageX][averageY] = 0;

        let depthCount = this.floodFillDistance(transform);


        this.invertTransform(transform, depthCount);

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    distanceFromBaseStructure2Transform(draw, showNumbers)
    {
        var transform = this.createTransform('distanceFromBaseStructure2', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        for (let structureType in this.memory.structures)
        {
            if ((structureType == STRUCTURE_TOWER && !this.memory.temp.towerIsBaseStructure) || structureType == STRUCTURE_WALL || structureType == STRUCTURE_RAMPART || structureType == STRUCTURE_ROAD || structureType == STRUCTURE_CONTAINER || structureType == STRUCTURE_LINK || structureType == STRUCTURE_EXTRACTOR)
                continue;

            let structureList = Room.getBasePlanMemoryStructuresSpots(this.data.room, structureType);
            for (let planSpot of structureList)
                transform[planSpot.x][planSpot.y] = 0;
        }

        let depthCount = this.floodFillValue(transform, 1, this.memory.temp.cut);

        for (let structureType in this.memory.structures)
        {
            if ((structureType == STRUCTURE_TOWER && !this.memory.temp.towerIsBaseStructure) || structureType == STRUCTURE_WALL || structureType == STRUCTURE_RAMPART || structureType == STRUCTURE_ROAD || structureType == STRUCTURE_CONTAINER || structureType == STRUCTURE_LINK || structureType == STRUCTURE_EXTRACTOR)
                continue;

            let structureList = Room.getBasePlanMemoryStructuresSpots(this.data.room, structureType);
            for (let planSpot of structureList)
                transform[planSpot.x][planSpot.y] = 1;
        }

        if (draw)
            this.drawTransform(transform, 1, showNumbers);
    }

    distanceFromCutTransform(draw, showNumbers)
    {
        let maxDepth = 0;
        var transform = this.createTransform('distanceFromCut', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        if (this.memory.temp.cut && this.memory.temp.cut.length > 0)
        {
            _.forEach(this.memory.temp.cut, (cutSpot) => (transform[cutSpot.x][cutSpot.y] = 0))
            maxDepth = this.floodFillDistance(transform);
            this.invertTransform(transform, maxDepth);
        }

        if (draw)
            this.drawTransform(transform, maxDepth, showNumbers);
    }

    averageDistanceFromCutTransform(draw, showNumbers)
    {
        let maxDepth = 0;
        var transform = this.createTransform('averageDistanceFromCut', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        if (this.memory.temp.cut && this.memory.temp.cut.length > 0)
        {
            for (var i = 0; i < 50; ++i)
            {
                for (var j = 0; j < 50; ++j)
                {
                    if (transform[i][j] < -1)
                        continue;

                    let distanceTotal = 0;
                    for (let cutSpot of this.memory.temp.cut)
                    {
                        let cutPos = new RoomPosition(cutSpot.x, cutSpot.y, this.room.name);
                        let transformPos = new RoomPosition(i, j, this.room.name);
                        distanceTotal += cutPos.getRangeTo(transformPos);
                    }

                    let value = Math.ceil(distanceTotal / this.memory.temp.cut.length);
                    transform[i][j] = value;
                    if (value > maxDepth)
                        maxDepth = value;
                }
            }
        }

        this.invertTransform(transform, maxDepth);

        if (draw)
            this.drawTransform(transform, maxDepth, showNumbers);
    }

    distanceFromMedianCutTransform(draw, showNumbers)
    {
        let maxDepth = 0;
        var transform = this.createTransform('distanceFromMedianCut', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        //this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        if (this.memory.temp.cut && this.memory.temp.cut.length > 0)
        {
            let xMin = 50;
            let yMin = 50;
            let xMax = 0;
            let yMax = 0;
            let xSum = 0;
            let ySum = 0;

            for (let cutSpot of this.memory.temp.cut)
            {
                if (cutSpot.x < xMin)
                    xMin = cutSpot.x;
                if (cutSpot.y < yMin)
                    yMin = cutSpot.y;
                if (cutSpot.x > xMax)
                    xMax = cutSpot.x;
                if (cutSpot.y > yMax)
                    yMax = cutSpot.y;

                xSum += cutSpot.x;
                ySum += cutSpot.y;
            }


            let medianX = Math.ceil((xMin + xMax) / 2);
            let medianY = Math.ceil((yMin + yMax) / 2);

            // not actually median, but worth trying
            // let medianX = Math.round(xSum / this.memory.temp.cut.length);
            // let medianY = Math.round(ySum / this.memory.temp.cut.length);
            transform[medianX][medianY] = 0;

            maxDepth = this.floodFillDistance(transform);
            this.invertTransform(transform, maxDepth);
        }

        if (draw)
            this.drawTransform(transform, maxDepth, showNumbers);
    }

    outsideCutTransform(draw, showNumbers)
    {
        var transform = this.createTransform('outsideCut', -1);

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        _.forEach(this.room.find(FIND_EXIT), (exit) => (transform[exit.x][exit.y] = 0))

        this.floodFillValue(transform, 1, this.memory.temp.cut);

        _.forEach(this.memory.temp.cut, (spot) => (transform[spot.x][spot.y] = -1))

        if (draw)
            this.drawTransform(transform, 1, showNumbers);
    }

    verticalGapTransform(draw, showNumbers)
    {
        var transform = this.createTransform('verticalGap', -1);
        var depthCount = 0;

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (transform[i][j] < 0 && terrain.get(i, j) != TERRAIN_MASK_WALL)
                {
                    var accumulator = 1;
                    for (var k = j + 1; k < 50; ++k)
                    {
                        if (terrain.get(i, k) != TERRAIN_MASK_WALL)
                            accumulator += 1;
                        else
                            break;
                    }

                    for (var k = j; k < 50; ++k)
                    {
                        if (terrain.get(i, k) != TERRAIN_MASK_WALL)
                            transform[i][k] = accumulator;
                        else
                            break;
                    }
                }
            }
        }

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    horizontalGapTransform(draw, showNumbers)
    {
        var transform = this.createTransform('horizontalGap', -1);
        var depthCount = 0;

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), -2);

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (transform[i][j] < 0 && terrain.get(i, j) != TERRAIN_MASK_WALL)
                {
                    var accumulator = 1;
                    for (var k = i + 1; k < 50; ++k)
                    {
                        if (terrain.get(k, j) != TERRAIN_MASK_WALL)
                            accumulator += 1;
                        else
                            break;
                    }

                    for (var k = i; k < 50; ++k)
                    {
                        if (terrain.get(k, j) != TERRAIN_MASK_WALL)
                            transform[k][j] = accumulator;
                        else
                            break;
                    }
                }
            }
        }

        if (draw)
            this.drawTransform(transform, depthCount, showNumbers);
    }

    finalFormTransform(draw, showNumbers)
    {
        var transform = this.createTransform('finalForm', -1);

        var maxDepth = -1;

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (this.memory.temp.transforms.distanceFromQuickfill && this.memory.temp.transforms.distanceFromCore)
                {
                    transform[i][j] = (
                          (
                               (this.memory.temp.transforms.distanceFromCore[i][j] * 1)
                            +  (this.memory.temp.transforms.distanceFromQuickfill[i][j] * 1)
                            //+  (this.memory.temp.transforms.distanceFromExit[i][j] * 1)
                            //+  (this.memory.temp.transforms.distanceFromController[i][j] * 1)
                        ) / 2
                    );
                }
                else if (this.memory.temp.transforms.distanceFromQuickfill)
                {
                    transform[i][j] = (
                          (
                               (this.memory.temp.transforms.distanceFromQuickfill[i][j] * 1)
                            //+  (this.memory.temp.transforms.distanceFromExit[i][j] * 1)
                            //+  (this.memory.temp.transforms.distanceFromController[i][j] * 1)
                        ) / 1
                    );
                }
                else
                {
                    transform[i][j] = (
                          (
                               (this.memory.temp.transforms.distanceFromCore[i][j] * 1)
                            //+  (this.memory.temp.transforms.distanceFromExit[i][j] * 1)
                            //+  (this.memory.temp.transforms.distanceFromController[i][j] * 1)
                        ) / 1
                    );
                }


                if (transform[i][j] > maxDepth)
                    maxDepth = transform[i][j];
            }
        }

        let terrain = Game.map.getRoomTerrain(this.room.name);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL), 0);

        if (draw)
            this.drawTransform(transform, maxDepth, showNumbers);
    }

    getOrCreateTransform(name, defaultValue)
    {
        if (this.memory.temp.transforms && this.memory.temp.transforms[name])
            return this.memory.temp.transforms[name];
        else
            return this.createTransform(name, defaultValue);
    }

    createTransform(name, defaultValue)
    {
        defaultValue = (defaultValue || 0);

        if (!this.memory.temp.transforms)
            this.memory.temp.transforms = {};

        this.memory.temp.transforms[name] = [];
        for (var i = 0; i < 50; ++i)
        {
            this.memory.temp.transforms[name].push([]);
            for (var j = 0; j < 50; ++j)
            {
                this.memory.temp.transforms[name][i].push(defaultValue);
            }
        }

        return this.memory.temp.transforms[name];
    }

    fillTransformValues(transform, cellCheck, value)
    {
        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (cellCheck(i, j))
                {
                    transform[i][j] = value;
                }
            }
        }
    }

    floodFillDistance(transform, maxValue, blockers)
    {
        var cellsToVisit = [];
        var nextCellsToVisit = [];

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (transform[i][j] == 0)
                {
                    cellsToVisit.push({x: i, y: j, z: 0});
                }
            }
        }

        var maxDepthCount = 0;
        while (cellsToVisit.length > 0)
        {
            var cellInfo = cellsToVisit.shift();

            if (blockers && _.find(blockers, cell => cell.x == cellInfo.x && cell.y == cellInfo.y))
            {
                continue;
            }

            for (var k = -1; k <= 1; ++k)
            {
                for (var l = -1; l <= 1; ++l)
                {
                    var ex = cellInfo.x + k;
                    var wy = cellInfo.y + l;
                    var ze = cellInfo.z + 1;

                    if (maxValue)
                        ze = Math.min(maxValue, ze);

                    if (ze > maxDepthCount)
                        maxDepthCount = ze;

                    if ((ex != i || wy != j) && ex >= 0 && ex < 50 && wy >= 0 && wy < 50)
                    {
                        if (transform[ex][wy] == -1)
                        {
                            transform[ex][wy] = ze;
                            cellsToVisit.push({x: ex, y: wy, z: ze});
                        }
                    }
                }
            }
        }

        return maxDepthCount;
    }

    floodFillValue(transform, value, blockers)
    {
        var cellsToVisit = [];
        var nextCellsToVisit = [];

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (transform[i][j] == 0)
                {
                    cellsToVisit.push({x: i, y: j});
                }
            }
        }

        var maxDepthCount = 0;
        while (cellsToVisit.length > 0)
        {
            var cellInfo = cellsToVisit.shift();

            if (blockers && _.find(blockers, cell => cell.x == cellInfo.x && cell.y == cellInfo.y))
            {
                continue;
            }

            for (var k = -1; k <= 1; ++k)
            {
                for (var l = -1; l <= 1; ++l)
                {
                    var ex = cellInfo.x + k;
                    var wy = cellInfo.y + l;

                    if ((ex != i || wy != j) && ex >= 0 && ex < 50 && wy >= 0 && wy < 50)
                    {
                        if (transform[ex][wy] == -1)
                        {
                            transform[ex][wy] = value;
                            cellsToVisit.push({x: ex, y: wy});
                        }
                    }
                }
            }
        }
    }

    invertTransform(transform, maxValue)
    {
        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (transform[i][j] >= 0)
                {
                    transform[i][j] = maxValue - transform[i][j];
                }
            }
        }
    }

    drawTransform(transform, maxDepth, showNumbers)
    {
        if (transform && this.room.visual && maxDepth > 0)
        {
            for (var i = 0; i < 50; ++i)
            {
                for (var j = 0; j < 50; ++j)
                {
                    if (transform[i][j] > 0)
                    {
                        var opacity = 0;
                        if (transform[i][j] <= maxDepth)
                            opacity = transform[i][j] / (maxDepth * 2);

                        if (transform[i][j] == maxDepth)
                            this.room.visual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#0000ff", opacity: opacity})
                        else
                            this.room.visual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#ff0000", opacity: opacity})

                        if (showNumbers)
                            this.room.visual.text(Math.floor(transform[i][j]), i, j + .2, {opacity: 0.5});
                    }
                }
            }
        }
    }

    drawCostMatrix(costMatrix)
    {
        if (costMatrix && this.room.visual)
        {
            for (var i = 0; i < 50; ++i)
            {
                for (var j = 0; j < 50; ++j)
                {
                    let value = costMatrix.get(i, j);
                    if (value > 0 && value < 255)
                    {
                        this.room.visual.text(Math.floor(value), i, j + .2, {opacity: 0.5});
                    }
                }
            }
        }
    }
}

module.exports = Base_Planner;
