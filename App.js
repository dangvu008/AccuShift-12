'use client'

import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import { AppProvider } from './context/AppContext'

// Import screens
import HomeScreen from './screens/HomeScreen'
import ShiftListScreen from './screens/ShiftListScreen'
import ShiftManagementScreen from './screens/ShiftManagementScreen'
import SettingsScreen from './screens/SettingsScreen'
import BackupRestoreScreen from './screens/BackupRestoreScreen'
import WeatherAlertsScreen from './screens/WeatherAlertsScreen'
import WeatherApiKeysScreen from './screens/WeatherApiKeysScreen' // Giữ lại import nhưng không hiển thị trong UI
import WeatherDetailScreen from './screens/WeatherDetailScreen'
import StatisticsScreen from './screens/StatisticsScreen'
import MonthlyReportScreen from './screens/MonthlyReportScreen'
import AttendanceStatsScreen from './screens/AttendanceStatsScreen'
import NotesScreen from './screens/NotesScreen'
import NoteDetailScreen from './screens/NoteDetailScreen'
import LogHistoryScreen from './screens/LogHistoryScreen'
import LogHistoryDetailScreen from './screens/LogHistoryDetailScreen'
import ImageViewerScreen from './screens/ImageViewerScreen'
import AlarmScreen from './screens/AlarmScreen'
import MapPickerScreen from './screens/MapPickerScreen'

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

// Home stack navigator
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#8a56ff',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{ title: 'Thống kê' }}
      />
      <Stack.Screen
        name="MonthlyReport"
        component={MonthlyReportScreen}
        options={{ title: 'Báo cáo tháng' }}
      />
      <Stack.Screen
        name="AttendanceStats"
        component={AttendanceStatsScreen}
        options={{ title: 'Thống kê chấm công' }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ title: 'Chi tiết ghi chú' }}
      />
      <Stack.Screen
        name="AlarmScreen"
        component={AlarmScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShiftManagement"
        component={ShiftManagementScreen}
        options={{ title: 'Quản lý ca làm việc' }}
      />
      <Stack.Screen
        name="WeatherDetail"
        component={WeatherDetailScreen}
        options={{ title: 'Thời tiết' }}
      />
    </Stack.Navigator>
  )
}

// Shifts stack navigator
function ShiftsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#8a56ff',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ShiftList"
        component={ShiftListScreen}
        options={{ title: 'Ca làm việc' }}
      />
    </Stack.Navigator>
  )
}

// Statistics stack navigator
function StatisticsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#8a56ff',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{ title: 'Thống kê' }}
      />
      <Stack.Screen
        name="MonthlyReport"
        component={MonthlyReportScreen}
        options={{ title: 'Báo cáo tháng' }}
      />
      <Stack.Screen
        name="AttendanceStats"
        component={AttendanceStatsScreen}
        options={{ title: 'Thống kê chấm công' }}
      />
      <Stack.Screen
        name="LogHistory"
        component={LogHistoryScreen}
        options={{ title: 'Lịch sử' }}
      />
      <Stack.Screen
        name="LogHistoryDetail"
        component={LogHistoryDetailScreen}
        options={{ title: 'Chi tiết' }}
      />
      <Stack.Screen
        name="ImageViewer"
        component={ImageViewerScreen}
        options={{ title: 'Xem ảnh' }}
      />
    </Stack.Navigator>
  )
}

// Settings stack navigator
function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#8a56ff',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Cài đặt' }}
      />
      <Stack.Screen
        name="BackupRestore"
        component={BackupRestoreScreen}
        options={{ title: 'Sao lưu & Khôi phục' }}
      />
      <Stack.Screen
        name="WeatherAlerts"
        component={WeatherAlertsScreen}
        options={{ title: 'Cảnh báo thời tiết' }}
      />
      <Stack.Screen
        name="Notes"
        component={NotesScreen}
        options={{ title: 'Ghi chú' }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ title: 'Chi tiết ghi chú' }}
      />
      <Stack.Screen
        name="MapPickerScreen"
        component={MapPickerScreen}
        options={{ title: 'Chọn vị trí' }}
      />
      {/* Màn hình này vẫn được đăng ký nhưng không hiển thị trong UI, chỉ dành cho dev */}
      <Stack.Screen
        name="WeatherApiKeys"
        component={WeatherApiKeysScreen}
        options={{ title: 'Khóa API thời tiết' }}
      />
    </Stack.Navigator>
  )
}

export default function App() {
  const [notification, setNotification] = useState(false)

  useEffect(() => {
    // Listen for notifications
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification)
      }
    )

    // Listen for notification responses
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data

        // Handle alarm notifications
        if (data.isAlarm) {
          // Navigate to alarm screen
          // This will be handled by the navigation ref
        }
      })

    return () => {
      subscription.remove()
      responseSubscription.remove()
    }
  }, [])

  return (
    <AppProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName

              if (route.name === 'HomeTab') {
                iconName = focused ? 'home' : 'home-outline'
              } else if (route.name === 'ShiftsTab') {
                iconName = focused ? 'calendar' : 'calendar-outline'
              } else if (route.name === 'StatisticsTab') {
                iconName = focused ? 'stats-chart' : 'stats-chart-outline'
              } else if (route.name === 'SettingsTab') {
                iconName = focused ? 'settings' : 'settings-outline'
              }

              return <Ionicons name={iconName} size={size} color={color} />
            },
            tabBarActiveTintColor: '#8a56ff',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
          })}
        >
          <Tab.Screen
            name="HomeTab"
            component={HomeStack}
            options={{ title: 'Trang chủ' }}
          />
          <Tab.Screen
            name="ShiftsTab"
            component={ShiftsStack}
            options={{ title: 'Ca làm việc' }}
          />
          <Tab.Screen
            name="StatisticsTab"
            component={StatisticsStack}
            options={{ title: 'Thống kê' }}
          />
          <Tab.Screen
            name="SettingsTab"
            component={SettingsStack}
            options={{ title: 'Cài đặt' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </AppProvider>
  )
}
