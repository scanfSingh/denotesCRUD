/** @type {import('next').NextConfig} */
const packageJson = require('./package.json');

const nextConfig = {
  env: {
    APP_VERSION: packageJson.version,
  },
};

module.exports = nextConfig;
