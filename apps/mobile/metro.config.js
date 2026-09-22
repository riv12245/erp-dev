const path = require('node:path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const workspaceRoot = path.resolve(__dirname, '../..');
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  maxWorkers: 2,
  watchFolders: [workspaceRoot],
  resolver: {
    disableHierarchicalLookup: true,
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')],
  },
});
