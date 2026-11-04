/** @type {import('next').NextConfig} */
const path = require('path');
const packageJson = require('./package.json');

const nextConfig = {
  env: {
    APP_VERSION: packageJson.version,
  },
  // pdf-parse/mammoth (mock interview resume parsing) do dynamic
  // requires/fs access that don't play well with webpack bundling -
  // keep them as plain Node requires in the serverless function
  // instead of being bundled.
  serverExternalPackages: ["pdf-parse", "mammoth"],
  // The kokoro worker (lib/interview/kokoroWorker.ts, loads kokoro-js) is
  // only constructed in the browser. Alias it to an empty module in the
  // server/SSR compilation so it never lands in .next/server. (The
  // sharp/onnxruntime-node client aliases recommended by transformers.js
  // were tested and are not needed for this build.)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        [path.resolve(__dirname, "lib/interview/kokoroWorker.ts")]: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
