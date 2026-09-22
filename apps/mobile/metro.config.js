const {getDefaultConfig} = require('metro-config');

module.exports = (async () => {
  const {
    resolver: {sourceExts, assetExts},
  } = await getDefaultConfig();
  return {
    transformer: {
      babelTransformerPath: require.resolve('react-native-typescript-transformer'),
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'js'),
      sourceExts: [...sourceExts, 'ts', 'tsx'],
    },
    watchFolders: ['../../packages', '../../services'],
    server: {
      port: 8081,
    },
  };
})();
