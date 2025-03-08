import type { Config } from 'tailwindcss'

import { heroui } from "@heroui/react"

const config: Config = {
    content: [
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
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
    plugins: [heroui()],
}
export default config
