module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@erp/*': ['../../packages/*/src', '../../services/*/src'],
        '@erp/mobile/*': ['./src/*'],
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    }],
  ],
};
