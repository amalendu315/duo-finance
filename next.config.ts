import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    register: true,
    skipWaiting: true,
    // ⚠️ Force enable PWA in dev mode to test installation
    // Change this back to `process.env.NODE_ENV === 'development'` later
    // if you encounter caching issues while coding.
    disable: false,
});

const nextConfig: NextConfig = {
    reactStrictMode: true,
    // Fix for infinite loop: Ignore SW files in webpack watch
    webpack: (config) => {
        config.watchOptions = {
            ...config.watchOptions,
            ignored: [
                // preserving existing ignored files if any
                ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : []),
                "**/public/sw.js",
                "**/public/workbox-*.js",
            ],
        };
        return config;
    },
};

export default withPWA(nextConfig as never);