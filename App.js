import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CalendarScreen from './src/screens/CalendarScreen';
import StudentListScreen from './src/screens/StudentListScreen';
import StudentDetailScreen from './src/screens/StudentDetailScreen';
import ClassRecordScreen from './src/screens/ClassRecordScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <Stack.Navigator
        initialRouteName="Calendar"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1.5,
          },
          headerTintColor: '#333333',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          cardStyle: { backgroundColor: '#f9f9f9' },
        }}
      >
        <Stack.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ title: '수업 캘린더' }}
        />
        <Stack.Screen
          name="StudentList"
          component={StudentListScreen}
          options={{ title: '학생 주소록' }}
        />
        <Stack.Screen
          name="StudentDetail"
          component={StudentDetailScreen}
          options={{ title: '학생 정보' }}
        />
        <Stack.Screen
          name="ClassRecord"
          component={ClassRecordScreen}
          options={{ title: '수업 일지 기록' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: '설정' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
