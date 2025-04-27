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
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { AppContext } from '../context/AppContext'
import {
  getNoteById,
  addNote,
  updateNote,
  deleteNote,
  checkDuplicateNote,
  getShifts,
} from '../utils/database'

const NoteFormModal = ({ visible, noteId, onClose, onSaved }) => {
  const { t, darkMode } = useContext(AppContext)
  const isEditMode = !!noteId

  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [shifts, setShifts] = useState([])

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [linkedShifts, setLinkedShifts] = useState([])
  const [useCustomDays, setUseCustomDays] = useState(false)
  const [reminderDays, setReminderDays] = useState([
    'T2',
    'T3',
    'T4',
    'T5',
    'T6',
  ])
  const [errors, setErrors] = useState({})

  // Load note data and shifts
  useEffect(() => {
    if (visible) {
      loadData()
    }
  }, [visible, noteId, loadData])

  // Track unsaved changes
  useEffect(() => {
    if (isLoading) return
    setHasUnsavedChanges(true)
  }, [
    title,
    content,
    reminderTime,
    linkedShifts,
    useCustomDays,
    reminderDays,
    isLoading,
  ])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      // Reset form
      if (!isEditMode) {
        setTitle('')
        setContent('')
        setReminderTime('')
        setLinkedShifts([])
        setReminderDays(['T2', 'T3', 'T4', 'T5', 'T6'])
        setUseCustomDays(false)
        setErrors({})
      }

      // Load shifts
      const loadedShifts = await getShifts()
      setShifts(loadedShifts)

      // If editing, load note data
      if (isEditMode) {
        const note = await getNoteById(noteId)
        if (note) {
          setTitle(note.title || '')
          setContent(note.content || '')
          setReminderTime(note.reminderTime || '')
          setLinkedShifts(note.linkedShifts || [])
          setReminderDays(note.reminderDays || ['T2', 'T3', 'T4', 'T5', 'T6'])
          setUseCustomDays(note.linkedShifts?.length === 0)
        }
      }

      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error loading note data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isEditMode, noteId])

  // Validate form
  const validateForm = async () => {
    const newErrors = {}

    // Validate title
    if (!title.trim()) {
      newErrors.title = t('Title is required')
    } else if (title.length > 100) {
      newErrors.title = t('Title must be less than 100 characters')
    }

    // Validate content
    if (!content.trim()) {
      newErrors.content = t('Content is required')
    } else if (content.length > 300) {
      newErrors.content = t('Content must be less than 300 characters')
    }

    // Validate reminder time
    if (!reminderTime) {
      newErrors.reminderTime = t('Reminder time is required')
    }

    // Validate reminder days if using custom days
    if (linkedShifts.length === 0 && reminderDays.length === 0) {
      newErrors.reminderDays = t('At least one day must be selected')
    }

    // Check for duplicate note (comparing trimmed values with case sensitivity)
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!isEditMode) {
      const isDuplicate = await checkDuplicateNote(trimmedTitle, trimmedContent)
      if (isDuplicate) {
        newErrors.duplicate = t(
          'A note with the same title and content already exists'
        )
      }
    } else {
      const isDuplicate = await checkDuplicateNote(
        trimmedTitle,
        trimmedContent,
        noteId
      )
      if (isDuplicate) {
        newErrors.duplicate = t(
          'A note with the same title and content already exists'
        )
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle time picker
  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(Platform.OS === 'ios')
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0')
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0')
      setReminderTime(`${hours}:${minutes}`)
    }
  }

  // Toggle day selection
  const toggleDay = (day) => {
    if (reminderDays.includes(day)) {
      setReminderDays(reminderDays.filter((d) => d !== day))
    } else {
      setReminderDays([...reminderDays, day])
    }
  }

  // Toggle shift selection
  const toggleShift = (shiftId) => {
    if (linkedShifts.includes(shiftId)) {
      setLinkedShifts(linkedShifts.filter((id) => id !== shiftId))
    } else {
      setLinkedShifts([...linkedShifts, shiftId])
    }
  }

  // Handle save
  const handleSave = async () => {
    setIsSaving(true)
    const isValid = await validateForm()

    if (!isValid) {
      setIsSaving(false)
      return
    }

    try {
      const noteData = {
        title,
        content,
        reminderTime,
        linkedShifts: useCustomDays ? [] : linkedShifts,
        reminderDays: useCustomDays ? reminderDays : [],
      }

      if (isEditMode) {
        // Update existing note
        const updatedNote = await updateNote({
          id: noteId,
          ...noteData,
          timestamp: Date.now(), // Update timestamp
        })

        if (updatedNote) {
          Alert.alert(t('Success'), t('Note updated successfully'), [
            {
              text: 'OK',
              onPress: () => {
                setHasUnsavedChanges(false)
                if (onSaved) onSaved(updatedNote)
                onClose()
              },
            },
          ])
        } else {
          Alert.alert(t('Error'), t('Failed to update note'))
        }
      } else {
        // Add new note
        const newNote = await addNote(noteData)

        if (newNote) {
          Alert.alert(t('Success'), t('Note added successfully'), [
            {
              text: 'OK',
              onPress: () => {
                setHasUnsavedChanges(false)
                if (onSaved) onSaved(newNote)
                onClose()
              },
            },
          ])
        } else {
          Alert.alert(t('Error'), t('Failed to add note'))
        }
      }
    } catch (error) {
      console.error('Error saving note:', error)
      Alert.alert(t('Error'), t('An error occurred while saving the note'))
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = () => {
    Alert.alert(
      t('Confirm Deletion'),
      t('Are you sure you want to delete this note?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteNote(noteId)
              if (success) {
                setHasUnsavedChanges(false)
                if (onSaved) onSaved(null, true) // Indicate deletion
                onClose()
              } else {
                Alert.alert(t('Error'), t('Failed to delete note'))
              }
            } catch (error) {
              console.error('Error deleting note:', error)
              Alert.alert(
                t('Error'),
                t('An error occurred while deleting the note')
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

  // Render day button
  const renderDayButton = (day, label) => (
    <TouchableOpacity
      style={[
        styles.dayButton,
        reminderDays.includes(day) && styles.selectedDayButton,
        darkMode && styles.darkDayButton,
        reminderDays.includes(day) && darkMode && styles.darkSelectedDayButton,
      ]}
      onPress={() => toggleDay(day)}
    >
      <Text
        style={[
          styles.dayButtonText,
          reminderDays.includes(day) && styles.selectedDayButtonText,
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
              {isEditMode ? t('Edit Note') : t('Add Note')}
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
                {/* Title */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Title')} *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      darkMode && styles.darkInput,
                      errors.title && styles.inputError,
                    ]}
                    value={title}
                    onChangeText={(text) => {
                      setTitle(text)
                      if (errors.title) {
                        setErrors({ ...errors, title: null })
                      }
                    }}
                    placeholder={t('Enter title')}
                    placeholderTextColor={darkMode ? '#777' : '#999'}
                    maxLength={100}
                  />
                  <View style={styles.inputFooter}>
                    {errors.title && (
                      <Text style={styles.errorText}>{errors.title}</Text>
                    )}
                    <Text
                      style={[
                        styles.charCount,
                        darkMode && styles.darkSubtitle,
                      ]}
                    >
                      {title.length}/100
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Content')} *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      darkMode && styles.darkInput,
                      errors.content && styles.inputError,
                    ]}
                    value={content}
                    onChangeText={(text) => {
                      setContent(text)
                      if (errors.content) {
                        setErrors({ ...errors, content: null })
                      }
                    }}
                    placeholder={t('Enter content')}
                    placeholderTextColor={darkMode ? '#777' : '#999'}
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                  />
                  <View style={styles.inputFooter}>
                    {errors.content && (
                      <Text style={styles.errorText}>{errors.content}</Text>
                    )}
                    <Text
                      style={[
                        styles.charCount,
                        darkMode && styles.darkSubtitle,
                      ]}
                    >
                      {content.length}/300
                    </Text>
                  </View>
                </View>

                {/* Reminder Time */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Reminder Time')} *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.timeInput,
                      darkMode && styles.darkInput,
                      errors.reminderTime && styles.inputError,
                    ]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={darkMode ? '#fff' : '#000'}
                    />
                    <Text
                      style={[styles.timeText, darkMode && styles.darkText]}
                    >
                      {reminderTime || t('Select time')}
                    </Text>
                  </TouchableOpacity>
                  {errors.reminderTime && (
                    <Text style={styles.errorText}>{errors.reminderTime}</Text>
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={
                        reminderTime
                          ? new Date(`2023-01-01T${reminderTime}:00`)
                          : new Date()
                      }
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimeChange}
                      themeVariant={darkMode ? 'dark' : 'light'}
                    />
                  )}
                </View>

                {/* Linked Shifts */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, darkMode && styles.darkText]}>
                    {t('Link to Work Shifts (Optional)')}
                  </Text>
                  <View style={styles.shiftsContainer}>
                    {shifts.length > 0 ? (
                      shifts.map((shift) => (
                        <TouchableOpacity
                          key={shift.id}
                          style={[
                            styles.shiftItem,
                            linkedShifts.includes(shift.id) &&
                              styles.selectedShiftItem,
                            darkMode && styles.darkShiftItem,
                            linkedShifts.includes(shift.id) &&
                              darkMode &&
                              styles.darkSelectedShiftItem,
                          ]}
                          onPress={() => {
                            toggleShift(shift.id)
                            // If we're adding a shift and there were no shifts before,
                            // make sure useCustomDays is false
                            if (
                              !linkedShifts.includes(shift.id) &&
                              linkedShifts.length === 0
                            ) {
                              setUseCustomDays(false)
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.shiftName,
                              linkedShifts.includes(shift.id) &&
                                styles.selectedShiftName,
                              darkMode && styles.darkText,
                            ]}
                          >
                            {shift.name}
                          </Text>
                          <Text
                            style={[
                              styles.shiftTime,
                              linkedShifts.includes(shift.id) &&
                                styles.selectedShiftTime,
                              darkMode && styles.darkSubtitle,
                            ]}
                          >
                            {shift.startTime} - {shift.endTime}
                          </Text>
                          {linkedShifts.includes(shift.id) && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#8a56ff"
                            />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text
                        style={[
                          styles.emptyText,
                          darkMode && styles.darkSubtitle,
                        ]}
                      >
                        {t('No shifts available')}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Reminder Days (if no shifts selected) */}
                {linkedShifts.length === 0 && (
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>
                      {t('Reminder Days (if not linked to shifts)')} *
                    </Text>
                    <View style={styles.daysContainer}>
                      {renderDayButton('T2', 'T2')}
                      {renderDayButton('T3', 'T3')}
                      {renderDayButton('T4', 'T4')}
                      {renderDayButton('T5', 'T5')}
                      {renderDayButton('T6', 'T6')}
                      {renderDayButton('T7', 'T7')}
                      {renderDayButton('CN', 'CN')}
                    </View>
                    {errors.reminderDays && (
                      <Text style={styles.errorText}>
                        {errors.reminderDays}
                      </Text>
                    )}
                  </View>
                )}

                {/* Duplicate error */}
                {errors.duplicate && (
                  <Text style={styles.errorText}>{errors.duplicate}</Text>
                )}

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
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  darkInput: {
    borderColor: '#444',
    color: '#fff',
    backgroundColor: '#2a2a2a',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  textArea: {
    minHeight: 100,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },

  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  darkDayButton: {
    backgroundColor: '#2a2a2a',
  },
  selectedDayButton: {
    backgroundColor: '#8a56ff',
  },
  darkSelectedDayButton: {
    backgroundColor: '#8a56ff',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  selectedDayButtonText: {
    color: '#fff',
  },
  shiftsContainer: {
    marginTop: 8,
  },
  shiftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  darkShiftItem: {
    backgroundColor: '#2a2a2a',
  },
  selectedShiftItem: {
    backgroundColor: '#f0e6ff',
    borderColor: '#8a56ff',
    borderWidth: 1,
  },
  darkSelectedShiftItem: {
    backgroundColor: '#3a2a5a',
    borderColor: '#8a56ff',
    borderWidth: 1,
  },
  shiftName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  shiftTime: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  selectedShiftTime: {
    color: '#8a56ff',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  saveButton: {
    backgroundColor: '#8a56ff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },
})

export default NoteFormModal
