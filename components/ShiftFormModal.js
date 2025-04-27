'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { AppContext } from '../context/AppContext'
import { getShifts, saveShifts } from '../utils/database'

// Helper function to convert time string to Date object
const timeStringToDate = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours)
  date.setMinutes(minutes)
  date.setSeconds(0)
  return date
}

// Helper function to format time from Date object to string
const formatTimeFromDate = (date) => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const ShiftFormModal = ({ visible, shiftId, onClose, onSaved }) => {
  const { t, darkMode } = useContext(AppContext)
  const isEditMode = !!shiftId

  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [shifts, setShifts] = useState([])

  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [showOfficeEndTimePicker, setShowOfficeEndTimePicker] = useState(false)
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [departureTime, setDepartureTime] = useState('07:30') // New field for departure time
  const [startTime, setStartTime] = useState('08:00')
  const [officeEndTime, setOfficeEndTime] = useState('17:00') // Renamed from adminEndTime for clarity
  const [endTime, setEndTime] = useState('17:30')
  const [daysApplied, setDaysApplied] = useState(['T2', 'T3', 'T4', 'T5', 'T6'])
  const [reminderBefore, setReminderBefore] = useState('15')
  const [reminderAfter, setReminderAfter] = useState('15')
  const [breakTime, setBreakTime] = useState('60')
  const [roundUpMinutes, setRoundUpMinutes] = useState('15')
  const [showCheckInButton, setShowCheckInButton] = useState(true)
  const [showCheckInButtonWhileWorking, setShowCheckInButtonWhileWorking] =
    useState(true)
  const [errors, setErrors] = useState({})

  // Load shift data
  useEffect(() => {
    if (visible) {
      loadData()
    }
  }, [shiftId, visible, loadData])

  // Track changes to form fields
  useEffect(() => {
    if (visible && !isLoading) {
      setHasUnsavedChanges(true)
    }
  }, [
    name,
    departureTime,
    startTime,
    endTime,
    officeEndTime,
    daysApplied,
    reminderBefore,
    reminderAfter,
    breakTime,
    roundUpMinutes,
    showCheckInButton,
    showCheckInButtonWhileWorking,
    isLoading,
    visible,
  ])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      // Reset form for new shift
      if (!isEditMode) {
        setName('')
        setDepartureTime('07:30')
        setStartTime('08:00')
        setOfficeEndTime('17:00')
        setEndTime('17:30')
        setDaysApplied(['T2', 'T3', 'T4', 'T5', 'T6'])
        setReminderBefore('15')
        setReminderAfter('15')
        setBreakTime('60')
        setRoundUpMinutes('15')
        setShowCheckInButton(true)
        setShowCheckInButtonWhileWorking(true)
        setErrors({})
      }

      // Load shifts
      const loadedShifts = await getShifts()
      setShifts(loadedShifts)

      // If editing, load shift data
      if (isEditMode) {
        const shift = loadedShifts.find((s) => s.id === shiftId)
        if (shift) {
          setName(shift.name || '')
          setDepartureTime(shift.departureTime || '07:30')
          setStartTime(shift.startTime || '08:00')
          // Handle backward compatibility with old data structure
          setOfficeEndTime(shift.officeEndTime || shift.adminEndTime || '17:00')
          setEndTime(shift.endTime || '17:30')
          setDaysApplied(shift.daysApplied || ['T2', 'T3', 'T4', 'T5', 'T6'])
          setReminderBefore(shift.reminderBefore?.toString() || '15')
          setReminderAfter(shift.reminderAfter?.toString() || '15')
          setBreakTime(shift.breakTime?.toString() || '60')
          setRoundUpMinutes(shift.roundUpMinutes?.toString() || '15')
          setShowCheckInButton(shift.showCheckInButton !== false)
          setShowCheckInButtonWhileWorking(
            shift.showCheckInButtonWhileWorking !== false
          )
        }
      }

      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error loading shift data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isEditMode, shiftId])

  // Helper function to calculate minutes between two time strings
  const getMinutesBetween = (time1, time2) => {
    // Convert time strings to minutes since midnight
    const [hours1, minutes1] = time1.split(':').map(Number)
    const [hours2, minutes2] = time2.split(':').map(Number)

    let totalMinutes1 = hours1 * 60 + minutes1
    let totalMinutes2 = hours2 * 60 + minutes2

    // Handle overnight shifts
    if (totalMinutes2 < totalMinutes1) {
      totalMinutes2 += 24 * 60 // Add a day's worth of minutes
    }

    return totalMinutes2 - totalMinutes1
  }

  // Check if a shift name already exists
  const isShiftNameDuplicate = useCallback(
    (nameToCheck) => {
      if (!nameToCheck.trim() || !shifts || shifts.length === 0) return false

      const normalizedName = nameToCheck.trim().toLowerCase()

      return shifts.some(
        (shift) =>
          shift.id !== shiftId && // Skip the current shift when editing
          shift.name.trim().toLowerCase() === normalizedName
      )
    },
    [shifts, shiftId]
  )

  // Validate a single field
  const validateField = (field, value) => {
    let error = null

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = t('Tên ca không được để trống.')
        } else if (value.length > 200) {
          error = t('Tên ca quá dài (tối đa 200 ký tự).')
        } else {
          // Check for valid characters using Unicode regex
          // This allows letters from all languages, numbers, and spaces
          const nameRegex = /^[\p{L}\p{N}\s]+$/u
          if (!nameRegex.test(value)) {
            error = t('Tên ca chứa ký tự không hợp lệ.')
          } else if (isShiftNameDuplicate(value)) {
            error = t('Tên ca này đã tồn tại.')
          }
        }
        break

      case 'departureTime': {
        const departureTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!departureTimeRegex.test(value)) {
          error = t('Định dạng giờ không hợp lệ (HH:MM)')
        } else {
          // Check if departureTime is at least 5 minutes before startTime
          const minutesBetween = getMinutesBetween(value, startTime)
          if (minutesBetween < 5) {
            error = t('Giờ xuất phát phải trước giờ bắt đầu ít nhất 5 phút.')
          }
        }
        break
      }

      case 'startTime': {
        const startTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!startTimeRegex.test(value)) {
          error = t('Định dạng giờ không hợp lệ (HH:MM)')
        } else {
          // Check if startTime is before officeEndTime
          if (
            value >= officeEndTime &&
            getMinutesBetween(value, officeEndTime) < 120
          ) {
            error = t('Giờ bắt đầu phải trước giờ kết thúc HC.')
          }

          // Check if work duration is at least 2 hours
          const workDuration = getMinutesBetween(value, officeEndTime)
          if (workDuration < 120) {
            // 2 hours = 120 minutes
            error = t('Thời gian làm việc HC tối thiểu phải là 2 giờ.')
          }

          // Check if departureTime is at least 5 minutes before startTime
          if (departureTime) {
            const departureToStartMinutes = getMinutesBetween(
              departureTime,
              value
            )
            if (departureToStartMinutes < 5) {
              error = t('Giờ bắt đầu phải sau giờ xuất phát ít nhất 5 phút.')
            }
          }
        }
        break
      }

      case 'officeEndTime': {
        const officeEndTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!officeEndTimeRegex.test(value)) {
          error = t('Định dạng giờ không hợp lệ (HH:MM)')
        } else {
          // Check if officeEndTime is after startTime
          if (startTime >= value && getMinutesBetween(startTime, value) < 120) {
            error = t('Giờ kết thúc HC phải sau giờ bắt đầu.')
          }

          // Check if work duration is at least 2 hours
          const workDuration = getMinutesBetween(startTime, value)
          if (workDuration < 120) {
            // 2 hours = 120 minutes
            error = t('Thời gian làm việc HC tối thiểu phải là 2 giờ.')
          }

          // Check if endTime is after or equal to officeEndTime
          if (endTime < value) {
            error = t('Giờ kết thúc ca phải sau hoặc bằng giờ kết thúc HC.')
          }
        }
        break
      }

      case 'endTime': {
        const endTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!endTimeRegex.test(value)) {
          error = t('Định dạng giờ không hợp lệ (HH:MM)')
        } else {
          // Check if endTime is after or equal to officeEndTime
          if (value < officeEndTime) {
            error = t('Giờ kết thúc ca phải sau hoặc bằng giờ kết thúc HC.')
          } else if (value > officeEndTime) {
            // If there's potential OT (endTime > officeEndTime), check if it's at least 30 minutes
            const otDuration = getMinutesBetween(officeEndTime, value)
            if (otDuration < 30) {
              error = t(
                'Nếu có OT, giờ kết thúc ca phải sau giờ kết thúc HC ít nhất 30 phút.'
              )
            }
          }
        }
        break
      }

      case 'reminderBefore':
      case 'reminderAfter':
      case 'breakTime':
      case 'roundUpMinutes':
        if (isNaN(parseInt(value)) || parseInt(value) < 0) {
          error = t('Phải là số dương')
        }
        break

      case 'daysApplied':
        if (value.length === 0) {
          error = t('Vui lòng chọn ít nhất một ngày áp dụng ca.')
        }
        break
    }

    return error
  }

  // Update errors for a specific field - memoized to avoid dependency cycles
  const updateFieldError = useCallback(
    (field, value) => {
      const error = validateField(field, value)

      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }))
      } else {
        setErrors((prev) => {
          const { [field]: removed, ...rest } = prev
          return rest
        })
      }

      return !error
    },
    [validateField]
  )

  // Use the memoized function directly
  const memoizedUpdateFieldError = updateFieldError

  // Effect to validate fields when they change
  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('name', name)
    }
  }, [name, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('startTime', startTime)
      // Also validate endTime since it depends on startTime
      memoizedUpdateFieldError('endTime', endTime)
    }
  }, [startTime, endTime, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('endTime', endTime)
      // Also validate officeEndTime since it depends on endTime
      memoizedUpdateFieldError('officeEndTime', officeEndTime)
    }
  }, [endTime, officeEndTime, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('officeEndTime', officeEndTime)
    }
  }, [officeEndTime, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('reminderBefore', reminderBefore)
    }
  }, [reminderBefore, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('reminderAfter', reminderAfter)
    }
  }, [reminderAfter, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('breakTime', breakTime)
    }
  }, [breakTime, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('roundUpMinutes', roundUpMinutes)
    }
  }, [roundUpMinutes, isLoading, visible, memoizedUpdateFieldError])

  useEffect(() => {
    if (!isLoading && visible) {
      memoizedUpdateFieldError('daysApplied', daysApplied)
    }
  }, [daysApplied, isLoading, visible, memoizedUpdateFieldError])

  const validateForm = () => {
    // Validate all fields
    const nameValid = updateFieldError('name', name)
    const departureTimeValid = updateFieldError('departureTime', departureTime)
    const startTimeValid = updateFieldError('startTime', startTime)
    const officeEndTimeValid = updateFieldError('officeEndTime', officeEndTime)
    const endTimeValid = updateFieldError('endTime', endTime)
    const reminderBeforeValid = updateFieldError(
      'reminderBefore',
      reminderBefore
    )
    const reminderAfterValid = updateFieldError('reminderAfter', reminderAfter)
    const breakTimeValid = updateFieldError('breakTime', breakTime)
    const roundUpMinutesValid = updateFieldError(
      'roundUpMinutes',
      roundUpMinutes
    )
    const daysAppliedValid = updateFieldError('daysApplied', daysApplied)

    return (
      nameValid &&
      departureTimeValid &&
      startTimeValid &&
      officeEndTimeValid &&
      endTimeValid &&
      reminderBeforeValid &&
      reminderAfterValid &&
      breakTimeValid &&
      roundUpMinutesValid &&
      daysAppliedValid
    )
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setIsSaving(true)

      // Confirm before saving
      Alert.alert(
        t(isEditMode ? 'Update Shift' : 'Add Shift'),
        t(
          isEditMode
            ? 'Are you sure you want to update this shift?'
            : 'Are you sure you want to add a new shift?'
        ),
        [
          {
            text: t('Cancel'),
            style: 'cancel',
            onPress: () => setIsSaving(false),
          },
          {
            text: t('Confirm'),
            onPress: async () => {
              const loadedShifts = await getShifts()
              let updatedShifts = [...loadedShifts]

              const shiftData = {
                name,
                departureTime,
                startTime,
                endTime,
                officeEndTime, // New field replacing adminEndTime
                daysApplied,
                reminderBefore: Number.parseInt(reminderBefore),
                reminderAfter: Number.parseInt(reminderAfter),
                breakTime: Number.parseInt(breakTime),
                roundUpMinutes: Number.parseInt(roundUpMinutes),
                showCheckInButton,
                showCheckInButtonWhileWorking,
              }

              if (isEditMode) {
                // Update existing shift
                updatedShifts = updatedShifts.map((shift) =>
                  shift.id === shiftId
                    ? {
                        ...shift,
                        ...shiftData,
                      }
                    : shift
                )
              } else {
                // Add new shift
                const newShift = {
                  id: Date.now().toString(),
                  ...shiftData,
                }
                updatedShifts.push(newShift)
              }

              await saveShifts(updatedShifts)

              Alert.alert(
                t('Success'),
                t(
                  isEditMode
                    ? 'Shift updated successfully'
                    : 'Shift added successfully'
                ),
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setHasUnsavedChanges(false)
                      if (onSaved)
                        onSaved(
                          isEditMode
                            ? shiftId
                            : updatedShifts[updatedShifts.length - 1].id
                        )
                      onClose()
                    },
                  },
                ]
              )
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error saving shift:', error)
      Alert.alert(t('Error'), t('Failed to save shift'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      t('Confirm Deletion'),
      t('Are you sure you want to delete this shift?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const loadedShifts = await getShifts()
              const updatedShifts = loadedShifts.filter(
                (shift) => shift.id !== shiftId
              )
              await saveShifts(updatedShifts)

              setHasUnsavedChanges(false)
              if (onSaved) onSaved(null, true) // Indicate deletion
              onClose()

              Alert.alert(t('Success'), t('Shift deleted successfully'))
            } catch (error) {
              console.error('Error deleting shift:', error)
              Alert.alert(
                t('Error'),
                t('An error occurred while deleting the shift')
              )
            }
          },
        },
      ]
    )
  }

  // Handle close with confirmation if there are unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        t('Unsaved Changes'),
        t('You have unsaved changes. Are you sure you want to discard them?'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Discard'),
            style: 'destructive',
            onPress: () => {
              setHasUnsavedChanges(false)
              onClose()
            },
          },
        ]
      )
    } else {
      onClose()
    }
  }

  const toggleDay = (day) => {
    if (daysApplied.includes(day)) {
      setDaysApplied(daysApplied.filter((d) => d !== day))
    } else {
      setDaysApplied([...daysApplied, day])
    }
  }

  // Time picker handlers
  const handleDepartureTimeChange = (event, selectedDate) => {
    setShowDepartureTimePicker(false)
    if (selectedDate) {
      const formattedTime = formatTimeFromDate(selectedDate)
      setDepartureTime(formattedTime)
      updateFieldError('departureTime', formattedTime)
      // Also validate startTime since it depends on departureTime
      updateFieldError('startTime', startTime)
    }
  }

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(false)
    if (selectedDate) {
      const formattedTime = formatTimeFromDate(selectedDate)
      setStartTime(formattedTime)
      updateFieldError('startTime', formattedTime)
      // Also validate related fields
      updateFieldError('departureTime', departureTime)
      updateFieldError('officeEndTime', officeEndTime)
      updateFieldError('endTime', endTime)
    }
  }

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(false)
    if (selectedDate) {
      const formattedTime = formatTimeFromDate(selectedDate)
      setEndTime(formattedTime)
      updateFieldError('endTime', formattedTime)
      // Also validate officeEndTime since it's related
      updateFieldError('officeEndTime', officeEndTime)
    }
  }

  const handleOfficeEndTimeChange = (event, selectedDate) => {
    setShowOfficeEndTimePicker(false)
    if (selectedDate) {
      const formattedTime = formatTimeFromDate(selectedDate)
      setOfficeEndTime(formattedTime)
      updateFieldError('officeEndTime', formattedTime)
      // Also validate related fields
      updateFieldError('startTime', startTime)
      updateFieldError('endTime', endTime)
    }
  }

  const renderDayButton = (day, label) => (
    <TouchableOpacity
      style={[
        styles.dayButton,
        daysApplied.includes(day) && styles.selectedDayButton,
        darkMode && styles.darkDayButton,
        daysApplied.includes(day) && darkMode && styles.darkSelectedDayButton,
      ]}
      onPress={() => toggleDay(day)}
    >
      <Text
        style={[
          styles.dayButtonText,
          daysApplied.includes(day) && styles.selectedDayButtonText,
          darkMode && styles.darkText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <View style={styles.modalContainer}>
        <View
          style={[styles.modalContent, darkMode && styles.darkModalContent]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons
                name="close"
                size={24}
                color={darkMode ? '#fff' : '#000'}
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
              {isEditMode ? t('Edit Shift') : t('Add Shift')}
            </Text>
            {isEditMode && (
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color={darkMode ? '#ff6b6b' : '#e74c3c'}
                />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8a56ff" />
              <Text style={[styles.loadingText, darkMode && styles.darkText]}>
                {t('Loading...')}
              </Text>
            </View>
          ) : (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
              <ScrollView
                style={styles.formContainer}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Shift Name */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Shift Name')} *
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.name && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#666'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.inputWithIcon,
                        darkMode && styles.darkInput,
                      ]}
                      value={name}
                      onChangeText={setName}
                      placeholder={t('Enter shift name')}
                      placeholderTextColor={darkMode ? '#777' : '#999'}
                      accessibilityLabel={t('Shift name')}
                    />
                  </View>
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                {/* Time Settings */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Departure Time')} *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.timeInput,
                      darkMode && styles.darkInput,
                      errors.departureTime && styles.inputError,
                    ]}
                    onPress={() => setShowDepartureTimePicker(true)}
                    accessible={true}
                    accessibilityLabel={t('Select departure time')}
                    accessibilityHint={t(
                      'Opens time picker to select departure time'
                    )}
                  >
                    <Ionicons
                      name="walk-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                    <Text
                      style={[
                        styles.timeInputText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {departureTime}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                  </TouchableOpacity>
                  {showDepartureTimePicker && (
                    <DateTimePicker
                      value={timeStringToDate(departureTime)}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDepartureTimeChange}
                      themeVariant={darkMode ? 'dark' : 'light'}
                    />
                  )}
                  {errors.departureTime && (
                    <Text style={styles.errorText}>{errors.departureTime}</Text>
                  )}
                  <Text style={styles.helperText}>
                    {t('Thời gian xuất phát từ nhà đi làm')}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Start Time')} *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.timeInput,
                      darkMode && styles.darkInput,
                      errors.startTime && styles.inputError,
                    ]}
                    onPress={() => setShowStartTimePicker(true)}
                    accessible={true}
                    accessibilityLabel={t('Select start time')}
                    accessibilityHint={t(
                      'Opens time picker to select shift start time'
                    )}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                    <Text
                      style={[
                        styles.timeInputText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {startTime}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                  </TouchableOpacity>
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={timeStringToDate(startTime)}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleStartTimeChange}
                      themeVariant={darkMode ? 'dark' : 'light'}
                    />
                  )}
                  {errors.startTime && (
                    <Text style={styles.errorText}>{errors.startTime}</Text>
                  )}
                  <Text style={styles.helperText}>
                    {t('Thời gian bắt đầu ca làm việc')}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('End Time')} *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.timeInput,
                      darkMode && styles.darkInput,
                      errors.endTime && styles.inputError,
                    ]}
                    onPress={() => setShowEndTimePicker(true)}
                    accessible={true}
                    accessibilityLabel={t('Select end time')}
                    accessibilityHint={t(
                      'Opens time picker to select shift end time'
                    )}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                    <Text
                      style={[
                        styles.timeInputText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {endTime}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                  </TouchableOpacity>
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={timeStringToDate(endTime)}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndTimeChange}
                      themeVariant={darkMode ? 'dark' : 'light'}
                    />
                  )}
                  {errors.endTime && (
                    <Text style={styles.errorText}>{errors.endTime}</Text>
                  )}
                  <Text style={styles.helperText}>
                    {t('Thời gian kết thúc ca làm việc')}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Office End Time')} *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.timeInput,
                      darkMode && styles.darkInput,
                      errors.officeEndTime && styles.inputError,
                    ]}
                    onPress={() => setShowOfficeEndTimePicker(true)}
                    accessible={true}
                    accessibilityLabel={t('Select office end time')}
                    accessibilityHint={t(
                      'Opens time picker to select office end time'
                    )}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                    <Text
                      style={[
                        styles.timeInputText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {officeEndTime}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                  </TouchableOpacity>
                  {showOfficeEndTimePicker && (
                    <DateTimePicker
                      value={timeStringToDate(officeEndTime)}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleOfficeEndTimeChange}
                      themeVariant={darkMode ? 'dark' : 'light'}
                    />
                  )}
                  {errors.officeEndTime && (
                    <Text style={styles.errorText}>{errors.officeEndTime}</Text>
                  )}
                  <Text style={styles.helperText}>
                    {t('Thời gian kết thúc giờ hành chính')}
                  </Text>
                </View>

                {/* Days Applied */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Days Applied')} *
                  </Text>
                  <View style={styles.daysContainer}>
                    {renderDayButton('T2', t('Mon'))}
                    {renderDayButton('T3', t('Tue'))}
                    {renderDayButton('T4', t('Wed'))}
                    {renderDayButton('T5', t('Thu'))}
                    {renderDayButton('T6', t('Fri'))}
                    {renderDayButton('T7', t('Sat'))}
                    {renderDayButton('CN', t('Sun'))}
                  </View>
                  {errors.daysApplied && (
                    <Text style={styles.errorText}>{errors.daysApplied}</Text>
                  )}
                </View>

                {/* Break Time */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Break Time (minutes)')}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.breakTime && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#666'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.inputWithIcon,
                        darkMode && styles.darkInput,
                      ]}
                      value={breakTime}
                      onChangeText={setBreakTime}
                      placeholder="60"
                      placeholderTextColor={darkMode ? '#777' : '#999'}
                      keyboardType="number-pad"
                      accessibilityLabel={t('Break time in minutes')}
                    />
                  </View>
                  {errors.breakTime && (
                    <Text style={styles.errorText}>{errors.breakTime}</Text>
                  )}
                </View>

                {/* Reminder Settings */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Reminder Before (minutes)')}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.reminderBefore && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#666'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.inputWithIcon,
                        darkMode && styles.darkInput,
                      ]}
                      value={reminderBefore}
                      onChangeText={setReminderBefore}
                      placeholder="15"
                      placeholderTextColor={darkMode ? '#777' : '#999'}
                      keyboardType="number-pad"
                      accessibilityLabel={t('Reminder before shift in minutes')}
                    />
                  </View>
                  {errors.reminderBefore && (
                    <Text style={styles.errorText}>
                      {errors.reminderBefore}
                    </Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Reminder After (minutes)')}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.reminderAfter && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#666'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.inputWithIcon,
                        darkMode && styles.darkInput,
                      ]}
                      value={reminderAfter}
                      onChangeText={setReminderAfter}
                      placeholder="15"
                      placeholderTextColor={darkMode ? '#777' : '#999'}
                      keyboardType="number-pad"
                      accessibilityLabel={t('Reminder after shift in minutes')}
                    />
                  </View>
                  {errors.reminderAfter && (
                    <Text style={styles.errorText}>{errors.reminderAfter}</Text>
                  )}
                </View>

                {/* Round Up Minutes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Round Up Minutes')}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.roundUpMinutes && styles.inputContainerError,
                    ]}
                  >
                    <MaterialIcons
                      name="timer"
                      size={20}
                      color={darkMode ? '#fff' : '#666'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.inputWithIcon,
                        darkMode && styles.darkInput,
                      ]}
                      value={roundUpMinutes}
                      onChangeText={setRoundUpMinutes}
                      placeholder="15"
                      placeholderTextColor={darkMode ? '#777' : '#999'}
                      keyboardType="number-pad"
                      accessibilityLabel={t('Round up minutes')}
                    />
                  </View>
                  {errors.roundUpMinutes && (
                    <Text style={styles.errorText}>
                      {errors.roundUpMinutes}
                    </Text>
                  )}
                </View>

                {/* Toggle Settings */}
                <View style={styles.formGroup}>
                  <View style={styles.switchContainer}>
                    <Text
                      style={[styles.switchLabel, darkMode && styles.darkText]}
                    >
                      {t('Show Check-In Button')}
                    </Text>
                    <Switch
                      value={showCheckInButton}
                      onValueChange={setShowCheckInButton}
                      trackColor={{ false: '#767577', true: '#8a56ff' }}
                      thumbColor={showCheckInButton ? '#f4f3f4' : '#f4f3f4'}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchContainer}>
                    <Text
                      style={[styles.switchLabel, darkMode && styles.darkText]}
                    >
                      {t('Show Check-In Button While Working')}
                    </Text>
                    <Switch
                      value={showCheckInButtonWhileWorking}
                      onValueChange={setShowCheckInButtonWhileWorking}
                      trackColor={{ false: '#767577', true: '#8a56ff' }}
                      thumbColor={
                        showCheckInButtonWhileWorking ? '#f4f3f4' : '#f4f3f4'
                      }
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleClose}
                  >
                    <Ionicons name="close-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>{t('Cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.saveButton,
                      (Object.keys(errors).length > 0 || isSaving) &&
                        styles.disabledButton,
                    ]}
                    onPress={handleSave}
                    disabled={Object.keys(errors).length > 0 || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={20} color="#fff" />
                        <Text style={styles.buttonText}>{t('Save')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...Platform.select({
      android: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    }),
  },
  modalContent: {
    width: '95%',
    maxHeight: '95%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 5,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
  },
  darkModalContent: {
    backgroundColor: '#1e1e1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },

  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },

  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  timeInputText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  darkInput: {
    borderColor: '#444',
    backgroundColor: '#333',
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  inputContainerError: {
    borderColor: '#e74c3c',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  darkDayButton: {
    backgroundColor: '#333',
  },
  selectedDayButton: {
    backgroundColor: '#8a56ff',
  },
  darkSelectedDayButton: {
    backgroundColor: '#6a3adf',
  },
  dayButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedDayButtonText: {
    color: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#8a56ff',
  },
  disabledButton: {
    opacity: 0.6,
  },
})

export default ShiftFormModal
