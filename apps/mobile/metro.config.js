const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Root node_modules has React 18 (Next.js). react-native 0.81.5 needs React 19.
// Metro's config merging spreads resolver objects, which silently drops Proxy traps,
// so extraNodeModules: new Proxy(...) doesn't survive. resolveRequest is a plain
// function reference and does survive the merge — use it to redirect all react/*
// imports to mobile's local React 19 before Metro's default resolution runs.
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const filePath = require.resolve(moduleName, { paths: [mobileNodeModules] });
    return { filePath, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
