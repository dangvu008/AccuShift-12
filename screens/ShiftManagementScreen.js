'use client'

import { useState, useEffect, useContext } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Switch,
  Alert,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../config/appConfig'

const ShiftManagementScreen = ({ navigation }) => {
  const { t, darkMode, setCurrentShift, currentShift } = useContext(AppContext)
  const [shifts, setShifts] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [shiftName, setShiftName] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [breakTime, setBreakTime] = useState('60')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)

  // Load shifts from storage
  useEffect(() => {
    loadShifts()
  }, [])

  const loadShifts = async () => {
    try {
      const shiftsData = await AsyncStorage.getItem(STORAGE_KEYS.SHIFT_LIST)
      if (shiftsData) {
        const parsedShifts = JSON.parse(shiftsData)
        setShifts(parsedShifts)
      } else {
        // If no shifts exist, create default shifts
        const defaultShifts = [
          {
            id: '1',
            name: 'Ca 1',
            startTime: '06:00',
            endTime: '14:00',
            breakTime: 30,
            isActive: true,
            isDefault: false,
          },
          {
            id: '2',
            name: 'Ca 2',
            startTime: '14:00',
            endTime: '22:00',
            breakTime: 30,
            isActive: true,
            isDefault: false,
          },
          {
            id: '3',
            name: 'Ca 3',
            startTime: '22:00',
            endTime: '06:00',
            breakTime: 30,
            isActive: true,
            isDefault: false,
          },
          {
            id: '4',
            name: 'Ca hành chính',
            startTime: '08:00',
            endTime: '17:00',
            breakTime: 60,
            isActive: true,
            isDefault: true,
          },
          {
            id: '5',
            name: 'Ca ngày',
            startTime: '08:00',
            endTime: '20:00',
            breakTime: 60,
            isActive: true,
            isDefault: false,
          },
          {
            id: '6',
            name: 'Ca đêm',
            startTime: '20:00',
            endTime: '08:00',
            breakTime: 60,
            isActive: true,
            isDefault: false,
          },
        ]
        await AsyncStorage.setItem(
          STORAGE_KEYS.SHIFT_LIST,
          JSON.stringify(defaultShifts)
        )
        setShifts(defaultShifts)
      }
    } catch (error) {
      console.error('Error loading shifts:', error)
    }
  }

  const saveShifts = async (updatedShifts) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SHIFT_LIST,
        JSON.stringify(updatedShifts)
      )
      setShifts(updatedShifts)
    } catch (error) {
      console.error('Error saving shifts:', error)
    }
  }

  const handleAddShift = () => {
    setEditingShift(null)
    setShiftName('')
    setStartTime('08:00')
    setEndTime('17:00')
    setBreakTime('60')
    setIsActive(true)
    setIsDefault(false)
    setModalVisible(true)
  }

  const handleEditShift = (shift) => {
    setEditingShift(shift)
    setShiftName(shift.name)
    setStartTime(shift.startTime)
    setEndTime(shift.endTime)
    setBreakTime(shift.breakTime.toString())
    setIsActive(shift.isActive)
    setIsDefault(shift.isDefault)
    setModalVisible(true)
  }

  const handleDeleteShift = (shiftId) => {
    Alert.alert(
      t('Delete Shift'),
      t('Are you sure you want to delete this shift?'),
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () => {
            const updatedShifts = shifts.filter((shift) => shift.id !== shiftId)
            saveShifts(updatedShifts)
          },
        },
      ]
    )
  }

  const handleSaveShift = () => {
    if (!shiftName.trim()) {
      Alert.alert(t('Error'), t('Shift name is required'))
      return
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      Alert.alert(t('Error'), t('Invalid time format. Use HH:MM'))
      return
    }

    // Validate break time
    const breakTimeNum = parseInt(breakTime, 10)
    if (isNaN(breakTimeNum) || breakTimeNum < 0) {
      Alert.alert(t('Error'), t('Break time must be a positive number'))
      return
    }

    let updatedShifts = [...shifts]

    // If isDefault is true, set all other shifts to not default
    if (isDefault) {
      updatedShifts = updatedShifts.map((shift) => ({
        ...shift,
        isDefault: false,
      }))
    }

    if (editingShift) {
      // Update existing shift
      updatedShifts = updatedShifts.map((shift) =>
        shift.id === editingShift.id
          ? {
              ...shift,
              name: shiftName,
              startTime,
              endTime,
              breakTime: breakTimeNum,
              isActive,
              isDefault,
            }
          : shift
      )
    } else {
      // Add new shift
      const newShift = {
        id: Date.now().toString(),
        name: shiftName,
        startTime,
        endTime,
        breakTime: breakTimeNum,
        isActive,
        isDefault,
      }
      updatedShifts.push(newShift)
    }

    saveShifts(updatedShifts)
    setModalVisible(false)
  }

  const handleSelectShift = (shift) => {
    setCurrentShift(shift)
    navigation.goBack()
  }

  const renderShiftItem = ({ item }) => (
    <View
      style={[
        styles.shiftItem,
        darkMode && styles.darkShiftItem,
        item.id === currentShift?.id && styles.selectedShiftItem,
        item.id === currentShift?.id &&
          darkMode &&
          styles.darkSelectedShiftItem,
      ]}
    >
      <TouchableOpacity
        style={styles.shiftContent}
        onPress={() => handleSelectShift(item)}
      >
        <View style={styles.shiftHeader}>
          <Text
            style={[
              styles.shiftName,
              darkMode && styles.darkText,
              !item.isActive && styles.inactiveText,
            ]}
          >
            {item.name}
          </Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{t('Default')}</Text>
            </View>
          )}
        </View>

        <View style={styles.shiftDetails}>
          <Text
            style={[
              styles.shiftTime,
              darkMode && styles.darkSubtitle,
              !item.isActive && styles.inactiveText,
            ]}
          >
            {item.startTime} - {item.endTime}
          </Text>
          <Text
            style={[
              styles.shiftBreak,
              darkMode && styles.darkSubtitle,
              !item.isActive && styles.inactiveText,
            ]}
          >
            {t('Break')}: {item.breakTime} {t('min')}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.shiftActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditShift(item)}
        >
          <Ionicons
            name="pencil"
            size={20}
            color={darkMode ? '#aaa' : '#666'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteShift(item.id)}
        >
          <Ionicons name="trash" size={20} color={darkMode ? '#aaa' : '#666'} />
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={darkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, darkMode && styles.darkText]}>
          {t('Manage Shifts')}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddShift}>
          <Ionicons
            name="add-circle"
            size={24}
            color={darkMode ? '#8a56ff' : '#8a56ff'}
          />
        </TouchableOpacity>
      </View>

      {/* Shift Change Reminder */}
      <View style={[styles.reminderContainer, darkMode && styles.darkCard]}>
        <Text style={[styles.reminderLabel, darkMode && styles.darkText]}>
          {t('Shift Change Reminder')}
        </Text>
        <TouchableOpacity
          style={[styles.dropdown, darkMode && styles.darkDropdown]}
        >
          <Text style={[styles.dropdownText, darkMode && styles.darkText]}>
            {t('No Reminder')}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      {/* Shifts List */}
      <FlatList
        data={shifts}
        renderItem={renderShiftItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.shiftsList}
      />

      {/* Add/Edit Shift Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, darkMode && styles.darkModalContent]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
                {editingShift ? t('Edit Shift') : t('Add Shift')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={darkMode ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.inputLabel, darkMode && styles.darkText]}>
                {t('Shift Name')}
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.darkInput]}
                value={shiftName}
                onChangeText={setShiftName}
                placeholder={t('Enter shift name')}
                placeholderTextColor={darkMode ? '#666' : '#999'}
              />

              <Text style={[styles.inputLabel, darkMode && styles.darkText]}>
                {t('Start Time (HH:MM)')}
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.darkInput]}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="08:00"
                placeholderTextColor={darkMode ? '#666' : '#999'}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={[styles.inputLabel, darkMode && styles.darkText]}>
                {t('End Time (HH:MM)')}
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.darkInput]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="17:00"
                placeholderTextColor={darkMode ? '#666' : '#999'}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={[styles.inputLabel, darkMode && styles.darkText]}>
                {t('Break Time (minutes)')}
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.darkInput]}
                value={breakTime}
                onChangeText={setBreakTime}
                placeholder="60"
                placeholderTextColor={darkMode ? '#666' : '#999'}
                keyboardType="number-pad"
              />

              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, darkMode && styles.darkText]}>
                  {t('Active')}
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#767577', true: '#8a56ff' }}
                  thumbColor={isActive ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, darkMode && styles.darkText]}>
                  {t('Set as Default')}
                </Text>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#767577', true: '#8a56ff' }}
                  thumbColor={isDefault ? '#fff' : '#f4f3f4'}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveShift}
            >
              <Text style={styles.saveButtonText}>{t('Save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },
  addButton: {
    padding: 8,
  },
  shiftsList: {
    paddingBottom: 20,
  },
  shiftItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkShiftItem: {
    backgroundColor: '#1e1e1e',
  },
  selectedShiftItem: {
    borderWidth: 2,
    borderColor: '#8a56ff',
  },
  darkSelectedShiftItem: {
    borderWidth: 2,
    borderColor: '#8a56ff',
  },
  shiftContent: {
    flex: 1,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#8a56ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shiftDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shiftTime: {
    fontSize: 14,
    color: '#666',
  },
  shiftBreak: {
    fontSize: 14,
    color: '#666',
  },
  inactiveText: {
    color: '#999',
    fontStyle: 'italic',
  },
  shiftActions: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  darkModalContent: {
    backgroundColor: '#1e1e1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalForm: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
  },
  darkInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#8a56ff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reminderContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
})

export default ShiftManagementScreen
