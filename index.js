import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

import 'expo-router/entry';

registerWidgetTaskHandler(widgetTaskHandler);
