// Fairway course module: seeds, the versioned hole generator, ground
// queries and playability checks. No Three.js and no DOM.
export { createRng, hashString, sfc32 } from './prng'
export type { Rng } from './prng'
export {
    LAUNCH_DATE,
    addDays,
    archiveDates,
    dailySeed,
    holeNumberFor,
    parseDateSeed,
    randomSeed,
} from './seed'
export {
    CURRENT_VERSION,
    GENERATORS,
    VERSION_SCHEDULE,
    generateDailyHole,
    generateHole,
    versionForDate,
    versionForSeed,
    versionInSchedule,
} from './versions'
export type { GenerateOptions, HoleGenerator, ScheduleEntry } from './versions'
export { GREEN_SEAM, createGround } from './ground'
export type { Ground } from './ground'
export { CLUB_CARRY, holeLength, validateHole } from './validate'
export type { ValidationResult } from './validate'
