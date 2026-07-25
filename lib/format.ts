const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
]

/**
 * Formats an ISO-ish date string (`2024-10-16`) as `Oct 2024`, the meta format
 * used across the site. Returns the input unchanged when it cannot be parsed.
 */
export function formatMonthYear(value: string): string {
    const match = /^(\d{4})-(\d{2})/.exec(value.trim())
    if (!match) {
        return value
    }
    const month = MONTHS[Number(match[2]) - 1]
    return month ? `${month} ${match[1]}` : value
}
