/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'img.shields.io',
                port: '',
                pathname: '/badge/**',
            },
        ],
        dangerouslyAllowSVG: true,
    },
}

export default nextConfig
