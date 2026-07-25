import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/components/theme-provider'

/**
 * 28x28 bordered icon button that flips between light and dark. The icons are
 * swapped with the `dark:` variant rather than from state so the button renders
 * correctly in the pre-rendered HTML, before hydration.
 */
export function ModeToggle() {
    const { toggleTheme } = useTheme()

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="border-border bg-popover text-foreground hover:bg-muted focus-visible:ring-ring flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
        >
            <Sun className="size-[13px] dark:hidden" />
            <Moon className="hidden size-[13px] dark:block" />
        </button>
    )
}
