// Club labels for the HUD. The list follows the physics CLUB_ORDER (longest
// to shortest), so a club index means the same club in both. The full names
// come from the physics club table; only the short labels are UI data.
import { CLUBS, CLUB_ORDER, type ClubId } from '../physics/clubs'

export interface ClubLabel {
    id: ClubId
    /** Full name, shown with the carry. */
    name: string
    /** Label on the club bar. */
    short: string
    /** Even shorter label for narrow screens. */
    narrow: string
}

const SHORT: Record<ClubId, [short: string, narrow: string]> = {
    driver: ['Driver', 'Dr'],
    wood3: ['3W', '3W'],
    iron5: ['5i', '5i'],
    iron7: ['7i', '7i'],
    iron9: ['9i', '9i'],
    pw: ['PW', 'PW'],
    sw: ['SW', 'SW'],
    putter: ['Putter', 'Pt'],
}

/** One entry per club, in CLUB_ORDER. */
export const CLUB_LABELS: readonly ClubLabel[] = CLUB_ORDER.map((id) => ({
    id,
    name: CLUBS[id].name,
    short: SHORT[id][0],
    narrow: SHORT[id][1],
}))

export const CLUB_COUNT = CLUB_LABELS.length

export const PUTTER_INDEX = CLUB_ORDER.indexOf('putter')

export function clampClubIndex(i: number): number {
    return Math.max(0, Math.min(CLUB_COUNT - 1, Math.round(i)))
}
