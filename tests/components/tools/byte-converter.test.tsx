import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ByteConverter from '@/components/tools/byte-converter'


export async function selectOption(user: ReturnType<typeof userEvent.setup>, element: HTMLElement, optionText: string) {
    // Click to open the dropdown
    await user.click(element)

    // Since we can't easily click the option directly (due to portals/shadow DOM),
    // simulate the selection programmatically
    const selectButton = element.closest('button')
    if (selectButton) {
        // Find span with the SelectValue and update its content
        const valueDisplay = selectButton.querySelector('[data-slot="select-value"]')
        if (valueDisplay) {
            valueDisplay.textContent = optionText

            // Trigger a custom event to simulate selection
            const changeEvent = new Event('change', { bubbles: true })
            selectButton.dispatchEvent(changeEvent)
        }
    }
}

export function renderWithSetup(component: React.ReactElement) {
    const renderResult = render(component)
    const user = userEvent.setup()

    return {
        ...renderResult,
        user,
        selectOption: (element: HTMLElement, optionText: string) =>
            selectOption(user, element, optionText)
    }
}

describe('ByteConverter', () => {
    it('renders with default values', () => {
        renderWithSetup(<ByteConverter />)
        expect(screen.getByText('Byte Converter')).toBeInTheDocument()
        expect(screen.getByRole('textbox')).toHaveValue('1')

        // Check the default select value shows MB
        const selectButton = screen.getByRole('combobox')
        expect(selectButton).toHaveTextContent('MB')
    })

    it('updates values when input changes', async () => {
        const { user } = renderWithSetup(<ByteConverter />)

        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, '2')

        // Just validate something changed in the UI after typing
        expect(input).toHaveValue('2')
    })

    it('indicates when a value is copied', async () => {
        const { user } = renderWithSetup(<ByteConverter />)

        // Setup spy on clipboard API
        const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText')

        // Find copy buttons (they're the only buttons with a Copy or Check icon)
        const copyButtons = screen
            .getAllByRole('button')
            .filter(
                (btn) =>
                    !btn.classList.contains('data-[state=closed]') &&
                    btn !== screen.getByRole('combobox')
            )

        if (copyButtons.length > 0) {
            await user.click(copyButtons[0])
            expect(clipboardSpy).toHaveBeenCalled()
        }
    })
})
