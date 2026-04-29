export interface Room {
    id: string
    displayName: string
    x: number
    y: number
    width: number
    height: number
}

export interface CastlePoint {
    x: number
    y: number
}

export interface Corridor {
    from: { x: number; y: number }
    to: { x: number; y: number }
    width: number
}

export const ROOMS: Room[] = [
    { id: '1', displayName: 'Great Hall',               x: 150, y: 175, width: 200, height: 150 },
    { id: '2', displayName: 'Gryffindor Common Room',   x: 850, y:  50, width: 125, height: 100 },
    { id: '3', displayName: 'Slytherin Common Room',    x: 450, y: 400, width: 125, height:  75 },
    { id: '4', displayName: 'Ravenclaw Common Room',    x: 775, y: 400, width: 125, height:  75 },
    { id: '5', displayName: 'Hufflepuff Common Room',   x: 450, y:  25, width: 125, height:  75 },
    { id: '6', displayName: 'Potions Classroom',        x: 550, y: 225, width: 100, height:  50 },
    { id: '7', displayName: 'Transfiguration Classroom',x: 825, y: 225, width: 100, height:  75 },
    { id: '8', displayName: 'Charms Classroom',         x: 700, y:  25, width: 100, height:  75 },
    { id: '9', displayName: 'Headmaster\'s Office',     x: 925, y: 300, width:  50, height: 100 },
]

export const CASTLE: CastlePoint[] = [
    { x: 25,  y: 50  }, { x: 125, y: 50  }, { x: 125, y: 75  },
    { x: 350, y: 75  }, { x: 350, y: 100 }, { x: 450, y: 100 },
    { x: 450, y: 25  }, { x: 800, y: 25  }, { x: 800, y: 50  },
    { x: 975, y: 50  }, { x: 975, y: 150 }, { x: 925, y: 150 },
    { x: 925, y: 300 }, { x: 975, y: 300 }, { x: 975, y: 400 },
    { x: 900, y: 400 }, { x: 900, y: 475 }, { x: 450, y: 475 },
    { x: 450, y: 400 }, { x: 150, y: 400 }, { x: 150, y: 475 },
    { x: 25,  y: 475 }, { x: 25,  y: 350 }, { x: 75,  y: 350 },
    { x: 75,  y: 150 }, { x: 25,  y: 150 }, { x: 25,  y: 50  },
]

export const CORRIDORS: Corridor[] = [
    { from: { x: 350, y: 250 }, to: { x: 450, y: 250 }, width: 25 },
    { from: { x: 460, y: 100 }, to: { x: 460, y: 400 }, width: 25 },
    { from: { x: 790, y: 100 }, to: { x: 790, y: 400 }, width: 25 },
    { from: { x: 470, y: 325 }, to: { x: 790, y: 325 }, width: 25 },
]

// ── Shared localStorage contract ───────────────────────────────────────────────

export const STORAGE_KEY = 'marauders-map-room-assets'

export interface StoredAsset {
    assetId: string
    wx: number
    wy: number
}

export type StoredRoomAssets = Record<string, StoredAsset[]>
