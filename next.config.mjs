/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    // Handle SVG imports with ?react suffix as React components
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: /react/, // Match *.svg?react
      use: ['@svgr/webpack'],
    })

    // Handle regular SVG imports as files
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: { not: [/react/] }, // Exclude *.svg?react
      type: 'asset/resource',
    })

    return config
  },
}

export default nextConfig
