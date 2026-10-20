const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo (so packages/shared updates trigger hot reload)
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages in pnpm workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Prevent duplicate react versions
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
