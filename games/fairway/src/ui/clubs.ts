// Club labels for the HUD. The order matches the physics CLUB_ORDER
// (longest to shortest): the club index is the same in both.

export const CLUB_COUNT = 8

/** Full names, shown with the carry. */
export const CLUB_NAMES: readonly string[] = [
    'Driver',
    '3 Wood',
    '5 Iron',
    '7 Iron',
    '9 Iron',
    'Pitching wedge',
    'Sand wedge',
    'Putter',
]

/** Labels on the club bar. */
export const CLUB_LABELS: readonly string[] = [
    'Driver',
    '3W',
    '5i',
    '7i',
    '9i',
    'PW',
    'SW',
    'Putter',
]

/** Even shorter labels for narrow screens. */
export const CLUB_LABELS_NARROW: readonly string[] = [
    'Dr',
    '3W',
    '5i',
    '7i',
    '9i',
    'PW',
    'SW',
    'Pt',
]

export const PUTTER_INDEX = 7

export function clampClubIndex(i: number): number {
    return Math.max(0, Math.min(CLUB_COUNT - 1, Math.round(i)))
}
