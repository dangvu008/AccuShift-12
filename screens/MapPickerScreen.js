'use client'

import { useState, useEffect, useContext } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import AsyncStorage from '@react-native-async-storage/async-storage'

const MapPickerScreen = ({ navigation, route }) => {
  const { t, darkMode } = useContext(AppContext)
  const { locationType } = route.params || {}

  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')

  // Default location for Hanoi
  const defaultLocation = {
    latitude: 21.0278,
    longitude: 105.8342,
  }

  // Load existing location if editing
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const savedLocation = await AsyncStorage.getItem(
          locationType === 'home' ? 'homeLocation' : 'workLocation'
        )

        if (savedLocation) {
          const location = JSON.parse(savedLocation)
          setLocationName(location.name)
          setLocationAddress(location.address)
        }
      } catch (error) {
        console.error('Error loading location:', error)
      }
    }

    loadLocation()
  }, [locationType])

  // Save location
  const saveLocation = async () => {
    try {
      const locationData = {
        name: locationName || (locationType === 'home' ? t('Home') : t('Work')),
        address: locationAddress || '',
        latitude: defaultLocation.latitude,
        longitude: defaultLocation.longitude,
      }

      await AsyncStorage.setItem(
        locationType === 'home' ? 'homeLocation' : 'workLocation',
        JSON.stringify(locationData)
      )

      // Return to settings screen with updated location
      navigation.navigate('Settings', {
        updatedLocation: {
          type: locationType,
          data: locationData,
        },
      })
    } catch (error) {
      console.error('Error saving location:', error)
    }
  }

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      <View
        style={[styles.infoContainer, darkMode && styles.darkInfoContainer]}
      >
        <Ionicons
          name="information-circle-outline"
          size={24}
          color={darkMode ? '#aaa' : '#666'}
          style={styles.infoIcon}
        />
        <Text style={[styles.infoText, darkMode && styles.darkText]}>
          {t(
            'Map functionality has been simplified. Please enter your location details manually.'
          )}
        </Text>
      </View>

      {/* Location Details */}
      <View
        style={[
          styles.detailsContainer,
          darkMode && styles.darkDetailsContainer,
        ]}
      >
        <View style={styles.locationNameContainer}>
          <Text style={[styles.detailsLabel, darkMode && styles.darkText]}>
            {locationType === 'home'
              ? t('Home Location Name')
              : t('Work Location Name')}
          </Text>
          <TextInput
            style={[
              styles.locationNameInput,
              darkMode && styles.darkLocationNameInput,
            ]}
            value={locationName}
            onChangeText={setLocationName}
            placeholder={locationType === 'home' ? t('Home') : t('Work')}
            placeholderTextColor={darkMode ? '#777' : '#999'}
          />
        </View>

        <View style={styles.locationAddressContainer}>
          <Text style={[styles.detailsLabel, darkMode && styles.darkText]}>
            {t('Address')}
          </Text>
          <TextInput
            style={[
              styles.locationAddressInput,
              darkMode && styles.darkLocationAddressInput,
            ]}
            value={locationAddress}
            onChangeText={setLocationAddress}
            placeholder={t('Enter address manually')}
            placeholderTextColor={darkMode ? '#777' : '#999'}
            multiline={true}
            numberOfLines={3}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveLocation}
          >
            <Text style={styles.saveButtonText}>{t('Save Location')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0f7fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  darkInfoContainer: {
    backgroundColor: '#263238',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  darkDetailsContainer: {
    backgroundColor: '#1e1e1e',
  },
  locationNameContainer: {
    marginBottom: 16,
  },
  locationAddressContainer: {
    marginBottom: 24,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  locationNameInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  darkLocationNameInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },
  locationAddressInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  darkLocationAddressInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#ddd',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#8a56ff',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
})

export default MapPickerScreen
