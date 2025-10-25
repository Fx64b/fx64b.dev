// types.ts
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
    | 'CLIMB'  // Moving between floors

export type CharacterType =
    | 'GRYFFINDOR'
    | 'SLYTHERIN'
    | 'RAVENCLAW'
    | 'HUFFLEPUFF'
    | 'TEACHER'
    | 'HEADMASTER'
    | 'STAFF'
    | 'GHOST'

export interface Position {
    x: number;
    y: number;
}

export interface Floor {
    id: string;
    name: string;
    level: number;
    position: Position;
    width: number;
    height: number;
    visible: boolean;
}

export interface Room {
    id: string;
    name: string;
    floorId: string;
    position: Position;
    width: number;
    height: number;
}

export interface StaircaseConnection {
    id: string;
    name: string;
    startFloorId: string;
    endFloorId: string;
    startPosition: Position;
    endPosition: Position;
    width: number;
    isSecret?: boolean;
    isMoving?: boolean;
}

export interface Character {
    id: string;
    name: string;
    type: CharacterType;
    position: Position;
    targetPosition: Position;
    mode: CharacterMode;
    path: Position[];
    pathIndex: number;
    currentFloorId: string;
    currentRoom?: string;
    lastFootstepTime?: number;
    lastFootstepWasLeft?: boolean;
    debugInfo?: {
        lastPathCalculation: number;
        pathAttempts: number;
        stuckCount: number;
    };
}

export interface FootstepInstance {
    id: string;
    position: Position;
    floorId: string;
    isLeft: boolean;
    opacity: number;
    rotation: number;
    timestamp: number;
}

export interface Schedule {
    timeBlock: TimeBlock;
    activity: string;
    room: string;
    mode: CharacterMode;
    floorId: string;
}

export interface PathfindingResult {
    success: boolean;
    path: Position[];
    message?: string;
    targetFloorId?: string;
    needsStaircase?: boolean;
}