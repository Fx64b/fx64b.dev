import { PathfindingResult, Position } from './types'
import { ROOMS, GRID_SIZE, Corridor, CORRIDORS, PATHFINDING_TIMEOUT } from './constants'

interface Node {
    x: number
    y: number
    f: number
    g: number
    h: number
    parent?: Node
}

const createGrid = (width: number, height: number): boolean[][] => {
    const gridWidth = Math.ceil(width / GRID_SIZE)
    const gridHeight = Math.ceil(height / GRID_SIZE)

    // Initialize grid with all unwalkable spaces
    const grid: boolean[][] = Array(gridHeight).fill(null).map(() =>
        Array(gridWidth).fill(false),
    )

    // Mark corridors as walkable
    CORRIDORS.forEach((corridor) => {
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (isInCorridor(x, y, corridor)) {
                    grid[y][x] = true
                }
            }
        }
    })

    // Process rooms and their entrances
    ROOMS.forEach((room) => {
        const startX = Math.max(0, Math.floor(room.position.x / GRID_SIZE))
        const startY = Math.max(0, Math.floor(room.position.y / GRID_SIZE))
        const endX = Math.min(gridWidth - 1, Math.floor((room.position.x + room.width) / GRID_SIZE))
        const endY = Math.min(gridHeight - 1, Math.floor((room.position.y + room.height) / GRID_SIZE))

        // Process room
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (y < 0 || y >= gridHeight || x < 0 || x >= gridWidth) {continue}

                const isWall = x === startX || x === endX || y === startY || y === endY
                const centerX = Math.floor((startX + endX) / 2)
                const centerY = Math.floor((startY + endY) / 2)

                // Create doors where corridors meet room walls
                const isAtCorridor = CORRIDORS.some(corridor =>
                    isInCorridor(x, y, corridor),
                )

                if (isWall) {
                    // Make the cell walkable if it's a door (intersection with corridor)
                    grid[y][x] = isAtCorridor
                } else {
                    // Interior of room is walkable
                    grid[y][x] = true
                }
            }
        }
    })

    return grid
}

const getNeighbors = (node: Node, grid: boolean[][]): Node[] => {
    const neighbors: Node[] = []
    // Cardinal directions first, then diagonals
    const directions = [
        { x: 0, y: -1 },  // North
        { x: 1, y: 0 },   // East
        { x: 0, y: 1 },   // South
        { x: -1, y: 0 },  // West
        { x: 1, y: -1 },  // Northeast
        { x: 1, y: 1 },   // Southeast
        { x: -1, y: 1 },  // Southwest
        { x: -1, y: -1 }, // Northwest
    ]

    for (const dir of directions) {
        const newX = node.x + dir.x
        const newY = node.y + dir.y

        // Check bounds
        if (newX < 0 || newX >= grid[0].length || newY < 0 || newY >= grid.length) {
            continue
        }

        // Check if walkable
        if (!grid[newY][newX]) {
            continue
        }

        // Check diagonal movement
        if (Math.abs(dir.x) === 1 && Math.abs(dir.y) === 1) {
            // Check if we can move diagonally (both adjacent cells must be walkable)
            if (!grid[node.y][newX] || !grid[newY][node.x]) {
                continue
            }
        }

        neighbors.push({
            x: newX,
            y: newY,
            f: 0,
            g: 0,
            h: 0,
        })
    }

    return neighbors
}

const manhattanDistance = (pos1: Position, pos2: Position): number => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

const findPath = (
    start: Position,
    end: Position,
    grid: boolean[][],
): PathfindingResult => {
    const startTime = performance.now();

    // Convert world coordinates to grid coordinates
    let startGridX = Math.floor(start.x / GRID_SIZE);
    let startGridY = Math.floor(start.y / GRID_SIZE);
    let endGridX = Math.floor(end.x / GRID_SIZE);
    let endGridY = Math.floor(end.y / GRID_SIZE);

    // Validate grid coordinates
    if (startGridX < 0 || startGridY < 0 || endGridX < 0 || endGridY < 0 ||
        startGridX >= grid[0].length || startGridY >= grid.length ||
        endGridX >= grid[0].length || endGridY >= grid.length) {
        return {
            success: false,
            path: [],
            message: "Start or end position is outside the grid bounds"
        };
    }

    // Check if start or end is in unwalkable cell
    if (!grid[startGridY][startGridX]) {
        // Find nearest walkable cell for start
        const nearestStart = findNearestWalkableCell(startGridX, startGridY, grid);
        if (!nearestStart) {
            return {
                success: false,
                path: [],
                message: "No walkable cell near start position"
            };
        }
        startGridX = nearestStart.x;
        startGridY = nearestStart.y;
    }

    if (!grid[endGridY][endGridX]) {
        // Find nearest walkable cell for end
        const nearestEnd = findNearestWalkableCell(endGridX, endGridY, grid);
        if (!nearestEnd) {
            return {
                success: false,
                path: [],
                message: "No walkable cell near end position"
            };
        }
        endGridX = nearestEnd.x;
        endGridY = nearestEnd.y;
    }

    const startNode: Node = {
        x: startGridX,
        y: startGridY,
        f: 0,
        g: 0,
        h: 0,
    };

    const endNode: Node = {
        x: endGridX,
        y: endGridY,
        f: 0,
        g: 0,
        h: 0,
    };

    const openSet: Node[] = [startNode];
    const closedSet = new Set<string>(); // Using string key for better performance

    while (openSet.length > 0) {
        // Check timeout to prevent infinite loops
        if (performance.now() - startTime > PATHFINDING_TIMEOUT) {
            return {
                success: false,
                path: [],
                message: "Pathfinding timeout reached"
            };
        }

        // Find node with lowest f value
        let currentNode = openSet[0];
        let currentIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < currentNode.f) {
                currentNode = openSet[i];
                currentIndex = i;
            }
        }

        // Found the goal
        if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
            const rawPath: Position[] = [];
            let current: Node | undefined = currentNode;

            while (current) {
                rawPath.push({
                    x: current.x * GRID_SIZE + GRID_SIZE / 2,
                    y: current.y * GRID_SIZE + GRID_SIZE / 2,
                });
                current = current.parent;
            }

            const path = rawPath.reverse();
            // Apply path smoothing to create more natural movement
            const smoothedPath = smoothPath(path, grid);

            return {
                success: true,
                path: smoothedPath
            };
        }

        // Move current node from open to closed set
        openSet.splice(currentIndex, 1);
        closedSet.add(`${currentNode.x},${currentNode.y}`);

        // Check neighbors
        const neighbors = getNeighbors(currentNode, grid);
        for (const neighbor of neighbors) {
            if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue;
            }

            // Calculate g score for this path
            const tentativeG = currentNode.g + (
                Math.abs(neighbor.x - currentNode.x) + Math.abs(neighbor.y - currentNode.y) === 2
                    ? 1.4 // Diagonal movement cost
                    : 1   // Cardinal movement cost
            );

            const existingNeighbor = openSet.find(
                node => node.x === neighbor.x && node.y === neighbor.y,
            );

            if (!existingNeighbor) {
                // New node
                neighbor.g = tentativeG;
                neighbor.h = manhattanDistance(
                    { x: neighbor.x, y: neighbor.y },
                    { x: endNode.x, y: endNode.y },
                );
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;
                openSet.push(neighbor);
            } else if (tentativeG < existingNeighbor.g) {
                // Better path found
                existingNeighbor.g = tentativeG;
                existingNeighbor.f = existingNeighbor.g + existingNeighbor.h;
                existingNeighbor.parent = currentNode;
            }
        }
    }

    // No path found - handle this case better
    return {
        success: false,
        path: getApproximatePath(start, end),
        message: "No path found, using approximate path"
    };
};

const findNearestWalkableCell = (x: number, y: number, grid: boolean[][]): { x: number, y: number } | null => {
    const maxRadius = 5; // Maximum search radius

    for (let radius = 1; radius <= maxRadius; radius++) {
        // Check cells in a square around the point
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Skip if not on the perimeter of the square
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {continue;}

                const nx = x + dx;
                const ny = y + dy;

                // Skip if out of bounds
                if (nx < 0 || ny < 0 || nx >= grid[0].length || ny >= grid.length) {continue;}

                // Return if walkable
                if (grid[ny][nx]) {
                    return { x: nx, y: ny };
                }
            }
        }
    }

    return null; // No walkable cell found within radius
};

const getApproximatePath = (start: Position, end: Position): Position[] => {
    const path: Position[] = [];
    const distance = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    // Create a simple straight-line path with points every 20 pixels
    const steps = Math.max(2, Math.ceil(distance / 20));

    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        path.push({
            x: start.x + t * (end.x - start.x),
            y: start.y + t * (end.y - start.y),
        });
    }

    return path;
};

const smoothPath = (path: Position[], grid: boolean[][]): Position[] => {
    if (path.length <= 2) {return path;}

    const smoothedPath: Position[] = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
        const current = smoothedPath[smoothedPath.length - 1];

        // Try to find the furthest visible point
        let furthestVisible = currentIndex + 1;
        for (let i = currentIndex + 2; i < path.length; i++) {
            if (hasLineOfSight(current, path[i], grid)) {
                furthestVisible = i;
            } else {
                break;
            }
        }

        // Add the furthest visible point to the smoothed path
        smoothedPath.push(path[furthestVisible]);
        currentIndex = furthestVisible;
    }

    return smoothedPath;
};

// Check if there's a clear line of sight between two points
const hasLineOfSight = (start: Position, end: Position, grid: boolean[][]): boolean => {
    // Convert to grid coordinates
    const startX = Math.floor(start.x / GRID_SIZE);
    const startY = Math.floor(start.y / GRID_SIZE);
    const endX = Math.floor(end.x / GRID_SIZE);
    const endY = Math.floor(end.y / GRID_SIZE);

    // Bresenham's line algorithm to check cells along the line
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;

    let x = startX;
    let y = startY;

    while (x !== endX || y !== endY) {
        // Check if current cell is walkable
        if (x < 0 || y < 0 || x >= grid[0].length || y >= grid.length || !grid[y][x]) {
            return false;
        }

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }

    return true;
};


const isInCorridor = (x: number, y: number, corridor: Corridor): boolean => {
    // Convert grid coordinates to world coordinates
    const worldX = x * GRID_SIZE
    const worldY = y * GRID_SIZE

    // Calculate corridor bounds
    const minX = Math.min(corridor.start.x, corridor.end.x) - corridor.width / 2
    const maxX = Math.max(corridor.start.x, corridor.end.x) + corridor.width / 2
    const minY = Math.min(corridor.start.y, corridor.end.y) - corridor.width / 2
    const maxY = Math.max(corridor.start.y, corridor.end.y) + corridor.width / 2

    // Check if point is within corridor bounds
    return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY
}

export { findPath, createGrid }