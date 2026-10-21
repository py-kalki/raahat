const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Ensure the monorepo root is included in watchFolders
if (!config.watchFolders.includes(monorepoRoot)) {
  config.watchFolders.push(monorepoRoot);
}

// Expo resolves the app entry from package.json. Do not redirect generic
// './index' imports: dependencies use those for their own internal modules.

module.exports = config;
