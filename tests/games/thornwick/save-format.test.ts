import {
    SAVE_VERSION,
    type Save,
    migrateSave,
} from '@/games/thornwick/src/save-format'
import { describe, expect, it } from 'vitest'

describe('Thornwick save format', () => {
    it('keeps a current save as it is', () => {
        const save = { v: SAVE_VERSION, seed: 42, b: [], riv: [] }
        expect(migrateSave(save)).toEqual(save)
    })

    it('rejects saves that are too old, too new or not saves', () => {
        expect(migrateSave({ v: 4, b: [] })).toBeNull()
        expect(migrateSave({ v: SAVE_VERSION + 1 })).toBeNull()
        expect(migrateSave('nope')).toBeNull()
        expect(migrateSave(null)).toBeNull()
    })

    it('brings an old save up to date with a stock of weapons', () => {
        const o = migrateSave({ v: 6, res: { food: 5, gold: 9 }, b: [] })
        expect(o?.v).toBe(SAVE_VERSION)
        expect(o?.res).toEqual({ weapons: 20, food: 5, gold: 9 })
        expect(o?.eco).toEqual({})
    })

    it('runs every migration step in order up to the target version', () => {
        const steps: Record<number, (o: Save) => Save> = {
            6: (o) => ({ ...o, gold: 1 }),
            7: (o) => ({ ...o, gold: o.gold + 1 }),
        }
        expect(migrateSave({ v: 6 }, steps, 8)).toEqual({ v: 8, gold: 2 })
        expect(migrateSave({ v: 6 }, {}, 7)).toBeNull()
    })
})
