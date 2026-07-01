import type { Project } from '@/types/project'

export const statusColors: Record<Project['status'], string> = {
    Finished: 'bg-green-500/10 text-green-700 dark:text-green-400',
    'In Progress': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    Planned: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    Abandoned: 'bg-red-500/10 text-red-700 dark:text-red-400',
    'On Hold': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
}

export const statusColorsBordered: Record<Project['status'], string> =
    Object.fromEntries(
        Object.entries(statusColors).map(([status, classes]) => [
            status,
            `${classes} border-current/20`,
        ])
    ) as Record<Project['status'], string>
