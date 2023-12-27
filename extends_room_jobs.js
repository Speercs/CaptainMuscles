'use strict'

const constants = require('constants');

let Mission_Creeps = require('program_mission_creeps');

let Job_Assault         = require('job_assault');
let Job_Attack          = require('job_attack');
let Job_Build           = require('job_build');
let Job_Caravan_Deliver = require('job_caravan_deliver');
let Job_Caravan_Search  = require('job_caravan_search');
let Job_Claim           = require('job_claim');
let Job_Clean           = require('job_clean');
let Job_Clear           = require('job_clear');
let Job_Collect         = require('job_collect');
let Job_Combat_Test     = require('job_combat_test');
let Job_Commando        = require('job_commando');
let Job_Controller_Blocker     = require('job_controller_blocker');
let Job_Defend          = require('job_defend');
let Job_Demolish        = require('job_demolish');
let Job_Deposit_Collect = require('job_deposit_collect');
let Job_Deposit_Harvest = require('job_deposit_harvest');
let Job_Destroy         = require('job_destroy');
let Job_Drain           = require('job_drain');
let Job_Empty_Labs      = require('job_empty_labs');
let Job_Extract         = require('job_extract');
let Job_Fill_Can        = require('job_fill_can');
let Job_Fill_Cans       = require('job_fill_cans');
let Job_Fill_Labs       = require('job_fill_labs');
let Job_Fill_Spawn      = require('job_fill_spawn');
let Job_Fill_Towers     = require('job_fill_towers');
let Job_Fortify         = require('job_fortify');
let Job_Harvest         = require('job_harvest');
let Job_Haul            = require('job_haul');
let Job_Loot            = require('job_loot');
let Job_Pave            = require('job_pave');
let Job_Power_Attack    = require('job_power_attack');
let Job_Power_Collect   = require('job_power_collect');
let Job_Power_Heal      = require('job_power_heal');
let Job_Quickfill       = require('job_quickfill');
let Job_Reactor_Claim   = require('job_reactor_claim');
let Job_Reactor_Fill    = require('job_reactor_fill');
let Job_Repair          = require('job_repair');
let Job_Repel           = require('job_repel');
let Job_Rescue          = require('job_rescue');
let Job_Reserve         = require('job_reserve');
let Job_Scout           = require('job_scout');
let Job_Send_Out        = require('job_send_out');
let Job_Ship            = require('job_ship');
let Job_Smash           = require('job_smash');
let Job_Squad           = require('job_squad');
let Job_Stock           = require('job_stock');
let Job_Store           = require('job_store');
let Job_Swarm           = require('job_swarm');
let Job_Upgrade         = require('job_upgrade');
let Job_Watch           = require('job_watch');

let jobClasses = {};
jobClasses['assault']           = Job_Assault;
jobClasses['attack']            = Job_Attack;
jobClasses['build']             = Job_Build;
jobClasses['caravan_deliver']   = Job_Caravan_Deliver;
jobClasses['caravan_search']    = Job_Caravan_Search;
jobClasses['clean']             = Job_Clean;
jobClasses['clear']             = Job_Clear;
jobClasses['claim']             = Job_Claim;
jobClasses['collect']           = Job_Collect;
jobClasses['combat_test']       = Job_Combat_Test;
jobClasses['commando']          = Job_Commando;
jobClasses['controller_blocker']= Job_Controller_Blocker;
jobClasses['defend']            = Job_Defend;
jobClasses['demolish']          = Job_Demolish;
jobClasses['deposit_collect']   = Job_Deposit_Collect;
jobClasses['deposit_harvest']   = Job_Deposit_Harvest;
jobClasses['destroy']           = Job_Destroy;
jobClasses['drain']             = Job_Drain;
jobClasses['empty_labs']        = Job_Empty_Labs;
jobClasses['extract']           = Job_Extract;
jobClasses['fill_can']          = Job_Fill_Can;
jobClasses['fill_cans']         = Job_Fill_Cans;
jobClasses['fill_labs']         = Job_Fill_Labs;
jobClasses['fill_spawn']        = Job_Fill_Spawn;
jobClasses['fill_towers']       = Job_Fill_Towers;
jobClasses['fortify']           = Job_Fortify;
jobClasses['harvest']           = Job_Harvest;
jobClasses['haul']              = Job_Haul;
jobClasses['loot']              = Job_Loot;
jobClasses['pave']              = Job_Pave;
jobClasses['power_attack']      = Job_Power_Attack;
jobClasses['power_collect']     = Job_Power_Collect;
jobClasses['power_heal']        = Job_Power_Heal;
jobClasses['quickfill']         = Job_Quickfill;
jobClasses['reactor_claim']     = Job_Reactor_Claim;
jobClasses['reactor_fill']      = Job_Reactor_Fill;
jobClasses['repair']            = Job_Repair;
jobClasses['repel']             = Job_Repel;
jobClasses['rescue']            = Job_Rescue;
jobClasses['reserve']           = Job_Reserve;
jobClasses['scout']             = Job_Scout;
jobClasses['send_out']          = Job_Send_Out;
jobClasses['ship']              = Job_Ship;
jobClasses['smash']             = Job_Smash;
jobClasses['squad']             = Job_Squad;
jobClasses['stock']             = Job_Stock;
jobClasses['store']             = Job_Store;
jobClasses['swarm']             = Job_Swarm;
jobClasses['upgrade']           = Job_Upgrade;
jobClasses['watch']             = Job_Watch;

Room.getJobInstance = function(jobInfo)
{
    if (!jobInfo)
    {
        console.log('Room.getJobInstance - no jobInfo given');
        return null;
    }

    let jobClass = jobClasses[jobInfo.type];
    if (!jobClass)
    {
        console.log('Room.getJobInstance - job class not found for ' + JSON.stringify(jobInfo));
        return null;
    }

    let data = {};
    if (jobInfo.source)
        data.source = jobInfo.source;

    return new jobClass (jobInfo.room, jobInfo.id, data);
}

Room.getJobList = function*(roomName, isHome, isRemote)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        yield null;

    if (isHome)
    {
        let jobList = Room.getJobListHome(roomName, roomMemory);

        let nextJob = jobList.next();

        while (nextJob.value)
        {
            yield nextJob.value;
            nextJob = jobList.next();
        }

        jobList.return();

        yield null;
    }
    else if (isRemote)
    {
        let jobList = Room.getJobListRemote(roomName, roomMemory);

        let nextJob = jobList.next();

        while (nextJob.value)
        {
            yield nextJob.value;
            nextJob = jobList.next();
        }

        jobList.return();

        yield null;
    }
    else
    {
        let jobList = Room.getJobListNearby(roomName, roomMemory);

        let nextJob = jobList.next();

        while (nextJob.value)
        {
            yield nextJob.value;
            nextJob = jobList.next();
        }

        jobList.return();

        yield null;
    }
}

Room.getJobListHome = function*(roomName, roomMemory)
{
    let room = Game.rooms[roomName];
    // let isRepelable = Room.inDanger(roomName) && roomMemory.hostiles && !roomMemory.hostiles.tc;

    let inDanger = Room.inDanger(roomName);
    let isRepelable = ((!inDanger || room.towers.length <= 0) && roomMemory.hostiles && !roomMemory.hostiles.tc) || (Game.flags['repelTest'] && Game.flags['repelTest'].pos.roomName == roomName);
    let isUnclaiming = Room.isUnclaiming(roomName);
    let planComplete = false;
    let planMemory = Room.getBasePlanMemory(roomName);
    if (planMemory && planMemory.planComplete)
        planComplete = true;

    yield new Job_Combat_Test    (roomName, 'combat_test',    {});

    if (planComplete)
    {
        yield new Job_Quickfill     (roomName, 'quickfill',     {});
        yield new Job_Stock         (roomName, 'stock',         {});
    }

    yield new Job_Fill_Spawn    (roomName, 'fill_spawn',    {});
    yield new Job_Fill_Towers   (roomName, 'fill_towers',   {});
    yield new Job_Fill_Cans     (roomName, 'fill_cans',     {});

    if (inDanger)
    {
        yield new Job_Fortify       (roomName, 'fortify',       {});
        yield new Job_Defend        (roomName, 'defend',        {});
    }

    if (isRepelable)
    {
        yield new Job_Repel         (roomName, 'repel',         {});
    }

    if (isUnclaiming)
    {
        yield new Job_Demolish      (roomName, 'demolish',      {});
    }
    
    if (planComplete)
    {
        let baseLabsMemory = Room.getBaseLabsMemory(roomName);
        if (baseLabsMemory)
        {
            yield new Job_Empty_Labs(roomName, 'empty_labs',    {});
            yield new Job_Fill_Labs (roomName, 'fill_labs' ,    {});
        }

        yield new Job_Repair        (roomName, 'repair',        {});

    }

    if (planComplete && room.thorium && room.controller.level >= 6 && room.thorium.mineralAmount)
    {
        let sourceId = roomMemory.thorium.id;
        yield new Job_Extract       (roomName, 'extract_' + sourceId, { source: sourceId });
        yield new Job_Pave          (roomName, 'pave_'    + sourceId, { source: sourceId });
    }

    if (planComplete && roomMemory.mineral && room.controller.level >= 6)
    {
        let sourceId = roomMemory.mineral.id;
        yield new Job_Extract       (roomName, 'extract_' + sourceId, { source: sourceId });
        yield new Job_Pave          (roomName, 'pave_'    + sourceId, { source: sourceId });
    }

    yield new Job_Haul(roomName, 'haul', {});
    

    if (roomMemory.sources)
    {
        for (let sourceId in roomMemory.sources)
            yield new Job_Harvest   (roomName, 'harvest_' + sourceId, { source: sourceId });
    }

    if (planComplete)
    {
        yield new Job_Build         (roomName, 'build',         {});
        yield new Job_Fortify       (roomName, 'fortify',       {});
        
        if (roomMemory.sources)
        {
            for (let sourceId in roomMemory.sources)
                yield new Job_Pave      (roomName, 'pave_'    + sourceId, { source: sourceId });
        }
        
        yield new Job_Scout         (roomName, 'scout',         {});
    }

    yield new Job_Store         (roomName, 'store',         {});

    let swarmFlag = Game.flags['swarm'];
    if (swarmFlag && global.realDistanceBetweenRooms(roomName, swarmFlag.pos.roomName) <= global.REMOTE_SEARCH_RANGE)
    {
        yield new Job_Swarm (roomName, 'swarm',         {});
    }

    let squadMissionInfo = { type: 'squad', room: roomName };
    let squadMissionMemory = Mission_Creeps.getMemory(squadMissionInfo);
    if (squadMissionMemory)
    {
        yield new Job_Squad (roomName, 'squad',         {});
    }

    let clearFlag = Game.flags['clear_' + roomName];
    if (clearFlag)
    {
        yield new Job_Clear (clearFlag.pos.roomName, 'clear',         {});
    }

    if (planComplete)
    {
        yield new Job_Upgrade       (roomName, 'upgrade',       {});
    }

    yield new Job_Clean         (roomName, 'clean',         {});
}

Room.getJobListRemote = function*(roomName, roomMemory)
{
    let room = Game.rooms[roomName];
    let isMyBase = Room.isMyBase(roomName);
    let nearestBase = null;
    if (isMyBase)
        nearestBase = room;
    else
        nearestBase = Room.getNearestBase(roomName);
    let isEnemyBase = Room.isEnemyBase(roomName);
    let spawnForBase = false;

    let planComplete = false;
    if (isMyBase && room)
    {
        let planMemory = Room.getBasePlanMemory(roomName);
        if (planMemory && planMemory.planComplete)
            planComplete = true;

        if (planComplete)
        {
            if (room.spawns.length <= 0)
                spawnForBase = true;
        }
    }

    let isAlleyRoom = Room.isAlleyRoom(roomName);
    let isCenterRoom = Room.isCenterRoom(roomName);
    let isControllerRoom = Room.isControllerRoom(roomName);
    let isHighwayRoom = Room.isHighwayRoom(roomName);
    //let isRepelable = Room.inDanger(roomName) && roomMemory.hostiles && !roomMemory.hostiles.tc;
    let wantToClaim = Room.wantToClaim(roomName);
    let isRepelable = true;//(roomMemory.hostiles && !roomMemory.hostiles.etc) || (!roomMemory.hostiles && wantToClaim); //(Game.flags['repelTest'] && Game.flags['repelTest'].pos.roomName == roomName);
    let inDanger = Room.inDanger(roomName);
    
    let energyLevel = constants.RESOURCE_LEVEL_NORMAL;
    if (nearestBase)
        energyLevel = Room.getResourceAmountLevel(nearestBase.name, RESOURCE_ENERGY);

    //console.log('Room.getJobListRemote - ' + roomName + ' - isMyBase: ' + isMyBase + ' - spawnForBase: ' + spawnForBase + ' - isCenterRoom: ' + isCenterRoom + ' - isRepelable: ' + isRepelable )

    if (Game.flags['watch_' + roomName] || roomMemory.defendUntil || (Room.isEnemyBase(roomName) && Room.trusted(roomName)) || (constants.SEASON_FIVE_ACTIVE && Room.isCoreRoom(roomName)) || (Memory.empire && Memory.empire.warfare && Memory.empire.warfare.targets && Memory.empire.warfare.targets.find(rn => rn == roomName)))
    {
        //console.log('****************Room.getJobListRemote - ' + roomName + ' - trying watch job');
        yield new Job_Watch (roomName, 'watch', {});
    }

    if (isMyBase && !inDanger)
    {
        yield new Job_Controller_Blocker (roomName, 'controller_blocker', {});
    }

    if (isRepelable)
    {
        let repelJob = new Job_Repel         (roomName, 'repel',         {});
        if (isMyBase)
        {
            yield repelJob;
        }
        else if (repelJob.missionMemory && repelJob.missionMemory.doRemote)
        {
            yield new Job_Watch (roomName, 'watch', {});
            yield repelJob;
        }
    }

    if (!inDanger && Game.flags['rescue_' + roomName])
    {
        yield new Job_Rescue (roomName, 'rescue',         {});
    }

    if (planComplete && !inDanger && spawnForBase)
    {
        yield new Job_Build         (roomName, 'build',         {});
    }

    let commandoFlag = Game.flags['commando_' + roomName];
    if (!commandoFlag && Game.flags['commando'] && Game.flags['commando'].pos.roomName == roomName)
        commandoFlag = Game.flags['commando'];

    if (commandoFlag || (!isMyBase && !isEnemyBase && roomMemory.hostiles && roomMemory.hostiles.tc && roomMemory.hostiles.tc <= 3))
    {
        yield new Job_Commando          (roomName, 'commando',      {});
        //yield new Job_Smash             (roomName, 'smash',         {});
    }

    let drainFlag = Game.flags['drain_' + roomName];
    if (!drainFlag && Game.flags['drain'] && Game.flags['drain'].pos.roomName == roomName)
        drainFlag = Game.flags['drain'];

    if (drainFlag || (Memory.empire && (Memory.empire.nextClaim == roomName || Memory.empire.desiredRoom == roomName) && !isMyBase && !isEnemyBase && roomMemory.hostiles && roomMemory.hostiles.etc))
    {
        yield new Job_Drain          (roomName, 'drain',      {});
    }

    if (isAlleyRoom && constants.SEASON_FOUR_ACTIVE)
    {
        yield new Job_Caravan_Deliver(roomName, 'caravan_deliver', {});
        yield new Job_Caravan_Search (roomName, 'caravan_search',  {});
    }

    if (constants.USE_POWER && isHighwayRoom && !inDanger && roomMemory.powerBanks)
    {
        for (let powerBankId in roomMemory.powerBanks)
        {
            if (energyLevel >= constants.RESOURCE_LEVEL_LOW)
                yield new Job_Power_Heal    (roomName, 'power_heal_'    + powerBankId, { source: powerBankId });
            if (energyLevel >= constants.RESOURCE_LEVEL_NORMAL)
                yield new Job_Power_Attack  (roomName, 'power_attack_'  + powerBankId, { source: powerBankId });
            yield new Job_Power_Collect (roomName, 'power_collect_' + powerBankId, { source: powerBankId });
        }
    }

    if (constants.USE_FACTORY && isHighwayRoom && !inDanger && roomMemory.deposits && energyLevel >= constants.RESOURCE_LEVEL_LOW)
    {
        for (let depositId in roomMemory.deposits)
        {
            yield new Job_Deposit_Collect (roomName, 'deposit_collect_' + depositId, { source: depositId });
            yield new Job_Deposit_Harvest (roomName, 'deposit_harvest_' + depositId, { source: depositId });
        }
    }

    if (!isMyBase && !inDanger && isControllerRoom)
    {
        if (wantToClaim || isEnemyBase)
            yield new Job_Demolish      (roomName, 'demolish',      {});

        if (wantToClaim && (Game.flags['claim_' + roomName] || !roomMemory.demolish))
        {
            yield new Job_Destroy       (roomName, 'destroy',       {});
            yield new Job_Claim         (roomName, 'claim',         {});
        }
    }

    if (spawnForBase && !inDanger)
    {
        // yield new Job_Quickfill     (roomName, 'quickfill',     {});
        // yield new Job_Stock         (roomName, 'stock',         {});
        yield new Job_Repair        (roomName, 'repair',        {});
    }

    if (spawnForBase && !inDanger && roomMemory.sources)
    {
        yield new Job_Haul(roomName, 'haul', {});

        for (let sourceId in roomMemory.sources)
        {
            yield new Job_Harvest   (roomName, 'harvest_' + sourceId, { source: sourceId });
            yield new Job_Pave      (roomName, 'pave_'    + sourceId, { source: sourceId });
        }
    }

    if (!isMyBase && !inDanger && room && room.controller && nearestBase && room.controller.sign && room.controller.sign.username == 'Screeps')
    {
        if (global.distanceBetweenRooms(roomName, nearestBase.name) <= 1)
            yield new Job_Reserve       (roomName, 'reserve',       {});
    }

    if ((isEnemyBase || (wantToClaim && roomMemory.controller && roomMemory.controller.r && roomMemory.controller.r != ME)) && !inDanger && (Game.flags['claim_' + roomName] || !roomMemory.demolish))
    {
        yield new Job_Reserve       (roomName, 'reserve',       {});
    }

    if (Game.flags['reserve_' + roomName])
    {
        yield new Job_Reserve       (roomName, 'reserve',       {});
    }

    if (spawnForBase && !inDanger)
    {
        //yield new Job_Build         (roomName, 'build',         {});
        //yield new Job_Fortify       (roomName, 'fortify',       {});
        yield new Job_Scout         (roomName, 'scout',         {});
        // yield new Job_Store         (roomName, 'store',         {});
        //yield new Job_Upgrade       (roomName, 'upgrade',       {});
    }

    
    if (planComplete && !inDanger && spawnForBase)//room.controller.level < 6)
    {
        yield new Job_Upgrade       (roomName, 'upgrade',       {});
    }

    //if ((isEnemyBase && roomMemory.hostiles && roomMemory.hostiles.tc >= 6) || (Game.flags['assault']))// && Game.flags['assault'].pos.roomName == roomName)) // && energyLevel >= constants.RESOURCE_LEVEL_NORMAL)
    if (Game.flags['assault'])
    {
        yield new Job_Assault           (roomName, 'assault',       {});
    }

    //if ((isEnemyBase && roomMemory.hostiles && roomMemory.hostiles.tc >= 6) || (Game.flags['attack_' + roomName])) // && energyLevel >= constants.RESOURCE_LEVEL_NORMAL)
    //if (Game.flags['attack_' + roomName])
    {
        //console.log('****************Room.getJobListRemote - ' + roomName + ' - trying attack job');
        yield new Job_Attack            (roomName, 'attack',       {});
    }

    if (Room.hasReactor(roomName))
    {
        if (Room.wantToClaimReactor(roomName))
            yield new Job_Reactor_Claim(roomName, 'reactor_claim', {});

        yield new Job_Reactor_Fill(roomName, 'reactor_fill', {});
    }
}


Room.getJobListNearby = function*(roomName, roomMemory)
{

    let inDanger = Room.inDanger(roomName);
    // if (inDanger)
    //     yield null;

    let room = Game.rooms[roomName];
    let isMyBase = Room.isMyBase(roomName);
    let isControllerRoom = Room.isControllerRoom(roomName);
    let isHighwayRoom = Room.isHighwayRoom(roomName);
    let isSourceKeeperRoom = Room.isSourceKeeperRoom(roomName);
    let isCenterRoom = Room.isCenterRoom(roomName);
    let isRepelable = (roomMemory.hostiles && !roomMemory.hostiles.tc) || (Game.flags['repelTest'] && Game.flags['repelTest'].pos.roomName == roomName);

    let canHarvest = (!roomMemory.controller && roomMemory.clear && !Room.hasReactor(roomName));
    if (!canHarvest && roomMemory.controller)
        canHarvest = (roomMemory.controller.r == ME || roomMemory.controller.o == ME || (!roomMemory.controller.o && !roomMemory.controller.r));

    canHarvest = canHarvest && !!roomMemory.sources;

    // if (roomName == "W4N3")
    //     console.log('Room.getJobListNearby - ' + roomName + ' - canHarvest: ' + canHarvest + ' - ' + JSON.stringify(roomMemory.controller));

    let nearestBase = null;
    if (isMyBase)
        nearestBase = room;
    else
        nearestBase = Room.getNearestBase(roomName);

    let planComplete = false;
    if (isMyBase)
    {
        let planMemory = Room.getBasePlanMemory(roomName);
        if (planMemory && planMemory.planComplete)
            planComplete = true;
    }

    let canExtract = ((isMyBase && planComplete && room.controller.level >= 6) || isCenterRoom) && roomMemory.mineral;

    if (isRepelable)
    {
        yield new Job_Repel         (roomName, 'repel',         {});
    }

    if (!inDanger && !isMyBase && isControllerRoom)
    {
        yield new Job_Destroy       (roomName, 'destroy',       {});
        yield new Job_Demolish      (roomName, 'demolish',      {});
        yield new Job_Claim         (roomName, 'claim',         {});
    }

    if (!inDanger && isSourceKeeperRoom)
    {
        yield new Job_Clear         (roomName, 'clear',         {});
    }

    if (!inDanger && isMyBase && planComplete)
    {
        yield new Job_Repair        (roomName, 'repair',        {});
    }

    if (!isMyBase && !inDanger && isControllerRoom && nearestBase && Room.killOnSight(roomName))
    {
        yield new Job_Loot          (roomName, 'loot',          {});
    }

    if (!inDanger && !isMyBase && isControllerRoom)
    {
        yield new Job_Reserve       (roomName, 'reserve',       {});
    }

    if (!inDanger && canExtract)
    {
        let sourceId = roomMemory.mineral.id;
        yield new Job_Extract       (roomName, 'extract_' + sourceId, { source: sourceId });
        yield new Job_Pave          (roomName, 'pave_'    + sourceId, { source: sourceId });
    }

    if (!inDanger && (canExtract || canHarvest))
    {
        yield new Job_Haul(roomName, 'haul', {});
        
        if (canHarvest)
        {
            for (let sourceId in roomMemory.sources)
            {
                let sourceMemory = roomMemory.sources[sourceId];
    
                yield new Job_Harvest   (roomName, 'harvest_' + sourceId, { source: sourceId });
                yield new Job_Pave      (roomName, 'pave_'    + sourceId, { source: sourceId });
            }
        }
    }

    if (!inDanger && isMyBase && planComplete)
    {
        yield new Job_Fortify       (roomName, 'fortify',       {});
        yield new Job_Build         (roomName, 'build',         {});
        yield new Job_Scout         (roomName, 'scout',         {});
        yield new Job_Ship          (roomName, 'ship',          {});
        yield new Job_Store         (roomName, 'store',         {});
        yield new Job_Upgrade       (roomName, 'upgrade',       {});
        yield new Job_Clean         (roomName, 'clean',         {});
    }

    if (!inDanger && (isSourceKeeperRoom || roomMemory.demolish))
    {
        yield new Job_Clean         (roomName, 'clean',         {});
    }
}

Room.getJobListAll = function*(roomName, roomMemory)
{
    let room = Game.rooms[roomName];
    let isMyBase = Room.isMyBase(roomName);
    let isSourceKeeperRoom = Room.isSourceKeeperRoom(roomName);
    let planComplete = false;
    if (isMyBase)
    {
        let planMemory = Room.getBasePlanMemory(roomName);
        if (planMemory && planMemory.planComplete)
            planComplete = true;
    }

    yield new Job_Quickfill     (roomName, 'quickfill',     {});
    yield new Job_Stock         (roomName, 'stock',         {});
    yield new Job_Send_Out      (roomName, 'send_out',      {});
    yield new Job_Fill_Spawn    (roomName, 'fill_spawn',    {});
    yield new Job_Fill_Towers   (roomName, 'fill_towers',   {});
    yield new Job_Fill_Cans     (roomName, 'fill_cans',     {});
    // if (room && room.quickCan1)
    //     yield new Job_Fill_Can     (roomName, 'fill_can_' + room.quickCan1.id,     { target: room.quickCan1.id });
    // if (room && room.quickCan2)
    //     yield new Job_Fill_Can     (roomName, 'fill_can_' + room.quickCan2.id,     { target: room.quickCan2.id });
    // if (room && room.controllerCan)
    //     yield new Job_Fill_Can     (roomName, 'fill_can_' + room.controllerCan.id, { target: room.controllerCan.id });
    yield new Job_Repair        (roomName, 'repair',        {});

    let baseLabsMemory = Room.getBaseLabsMemory(roomName);
    if (baseLabsMemory)
    {
        yield new Job_Empty_Labs    (roomName, 'empty_labs',    {});
        yield new Job_Fill_Labs     (roomName, 'fill_labs' ,    {});
    }

    if (roomMemory.mineral)
    {
        let sourceId = roomMemory.mineral.id;
        yield new Job_Extract       (roomName, 'extract_' + sourceId, { source: sourceId });
        yield new Job_Pave          (roomName, 'pave_'    + sourceId, { source: sourceId });
        yield new Job_Collect       (roomName, 'collect_' + sourceId, { source: sourceId });
    }

    if (roomMemory.sources)
    {
        for (let sourceId in roomMemory.sources)
        {
            let sourceMemory = roomMemory.sources[sourceId];
            yield new Job_Harvest   (roomName, 'harvest_' + sourceId, { source: sourceId });
            yield new Job_Pave      (roomName, 'pave_'    + sourceId, { source: sourceId });
            yield new Job_Collect   (roomName, 'collect_' + sourceId, { source: sourceId });
        }
    }

    if (constants.USE_POWER && roomMemory.powerBanks)
    {
        for (let powerBankId in roomMemory.powerBanks)
        {
            yield new Job_Power_Heal    (roomName, 'power_heal_'    + powerBankId, { source: powerBankId });
            yield new Job_Power_Attack  (roomName, 'power_attack_'  + powerBankId, { source: powerBankId });
            yield new Job_Power_Collect (roomName, 'power_collect_' + powerBankId, { source: powerBankId });
        }
    }

    if (constants.USE_FACTORY && roomMemory.deposits)
    {
        for (let depositId in roomMemory.deposits)
        {
            yield new Job_Deposit_Collect (roomName, 'deposit_collect_' + depositId, { source: depositId });
            yield new Job_Deposit_Harvest (roomName, 'deposit_harvest_' + depositId, { source: depositId });
        }
    }

    yield new Job_Build         (roomName, 'build',         {});
    yield new Job_Pave          (roomName, 'pave',          {});
    yield new Job_Fortify       (roomName, 'fortify',       {});
    yield new Job_Scout         (roomName, 'scout',         {});
    yield new Job_Store         (roomName, 'store',         {});
    yield new Job_Upgrade       (roomName, 'upgrade',       {});

    yield new Job_Clean         (roomName, 'clean',         {});

    yield new Job_Loot          (roomName, 'loot',          {});
    yield new Job_Reserve       (roomName, 'reserve',       {});

    yield new Job_Destroy       (roomName, 'destroy',       {});
    yield new Job_Demolish      (roomName, 'demolish',      {});
    yield new Job_Claim         (roomName, 'claim',         {});

    yield new Job_Clear         (roomName, 'clear',         {});

    yield new Job_Repel         (roomName, 'repel',         {});
    yield new Job_Defend        (roomName, 'defend',        {});
    yield new Job_Commando      (roomName, 'commando',      {});
    yield new Job_Smash         (roomName, 'smash',         {});
    yield new Job_Drain         (roomName, 'drain',         {});
    yield new Job_Assault       (roomName, 'assault',       {});
    yield new Job_Attack        (roomName, 'attack',        {});
    

    yield new Job_Watch         (roomName, 'watch', {});
    yield new Job_Controller_Blocker (roomName, 'controller_blocker', {});
    

    if (Game.shard.name == 'shardSeason')
    {
        yield new Job_Caravan_Deliver(roomName, 'caravan_deliver', {});
        yield new Job_Caravan_Search (roomName, 'caravan_search',  {});
    }
}

Room.getCreepCounts = function(roomName)
{
    let creepCounts = {};
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return creepCounts;

    let jobList = Room.getJobListAll(roomName, roomMemory);

    let nextJob = jobList.next();

    let total = 0;

    while (nextJob.value)
    {
        if (!creepCounts[nextJob.value.jobType])
            creepCounts[nextJob.value.jobType] = 0;

        let jobCreepCount = nextJob.value.getCreepCount();

        total += jobCreepCount;
        creepCounts[nextJob.value.jobType] += jobCreepCount;

        nextJob = jobList.next();
    }

    jobList.return();

    // if (total > 0)
    //     console.log('Room.getCreepCounts - ' + roomName + ' - ' + total + ' creeps found');

    return creepCounts;
}

Room.getJobCreeps = function(roomName, jobId)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.creeps || !roomMemory.creeps[jobId])
        return [];

    Room.resetJobCreepIndices(roomMemory, jobId);

    if (!roomMemory.creeps || !roomMemory.creeps[jobId])
        return [];
    
    let creeps = roomMemory.creeps[jobId].map(c => Game.creeps[c]);

    return creeps;
}

Room.getJobCreepMemories = function(roomName, jobId)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.creeps || !roomMemory.creeps[jobId])
        return [];

    Room.resetJobCreepIndices(roomMemory, jobId);

    if (!roomMemory.creeps || !roomMemory.creeps[jobId])
        return [];

    let creepMemories = roomMemory.creeps[jobId].map(cn => Memory.creeps[cn]);

    return creepMemories;
}

Room.getJobSpawnedCreeps = function(roomName, jobId)
{
    return _.filter(Room.getJobCreeps(roomName, jobId), c => !c.spawning);
}

Room.getJobCreepCount = function(roomName, jobId)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.creeps || !roomMemory.creeps[jobId])
        return 0;

    return roomMemory.creeps[jobId].length;
}

Room.resetJobCreepIndices = function(roomMemory, jobId)
{
    if (!roomMemory || !roomMemory.creeps || !roomMemory.creeps[jobId])
        return;

    roomMemory.creeps[jobId] = _.filter(roomMemory.creeps[jobId], cn => Memory.creeps[cn] && Game.creeps[cn]);

    if (roomMemory.creeps[jobId].length <= 0)
    {
        delete roomMemory.creeps[jobId];
        if (Object.keys(roomMemory.creeps).length <= 0)
            delete roomMemory.creeps;

        return;
    }

    for (let creepIndex in roomMemory.creeps[jobId])
    {
        let creepMemory = Memory.creeps[roomMemory.creeps[jobId][creepIndex]];
        if (creepMemory)
            creepMemory.n = creepIndex;
    }
}

Room.addCreepToJob = function(roomName, jobType, jobId, creepName, jobMemory)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return false;

    let JobClass = jobClasses[jobType];
    if (!JobClass)
        return false;

    let job = new JobClass(roomName, jobId, {});

    if (!roomMemory.creeps)
        roomMemory.creeps = {};
    if (!roomMemory.creeps[jobId])
        roomMemory.creeps[jobId] = [];

    roomMemory.creeps[jobId].push(creepName);

    Room.resetJobCreepIndices(roomMemory, jobId);

    // console.log('Room.addCreepToJob - ' + roomName + ' - ' + creepName + ' added to ' + jobId);

    job.creepAdded(creepName, jobMemory);

    return true;
}

Room.removeCreepFromJob = function(roomName, jobType, jobId, creepName)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory || !roomMemory.creeps || !roomMemory.creeps[jobId])
    {
        console.log('Room.removeCreepFromJob - ' + roomName + ' - could not remove ' + creepName + ' from job '+ jobId);
        return;
    }

    let oldCreepCount = roomMemory.creeps[jobId].length;
    roomMemory.creeps[jobId] = _.filter(roomMemory.creeps[jobId], cn => cn != creepName);
    let newCreepCount = roomMemory.creeps[jobId].length;
    let difference = oldCreepCount - newCreepCount;

    // console.log('Room.getCreepCounts - ' + roomName + ' - ' + difference + ' creeps removed from ' + jobId);

    Room.resetJobCreepIndices(roomMemory, jobId);

    let JobClass = jobClasses[jobType];
    if (!JobClass)
        return false;

    let job = new JobClass(roomName, jobId, {});
    job.creepRemoved(creepName);
}

Room.getDesiredSpawn = function(roomName, spawn, isHome, isRemote, idleCreepsRoom)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return null;

    let isBase = Room.isMyBase(roomName);
    let inDanger = Room.inDanger(roomName);

    let desiredSpawn = null;

    let jobList = Room.getJobList(roomName, isHome, isRemote);

    let nextJob = jobList.next();

    while (nextJob.value)
    {
        // if (roomName == 'E28S19')
        //     console.log('Room.getDesiredSpawn - ' + roomName + ' - ' + ' - isBase: ' + isBase + ' - isMilitary: ' + nextJob.value.isMilitary + ' - inDanger: ' + inDanger + ' - isRemote: ' + isRemote + ' - ' + JSON.stringify(nextJob.value.id));
        if (isBase || nextJob.value.isMilitary || !inDanger)
        {
            let startCpu = Game.cpu.getUsed();
            let profileInfo = kernel.scheduler.startProfile(nextJob.value.constructor.name);
            desiredSpawn = nextJob.value.getDesiredSpawn(spawn);
            if (desiredSpawn)
                desiredSpawn.room = nextJob.value.roomName;
            kernel.scheduler.endProfile(startCpu, profileInfo);
        }
            

        if (desiredSpawn && desiredSpawn.utility <= 0)
            desiredSpawn = null;
        if (desiredSpawn)
        {
            if (!idleCreepsRoom || desiredSpawn.swarm)
                break;

            let idleCreepOfType = _.find(idleCreepsRoom.find(FIND_MY_CREEPS), c => c.memory.type == desiredSpawn.type && c.isIdle());
            if (!idleCreepOfType)
                break;
        }

        nextJob = jobList.next();
    }

    jobList.return();

    return desiredSpawn;
}

Room.getDesiredSpawnInRange = function*(roomName, range, spawn, skipHome, isRemote, idleCreepsRoom)
{
    let roomList = Room.getRoomNamesInRangeFloodFillFiltered(roomName, range, rn => !Room.inDanger(rn) && (Room.isMyBase(rn) || !Room.getMemory(rn) || !Room.getMemory(rn).controller || !Room.getMemory(rn).controller.o), true);

    //console.log('Room.getDesiredSpawnInRange - from ' + roomName + ' - ' + JSON.stringify(roomList))
    if (!isRemote)
    {
        // roomList = _.sortByOrder(roomList, [o => o.depth, o => !Memory.rooms[o.name] || Memory.rooms[o.name].nearestBase == roomName], ['asc', 'desc']);
        roomList = _.sortByOrder(roomList, 
            [o => o.depth, 
             o => (Memory.rooms[o.name] && Memory.rooms[o.name].sources) ? Object.keys(Memory.rooms[o.name].sources).length : 0,
             o => (Memory.empire && Memory.empire.accounting && Memory.empire.accounting.mineralValues && Memory.rooms[o.name] && !Memory.rooms[o.name].controller && Memory.rooms[o.name].mineral) ? Memory.empire.accounting.mineralValues[Memory.rooms[o.name].mineral.type] : 0],
              ['asc', 'desc', 'desc']);
    }
    
    let startingRoomStatus = Game.map.getRoomStatus(roomName);

    let desiredSpawn = null;


    for (let nextEntry of roomList)
    {
        let nextRoomName = nextEntry.name;

        let roomStatus = Game.map.getRoomStatus(nextRoomName);
        if (roomStatus && startingRoomStatus && roomStatus.status != startingRoomStatus.status)
        {
            //console.log('Room.getDesiredSpawnInRange - ' + roomName + ' - skipping unavailable room ' + nextRoomName + ' - ' + startingRoomStatus.status + ' - ' + roomStatus.status);
            yield {};
            continue;
        }
        
        //if (roomName == 'W17N35')
        //    console.log('Room.getDesiredSpawnInRange - ' + roomName + ' - checking ' + nextRoomName);
        let ignore = Room.shouldIgnore(nextRoomName);
        if (ignore)
        {
            //console.log('Room.getDesiredSpawnInRange - ' + roomName + ' - ignoring ' + nextRoomName);
            yield {};
            continue;
        }

        let isHome = (nextRoomName == roomName);
        if (!isHome || !skipHome)
            desiredSpawn = Room.getDesiredSpawn(nextRoomName, spawn, isHome, isRemote, idleCreepsRoom);

        if (desiredSpawn)
            yield desiredSpawn;
        else
            yield {};
    }

    yield null;
}

// Room.getDesiredSpawnInRange = function*(roomName, range, spawn, skipHome, isRemote)
// {
//     let roomList = Room.getRoomNamesInRangeFloodFillGenerator(roomName, range, rn => !Room.inDanger(rn), true);
    
//     let startingRoomStatus = Game.map.getRoomStatus(roomName);

//     let desiredSpawn = null;
//     let nextRoom = roomList.next();
//     while (nextRoom.value)
//     {
//         let roomStatus = Game.map.getRoomStatus(nextRoom.value);
//         if (roomStatus && startingRoomStatus && roomStatus.status != startingRoomStatus.status)
//         {
//             //console.log('Room.getDesiredSpawnInRange - ' + roomName + ' - skipping unavailable room ' + nextRoom.value + ' - ' + startingRoomStatus.status + ' - ' + roomStatus.status);
//             yield {};
//             nextRoom = roomList.next();
//             continue;
//         }
        
//         // if (nextRoom.value == 'E24S17')
//         //     console.log('Room.getDesiredSpawnInRange - ' + roomName + ' - checking ' + nextRoom.value);
//         let ignore = Room.shouldIgnore(nextRoom.value);
//         if (ignore)
//         {
//             console.log('Room.getDesiredSpawnInRange - ' + roomName + ' - ignoring ' + nextRoom.value);
//             yield {};
//             nextRoom = roomList.next();
//             continue;
//         }

//         let isHome = (nextRoom.value == roomName);
//         if (!isHome || !skipHome)
//             desiredSpawn = Room.getDesiredSpawn(nextRoom.value, spawn, isHome, isRemote);

//         if (desiredSpawn)
//             yield desiredSpawn;
//         else
//             yield {};

//         nextRoom = roomList.next();
//     }

//     roomList.return();

//     yield null;
// }

Room.findTask = function(roomName, creep, isHome, isRemote)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return null;

    let isBase = Room.isMyBase(roomName);
    let inDanger = Room.inDanger(roomName);

    let task = null;

    let jobList = Room.getJobList(roomName, isHome, isRemote);

    let nextJob = jobList.next();
    while (nextJob.value)
    {
        //console.log('Room.findTask - ' + roomName + ' - ' + JSON.stringify(nextJob.value.id));
        if (isBase || nextJob.value.isMilitary || !inDanger)
        {
            let startCpu = Game.cpu.getUsed();
            let profileInfo = kernel.scheduler.startProfile(nextJob.value.constructor.name);
            task = nextJob.value.getTask(creep);
            if (task)
                task.room = nextJob.value.roomName;
            kernel.scheduler.endProfile(startCpu, profileInfo);
        }

        if (task)
            break;

        nextJob = jobList.next();
    }

    jobList.return();

    return task;
}

Room.findTaskInRange = function(roomName, range, creep, isRemote)
{
    let roomList = Room.getRoomNamesInRangeFloodFillFiltered(roomName, range, rn => !Room.inDanger(rn) && (Room.isMyBase(rn) || !Room.getMemory(rn) || !Room.getMemory(rn).controller || !Room.getMemory(rn).controller.o), true);

    let baseName = creep.memory.spawnRoom;
    let nearestBase = Room.getNearestBase(roomName);
    if (nearestBase)
        baseName = nearestBase.name;

    if (!isRemote)
    {
        // roomList = _.sortByOrder(roomList, [o => o.depth, o => !Memory.rooms[o.name] || Memory.rooms[o.name].nearestBase == roomName], ['asc', 'desc']);
        roomList = _.sortByOrder(roomList, 
            [o => o.depth, 
                o => (Memory.rooms[o.name] && Memory.rooms[o.name].sources) ? Object.keys(Memory.rooms[o.name].sources).length : 0,
                o => (Memory.empire && Memory.empire.accounting && Memory.empire.accounting.mineralValues && Memory.rooms[o.name] && !Memory.rooms[o.name].controller && Memory.rooms[o.name].mineral) ? Memory.empire.accounting.mineralValues[Memory.rooms[o.name].mineral.type] : 0],
                ['asc', 'desc', 'desc']);
    }

    let task = null;
    for (let nextEntry of roomList)
    {
        let nextRoomName = nextEntry.name;
        if (nextRoomName == roomName)
            continue;

        let ignore = Room.shouldIgnore(nextRoomName);
        if (ignore)
        {
            //console.log('Room.findTaskInRange - ' + roomName + ' - ignoring ' + nextRoomName);
            continue;
        }

        task = Room.findTask(nextRoomName, creep, false, isRemote);

        if (task)
            return task;
    }

    return task;
}


// Room.findTaskInRange = function(roomName, range, creep, isRemote)
// {
//     let roomList = Room.getRoomNamesInRangeFloodFillGenerator(roomName, range, rn => !Room.inDanger(rn), true);

//     let task = null;
//     let nextRoom = roomList.next();
//     while (nextRoom.value && !task)
//     {
            // if (nextRoomName == roomName)
            //     continue;
//         let ignore = Room.shouldIgnore(nextRoom.value);
//         if (ignore)
//         {
//             console.log('Room.findTaskInRange - ' + roomName + ' - ignoring ' + nextRoom.value);
//             nextRoom = roomList.next();
//             continue;
//         }

//         task = Room.findTask(nextRoom.value, creep, false, isRemote);
//         nextRoom = roomList.next();
//     }

//     return task;
// }

Room.cancelCivilianJobs = function(roomName)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return;

    let jobList = Room.getJobListAll(roomName, roomMemory);

    let nextJob = jobList.next();

    let total = 0;

    while (nextJob.value)
    {
        let jobCreepCount = nextJob.value.getCreeps().length
        total += jobCreepCount;

        if (!nextJob.value.isMilitary)
            nextJob.value.layOffAllCreeps();
        nextJob = jobList.next();
    }

    jobList.return();

    if (total > 0)
        console.log('********Room.cancelCivilianJobs - ' + roomName + ' - ' + total + ' creeps jobs canceled');

    return;
}

Room.getPaveTime = function(roomName, paveKey)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return 0;

    if (!roomMemory.paveTime || !roomMemory.paveTime[paveKey])
        return 0;

    return roomMemory.paveTime[paveKey];
}

Room.setPaveTime = function(roomName, paveKey, time)
{
    let roomMemory = Room.getMemory(roomName);
    if (!roomMemory)
        return;

    if (!roomMemory.paveTime)
        roomMemory.paveTime = {};

    roomMemory.paveTime[paveKey] = time;
}
