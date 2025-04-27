'use client'

import { useContext, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SettingsScreen = ({ navigation }) => {
  const {
    t,
    darkMode,
    language,
    notificationSound,
    notificationVibration,
    alarmPermissionGranted,
    onlyGoWorkMode,
    toggleDarkMode,
    changeLanguage,
    toggleNotificationSound,
    toggleNotificationVibration,
    toggleOnlyGoWorkMode,
    requestAlarmPermission,
  } = useContext(AppContext)

  const languages = [
    { id: 'vi', name: 'Tiếng Việt' },
    { id: 'en', name: 'English' },
  ]

  const [showLanguageModal, setShowLanguageModal] = useState(false)

  const handleLanguageChange = (langId) => {
    changeLanguage(langId)
    setShowLanguageModal(false)
  }

  const [weatherAlertsEnabled, setWeatherAlertsEnabled] = useState(true)

  useEffect(() => {
    // Load weather alerts setting
    const loadWeatherAlertsSetting = async () => {
      try {
        const value = await AsyncStorage.getItem('weatherAlertsEnabled')
        if (value !== null) {
          setWeatherAlertsEnabled(value === 'true')
        }
      } catch (error) {
        console.error('Error loading weather alerts setting:', error)
      }
    }

    loadWeatherAlertsSetting()
  }, [])

  const toggleWeatherAlerts = (value) => {
    setWeatherAlertsEnabled(value)
    // Save setting to AsyncStorage
    AsyncStorage.setItem('weatherAlertsEnabled', value.toString())
  }

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Attendance Button Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
          {t('Attendance Button')}
        </Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
              {t('Only Go Work Mode')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                darkMode && styles.darkSubtitle,
              ]}
            >
              {t(
                'Only show Go Work button instead of the full attendance flow'
              )}
            </Text>
          </View>
          <Switch
            value={onlyGoWorkMode}
            onValueChange={toggleOnlyGoWorkMode}
            trackColor={{ false: '#767577', true: '#8a56ff' }}
            thumbColor={onlyGoWorkMode ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
          {t('Notifications')}
        </Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
              {t('Alarm Permissions')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                darkMode && styles.darkSubtitle,
              ]}
            >
              {t(
                'Allow alarms to work even when the device is in Do Not Disturb mode'
              )}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              alarmPermissionGranted
                ? styles.permissionGrantedButton
                : styles.permissionNeededButton,
            ]}
            onPress={requestAlarmPermission}
          >
            <Text style={styles.permissionButtonText}>
              {alarmPermissionGranted ? t('Granted') : t('Request')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
              {t('Notification Sound')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                darkMode && styles.darkSubtitle,
              ]}
            >
              {t('Play sound for notifications')}
            </Text>
          </View>
          <Switch
            value={notificationSound}
            onValueChange={toggleNotificationSound}
            trackColor={{ false: '#767577', true: '#8a56ff' }}
            thumbColor={notificationSound ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
              {t('Notification Vibration')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                darkMode && styles.darkSubtitle,
              ]}
            >
              {t('Vibrate for notifications')}
            </Text>
          </View>
          <Switch
            value={notificationVibration}
            onValueChange={toggleNotificationVibration}
            trackColor={{ false: '#767577', true: '#8a56ff' }}
            thumbColor={notificationVibration ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Weather Alerts Toggle */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
          {t('Weather Settings')}
        </Text>

        <View style={styles.settingItem}>
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
              {t('Get notified about weather conditions before departure')}
            </Text>
          </View>
          <Switch
            value={weatherAlertsEnabled}
            onValueChange={toggleWeatherAlerts}
            trackColor={{ false: '#767577', true: '#8a56ff' }}
            thumbColor={weatherAlertsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Backup & Restore Section */}
      <TouchableOpacity
        style={[styles.menuItem, darkMode && styles.darkCard]}
        onPress={() => navigation.navigate('BackupRestore')}
      >
        <View style={styles.menuIconContainer}>
          <Ionicons
            name="cloud-outline"
            size={24}
            color={darkMode ? '#fff' : '#000'}
          />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, darkMode && styles.darkText]}>
            {t('Backup & Restore')}
          </Text>
          <Text
            style={[styles.menuDescription, darkMode && styles.darkSubtitle]}
          >
            {t('Backup and restore your data')}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={darkMode ? '#aaa' : '#999'}
        />
      </TouchableOpacity>

      {/* General Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
          {t('General Settings')}
        </Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
              {t('Dark Mode')}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                darkMode && styles.darkSubtitle,
              ]}
            >
              {t('Enable Dark Mode for better viewing in low light')}
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: '#8a56ff' }}
            thumbColor={darkMode ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
            {t('Language')}
          </Text>
          <TouchableOpacity
            style={[styles.dropdown, darkMode && styles.darkDropdown]}
            onPress={() => setShowLanguageModal(true)}
          >
            <Text style={[styles.dropdownText, darkMode && styles.darkText]}>
              {languages.find((lang) => lang.id === language)?.name ||
                'Tiếng Việt'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={darkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>

        {/* Modal chọn ngôn ngữ */}
        {showLanguageModal && (
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, darkMode && styles.darkModalContent]}
            >
              <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
                {t('Select Language')}
              </Text>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.languageOption,
                    language === lang.id && styles.selectedLanguageOption,
                    darkMode && styles.darkLanguageOption,
                    language === lang.id &&
                      darkMode &&
                      styles.darkSelectedLanguageOption,
                  ]}
                  onPress={() => handleLanguageChange(lang.id)}
                >
                  <Text
                    style={[
                      styles.languageText,
                      language === lang.id && styles.selectedLanguageText,
                      darkMode && styles.darkText,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {language === lang.id && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={darkMode ? '#fff' : '#8a56ff'}
                    />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  darkMode && styles.darkCancelButton,
                ]}
                onPress={() => setShowLanguageModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, darkMode && styles.darkSubtitle]}>
          AccShift v1.0.0
        </Text>
        <Text style={[styles.appCopyright, darkMode && styles.darkSubtitle]}>
          © 2025 AccShift
        </Text>
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
  darkSubtitle: {
    color: '#aaa',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  darkDropdown: {
    backgroundColor: '#2a2a2a',
  },
  dropdownText: {
    fontSize: 14,
    color: '#000',
    marginRight: 8,
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  permissionNeededButton: {
    backgroundColor: '#f39c12',
  },
  permissionGrantedButton: {
    backgroundColor: '#27ae60',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#666',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  darkModalContent: {
    backgroundColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  darkLanguageOption: {
    backgroundColor: '#3a3a3a',
  },
  selectedLanguageOption: {
    backgroundColor: '#e6e0ff',
  },
  darkSelectedLanguageOption: {
    backgroundColor: '#4a3b80',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  selectedLanguageText: {
    fontWeight: 'bold',
    color: '#8a56ff',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  darkCancelButton: {
    backgroundColor: '#3a3a3a',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#8a56ff',
    fontWeight: 'bold',
  },
})

export default SettingsScreen
