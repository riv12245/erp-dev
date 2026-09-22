// @ts-check
import {AppRegistry, NativeModules} from 'react-native';
import {configureApi} from './src/services/api-config';
import {App} from './src/app/App';
import {name as appName} from './src/app.json';

configureApi(NativeModules.ErpConfig.API_BASE_URL);
AppRegistry.registerComponent(appName, () => App);
