'use client'

import { useState, useContext, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import locationUtils from '../utils/location'

const WeatherAlertsScreen = () => {
  const { t, darkMode, weatherAlerts } = useContext(AppContext)
  const [weatherAlertEnabled, setWeatherAlertEnabled] = useState(true)
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false)

  // Sample weather alerts for demonstration
  const [sampleAlerts, setSampleAlerts] = useState([
    {
      id: '1',
      type: 'rain',
      severity: 'moderate',
      message:
        'Mưa vừa đến mưa to dự kiến trong khoảng thời gian từ 15:00 đến 18:00',
      timestamp: Date.now(),
      affectedShifts: ['Ca Ngày'],
    },
    {
      id: '2',
      type: 'temperature',
      severity: 'high',
      message: 'Nhiệt độ cao bất thường (35°C) dự kiến vào buổi trưa',
      timestamp: Date.now() - 24 * 60 * 60 * 1000,
      affectedShifts: ['Ca Hành chính'],
    },
  ])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedWeatherAlertEnabled = await AsyncStorage.getItem(
          'weatherAlertEnabled'
        )
        if (storedWeatherAlertEnabled !== null) {
          setWeatherAlertEnabled(storedWeatherAlertEnabled === 'true')
        }

        // In a real app, you would check location permission here
        setLocationPermissionGranted(true)
      } catch (error) {
        console.error('Error loading weather settings:', error)
      }
    }

    loadSettings()
  }, [])

  const toggleWeatherAlert = async () => {
    try {
      const newValue = !weatherAlertEnabled
      setWeatherAlertEnabled(newValue)
      await AsyncStorage.setItem('weatherAlertEnabled', newValue.toString())
    } catch (error) {
      console.error('Error saving weather settings:', error)
    }
  }

  const requestLocationPermission = async () => {
    // In a real app, you would request location permission here
    setLocationPermissionGranted(true)
  }

  const getWeatherIcon = (type) => {
    switch (type) {
      case 'rain':
        return 'rainy'
      case 'temperature':
        return 'thermometer'
      case 'wind':
        return 'thunderstorm'
      default:
        return 'cloud'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low':
        return '#3498db'
      case 'moderate':
        return '#f39c12'
      case 'high':
        return '#e74c3c'
      default:
        return '#3498db'
    }
  }

  const renderAlertItem = ({ item }) => (
    <View style={[styles.alertItem, darkMode && styles.darkAlertItem]}>
      <View
        style={[
          styles.alertIconContainer,
          { backgroundColor: getSeverityColor(item.severity) },
        ]}
      >
        <Ionicons name={getWeatherIcon(item.type)} size={24} color="#fff" />
      </View>

      <View style={styles.alertContent}>
        <Text style={[styles.alertMessage, darkMode && styles.darkText]}>
          {item.message}
        </Text>

        {item.affectedShifts && item.affectedShifts.length > 0 && (
          <View style={styles.affectedShiftsContainer}>
            <Text
              style={[
                styles.affectedShiftsLabel,
                darkMode && styles.darkSubtitle,
              ]}
            >
              {t('Affected shifts')}:
            </Text>
            {item.affectedShifts.map((shift, index) => (
              <View key={index} style={styles.shiftTag}>
                <Text style={styles.shiftTagText}>{shift}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.alertTimestamp, darkMode && styles.darkSubtitle]}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={[styles.settingsCard, darkMode && styles.darkCard]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
              {t('Weather Alerts')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                darkMode && styles.darkSubtitle,
              ]}
            >
              {t(
                'Receive alerts about extreme weather conditions that may affect your shifts'
              )}
            </Text>
          </View>
          <Switch
            value={weatherAlertEnabled}
            onValueChange={toggleWeatherAlert}
            trackColor={{ false: '#767577', true: '#8a56ff' }}
            thumbColor={weatherAlertEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        {!locationPermissionGranted && (
          <View style={styles.permissionContainer}>
            <Text
              style={[styles.permissionText, darkMode && styles.darkSubtitle]}
            >
              {t('Location permission is required for weather alerts')}
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.permissionButtonText}>
                {t('Grant Permission')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
        {t('Current Alerts')}
      </Text>

      {sampleAlerts.length > 0 ? (
        <FlatList
          data={sampleAlerts}
          renderItem={renderAlertItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.alertsList}
        />
      ) : (
        <View style={[styles.emptyContainer, darkMode && styles.darkCard]}>
          <Ionicons
            name="sunny-outline"
            size={64}
            color={darkMode ? '#555' : '#ccc'}
          />
          <Text style={[styles.emptyText, darkMode && styles.darkText]}>
            {t('No weather alerts at this time')}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  permissionContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  permissionButton: {
    backgroundColor: '#f39c12',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  alertsList: {
    paddingBottom: 16,
  },
  alertItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  darkAlertItem: {
    backgroundColor: '#1e1e1e',
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  affectedShiftsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  affectedShiftsLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  shiftTag: {
    backgroundColor: '#8a56ff',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  shiftTagText: {
    color: '#fff',
    fontSize: 12,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
})

export default WeatherAlertsScreen
