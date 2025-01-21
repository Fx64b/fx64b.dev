import { Position, Room, Character, FootstepInstance, Schedule } from './types'
import { ROOMS, STEP_SIZE, WANDER_RADIUS, FOOTSTEP_SPACING } from './constants'
import { findPath } from './pathfinding'
import { getCurrentTimeBlock } from './time'
import React from 'react'

const BASE_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Sleep', room: 'gryffindor', mode: 'SLEEP' },
    { timeBlock: 'NIGHT2', activity: 'Sleep', room: 'gryffindor', mode: 'SLEEP' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK' },
    { timeBlock: 'NOON', activity: 'Class', room: 'transfiguration', mode: 'WALK' },
    { timeBlock: 'AFTERNOON', activity: 'Class', room: 'potions', mode: 'WALK' },
    { timeBlock: 'EVENING', activity: 'Free Time', room: 'gryffindor', mode: 'WANDER' },
]

const TEACHER_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Sleep', room: 'teachers_room', mode: 'SLEEP' },
    { timeBlock: 'NIGHT2', activity: 'Sleep', room: 'teachers_room', mode: 'SLEEP' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK' },
    { timeBlock: 'NOON', activity: 'Teach', room: 'transfiguration', mode: 'WANDER' },
    { timeBlock: 'AFTERNOON', activity: 'Teach', room: 'potions', mode: 'WANDER' },
    { timeBlock: 'EVENING', activity: 'Rest', room: 'teachers_room', mode: 'WANDER' },
]

let setFootstepsRef: React.Dispatch<React.SetStateAction<FootstepInstance[]>> | null = null;

export const initializeSchedule = (setFootsteps: React.Dispatch<React.SetStateAction<FootstepInstance[]>>) => {
    setFootstepsRef = setFootsteps;
};

const getDistance = (p1: Position, p2: Position): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
}

const moveTowards = (current: Position, target: Position, speed: number): Position => {
    const dx = target.x - current.x
    const dy = target.y - current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Return target position if we're close enough
    if (distance <= speed) {return target}

    // Calculate movement
    const ratio = speed / distance
    return {
        x: current.x + dx * ratio,
        y: current.y + dy * ratio,
    }
}

const createFootstep = (position: Position, isLeft: boolean, angle: number): FootstepInstance => {
    const footstep = {
        id: Math.random().toString(),
        position,
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
    grid: boolean[][],
): {position: Position; path: Position[]; pathIndex: number} => {
    const roomCenter = {
        x: targetRoom.position.x + targetRoom.width / 2,
        y: targetRoom.position.y + targetRoom.height / 2,
    }

    // If no path or path completed, calculate new path
    if (!character.path.length || character.pathIndex >= character.path.length) {
        const newPath = findPath(character.position, roomCenter, grid)
        return {
            position: character.position,
            path: newPath,
            pathIndex: 0,
        }
    }

    // Follow current path
    const currentTarget = character.path[character.pathIndex]
    const distanceToTarget = getDistance(character.position, currentTarget)

    if (distanceToTarget <= STEP_SIZE) {
        // Move to next waypoint
        const newPathIndex = character.pathIndex + 1
        if (newPathIndex < character.path.length) {
            const nextTarget = character.path[newPathIndex]
            return {
                position: moveTowards(character.position, nextTarget, STEP_SIZE),
                path: character.path,
                pathIndex: newPathIndex,
            }
        }
        // Keep the final position and clear path only when we've reached the room
        if (isCharacterInRoom(character, targetRoom)) {
            return {
                position: character.position,
                path: [],
                pathIndex: 0,
            }
        }
        // If not in room yet, recalculate path
        const newPath = findPath(character.position, roomCenter, grid)
        return {
            position: character.position,
            path: newPath,
            pathIndex: 0,
        }
    }

    // Continue moving to current target
    return {
        position: moveTowards(character.position, currentTarget, STEP_SIZE),
        path: character.path,
        pathIndex: character.pathIndex,
    }
}

const handleWandering = (
    character: Character,
    room: Room,
    currentTime: number,
    grid: boolean[][],
): {position: Position; path: Position[]; pathIndex: number} => {
    if (!isCharacterInRoom(character, room)) {
        // If not in room, use pathfinding to get there
        const roomCenter = {
            x: room.position.x + room.width / 2,
            y: room.position.y + room.height / 2,
        }

        if (!character.path.length || character.pathIndex >= character.path.length) {
            const newPath = findPath(character.position, roomCenter, grid)
            return {
                position: character.position,
                path: newPath,
                pathIndex: 0,
            }
        }

        // Follow existing path
        return handleWalking(character, room, grid)
    }

    // Regular wandering behavior when in room
    const angle = Math.random() * Math.PI * 2
    const radius = WANDER_RADIUS * Math.sqrt(Math.random())
    const target = {
        x: room.position.x + room.width / 2 + radius * Math.cos(angle),
        y: room.position.y + room.height / 2 + radius * Math.sin(angle),
    }

    return {
        position: moveTowards(character.position, target, STEP_SIZE),
        path: [],
        pathIndex: 0,
    }
}

const updateCharacter = (
    character: Character,
    currentTime: number,
    gameTime: number,
    grid: boolean[][],
): Character => {
    const schedule = getCurrentSchedule(character, gameTime)
    const targetRoom = ROOMS.find((r) => r.id === schedule.room)
    if (!targetRoom) {return character}

    let newState = { position: character.position, path: character.path, pathIndex: character.pathIndex }

    switch (schedule.mode) {
        case 'WALK':
            newState = handleWalking(character, targetRoom, grid)
            break
        case 'WANDER':
            newState = handleWandering(character, targetRoom, currentTime, grid)
            break
        case 'SLEEP':
            const sleepPosition = {
                x: targetRoom.position.x + targetRoom.width / 2,
                y: targetRoom.position.y + targetRoom.height / 2,
            }
            if (!isCharacterInRoom(character, targetRoom)) {
                newState = handleWalking(character, targetRoom, grid)
            } else {
                newState.position = moveTowards(character.position, sleepPosition, STEP_SIZE)
            }
            break
    }

    // Calculate distance moved
    const distanceMoved = getDistance(character.position, newState.position)

    // Create footstep if character is moving and enough time has passed since last footstep
    if (distanceMoved > 0.01 && // Tiny threshold to account for floating point errors
        currentTime - (character.lastFootstepTime || 0) > FOOTSTEP_SPACING &&
        setFootstepsRef) {

        const angle = Math.atan2(
            newState.position.y - character.position.y,
            newState.position.x - character.position.x,
        ) * (180 / Math.PI) + 90

        setFootstepsRef(prev => [...prev, createFootstep(
            character.position,
            !character.lastFootstepWasLeft,
            angle + (character.lastFootstepWasLeft ? -5 : 5),
        )])

        // Update footstep timing and alternation
        return {
            ...character,
            ...newState,
            mode: schedule.mode,
            lastFootstepTime: currentTime,
            lastFootstepWasLeft: !character.lastFootstepWasLeft,
        }
    }

    // Return updated character without updating footstep info if no footstep was created
    return {
        ...character,
        ...newState,
        mode: schedule.mode,
    }
}

const getCurrentSchedule = (character: Character, gameTime: number): Schedule => {
    const timeBlock = getCurrentTimeBlock(gameTime)
    const scheduleList = character.type === 'STUDENT' ? BASE_SCHEDULE : TEACHER_SCHEDULE
    return scheduleList.find((s) => s.timeBlock === timeBlock) || scheduleList[0]
}

const isCharacterInRoom = (character: Character, room: Room): boolean => {
    return (
        character.position.x >= room.position.x &&
        character.position.x <= room.position.x + room.width &&
        character.position.y >= room.position.y &&
        character.position.y <= room.position.y + room.height
    )
}

export { createFootstep, getCurrentSchedule, updateCharacter }