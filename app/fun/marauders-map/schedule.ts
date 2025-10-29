import React from 'react';
import {
    FLOORS,
    FOOTSTEP_SPACING,
    GRYFFINDOR_SCHEDULE,
    HEADMASTER_SCHEDULE,
    HUFFLEPUFF_SCHEDULE,
    RAVENCLAW_SCHEDULE,
    ROOMS,
    SLYTHERIN_SCHEDULE,
    STAIRCASES,
    STEP_SIZE,
    TEACHER_SCHEDULE,
    WANDER_RADIUS,
} from './constants';
import { findPath } from './pathfinding';
import { getCurrentTimeBlock } from './time';
import {
    Character,
    FootstepInstance,
    PathfindingResult,
    Position,
    Room,
    Schedule,
} from './types';

let setFootstepsRef: any | null = null;

export const initializeSchedule = (
    setFootsteps: React.Dispatch<React.SetStateAction<FootstepInstance[]>>
) => {
    setFootstepsRef = setFootsteps;
};

const getDistance = (p1: Position, p2: Position): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

const moveTowards = (
    current: Position,
    target: Position,
    speed: number
): Position => {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Return target position if we're close enough
    if (distance <= speed) {
        return target;
    }

    // Calculate movement
    const ratio = speed / distance;
    return {
        x: current.x + dx * ratio,
        y: current.y + dy * ratio,
    };
};

const generateRandomPositionInRoom = (room: Room): Position => {
    // Add padding to keep characters away from walls
    const padding = 10;
    return {
        x: room.position.x + padding + Math.random() * (room.width - 2 * padding),
        y: room.position.y + padding + Math.random() * (room.height - 2 * padding),
    };
};

const isPositionInRoom = (position: Position, room: Room): boolean => {
    return (
        position.x >= room.position.x &&
        position.x <= room.position.x + room.width &&
        position.y >= room.position.y &&
        position.y <= room.position.y + room.height
    );
};

const createFootstep = (
    position: Position,
    floorId: string,
    isLeft: boolean,
    angle: number
): FootstepInstance => {
    const footstep = {
        id: Math.random().toString(),
        position,
        floorId,
        isLeft,
        opacity: 1,
        rotation: angle,
        timestamp: Date.now(),
    };
    return footstep;
};

const handleWalking = (
    character: Character,
    targetRoom: Room,
    grid: boolean[][]
): { position: Position; path: Position[]; pathIndex: number; currentFloorId: string } => {
    const roomCenter = {
        x: targetRoom.position.x + targetRoom.width / 2,
        y: targetRoom.position.y + targetRoom.height / 2,
    };

    // Check if we need to change floors
    if (character.currentFloorId !== targetRoom.floorId) {
        // Find staircase connection
        const staircase = STAIRCASES.find(
            s =>
                (s.startFloorId === character.currentFloorId && s.endFloorId === targetRoom.floorId) ||
                (s.endFloorId === character.currentFloorId && s.startFloorId === targetRoom.floorId)
        );

        if (staircase) {
            // Get current floor position
            const currentFloor = FLOORS.find(f => f.id === character.currentFloorId);

            // Determine staircase entry point on current floor
            const staircaseEntryPosition =
                staircase.startFloorId === character.currentFloorId ?
                    staircase.startPosition : staircase.endPosition;

            // Calculate absolute position
            const absoluteEntryPosition = {
                x: staircaseEntryPosition.x,
                y: staircaseEntryPosition.y
            };

            // If we're near the staircase entry, change floors
            const distanceToStaircase = getDistance(character.position, absoluteEntryPosition);

            if (distanceToStaircase < STEP_SIZE * 2) {
                // Change floor
                const newFloorId =
                    staircase.startFloorId === character.currentFloorId ?
                        staircase.endFloorId : staircase.startFloorId;

                // Get the exit position on the new floor
                const exitPosition =
                    staircase.startFloorId === newFloorId ?
                        staircase.startPosition : staircase.endPosition;

                return {
                    position: exitPosition,
                    path: [],
                    pathIndex: 0,
                    currentFloorId: newFloorId
                };
            }

            // Otherwise, path to the staircase entry
            if (!character.path.length || character.pathIndex >= character.path.length) {
                const pathResult: PathfindingResult = findPath(
                    character.position,
                    absoluteEntryPosition,
                    grid
                );

                return {
                    position: character.position,
                    path: pathResult.success ? pathResult.path : (pathResult.path.length > 0 ? pathResult.path : []),
                    pathIndex: 0,
                    currentFloorId: character.currentFloorId
                };
            }
        }
    }

    // If we're on the correct floor, normal pathfinding to room
    if (character.currentFloorId === targetRoom.floorId) {
        if (!character.targetPosition || !isPositionInRoom(character.targetPosition, targetRoom)) {
            character.targetPosition = generateRandomPositionInRoom(targetRoom);
        }

        // If no path or path completed, calculate new path
        if (!character.path.length || character.pathIndex >= character.path.length) {
            const pathResult: PathfindingResult = findPath(
                character.position,
                character.targetPosition,
                grid
            );

            // If pathfinding failed but we have an approximate path, use it
            if (!pathResult.success && pathResult.path.length > 0) {
                // Pathfinding issue - using approximate path
                return {
                    position: character.position,
                    path: pathResult.path,
                    pathIndex: 0,
                    currentFloorId: character.currentFloorId
                };
            }
            // If pathfinding completely failed, stay in place
            else if (!pathResult.success) {
                // Pathfinding failed - character stays in place
                return {
                    position: character.position,
                    path: [],
                    pathIndex: 0,
                    currentFloorId: character.currentFloorId
                };
            }

            return {
                position: character.position,
                path: pathResult.path,
                pathIndex: 0,
                currentFloorId: character.currentFloorId
            };
        }

        // Follow current path
        const currentTarget = character.path[character.pathIndex];
        const distanceToTarget = getDistance(character.position, currentTarget);

        if (distanceToTarget <= STEP_SIZE) {
            // Move to next waypoint
            const newPathIndex = character.pathIndex + 1;
            if (newPathIndex < character.path.length) {
                const nextTarget = character.path[newPathIndex];
                return {
                    position: moveTowards(character.position, nextTarget, STEP_SIZE),
                    path: character.path,
                    pathIndex: newPathIndex,
                    currentFloorId: character.currentFloorId
                };
            }
            // Keep the final position and clear path only when we've reached the room
            if (isCharacterInRoom(character, targetRoom)) {
                return {
                    position: character.position,
                    path: [],
                    pathIndex: 0,
                    currentFloorId: character.currentFloorId
                };
            }
            // If not in room yet, recalculate path
            const pathResult = findPath(character.position, roomCenter, grid);
            return {
                position: character.position,
                path: pathResult.success
                    ? pathResult.path
                    : pathResult.path.length > 0
                        ? pathResult.path
                        : [],
                pathIndex: 0,
                currentFloorId: character.currentFloorId
            };
        }

        // Continue moving to current target
        return {
            position: moveTowards(character.position, currentTarget, STEP_SIZE),
            path: character.path,
            pathIndex: character.pathIndex,
            currentFloorId: character.currentFloorId
        };
    }

    // Default behavior if no staircase found or other issues
    return {
        position: character.position,
        path: [],
        pathIndex: 0,
        currentFloorId: character.currentFloorId
    };
};

const handleWandering = (
    character: Character,
    room: Room,
    currentTime: number,
    grid: boolean[][]
): { position: Position; path: Position[]; pathIndex: number; currentFloorId: string } => {
    // Check if we need to change floors
    if (character.currentFloorId !== room.floorId) {
        return handleWalking(character, room, grid);
    }

    if (!isCharacterInRoom(character, room)) {
        // If not in room, use pathfinding to get there
        const roomCenter = {
            x: room.position.x + room.width / 2,
            y: room.position.y + room.height / 2,
        };

        if (!character.path.length || character.pathIndex >= character.path.length) {
            const newPath = findPath(character.position, roomCenter, grid);
            return {
                position: character.position,
                path: newPath.path,
                pathIndex: 0,
                currentFloorId: character.currentFloorId
            };
        }

        // Follow existing path
        return handleWalking(character, room, grid);
    }

    // Regular wandering behavior when in room
    const angle = Math.random() * Math.PI * 2;
    const radius = WANDER_RADIUS * Math.sqrt(Math.random());
    const target = {
        x: room.position.x + room.width / 2 + radius * Math.cos(angle),
        y: room.position.y + room.height / 2 + radius * Math.sin(angle),
    };

    return {
        position: moveTowards(character.position, target, STEP_SIZE),
        path: [],
        pathIndex: 0,
        currentFloorId: character.currentFloorId
    };
};

const updateCharacter = (
    character: Character,
    currentTime: number,
    gameTime: number,
    grid: boolean[][]
): Character => {
    const schedule = getCurrentSchedule(character, gameTime);
    const targetRoom = ROOMS.find(
        (r) => r.id === schedule.room && r.floorId === schedule.floorId
    );

    if (!targetRoom) {
        // Room not found - character stays in current state
        return character;
    }

    let newState = {
        position: character.position,
        path: character.path,
        pathIndex: character.pathIndex,
        currentFloorId: character.currentFloorId
    };

    switch (schedule.mode) {
        case 'WALK':
            newState = handleWalking(character, targetRoom, grid);
            break;
        case 'WANDER':
            newState = handleWandering(character, targetRoom, currentTime, grid);
            break;
        case 'SLEEP':
            // For sleep mode, use room center
            const sleepPosition = {
                x: targetRoom.position.x + targetRoom.width / 2,
                y: targetRoom.position.y + targetRoom.height / 2,
            };
            character.targetPosition = sleepPosition;

            // If not on the correct floor or not in room yet
            if (character.currentFloorId !== targetRoom.floorId || !isCharacterInRoom(character, targetRoom)) {
                newState = handleWalking(character, targetRoom, grid);
            } else {
                newState.position = moveTowards(character.position, sleepPosition, STEP_SIZE);
            }
            break;
        case 'CLIMB':
            // Specific behavior for climbing staircases
            // This would need to be implemented based on your staircase mechanics
            break;
    }

    // Calculate distance moved
    const distanceMoved = getDistance(character.position, newState.position);

    // Create footstep if character is moving and enough time has passed since last footstep
    if (
        distanceMoved > 0.01 && // Tiny threshold to account for floating point errors
        currentTime - (character.lastFootstepTime || 0) > FOOTSTEP_SPACING &&
        setFootstepsRef
    ) {
        const angle =
            Math.atan2(
                newState.position.y - character.position.y,
                newState.position.x - character.position.x
            ) *
            (180 / Math.PI) +
            90;

        setFootstepsRef((prev: any) => [
            ...prev,
            createFootstep(
                character.position,
                character.currentFloorId,
                !character.lastFootstepWasLeft,
                angle + (character.lastFootstepWasLeft ? -5 : 5)
            ),
        ]);

        // Update footstep timing and alternation
        return {
            ...character,
            ...newState,
            mode: schedule.mode,
            lastFootstepTime: currentTime,
            lastFootstepWasLeft: !character.lastFootstepWasLeft,
        };
    }

    // Return updated character without updating footstep info if no footstep was created
    return {
        ...character,
        ...newState,
        mode: schedule.mode,
    };
};

const getCurrentSchedule = (
    character: Character,
    gameTime: number
): Schedule => {
    const timeBlock = getCurrentTimeBlock(gameTime);

    let scheduleList;
    switch (character.type) {
        case 'GRYFFINDOR':
            scheduleList = GRYFFINDOR_SCHEDULE;
            break;
        case 'SLYTHERIN':
            scheduleList = SLYTHERIN_SCHEDULE;
            break;
        case 'RAVENCLAW':
            scheduleList = RAVENCLAW_SCHEDULE;
            break;
        case 'HUFFLEPUFF':
            scheduleList = HUFFLEPUFF_SCHEDULE;
            break;
        case 'TEACHER':
            scheduleList = TEACHER_SCHEDULE;
            break;
        case 'HEADMASTER':
            scheduleList = HEADMASTER_SCHEDULE;
            break;
        default:
            scheduleList = GRYFFINDOR_SCHEDULE;
    }

    return (
        scheduleList.find((s) => s.timeBlock === timeBlock) || scheduleList[0]
    );
};

const isCharacterInRoom = (character: Character, room: Room): boolean => {
    // Must be on the same floor
    if (character.currentFloorId !== room.floorId) {
        return false;
    }

    return (
        character.position.x >= room.position.x &&
        character.position.x <= room.position.x + room.width &&
        character.position.y >= room.position.y &&
        character.position.y <= room.position.y + room.height
    );
};

export { createFootstep, getCurrentSchedule, updateCharacter };