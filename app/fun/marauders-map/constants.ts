import { Character, Position, Room, Schedule, Floor, StaircaseConnection } from './types';

// Time and animation constants
export const PATHFINDING_TIMEOUT = 1000;
export const FOOTSTEP_FADE_DURATION = 3000;
export const FOOTSTEP_SPACING = 300;
export const FOOTPRINT_SCALE = 0.02;
export const GAME_SPEED = 6 * 60 * 1000;
export const TIME_SCALE = 0.25; // hours per second of real time
export const STEP_SIZE = 1;
export const GRID_SIZE = 10;
export const WANDER_RADIUS = 30;

export const SVG_PATHS = {
    leftFoot:
        'M75.071,37.994c-85.775,27.432-91.109,189.36-50.785,282.24l136.988-10.244c0,0,18.469-81.1,17.828-160.524 C178.753,106.136,154.083,12.727,75.071,37.994z M29.257,356.393c0,0-4.604,131.482,87.014,121.318c81.18-9.006,49.805-135.703,49.805-135.703L29.257,356.393z',
    rightFoot:
        'M436.927,37.994c-79.01-25.268-103.68,68.142-104.03,111.472c-0.642,79.425,17.828,160.524,17.828,160.524l136.986,10.244C528.038,227.354,522.704,65.426,436.927,37.994z M345.925,342.008c0,0-31.375,126.697,49.803,135.703c91.619,10.164,87.016-121.318,87.016-121.318L345.925,342.008z',
}


// FLOORS remain mostly the same, just adjusting names for clarity
export const FLOORS: Floor[] = [
    {
        id: 'dungeon',
        name: 'Dungeon Level',
        level: 0,
        position: { x: 0, y: 700 },
        width: 800,
        height: 500,
        visible: true,
    },
    {
        id: 'ground',
        name: 'Ground Floor',
        level: 1,
        position: { x: 0, y: 150 },
        width: 800,
        height: 500,
        visible: true,
    },
    {
        id: 'first',
        name: 'First Floor',
        level: 2,
        position: { x: 0, y: -400 },
        width: 800,
        height: 500,
        visible: false,
    },
    {
        id: 'third',
        name: 'Third Floor',
        level: 4,
        position: { x: 0, y: -950 },
        width: 800,
        height: 500,
        visible: false,
    },
    {
        id: 'fifth',
        name: 'Fifth Floor',
        level: 6,
        position: { x: 0, y: -1500 },
        width: 800,
        height: 500,
        visible: false,
    },
    {
        id: 'seventh',
        name: 'Seventh Floor',
        level: 8,
        position: { x: 0, y: -2050 },
        width: 800,
        height: 500,
        visible: false,
    },
];

// Revised Rooms - Adjusted positions to align with corridors
export const ROOMS: Room[] = [
    // Ground Floor (Level 1)
    {
        id: 'entrance_hall',
        name: 'Entrance Hall',
        floorId: 'ground',
        position: { x: 300, y: 300 },
        width: 200,
        height: 150,
    },
    {
        id: 'great_hall',
        name: 'Great Hall',
        floorId: 'ground',
        position: { x: 300, y: 100 }, // Moved up to connect with entrance_hall
        width: 250,
        height: 200,
    },
    {
        id: 'staff_room',
        name: 'Staff Room',
        floorId: 'ground',
        position: { x: 550, y: 250 }, // Aligned with corridor
        width: 150,
        height: 120,
    },
    {
        id: 'kitchens',
        name: 'Kitchens',
        floorId: 'ground',
        position: { x: 150, y: 350 },
        width: 180,
        height: 140,
    },

    // First Floor (Level 2)
    {
        id: 'dada_classroom',
        name: 'Defense Against the Dark Arts',
        floorId: 'first',
        position: { x: 350, y: 200 }, // Aligned with corridor
        width: 180,
        height: 150,
    },
    {
        id: 'history_classroom',
        name: 'History of Magic',
        floorId: 'first',
        position: { x: 150, y: 250 },
        width: 160,
        height: 130,
    },
    {
        id: 'hospital_wing',
        name: 'Hospital Wing',
        floorId: 'first',
        position: { x: 550, y: 200 },
        width: 200,
        height: 180,
    },

    // Dungeon Level (Level 0)
    {
        id: 'potions_classroom',
        name: 'Potions Classroom',
        floorId: 'dungeon',
        position: { x: 400, y: 250 }, // Aligned with corridor
        width: 170,
        height: 140,
    },
    {
        id: 'slytherin_entrance',
        name: 'Slytherin Common Room',
        floorId: 'dungeon',
        position: { x: 600, y: 250 }, // Aligned with corridor entrance
        width: 150,
        height: 120,
    },
    {
        id: 'hufflepuff_entrance',
        name: 'Hufflepuff Common Room',
        floorId: 'dungeon',
        position: { x: 150, y: 250 }, // Aligned with corridor entrance
        width: 150,
        height: 120,
    },

    // Third Floor (Level 4)
    {
        id: 'library',
        name: 'Library',
        floorId: 'third',
        position: { x: 350, y: 200 }, // Centered on corridor
        width: 220,
        height: 180,
    },
    {
        id: 'charms_classroom',
        name: 'Charms Classroom',
        floorId: 'third',
        position: { x: 150, y: 250 },
        width: 160,
        height: 130,
    },

    // Fifth Floor (Level 6)
    {
        id: 'ravenclaw_tower',
        name: 'Ravenclaw Tower',
        floorId: 'fifth',
        position: { x: 600, y: 200 },
        width: 150,
        height: 150,
    },
    {
        id: 'prefects_bathroom',
        name: 'Prefects\' Bathroom',
        floorId: 'fifth',
        position: { x: 300, y: 250 },
        width: 140,
        height: 120,
    },

    // Seventh Floor (Level 8)
    {
        id: 'gryffindor_tower',
        name: 'Gryffindor Tower',
        floorId: 'seventh',
        position: { x: 150, y: 200 }, // Adjusted to connect with corridor
        width: 180,
        height: 180,
    },
    {
        id: 'headmasters_office',
        name: 'Headmaster\'s Office',
        floorId: 'seventh',
        position: { x: 450, y: 200 }, // Adjusted to connect with corridor
        width: 150,
        height: 150,
    },
];

// Revised Staircases - Adjusted to connect properly to corridors on each floor
export const STAIRCASES: StaircaseConnection[] = [
    // Main grand staircase
    {
        id: 'grand_staircase_0_1',
        name: 'Grand Staircase D-G',
        startFloorId: 'dungeon',
        endFloorId: 'ground',
        startPosition: { x: 350, y: 200 }, // Aligned with dungeon corridor
        endPosition: { x: 350, y: 350 }, // Aligned with ground floor corridor
        width: 50,
    },
    {
        id: 'grand_staircase_1_2',
        name: 'Grand Staircase G-1',
        startFloorId: 'ground',
        endFloorId: 'first',
        startPosition: { x: 350, y: 200 }, // Aligned with ground floor corridor
        endPosition: { x: 350, y: 350 }, // Aligned with first floor corridor
        width: 50,
    },
    {
        id: 'grand_staircase_2_4',
        name: 'Grand Staircase 1-3',
        startFloorId: 'first',
        endFloorId: 'third',
        startPosition: { x: 350, y: 200 }, // Aligned with first floor corridor
        endPosition: { x: 350, y: 350 }, // Aligned with third floor corridor
        width: 50,
    },
    {
        id: 'grand_staircase_4_6',
        name: 'Grand Staircase 3-5',
        startFloorId: 'third',
        endFloorId: 'fifth',
        startPosition: { x: 350, y: 200 }, // Aligned with third floor corridor
        endPosition: { x: 350, y: 350 }, // Aligned with fifth floor corridor
        width: 50,
    },
    {
        id: 'grand_staircase_6_8',
        name: 'Grand Staircase 5-7',
        startFloorId: 'fifth',
        endFloorId: 'seventh',
        startPosition: { x: 350, y: 200 }, // Aligned with fifth floor corridor
        endPosition: { x: 350, y: 350 }, // Aligned with seventh floor corridor
        width: 50,
    },
    // Secret passages and additional stairs
    {
        id: 'kitchen_passage',
        name: 'Kitchen Passage',
        startFloorId: 'ground',
        endFloorId: 'dungeon',
        startPosition: { x: 200, y: 350 }, // Connected to kitchen entrance
        endPosition: { x: 200, y: 250 }, // Connected to dungeon corridor
        width: 30,
        isSecret: true,
    },
    {
        id: 'headmaster_stair',
        name: 'Headmaster\'s Staircase',
        startFloorId: 'first',
        endFloorId: 'seventh',
        startPosition: { x: 450, y: 300 }, // Connected to first floor corridor
        endPosition: { x: 450, y: 250 }, // Connected to headmaster's office entrance
        width: 40,
        isMoving: true,
    },
];

// Revised Corridors - Adjusted to create proper connections
export const CORRIDORS: Corridor[] = [
    // Ground Floor corridors
    {
        id: 'entrance_to_great_hall',
        floorId: 'ground',
        name: 'Entrance to Great Hall',
        start: { x: 400, y: 300 }, // Connects entrance hall
        end: { x: 400, y: 200 }, // Connects to great hall
        width: 30,
    },
    {
        id: 'entrance_to_staff',
        floorId: 'ground',
        name: 'Entrance to Staff Room',
        start: { x: 500, y: 300 }, // Connected to main corridor
        end: { x: 550, y: 300 }, // Connected to staff room
        width: 30,
    },
    {
        id: 'entrance_to_kitchens',
        floorId: 'ground',
        name: 'Entrance to Kitchens',
        start: { x: 250, y: 350 }, // Connected to kitchens
        end: { x: 250, y: 300 }, // Connected to main corridor
        width: 25,
    },
    {
        id: 'ground_main_corridor',
        floorId: 'ground',
        name: 'Ground Floor Main Corridor',
        start: { x: 200, y: 300 }, // Connected to kitchen corridor
        end: { x: 600, y: 300 }, // Extended to reach staff room
        width: 30,
    },
    {
        id: 'ground_to_staircase',
        floorId: 'ground',
        name: 'Corridor to Grand Staircase',
        start: { x: 350, y: 300 }, // Connected to main corridor
        end: { x: 350, y: 200 }, // Connected to staircase
        width: 30,
    },

    // First Floor corridors
    {
        id: 'first_main_corridor',
        floorId: 'first',
        name: 'First Floor Main Corridor',
        start: { x: 150, y: 300 },
        end: { x: 600, y: 300 },
        width: 30,
    },
    {
        id: 'first_to_dada',
        floorId: 'first',
        name: 'Corridor to DADA',
        start: { x: 400, y: 300 }, // Connected to main corridor
        end: { x: 400, y: 250 }, // Connected to DADA classroom
        width: 25,
    },
    {
        id: 'first_to_history',
        floorId: 'first',
        name: 'Corridor to History',
        start: { x: 230, y: 300 }, // Connected to main corridor
        end: { x: 230, y: 250 }, // Connected to History classroom
        width: 25,
    },
    {
        id: 'first_to_hospital',
        floorId: 'first',
        name: 'Corridor to Hospital Wing',
        start: { x: 550, y: 300 }, // Connected to main corridor
        end: { x: 600, y: 250 }, // Connected to Hospital Wing
        width: 25,
    },
    {
        id: 'first_to_staircase',
        floorId: 'first',
        name: 'Corridor to Grand Staircase',
        start: { x: 350, y: 300 }, // Connected to main corridor
        end: { x: 350, y: 200 }, // Connected to staircase
        width: 30,
    },
    {
        id: 'first_to_headmaster',
        floorId: 'first',
        name: 'Corridor to Headmaster Staircase',
        start: { x: 450, y: 300 }, // Connected to main corridor
        end: { x: 450, y: 200 }, // Connected to headmaster staircase
        width: 25,
    },

    // Dungeon corridors
    {
        id: 'dungeon_main_corridor',
        floorId: 'dungeon',
        name: 'Dungeon Main Corridor',
        start: { x: 150, y: 250 }, // Connected to Hufflepuff
        end: { x: 650, y: 250 }, // Connected to Slytherin
        width: 30,
    },
    {
        id: 'dungeon_to_potions',
        floorId: 'dungeon',
        name: 'Corridor to Potions',
        start: { x: 400, y: 250 }, // Connected to main corridor
        end: { x: 400, y: 300 }, // Connected to Potions classroom
        width: 25,
    },
    {
        id: 'dungeon_to_slytherin',
        floorId: 'dungeon',
        name: 'Corridor to Slytherin',
        start: { x: 650, y: 250 }, // Connected to main corridor
        end: { x: 650, y: 300 }, // Connected to Slytherin entrance
        width: 25,
    },
    {
        id: 'dungeon_to_hufflepuff',
        floorId: 'dungeon',
        name: 'Corridor to Hufflepuff',
        start: { x: 150, y: 250 }, // Connected to main corridor
        end: { x: 150, y: 300 }, // Connected to Hufflepuff entrance
        width: 25,
    },
    {
        id: 'dungeon_to_staircase',
        floorId: 'dungeon',
        name: 'Corridor to Grand Staircase',
        start: { x: 350, y: 250 }, // Connected to main corridor
        end: { x: 350, y: 200 }, // Connected to staircase
        width: 30,
    },

    // Third Floor corridors
    {
        id: 'third_main_corridor',
        floorId: 'third',
        name: 'Third Floor Main Corridor',
        start: { x: 150, y: 300 },
        end: { x: 600, y: 300 },
        width: 30,
    },
    {
        id: 'third_to_library',
        floorId: 'third',
        name: 'Corridor to Library',
        start: { x: 400, y: 300 }, // Connected to main corridor
        end: { x: 400, y: 250 }, // Connected to Library
        width: 25,
    },
    {
        id: 'third_to_charms',
        floorId: 'third',
        name: 'Corridor to Charms',
        start: { x: 230, y: 300 }, // Connected to main corridor
        end: { x: 230, y: 250 }, // Connected to Charms classroom
        width: 25,
    },
    {
        id: 'third_to_staircase',
        floorId: 'third',
        name: 'Corridor to Grand Staircase',
        start: { x: 350, y: 300 }, // Connected to main corridor
        end: { x: 350, y: 200 }, // Connected to staircase
        width: 30,
    },

    // Fifth Floor corridors
    {
        id: 'fifth_main_corridor',
        floorId: 'fifth',
        name: 'Fifth Floor Main Corridor',
        start: { x: 200, y: 300 },
        end: { x: 600, y: 300 },
        width: 30,
    },
    {
        id: 'fifth_to_ravenclaw',
        floorId: 'fifth',
        name: 'Corridor to Ravenclaw Tower',
        start: { x: 600, y: 300 }, // Connected to main corridor
        end: { x: 650, y: 250 }, // Connected to Ravenclaw Tower
        width: 25,
    },
    {
        id: 'fifth_to_prefects',
        floorId: 'fifth',
        name: 'Corridor to Prefects Bathroom',
        start: { x: 350, y: 300 }, // Connected to main corridor
        end: { x: 350, y: 250 }, // Connected to Prefects Bathroom
        width: 25,
    },
    {
        id: 'fifth_to_staircase',
        floorId: 'fifth',
        name: 'Corridor to Grand Staircase',
        start: { x: 350, y: 300 }, // Connected to main corridor
        end: { x: 350, y: 200 }, // Connected to staircase
        width: 30,
    },

    // Seventh Floor corridors
    {
        id: 'seventh_main_corridor',
        floorId: 'seventh',
        name: 'Seventh Floor Main Corridor',
        start: { x: 150, y: 300 },
        end: { x: 600, y: 300 },
        width: 30,
    },
    {
        id: 'seventh_to_gryffindor',
        floorId: 'seventh',
        name: 'Corridor to Gryffindor Tower',
        start: { x: 200, y: 300 }, // Connected to main corridor
        end: { x: 200, y: 250 }, // Connected to Gryffindor Tower
        width: 25,
    },
    {
        id: 'seventh_to_headmaster',
        floorId: 'seventh',
        name: 'Corridor to Headmaster Office',
        start: { x: 500, y: 300 }, // Connected to main corridor
        end: { x: 500, y: 250 }, // Connected to Headmaster's Office
        width: 25,
    },
    {
        id: 'seventh_to_staircase',
        floorId: 'seventh',
        name: 'Corridor to Grand Staircase',
        start: { x: 350, y: 300 }, // Connected to main corridor
        end: { x: 350, y: 350 }, // Connected to staircase
        width: 30,
    },
];


// Character definitions
export const INITIAL_CHARACTERS: Character[] = [
    // Gryffindor Students
    {
        id: '1',
        name: 'Harry Potter',
        type: 'GRYFFINDOR',
        position: {
            x: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.x + 75,
            y: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.y + 75
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.x + 75,
            y: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.y + 75
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'seventh'
    },
    {
        id: '2',
        name: 'Ron Weasley',
        type: 'GRYFFINDOR',
        position: {
            x: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.x + 50,
            y: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.y + 75
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.x + 50,
            y: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.y + 75
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'seventh'
    },
    {
        id: '3',
        name: 'Hermione Granger',
        type: 'GRYFFINDOR',
        position: {
            x: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.x + 100,
            y: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.y + 75
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.x + 100,
            y: ROOMS.find(r => r.id === 'gryffindor_tower')!.position.y + 75
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'seventh'
    },

    // Teachers
    {
        id: '4',
        name: 'Minerva McGonagall',
        type: 'TEACHER',
        position: {
            x: ROOMS.find(r => r.id === 'staff_room')!.position.x + 50,
            y: ROOMS.find(r => r.id === 'staff_room')!.position.y + 50
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'staff_room')!.position.x + 50,
            y: ROOMS.find(r => r.id === 'staff_room')!.position.y + 50
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'ground'
    },
    {
        id: '5',
        name: 'Severus Snape',
        type: 'TEACHER',
        position: {
            x: ROOMS.find(r => r.id === 'potions_classroom')!.position.x + 70,
            y: ROOMS.find(r => r.id === 'potions_classroom')!.position.y + 50
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'potions_classroom')!.position.x + 70,
            y: ROOMS.find(r => r.id === 'potions_classroom')!.position.y + 50
        },
        mode: 'WANDER',
        path: [],
        pathIndex: 0,
        currentFloorId: 'dungeon'
    },

    // Slytherin Students
    {
        id: '6',
        name: 'Draco Malfoy',
        type: 'SLYTHERIN',
        position: {
            x: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.x + 30,
            y: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.y + 40
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.x + 30,
            y: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.y + 40
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'dungeon'
    },
    {
        id: '7',
        name: 'Pansy Parkinson',
        type: 'SLYTHERIN',
        position: {
            x: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.x + 70,
            y: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.y + 40
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.x + 70,
            y: ROOMS.find(r => r.id === 'slytherin_entrance')!.position.y + 40
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'dungeon'
    },

    // Ravenclaw Students
    {
        id: '8',
        name: 'Luna Lovegood',
        type: 'RAVENCLAW',
        position: {
            x: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.x + 40,
            y: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.y + 50
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.x + 40,
            y: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.y + 50
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'fifth'
    },
    {
        id: '9',
        name: 'Cho Chang',
        type: 'RAVENCLAW',
        position: {
            x: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.x + 90,
            y: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.y + 50
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.x + 90,
            y: ROOMS.find(r => r.id === 'ravenclaw_tower')!.position.y + 50
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'fifth'
    },

    // Hufflepuff Students
    {
        id: '10',
        name: 'Cedric Diggory',
        type: 'HUFFLEPUFF',
        position: {
            x: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.x + 40,
            y: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.y + 50
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.x + 40,
            y: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.y + 50
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'dungeon'
    },
    {
        id: '11',
        name: 'Susan Bones',
        type: 'HUFFLEPUFF',
        position: {
            x: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.x + 80,
            y: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.y + 50
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.x + 80,
            y: ROOMS.find(r => r.id === 'hufflepuff_entrance')!.position.y + 50
        },
        mode: 'SLEEP',
        path: [],
        pathIndex: 0,
        currentFloorId: 'dungeon'
    },

    // Headmaster
    {
        id: '12',
        name: 'Albus Dumbledore',
        type: 'HEADMASTER',
        position: {
            x: ROOMS.find(r => r.id === 'headmasters_office')!.position.x + 75,
            y: ROOMS.find(r => r.id === 'headmasters_office')!.position.y + 75
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'headmasters_office')!.position.x + 75,
            y: ROOMS.find(r => r.id === 'headmasters_office')!.position.y + 75
        },
        mode: 'WANDER',
        path: [],
        pathIndex: 0,
        currentFloorId: 'seventh'
    },

    // Additional teachers
    {
        id: '13',
        name: 'Filius Flitwick',
        type: 'TEACHER',
        position: {
            x: ROOMS.find(r => r.id === 'charms_classroom')!.position.x + 60,
            y: ROOMS.find(r => r.id === 'charms_classroom')!.position.y + 50
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'charms_classroom')!.position.x + 60,
            y: ROOMS.find(r => r.id === 'charms_classroom')!.position.y + 50
        },
        mode: 'WANDER',
        path: [],
        pathIndex: 0,
        currentFloorId: 'third'
    },
    {
        id: '14',
        name: 'Poppy Pomfrey',
        type: 'TEACHER',
        position: {
            x: ROOMS.find(r => r.id === 'hospital_wing')!.position.x + 80,
            y: ROOMS.find(r => r.id === 'hospital_wing')!.position.y + 60
        },
        targetPosition: {
            x: ROOMS.find(r => r.id === 'hospital_wing')!.position.x + 80,
            y: ROOMS.find(r => r.id === 'hospital_wing')!.position.y + 60
        },
        mode: 'WANDER',
        path: [],
        pathIndex: 0,
        currentFloorId: 'first'
    },
];


// Corridor definitions
export interface Corridor {
    id: string;
    floorId: string;
    start: Position;
    end: Position;
    width: number;
    name?: string;
    isSecret?: boolean;
}

export const GRYFFINDOR_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Sleep', room: 'gryffindor_tower', mode: 'SLEEP', floorId: 'seventh' },
    { timeBlock: 'NIGHT2', activity: 'Sleep', room: 'gryffindor_tower', mode: 'SLEEP', floorId: 'seventh' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK', floorId: 'ground' },
    { timeBlock: 'NOON', activity: 'DADA Class', room: 'dada_classroom', mode: 'WALK', floorId: 'first' },
    { timeBlock: 'AFTERNOON', activity: 'Potions', room: 'potions_classroom', mode: 'WALK', floorId: 'dungeon' },
    { timeBlock: 'EVENING', activity: 'Study', room: 'library', mode: 'WANDER', floorId: 'third' },
];

export const SLYTHERIN_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Sleep', room: 'slytherin_entrance', mode: 'SLEEP', floorId: 'dungeon' },
    { timeBlock: 'NIGHT2', activity: 'Sleep', room: 'slytherin_entrance', mode: 'SLEEP', floorId: 'dungeon' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK', floorId: 'ground' },
    { timeBlock: 'NOON', activity: 'Potions', room: 'potions_classroom', mode: 'WALK', floorId: 'dungeon' },
    { timeBlock: 'AFTERNOON', activity: 'DADA Class', room: 'dada_classroom', mode: 'WALK', floorId: 'first' },
    { timeBlock: 'EVENING', activity: 'Common Room', room: 'slytherin_entrance', mode: 'WANDER', floorId: 'dungeon' },
];

export const RAVENCLAW_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Sleep', room: 'ravenclaw_tower', mode: 'SLEEP', floorId: 'fifth' },
    { timeBlock: 'NIGHT2', activity: 'Study', room: 'ravenclaw_tower', mode: 'WANDER', floorId: 'fifth' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK', floorId: 'ground' },
    { timeBlock: 'NOON', activity: 'Charms', room: 'charms_classroom', mode: 'WALK', floorId: 'third' },
    { timeBlock: 'AFTERNOON', activity: 'Library', room: 'library', mode: 'WANDER', floorId: 'third' },
    { timeBlock: 'EVENING', activity: 'Tower', room: 'ravenclaw_tower', mode: 'WANDER', floorId: 'fifth' },
];

export const HUFFLEPUFF_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Sleep', room: 'hufflepuff_entrance', mode: 'SLEEP', floorId: 'dungeon' },
    { timeBlock: 'NIGHT2', activity: 'Sleep', room: 'hufflepuff_entrance', mode: 'SLEEP', floorId: 'dungeon' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK', floorId: 'ground' },
    { timeBlock: 'NOON', activity: 'History', room: 'history_classroom', mode: 'WALK', floorId: 'first' },
    { timeBlock: 'AFTERNOON', activity: 'Charms', room: 'charms_classroom', mode: 'WALK', floorId: 'third' },
    { timeBlock: 'EVENING', activity: 'Common Room', room: 'hufflepuff_entrance', mode: 'WANDER', floorId: 'dungeon' },
];

export const TEACHER_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Rest', room: 'staff_room', mode: 'SLEEP', floorId: 'ground' },
    { timeBlock: 'NIGHT2', activity: 'Rest', room: 'staff_room', mode: 'SLEEP', floorId: 'ground' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK', floorId: 'ground' },
    { timeBlock: 'NOON', activity: 'Teach', room: 'dada_classroom', mode: 'WANDER', floorId: 'first' },
    { timeBlock: 'AFTERNOON', activity: 'Teach', room: 'potions_classroom', mode: 'WANDER', floorId: 'dungeon' },
    { timeBlock: 'EVENING', activity: 'Staff Room', room: 'staff_room', mode: 'WANDER', floorId: 'ground' },
];

export const HEADMASTER_SCHEDULE: Schedule[] = [
    { timeBlock: 'NIGHT1', activity: 'Work', room: 'headmasters_office', mode: 'WANDER', floorId: 'seventh' },
    { timeBlock: 'NIGHT2', activity: 'Rest', room: 'headmasters_office', mode: 'SLEEP', floorId: 'seventh' },
    { timeBlock: 'MORNING', activity: 'Breakfast', room: 'great_hall', mode: 'WALK', floorId: 'ground' },
    { timeBlock: 'NOON', activity: 'Meeting', room: 'staff_room', mode: 'WANDER', floorId: 'ground' },
    { timeBlock: 'AFTERNOON', activity: 'Visit Classes', room: 'dada_classroom', mode: 'WALK', floorId: 'first' },
    { timeBlock: 'EVENING', activity: 'Dinner', room: 'great_hall', mode: 'WALK', floorId: 'ground' },
];