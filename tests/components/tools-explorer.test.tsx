import { getAllTags, getAllTools, getPopularTools } from '@/data/toolsData'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ToolsExplorer from '@/app/tools/components/ToolsExplorer'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace }),
    usePathname: () => '/tools',
}))

function renderExplorer() {
    return render(
        <ToolsExplorer
            tools={getAllTools()}
            popularTools={getPopularTools()}
            allTags={getAllTags()}
        />
    )
}

describe('ToolsExplorer', () => {
    beforeEach(() => {
        replace.mockClear()
    })

    it('renders all tools grouped by category by default', () => {
        renderExplorer()
        // Popular tools render both in the Popular section and their category
        // group, so a popular tool may appear more than once.
        expect(
            screen.getAllByRole('link', { name: 'Byte Converter' }).length
        ).toBeGreaterThan(0)
        expect(
            screen.getByRole('link', { name: 'Reverse Shell Generator' })
        ).toBeInTheDocument()
    })

    it('shows a Popular section when no filters are active', () => {
        renderExplorer()
        expect(screen.getByText('Popular')).toBeInTheDocument()
    })

    it('filters tools by free-text search', async () => {
        const user = userEvent.setup()
        renderExplorer()
        await user.type(
            screen.getByRole('searchbox', { name: 'Search tools' }),
            'subnet'
        )
        await waitFor(() =>
            expect(
                screen.getByRole('link', { name: 'IP Subnet Calculator' })
            ).toBeInTheDocument()
        )
        expect(
            screen.queryByRole('link', { name: 'Byte Converter' })
        ).not.toBeInTheDocument()
    })

    it('shows an empty state for a query with no matches', async () => {
        const user = userEvent.setup()
        renderExplorer()
        await user.type(
            screen.getByRole('searchbox', { name: 'Search tools' }),
            'zzzznotarealtool'
        )
        await waitFor(() =>
            expect(
                screen.getByText('No tools match your search.')
            ).toBeInTheDocument()
        )
    })

    it('filters by clicking a category chip', async () => {
        const user = userEvent.setup()
        renderExplorer()
        await user.click(screen.getByRole('button', { name: 'Security & CTF' }))
        await waitFor(() =>
            expect(
                screen.getByRole('link', { name: 'Reverse Shell Generator' })
            ).toBeInTheDocument()
        )
        expect(
            screen.queryByRole('link', { name: 'Byte Converter' })
        ).not.toBeInTheDocument()
    })

    it('filters by a tag from the tag bar and clears it again', async () => {
        const user = userEvent.setup()
        renderExplorer()
        const tagBar = screen.getByRole('group', { name: 'Filter by tag' })
        await user.click(within(tagBar).getByRole('button', { name: 'cidr' }))
        await waitFor(() =>
            expect(
                screen.getByRole('link', { name: 'IP Subnet Calculator' })
            ).toBeInTheDocument()
        )
        expect(
            screen.queryByRole('link', { name: 'Byte Converter' })
        ).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /clear filters/i }))
        await waitFor(() =>
            expect(
                screen.getAllByRole('link', { name: 'Byte Converter' }).length
            ).toBeGreaterThan(0)
        )
    })

    it('syncs filter state to the URL', async () => {
        const user = userEvent.setup()
        renderExplorer()
        await user.type(
            screen.getByRole('searchbox', { name: 'Search tools' }),
            'hash'
        )
        await waitFor(() =>
            expect(replace).toHaveBeenCalledWith(
                expect.stringContaining('q=hash'),
                expect.objectContaining({ scroll: false })
            )
        )
    })
})
