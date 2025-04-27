import AsyncStorage from '@react-native-async-storage/async-storage'

// Initialize database and load sample data
export const initializeDatabase = async () => {
  try {
    // Check if shifts are already initialized
    const shiftsJson = await AsyncStorage.getItem('shifts')
    if (!shiftsJson) {
      // Initialize with sample shifts
      const sampleShifts = [
        {
          id: '1',
          name: 'Ca Sáng',
          startTime: '08:00',
          endTime: '12:00',
          officeEndTime: '12:15',
          daysApplied: ['T2', 'T3', 'T4', 'T5', 'T6'],
          reminderBefore: 15,
          reminderAfter: 15,
          breakTime: 60,
          roundUpMinutes: 30,
          showCheckInButton: true,
          showCheckInButtonWhileWorking: true,
        },
        {
          id: '2',
          name: 'Ca Chiều',
          startTime: '13:00',
          endTime: '17:00',
          officeEndTime: '17:15',
          daysApplied: ['T2', 'T3', 'T4', 'T5', 'T6'],
          reminderBefore: 15,
          reminderAfter: 15,
          breakTime: 60,
          roundUpMinutes: 30,
          showCheckInButton: true,
          showCheckInButtonWhileWorking: true,
        },
        {
          id: '3',
          name: 'Ca Tối',
          startTime: '18:00',
          endTime: '22:00',
          adminEndTime: '22:15',
          daysApplied: ['T2', 'T3', 'T4', 'T5', 'T6'],
          reminderBefore: 15,
          reminderAfter: 15,
          breakTime: 60,
          roundUpMinutes: 30,
          showCheckInButton: true,
          showCheckInButtonWhileWorking: true,
        },
      ]
      await AsyncStorage.setItem('shifts', JSON.stringify(sampleShifts))
    }

    // Check if check-in history is already initialized
    const checkInHistoryJson = await AsyncStorage.getItem('checkInHistory')
    if (!checkInHistoryJson) {
      // Initialize with empty array
      await AsyncStorage.setItem('checkInHistory', JSON.stringify([]))
    }

    // Check if notes are already initialized
    const notesJson = await AsyncStorage.getItem('notes')
    if (!notesJson) {
      // Initialize with empty array
      await AsyncStorage.setItem('notes', JSON.stringify([]))
    }
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

// Get shifts
export const getShifts = async () => {
  try {
    const shiftsJson = await AsyncStorage.getItem('shifts')
    if (shiftsJson) {
      return JSON.parse(shiftsJson)
    } else {
      // Trả về dữ liệu mẫu nếu không có dữ liệu nào được lưu trữ
      const sampleShifts = [
        {
          id: '1',
          name: 'Ca Sáng',
          startTime: '08:00',
          endTime: '12:00',
          adminEndTime: '12:15',
          daysApplied: ['T2', 'T3', 'T4', 'T5', 'T6'],
          reminderBefore: 15,
          reminderAfter: 15,
          breakTime: 60,
          roundUpMinutes: 30,
          showCheckInButton: true,
          showCheckInButtonWhileWorking: true,
        },
        {
          id: '2',
          name: 'Ca Chiều',
          startTime: '13:00',
          endTime: '17:00',
          adminEndTime: '17:15',
          daysApplied: ['T2', 'T3', 'T4', 'T5', 'T6'],
          reminderBefore: 15,
          reminderAfter: 15,
          breakTime: 60,
          roundUpMinutes: 30,
          showCheckInButton: true,
          showCheckInButtonWhileWorking: true,
        },
        {
          id: '3',
          name: 'Ca Tối',
          startTime: '18:00',
          endTime: '22:00',
          officeEndTime: '22:15',
          daysApplied: ['T2', 'T3', 'T4', 'T5', 'T6'],
          reminderBefore: 15,
          reminderAfter: 15,
          breakTime: 60,
          roundUpMinutes: 30,
          showCheckInButton: true,
          showCheckInButtonWhileWorking: true,
        },
      ]
      // Lưu dữ liệu mẫu vào AsyncStorage
      await AsyncStorage.setItem('shifts', JSON.stringify(sampleShifts))
      return sampleShifts
    }
  } catch (error) {
    console.error('Error getting shifts:', error)
    return []
  }
}

// Get check-in history
export const getCheckInHistory = async () => {
  try {
    const checkInHistoryJson = await AsyncStorage.getItem('checkInHistory')
    return checkInHistoryJson ? JSON.parse(checkInHistoryJson) : []
  } catch (error) {
    console.error('Error getting check-in history:', error)
    return []
  }
}

// Get current shift
export const getCurrentShift = async () => {
  try {
    const currentShiftId = await AsyncStorage.getItem('currentShiftId')
    if (!currentShiftId) return null

    const shifts = await getShifts()
    return shifts.find((shift) => shift.id === currentShiftId) || null
  } catch (error) {
    console.error('Error getting current shift:', error)
    return null
  }
}

// Add shift
export const addShift = async (shiftData) => {
  try {
    const shifts = await getShifts()
    const newShift = {
      id: Date.now().toString(),
      ...shiftData,
    }
    const updatedShifts = [...shifts, newShift]
    await AsyncStorage.setItem('shifts', JSON.stringify(updatedShifts))
    return newShift
  } catch (error) {
    console.error('Error adding shift:', error)
    return null
  }
}

// Update shift
export const updateShift = async (updatedShift) => {
  try {
    const shifts = await getShifts()
    const updatedShifts = shifts.map((shift) =>
      shift.id === updatedShift.id ? updatedShift : shift
    )
    await AsyncStorage.setItem('shifts', JSON.stringify(updatedShifts))
    return updatedShift
  } catch (error) {
    console.error('Error updating shift:', error)
    return null
  }
}

// Save shifts (for bulk operations)
export const saveShifts = async (shifts) => {
  try {
    await AsyncStorage.setItem('shifts', JSON.stringify(shifts))
    return true
  } catch (error) {
    console.error('Error saving shifts:', error)
    return false
  }
}

// Delete shift
export const deleteShift = async (id) => {
  try {
    const shifts = await getShifts()
    const updatedShifts = shifts.filter((shift) => shift.id !== id)
    await AsyncStorage.setItem('shifts', JSON.stringify(updatedShifts))
    return true
  } catch (error) {
    console.error('Error deleting shift:', error)
    return false
  }
}

// Add check-in record
export const addCheckInRecord = async (record) => {
  try {
    const checkInHistory = await getCheckInHistory()
    const newRecord = {
      id: Date.now().toString(),
      ...record,
    }
    const updatedHistory = [...checkInHistory, newRecord]
    await AsyncStorage.setItem('checkInHistory', JSON.stringify(updatedHistory))
    return newRecord
  } catch (error) {
    console.error('Error adding check-in record:', error)
    return null
  }
}

// Get notes
export const getNotes = async () => {
  try {
    const notesJson = await AsyncStorage.getItem('notes')
    return notesJson ? JSON.parse(notesJson) : []
  } catch (error) {
    console.error('Error getting notes:', error)
    return []
  }
}

// Add note
export const addNote = async (noteData) => {
  try {
    const notesJson = await AsyncStorage.getItem('notes')
    let notes = notesJson ? JSON.parse(notesJson) : []
    const newNote = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      title: noteData.title || '',
      content: noteData.content || '',
      reminderTime: noteData.reminderTime || '',
      linkedShifts: noteData.linkedShifts || [],
      reminderDays: noteData.reminderDays || [],
    }
    notes = [...notes, newNote]
    await AsyncStorage.setItem('notes', JSON.stringify(notes))
    return newNote
  } catch (error) {
    console.error('Error adding note:', error)
    return null
  }
}

// Update note
export const updateNote = async (updatedNote) => {
  try {
    const notesJson = await AsyncStorage.getItem('notes')
    let notes = notesJson ? JSON.parse(notesJson) : []

    // Make sure to update the updatedAt timestamp
    const noteWithTimestamp = {
      ...updatedNote,
      updatedAt: Date.now(),
    }

    notes = notes.map((note) =>
      note.id === noteWithTimestamp.id ? noteWithTimestamp : note
    )
    await AsyncStorage.setItem('notes', JSON.stringify(notes))
    return noteWithTimestamp
  } catch (error) {
    console.error('Error updating note:', error)
    return null
  }
}

// Get note by ID
export const getNoteById = async (id) => {
  try {
    const notesJson = await AsyncStorage.getItem('notes')
    if (!notesJson) return null

    const notes = JSON.parse(notesJson)
    return notes.find((note) => note.id === id) || null
  } catch (error) {
    console.error('Error getting note by ID:', error)
    return null
  }
}

// Delete note
export const deleteNote = async (id) => {
  try {
    const notesJson = await AsyncStorage.getItem('notes')
    let notes = notesJson ? JSON.parse(notesJson) : []
    notes = notes.filter((note) => note.id !== id)
    await AsyncStorage.setItem('notes', JSON.stringify(notes))
    return true
  } catch (error) {
    console.error('Error deleting note:', error)
    return false
  }
}

// Check for duplicate note
export const checkDuplicateNote = async (title, content, excludeId = null) => {
  try {
    const notesJson = await AsyncStorage.getItem('notes')
    if (!notesJson) return false

    const notes = JSON.parse(notesJson)
    return notes.some(
      (note) =>
        note.title === title &&
        note.content === content &&
        (excludeId === null || note.id !== excludeId)
    )
  } catch (error) {
    console.error('Error checking duplicate note:', error)
    return false
  }
}
