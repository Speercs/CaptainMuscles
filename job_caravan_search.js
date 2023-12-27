'use strict'

let Job = require('job');

class Job_Caravan_Search extends Job
{
    constructor (...args)
    {
        super(...args);

        //console.log('Job_Caravan_Search.constructor - executing');

        this.jobType = 'caravan_search';
        this.desiredSpawnType = 'move';
    }

    getDesiredSpawn(spawn)
    {
        let task = this.getTask(null);
        if (!task)
            return null;

        return { utility: task.utility, jobId: this.id, jobType: this.jobType, type: this.desiredSpawnType, maxParts: 1, task: task };
    }

    getTask(creep)
    {
        if (creep && creep.memory.type != this.desiredSpawnType)
            return null;

        let targetRoom;

        let roomStatus = Game.map.getRoomStatus(this.roomName).status;
        let exits = Game.map.describeExits(this.roomName);

        let creepMemories = this.getCreepMemories();

        let nsIndex = this.roomName.indexOf('N');
        if (nsIndex < 0)
            nsIndex = this.roomName.indexOf('S');

        let ewPart = this.roomName.substring(0, nsIndex);
        let nsPart = this.roomName.substring(nsIndex);

        let ewNumber = parseInt(ewPart.match(/\d+/g));
        let nsNumber = parseInt(nsPart.match(/\d+/g));

        for (let exit in exits)
        {
            let neighbor = exits[exit];

            let nsIndexNeighbor = neighbor.indexOf('N');
            if (nsIndexNeighbor < 0)
                nsIndexNeighbor = neighbor.indexOf('S');

            let ewPartNeighbor = neighbor.substring(0, nsIndex);
            let nsPartNeighbor = neighbor.substring(nsIndex);

            let ewNumberNeighbor = parseInt(ewPartNeighbor.match(/\d+/g));
            let nsNumberNeighbor = parseInt(nsPartNeighbor.match(/\d+/g));

            let ewNeighbor = ewPart[0];
            let nsNeighbor = nsPart[0];

            if (ewNumberNeighbor == ewNumber && nsNumberNeighbor == nsNumber)
                continue;

            if (ewNumberNeighbor - ewNumber > 0)
                ewNumberNeighbor += 9;
            if (ewNumberNeighbor - ewNumber < 0)
                ewNumberNeighbor -= 9;
            if (nsNumberNeighbor - nsNumber > 0)
                nsNumberNeighbor += 9;
            if (nsNumberNeighbor - nsNumber < 0)
                nsNumberNeighbor -= 9;

            let potentialTargetRoom = ewNeighbor + ewNumberNeighbor + nsNeighbor + nsNumberNeighbor;
            let potentialTargetRoomStatus = Game.map.getRoomStatus(potentialTargetRoom).status;

            //console.log('Job_Caravan_Search.getTask - ' + this.roomName + ' - neighbor: ' + neighbor + ', potentialTargetRoom: ' + potentialTargetRoom + ', potentialTargetRoomStatus: ' + potentialTargetRoomStatus);

            //console.log('Job_Caravan_Search.getTask - ' + this.roomName + ' - creepMemories: ' + JSON.stringify(creepMemories));

            if (!_.find(creepMemories, cm => cm.tasks && cm.tasks.length > 0 && cm.tasks[0].targetRoom == potentialTargetRoom) && potentialTargetRoomStatus == roomStatus)
            {
                //console.log('Job_Caravan_Search.getTask - ' + this.roomName + ' - selecting targetRoom: ' + potentialTargetRoom);
                targetRoom = potentialTargetRoom;
                break;
            }
        }

        if (!targetRoom)
            return null;

        return { utility: 0.001, jobId: this.id, jobType: this.jobType, name: 'caravan_search', program: 'task_caravan_search', data: { r: this.roomName, targetRoom: targetRoom }};
    }
}

module.exports = Job_Caravan_Search;
