// util_transforms

const { fromRoomPosition } = require("./WorldPosition");

module.exports =
{
    createTransform: function(defaultValue)
    {
        defaultValue = (defaultValue || 0);

        let transform = [];

        for (var i = 0; i < 50; ++i)
        {
            transform.push([]);
            for (var j = 0; j < 50; ++j)
            {
                transform[i].push(defaultValue);
            }
        }

        return transform;
    },

    distanceFromObstructionTransform: function(roomName)
    {
        var transform = this.createTransform(-1);

        let terrain = Game.map.getRoomTerrain(roomName);
        
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL || new RoomPosition(i, j, roomName).isObstructed(null, false, true, false, false)), 0);

        this.floodFillDistance(transform);

        return transform;
    },

    distanceFromSwampTransform: function(roomName)
    {
        var transform = this.createTransform(-1);

        let terrain = Game.map.getRoomTerrain(roomName);
        
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_WALL || new RoomPosition(i, j, roomName).isObstructed(null, false, true, true, true)), -2);
        this.fillTransformValues(transform, (i, j) => (terrain.get(i, j) == TERRAIN_MASK_SWAMP), 0);

        this.floodFillDistance(transform);

        return transform;
    },

    // expects walls to be an array of {x, y} denoting wall positions
    insideBaseTransform: function(roomName, walls, exit = FIND_EXIT)
    {
        var transform = this.outsideBaseTransform(roomName, walls, exit);

        for (let wall of walls)
            transform[wall.x][wall.y] = -1;

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                if (transform[i][j] == -1)
                    transform[i][j] = 1;
                else if (transform[i][j] == 1)
                    transform[i][j] = -1;
            }
        }

        return transform;
    },

    outsideBaseTransform: function(roomName, walls, exit = FIND_EXIT)
    {
        var transform = this.createTransform(-1);

        let terrain = Game.map.getRoomTerrain(roomName);

        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                // ignore walls
                if (terrain.get(i, j) == TERRAIN_MASK_WALL)
                {
                    transform[i][j] = -2;
                }
                // start flood fill at exits
                else if (exit == FIND_EXIT && (i == 0 || j == 0 || i == 49 || j == 49))
                {
                    transform[i][j] = 0;
                }
                else if (exit == FIND_EXIT_TOP && j == 0)
                {
                    transform[i][j] = 0;
                }
                else if (exit == FIND_EXIT_RIGHT && i == 49)
                {
                    transform[i][j] = 0;
                }
                else if (exit == FIND_EXIT_BOTTOM && j == 49)
                {
                    transform[i][j] = 0;
                }
                else if (exit == FIND_EXIT_LEFT && i == 0)
                {
                    transform[i][j] = 0;
                }
            }
        }

        this.floodFillValue(transform, 1, walls);

        return transform;
    },

    fillTransformValues: function(transform, cellCheck, value)
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
    },

    floodFillValue: function(transform, value, blockers)
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
    },

    floodFillDistance: function(transform, maxValue, blockers)
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
                continue;

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
    },

    drawCostMatrix: function(costMatrix, roomName, maxDepth, showNumbers)
    {
        let roomVisual = new RoomVisual(roomName);
        if (costMatrix && roomVisual && maxDepth > 0)
        {
            for (var i = 0; i < 50; ++i)
            {
                for (var j = 0; j < 50; ++j)
                {
                    let value = costMatrix.get(i, j);
                    if (value > 0)
                    {
                        var opacity = 0;
                        if (value <= maxDepth)
                            opacity = value / (maxDepth * 2);
    
                        if (value == maxDepth)
                            roomVisual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#0000ff", opacity: opacity})
                        else
                            roomVisual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#ff0000", opacity: opacity})
    
                        if (showNumbers)
                            roomVisual.text(value, i, j + .2, {opacity: 0.5});
                    }
                }
            }
        }
    },

    drawString: function(stringToDraw, roomName, maxDepth, showNumbers)
    {
        if (!stringToDraw || stringToDraw.length < 2500 || maxDepth <= 0)
            return;

        let roomVisual = new RoomVisual(roomName);
        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
            {
                let index = (i * 50) + j;
                let value = stringToDraw.charAt(index);
                if (value > 0)
                {
                    var opacity = 0;
                    if (value <= maxDepth)
                        opacity = value / (maxDepth * 2);

                    if (value == maxDepth)
                        roomVisual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#0000ff", opacity: opacity})
                    else
                        roomVisual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#ff0000", opacity: opacity})

                    if (showNumbers)
                        roomVisual.text(value, i, j + .2, {opacity: 0.5});
                }
            }
        }
    },

    drawTransform: function(transform, roomName, maxDepth, showNumbers)
    {
        let roomVisual = new RoomVisual(roomName);
        if (transform && roomVisual && maxDepth > 0)
        {
            for (var i = 0; i < 50; ++i)
            {
                if (!transform[i])
                    continue;
                for (var j = 0; j < 50; ++j)
                {
                    if (transform[i][j] > 0)
                    {
                        var opacity = 0;
                        if (transform[i][j] <= maxDepth)
                            opacity = transform[i][j] / (maxDepth * 2);

                        // if (transform[i][j] == maxDepth)
                        //     roomVisual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#0000ff", opacity: opacity})
                        // else
                            roomVisual.rect(i - 0.5, j - 0.5, 1, 1, {fill: "#ff0000", opacity: opacity})

                        if (showNumbers)
                            roomVisual.text(Math.floor(transform[i][j]), i, j + .2, {opacity: 0.5});
                    }
                }
            }
        }
    },

    convertTransformToCostMatrix(transform)
    {
        let costMatrix = new PathFinder.CostMatrix;
        for (var i = 0; i < 50; ++i)
        {
            for (var j = 0; j < 50; ++j)
                costMatrix.set(i, j, Math.max(0, Math.floor(transform[i][j])));
        }

        return costMatrix;
    }
};
