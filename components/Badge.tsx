interface BadgeProps {
    status: 'Finished' | 'In Progress' | 'Planned' | 'Abandoned' | 'On Hold'
}

export function Badge({ status }: BadgeProps) {
    let badgeColor = ''

    switch (status) {
        case 'Finished':
            badgeColor = 'bg-green-500 text-white'
            break
        case 'In Progress':
            badgeColor = 'bg-blue-500 text-white'
            break
        case 'Planned':
            badgeColor = 'bg-yellow-500 text-white'
            break
        case 'Abandoned':
            badgeColor = 'bg-red-500 text-white'
            break
        case 'On Hold':
            badgeColor = 'bg-gray-500 text-white'
            break
        default:
            badgeColor = 'bg-gray-200 text-black' // fallback color
    }

    return (
        <span
            className={`ml-auto rounded-full px-3 py-0.5 text-sm font-semibold ${badgeColor}`}
        >
            {status}
        </span>
    )
}
