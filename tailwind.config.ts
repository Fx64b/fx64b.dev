import type { Config } from 'tailwindcss'

import { nextui } from '@nextui-org/react'

const config: Config = {
    content: [
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    light: '#030709',
                    dark: '#030709',
                    DEFAULT: '#030709',
                },
            },
        },
    },
    darkMode: 'class',
    plugins: [nextui()],
}
export default config
