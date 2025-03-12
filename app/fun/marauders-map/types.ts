export type TimeBlock =
    | 'NIGHT1'    // 22:00 - 06:00
    | 'NIGHT2'    // 22:00 - 06:00
    | 'MORNING'   // 06:00 - 10:00
    | 'NOON'      // 10:00 - 14:00
    | 'AFTERNOON' // 14:00 - 18:00
    | 'EVENING'   // 18:00 - 22:00

export type CharacterMode =
    | 'WALK'   // Moving between rooms
    | 'WANDER' // Free movement within a room
    | 'SLEEP'  // Stationary in room

export type CharacterType =
    | 'STUDENT'
    | 'TEACHER'

export interface Position {
    x: number
    y: number
}

export interface Room {
    id: string
    name: string
    position: Position
    width: number
    height: number
}

export interface Character {
    // Core properties
    id: string
    name: string
    type: CharacterType

    // Movement state
    position: Position
    targetPosition: Position
    mode: CharacterMode

    // Pathfinding state
    path: Position[]
    pathIndex: number

    // Room tracking
    currentRoom?: Room

    // Animation state
    lastFootstepTime?: number
    lastFootstepWasLeft?: boolean

    // Optional debug info
    debugInfo?: {
        lastPathCalculation: number
        pathAttempts: number
        stuckCount: number
    }
}

export interface FootstepInstance {
    id: string
    position: Position
    isLeft: boolean
    opacity: number
    rotation: number
    timestamp: number
}

export interface Schedule {
    timeBlock: TimeBlock
    activity: string
    room: string
    mode: CharacterMode
}

export interface MovementState {
    position: Position
    path: Position[]
    pathIndex: number
    targetPosition?: Position
}

export interface PathfindingResult {
    success: boolean
    path: Position[]
    message?: string
}

export interface GridCell {
    x: number
    y: number
    walkable: boolean
    cost: number
    type?: 'room' | 'door' | 'corridor'
}

// For type safety in movement calculations
export interface Vector2D {
    x: number
    y: number
}