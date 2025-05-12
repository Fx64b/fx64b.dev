import { Character, Position, Room, Schedule } from './types'

export const PATHFINDING_TIMEOUT = 1000
export const FOOTSTEP_FADE_DURATION = 3000
export const FOOTSTEP_SPACING = 300
export const FOOTPRINT_SCALE = 0.02

export const SVG_PATHS = {
    leftFoot:
        'M75.071,37.994c-85.775,27.432-91.109,189.36-50.785,282.24l136.988-10.244c0,0,18.469-81.1,17.828-160.524 C178.753,106.136,154.083,12.727,75.071,37.994z M29.257,356.393c0,0-4.604,131.482,87.014,121.318c81.18-9.006,49.805-135.703,49.805-135.703L29.257,356.393z',
    rightFoot:
        'M436.927,37.994c-79.01-25.268-103.68,68.142-104.03,111.472c-0.642,79.425,17.828,160.524,17.828,160.524l136.986,10.244C528.038,227.354,522.704,65.426,436.927,37.994z M345.925,342.008c0,0-31.375,126.697,49.803,135.703c91.619,10.164,87.016-121.318,87.016-121.318L345.925,342.008z',
}
export const GAME_SPEED = 6 * 60 * 1000
export const TIME_SCALE = 0.25 // hours per second of real time

export const STEP_SIZE = 1
export const GRID_SIZE = 10
export const WANDER_RADIUS = 30

export const ROOMS: Room[] = [
    {
        id: 'great_hall',
        name: 'Great Hall',
        position: { x: 80, y: 340 },
        width: 200,
        height: 150,
    },
    {
        id: 'gryffindor',
        name: 'Gryffindor Tower',
        position: { x: 140, y: 20 },
        width: 150,
        height: 150,
    },
    {
        id: 'transfiguration',
        name: 'Transfiguration',
        position: { x: 610, y: 320 },
        width: 150,
        height: 100,
    },
    {
        id: 'potions',
        name: 'Potions',
        position: { x: 500, y: 500 },
        width: 150,
        height: 100,
    },
    {
        id: 'teachers_room',
        name: 'Teachers Room',
        position: { x: 300, y: 500 },
        width: 150,
        height: 100,
    },
]

export const INITIAL_CHARACTERS: Character[] = [
    {
        id: '1',
        name: 'Harry Potter',
        type: 'STUDENT',
        position: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 75,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 75,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 75,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 75,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '2',
        name: 'Ron Weasley',
        type: 'STUDENT',
        position: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 50,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 75,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 50,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 75,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '3',
        name: 'Hermione Granger',
        type: 'STUDENT',
        position: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 100,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 75,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 100,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 75,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '4',
        name: 'Minerva McGonagall',
        type: 'TEACHER',
        position: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 50,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 50,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 50,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 50,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '5',
        name: 'Severus Snape',
        type: 'TEACHER',
        position: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 100,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 50,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 100,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 50,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '6',
        name: 'Draco Malfoy',
        type: 'SLYTHERIN',
        position: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 30,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 80,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 30,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 80,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '7',
        name: 'Pansy Parkinson',
        type: 'SLYTHERIN',
        position: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 70,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 80,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 70,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 80,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '8',
        name: 'Luna Lovegood',
        type: 'RAVENCLAW',
        position: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 25,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 100,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 25,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 100,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '9',
        name: 'Cho Chang',
        type: 'RAVENCLAW',
        position: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 125,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 100,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'gryffindor')!.position.x + 125,
            y: ROOMS.find((r) => r.id === 'gryffindor')!.position.y + 100,
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
    },
    {
        id: '10',
        name: 'Albus Dumbledore',
        type: 'HEADMASTER',
        position: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 75,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 25,
        },
        targetPosition: {
            x: ROOMS.find((r) => r.id === 'teachers_room')!.position.x + 75,
            y: ROOMS.find((r) => r.id === 'teachers_room')!.position.y + 25,
        },
        mode: 'WANDER', // Dumbledore starts awake
        path: [],
        pathIndex: 0,
    },
]

export interface Corridor {
    id: string
    start: Position
    end: Position
    width: number
}

export const CORRIDORS: Corridor[] = [
    // Main horizontal corridor
    {
        id: 'main_corridor',
        start: { x: 175, y: 250 },
        end: { x: 605, y: 250 },
        width: 30,
    },
    // Vertical corridor connecting Great Hall
    {
        id: 'great_hall_corridor',
        start: { x: 250, y: 280 },
        end: { x: 250, y: 325 },
        width: 30,
    },
    // Gryffindor tower corridor
    {
        id: 'gryffindor_corridor',
        start: { x: 175, y: 185 },
        end: { x: 175, y: 220 },
        width: 30,
    },
    // Transfiguration corridor
    {
        id: 'transfiguration_corridor',
        start: { x: 635, y: 250 },
        end: { x: 635, y: 305 },
        width: 30,
    },
    // Potions corridor
    {
        id: 'potions_corridor',
        start: { x: 545, y: 280 },
        end: { x: 545, y: 485 },
        width: 30,
    },
    // Teachers room corridor
    {
        id: 'teachers_corridor',
        start: { x: 375, y: 280 },
        end: { x: 375, y: 485 },
        width: 30,
    },
]

export const BASE_SCHEDULE: Schedule[] = [
    {
        timeBlock: 'NIGHT1',
        activity: 'Sleep',
        room: 'gryffindor',
        mode: 'SLEEP',
    },
    {
        timeBlock: 'NIGHT2',
        activity: 'Sleep',
        room: 'gryffindor',
        mode: 'SLEEP',
    },
    {
        timeBlock: 'MORNING',
        activity: 'Breakfast',
        room: 'great_hall',
        mode: 'WALK',
    },
    {
        timeBlock: 'NOON',
        activity: 'Class',
        room: 'transfiguration',
        mode: 'WALK',
    },
    {
        timeBlock: 'AFTERNOON',
        activity: 'Class',
        room: 'potions',
        mode: 'WALK',
    },
    {
        timeBlock: 'EVENING',
        activity: 'Free Time',
        room: 'gryffindor',
        mode: 'WANDER',
    },
]

export const TEACHER_SCHEDULE: Schedule[] = [
    {
        timeBlock: 'NIGHT1',
        activity: 'Sleep',
        room: 'teachers_room',
        mode: 'SLEEP',
    },
    {
        timeBlock: 'NIGHT2',
        activity: 'Sleep',
        room: 'teachers_room',
        mode: 'SLEEP',
    },
    {
        timeBlock: 'MORNING',
        activity: 'Breakfast',
        room: 'great_hall',
        mode: 'WALK',
    },
    {
        timeBlock: 'NOON',
        activity: 'Teach',
        room: 'transfiguration',
        mode: 'WANDER',
    },
    {
        timeBlock: 'AFTERNOON',
        activity: 'Teach',
        room: 'potions',
        mode: 'WANDER',
    },
    {
        timeBlock: 'EVENING',
        activity: 'Rest',
        room: 'teachers_room',
        mode: 'WANDER',
    },
]

// Slytherin Schedule
export const SLYTHERIN_SCHEDULE: Schedule[] = [
    {
        timeBlock: 'NIGHT1',
        activity: 'Sleep',
        room: 'teachers_room',
        mode: 'SLEEP',
    }, // Using teachers room as slytherin dorm temporarily
    {
        timeBlock: 'NIGHT2',
        activity: 'Sleep',
        room: 'teachers_room',
        mode: 'SLEEP',
    },
    {
        timeBlock: 'MORNING',
        activity: 'Breakfast',
        room: 'great_hall',
        mode: 'WALK',
    },
    { timeBlock: 'NOON', activity: 'Class', room: 'potions', mode: 'WALK' }, // Slytherins prefer potions
    {
        timeBlock: 'AFTERNOON',
        activity: 'Class',
        room: 'transfiguration',
        mode: 'WALK',
    },
    {
        timeBlock: 'EVENING',
        activity: 'Meeting',
        room: 'teachers_room',
        mode: 'WANDER',
    },
]

// Ravenclaw Schedule
export const RAVENCLAW_SCHEDULE: Schedule[] = [
    {
        timeBlock: 'NIGHT1',
        activity: 'Sleep',
        room: 'gryffindor',
        mode: 'SLEEP',
    }, // Using gryffindor as ravenclaw dorm temporarily
    {
        timeBlock: 'NIGHT2',
        activity: 'Study',
        room: 'gryffindor',
        mode: 'WANDER',
    }, // Ravenclaws study late
    {
        timeBlock: 'MORNING',
        activity: 'Breakfast',
        room: 'great_hall',
        mode: 'WALK',
    },
    {
        timeBlock: 'NOON',
        activity: 'Class',
        room: 'transfiguration',
        mode: 'WALK',
    },
    {
        timeBlock: 'AFTERNOON',
        activity: 'Study',
        room: 'great_hall',
        mode: 'WANDER',
    }, // Study in Great Hall
    {
        timeBlock: 'EVENING',
        activity: 'Free Time',
        room: 'gryffindor',
        mode: 'WANDER',
    },
]

// Headmaster Schedule
export const HEADMASTER_SCHEDULE: Schedule[] = [
    {
        timeBlock: 'NIGHT1',
        activity: 'Work',
        room: 'teachers_room',
        mode: 'WANDER',
    }, // Headmasters work late
    {
        timeBlock: 'NIGHT2',
        activity: 'Sleep',
        room: 'teachers_room',
        mode: 'SLEEP',
    },
    {
        timeBlock: 'MORNING',
        activity: 'Breakfast',
        room: 'great_hall',
        mode: 'WALK',
    },
    {
        timeBlock: 'NOON',
        activity: 'Meeting',
        room: 'teachers_room',
        mode: 'WANDER',
    },
    {
        timeBlock: 'AFTERNOON',
        activity: 'Observe',
        room: 'transfiguration',
        mode: 'WALK',
    },
    {
        timeBlock: 'EVENING',
        activity: 'Dinner',
        room: 'great_hall',
        mode: 'WALK',
    },
]
