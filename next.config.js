/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;
