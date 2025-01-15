import { Position } from './types'
import { ROOMS, GRID_SIZE, Corridor } from './constants'

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

    // Initialize grid with all walkable spaces
    const grid: boolean[][] = Array(gridHeight).fill(null).map(() =>
        Array(gridWidth).fill(true)
    )

    // Mark rooms while keeping their interiors walkable
    ROOMS.forEach((room) => {
        const startX = Math.max(0, Math.floor(room.position.x / GRID_SIZE))
        const startY = Math.max(0, Math.floor(room.position.y / GRID_SIZE))
        const endX = Math.min(gridWidth - 1, Math.floor((room.position.x + room.width) / GRID_SIZE))
        const endY = Math.min(gridHeight - 1, Math.floor((room.position.y + room.height) / GRID_SIZE))

        // Only mark the walls as unwalkable
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (y < 0 || y >= gridHeight || x < 0 || x >= gridWidth) continue

                // Mark only the walls as unwalkable
                const isWall = x === startX || x === endX || y === startY || y === endY

                // Create doors at the center of each wall
                const centerX = Math.floor((startX + endX) / 2)
                const centerY = Math.floor((startY + endY) / 2)

                const isDoor = (
                    (isWall && x === centerX) || // Horizontal doors
                    (isWall && y === centerY)    // Vertical doors
                )

                // Set cell walkability
                if (isWall && !isDoor) {
                    grid[y][x] = false // Wall is unwalkable
                } else {
                    grid[y][x] = true  // Interior and doors are walkable
                }
            }
        }
    })

    // Add debug logging for grid
    console.log('Grid created with dimensions:', {
        width: gridWidth,
        height: gridHeight,
        walkableCells: grid.flat().filter(cell => cell).length
    });

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
): Position[] => {
    // Convert world coordinates to grid coordinates
    const startGridX = Math.floor(start.x / GRID_SIZE)
    const startGridY = Math.floor(start.y / GRID_SIZE)
    const endGridX = Math.floor(end.x / GRID_SIZE)
    const endGridY = Math.floor(end.y / GRID_SIZE)

    // Validate grid coordinates
    if (startGridX < 0 || startGridY < 0 || endGridX < 0 || endGridY < 0 ||
        startGridX >= grid[0].length || startGridY >= grid.length ||
        endGridX >= grid[0].length || endGridY >= grid.length) {
        console.error('Invalid grid coordinates', { start, end, grid: { w: grid[0].length, h: grid.length } })
        return []
    }

    // Check if start or end is in unwalkable cell
    if (!grid[startGridY][startGridX] || !grid[endGridY][endGridX]) {
        console.error('Start or end position is unwalkable', {
            start: grid[startGridY][startGridX],
            end: grid[endGridY][endGridX]
        })
        return []
    }

    const startNode: Node = {
        x: startGridX,
        y: startGridY,
        f: 0,
        g: 0,
        h: 0,
    }

    const endNode: Node = {
        x: endGridX,
        y: endGridY,
        f: 0,
        g: 0,
        h: 0,
    }

    const openSet: Node[] = [startNode]
    const closedSet = new Set<string>() // Using string key for better performance

    while (openSet.length > 0) {
        // Find node with lowest f value
        let currentNode = openSet[0]
        let currentIndex = 0
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < currentNode.f) {
                currentNode = openSet[i]
                currentIndex = i
            }
        }

        // Found the goal
        if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
            const path: Position[] = []
            let current: Node | undefined = currentNode

            while (current) {
                path.push({
                    x: current.x * GRID_SIZE + GRID_SIZE / 2,
                    y: current.y * GRID_SIZE + GRID_SIZE / 2,
                })
                current = current.parent
            }

            return path.reverse()
        }

        // Move current node from open to closed set
        openSet.splice(currentIndex, 1)
        closedSet.add(`${currentNode.x},${currentNode.y}`)

        // Check neighbors
        const neighbors = getNeighbors(currentNode, grid)
        for (const neighbor of neighbors) {
            if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue
            }

            // Calculate g score for this path
            const tentativeG = currentNode.g + (
                Math.abs(neighbor.x - currentNode.x) + Math.abs(neighbor.y - currentNode.y) === 2
                    ? 1.4 // Diagonal movement cost
                    : 1   // Cardinal movement cost
            )

            const existingNeighbor = openSet.find(
                node => node.x === neighbor.x && node.y === neighbor.y
            )

            if (!existingNeighbor) {
                // New node
                neighbor.g = tentativeG
                neighbor.h = manhattanDistance(
                    { x: neighbor.x, y: neighbor.y },
                    { x: endNode.x, y: endNode.y }
                )
                neighbor.f = neighbor.g + neighbor.h
                neighbor.parent = currentNode
                openSet.push(neighbor)
            } else if (tentativeG < existingNeighbor.g) {
                // Better path found
                existingNeighbor.g = tentativeG
                existingNeighbor.f = existingNeighbor.g + existingNeighbor.h
                existingNeighbor.parent = currentNode
            }
        }
    }

    console.error('No path found', { start, end })
    return [] // No path found
}

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