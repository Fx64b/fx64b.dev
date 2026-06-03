import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import AgeInEverything from '@/components/tools/age-in-everything'

describe('AgeInEverything', () => {
    it('shows nothing until a birthdate is entered', () => {
        render(<AgeInEverything />)
        expect(screen.queryByText('Days')).not.toBeInTheDocument()
    })

    it('computes age breakdown for a past birthdate', () => {
        render(<AgeInEverything />)
        fireEvent.change(screen.getByLabelText('Date of birth'), {
            target: { value: '2000-01-01' },
        })
        expect(screen.getByText('Days')).toBeInTheDocument()
        expect(screen.getByText('Heartbeats')).toBeInTheDocument()
    })

    it('shows age on other planets', () => {
        render(<AgeInEverything />)
        fireEvent.change(screen.getByLabelText('Date of birth'), {
            target: { value: '2000-01-01' },
        })
        expect(screen.getByText('Mars')).toBeInTheDocument()
        expect(screen.getByText('Jupiter')).toBeInTheDocument()
    })

    it('ignores future birthdates', () => {
        render(<AgeInEverything />)
        fireEvent.change(screen.getByLabelText('Date of birth'), {
            target: { value: '2999-01-01' },
        })
        expect(screen.queryByText('Days')).not.toBeInTheDocument()
    })
})
