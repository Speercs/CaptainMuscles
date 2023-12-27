'use strict'

const constants = require('constants');

class Empire_Employer extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Empire_Employer.constructor - ' + this.data.room + ' - executing');
    }

    run()
    {
        //console.log('Empire_Employer.run - ' + this.data.spawn + ' - executing');

        //return;

        let unemployedCreeps = _.filter(Game.creeps, object => !object.spawning && !_.isUndefined(object.memory.unemployed));

        for (let creep of unemployedCreeps)
        {
            if (Room.inDanger(creep.room.name) && Room.getNearestBase(creep.room.name))
            {
                creep.setTask({ n: 'Retreat' });
                creep.doTask();
                continue;
            }
            else
            {
                creep.cancelTask();
            }

            if (creep.memory.unemployed <= 0)
            {
                let remoteRange = global.MAX_SEARCH_RANGE;
                let searchRange = global.WORK_SEARCH_RANGE;

                // let missionList = Object.values(Memory.missions);
                //
                // let roomNamesInRange = Room.getRoomNamesInRangeFloodFill(creep.room.name, searchRange);
                // let missionsInRange = _.sortByOrder(_.filter(missionList, mission => roomNamesInRange.indexOf(mission.room) >= 0), [mission => roomNamesInRange.indexOf(mission.room), mission => constants.generalMissionPriority.indexOf(mission.type)], ['asc', 'asc']);

                // if (Game.shard.name == 'shard2')
                // {
                //     let missionInfos = missionsInRange.map(m => ({ r: m.room, t: m.type }));
                //     console.log('Empire_Employer.run - ' + Game.shard.name + ' - ' + JSON.stringify(roomNamesInRange));
                //     console.log('Empire_Employer.run - ' + Game.shard.name + ' - ' + JSON.stringify(missionInfos));
                // }

                // if (missionsInRange.length > 0 && this.selectMissionForCreepFromList(creep, missionsInRange))
                //     continue;

                let missionList = Object.values(Memory.missions);

                //console.log('Empire_Employer.run - ' + this.data.room + ' - checking home missions.');

                let homeMissions = _.sortBy(_.filter(missionList, mission => mission.room == creep.room.name && constants.homeMissionPriority.indexOf(mission.type) >= 0), mission => constants.homeMissionPriority.indexOf(mission.type));
                if (this.selectMissionForCreepFromList(creep, homeMissions))
                    continue;

                //console.log('Empire_Employer.run - ' + this.data.room + ' - checking remote missions.');
                let roomNamesInRange = Room.getRoomNamesInRangeFloodFill(creep.room.name, remoteRange, true);
                let remoteMissions = _.sortByOrder(_.filter(missionList, mission => /*mission.room != creep.room.name &&*/ mission.remote && constants.remoteMissionPriority.indexOf(mission.type) >= 0 && roomNamesInRange.indexOf(mission.room) >= 0), [mission => roomNamesInRange.indexOf(mission.room), mission => constants.remoteMissionPriority.indexOf(mission.type)], ['asc', 'asc']);

                if (this.selectMissionForCreepFromList(creep, remoteMissions))
                    continue;

                // console.log('Empire_Employer.run - ' + creep.data.room + ' - checking home secondary missions.');
                let homeSecondaryMissions = _.sortBy(_.filter(missionList, mission => mission.room == creep.room.name && constants.homeSecondaryMissionPriority.indexOf(mission.type) >= 0), mission => constants.homeSecondaryMissionPriority.indexOf(mission.type));
                if (this.selectMissionForCreepFromList(creep, homeSecondaryMissions))
                    continue;

                roomNamesInRange = Room.getRoomNamesInRangeFloodFill(creep.room.name, searchRange, true);
                let foundMission = false;

                for (let roomName of roomNamesInRange)
                {
                    if (roomName == creep.room.name)
                        continue;

                    let nearbyMissions = _.sortByOrder(_.filter(missionList, mission => mission.room == roomName && !mission.remote && constants.nearbyMissionPriority.indexOf(mission.type) >= 0), [mission => constants.nearbyMissionPriority.indexOf(mission.type)], ['asc']);

                    //console.log('Empire_Employer.run - ' + creep.data.room + ' - checking nearby missions.');
                    if (this.selectMissionForCreepFromList(creep, nearbyMissions))
                    {
                        foundMission = true;
                        break;
                    }
                }

                if (foundMission)
                    continue;

                creep.memory.unemployed = 10;
            }
            else
            {
                creep.memory.unemployed -= 1;

                if (!creep.hasTask() && creep.store.getUsedCapacity() > 0)
                    creep.setTask({ n: 'Unload' });

                // if (!creep.hasTask() || creep.currentTask.n != 'Recycle')
                // {
                //     //console.log('Empire_Employer.run - recycling ' + creep.name);
                //     // let nearestBase = Room.getNearestBase(creep.room.name);
                //     // if (nearestBase)
                //     //     creep.setTask({ n: 'Recycle', r: nearestBase.name, t: 3, reason: 'reclaimed' });
                //     // else
                //     //     creep.setTask({ n: 'Recycle', t: 3, reason: 'reclaimed' });
                // }

                if (creep.hasTask())
                    creep.doTask();
            }
        }
    }

    selectMissionForCreepFromList(creep, missionList)
    {
        let relevantPartCount = this.relevantPartCount(creep)

        let availableMission = null;
        let missionProcess = null;

        // if (Game.shard.name == 'shard2')
        //     console.log('Empire_Employer.selectMissionForCreepFromList - ' + creep.name + ' - looking for missions');

        for (let mission of missionList)
        {
            missionProcess = kernel.scheduler.getProcessFromId(mission.pid);
            if (!missionProcess)
            {
                console.log('Empire_Employer.selectMissionForCreepFromList - could not get process for mission: ' + mission.type + ' - ' + mission.room);
                continue;
            }

            if (!missionProcess.getDesiredSpawn)
            {
                console.log('Empire_Employer.selectMissionForCreepFromList - could not find getDesiredSpawn function for mission: ' + mission.type + ' - ' + mission.room);
                continue;
            }

            try
            {
                missionProcess.getDesiredSpawn();
            }
            catch(error)
            {
                console.log('Empire_Employer.selectMissionForCreepFromList - error calling getDesiredSpawn function for mission: ' + mission.type + ' - ' + mission.room + ' - ' + error);
            }

            // if (Game.shard.name == 'shard2' && mission.desiredSpawn && mission.desiredSpawn.type == creep.memory.type)
            //     console.log('Empire_Employer.selectMissionForCreepFromList - ' + creep.name + ' - ' + JSON.stringify(mission.desiredSpawn));

            if (mission.desiredSpawn && mission.desiredSpawn.type == creep.memory.type &&
                mission.desiredSpawn.utility && mission.desiredSpawn.utility > 0 &&
               (!mission.desiredSpawn.missionShard || mission.desiredSpawn.missionShard != creep.memory.spawnShard) &&
               (!mission.desiredSpawn.minParts || relevantPartCount >= mission.desiredSpawn.minParts) &&
                !mission.desiredSpawn.delay)
            {
                availableMission = mission;
                break;
            }
        }

        if (availableMission)
        {
            if (availableMission.type != 'collect')
                console.log('Empire_Employer.run - assigning ' + creep.name + ' to mission ' + availableMission.type + ' - ' + availableMission.room);

            let creepMemory = availableMission.desiredSpawn.memory;

            delete creep.memory.unemployed;
            delete creep.memory.spawnShard;
            creep.setTask(null);

            if (creepMemory)
            {
                //console.log('Empire_Employer.run - copying to creep memory ');
                for (let key in creepMemory)
                {
                    //console.log('Empire_Employer.run - copying ' + key + ' to creep memory ');
                    creep.memory[key] = creepMemory[key];
                }
            }

            if (!missionProcess.employNewCreep)
            {
                console.log('Empire_Employer.selectMissionForCreepFromList - could not find employNewCreep function for mission: ' + availableMission.type + ' - ' + availableMission.room);
            }
            else
            {
                try
                {
                    missionProcess.employNewCreep(creep.name, creep.memory);
                }
                catch(error)
                {
                    console.log('Empire_Employer.selectMissionForCreepFromList - error calling employNewCreep function for mission: ' + availableMission.type + ' - ' + availableMission.room + ' - ' + error);
                }
            }

            return true;
        }

        return false;
    }

    relevantPartCount(creep)
    {
        let relevantPart = creep.memory.type;
        let type = creep.memory.type;

        if (type == 'worry' || type == 'warry' || type == 'worky')
            relevantPart = 'work';
        else if (type == 'reserve')
            relevantPart = 'claim';
        else if (type == 'transfer')
            relevantPart = 'carry';
        else if (type == 'destroy')
            relevantPart = 'attack';

        return creep.memory[relevantPart];
    }
}

module.exports = Empire_Employer;
