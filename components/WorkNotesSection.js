'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import { getNotes } from '../utils/database'

const WorkNotesSection = ({ navigation }) => {
  const { t, darkMode, currentShift, shifts } = useContext(AppContext)
  const [filteredNotes, setFilteredNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Load and filter notes
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true)
      const allNotes = await getNotes()

      // Get current day of week in format T2, T3, etc.
      const today = new Date()
      const dayMap = {
        0: 'CN',
        1: 'T2',
        2: 'T3',
        3: 'T4',
        4: 'T5',
        5: 'T6',
        6: 'T7',
      }
      const currentDay = dayMap[today.getDay()]

      // Filter notes based on requirements
      const filtered = allNotes.filter((note) => {
        // Condition 1: Note has associatedShiftIds containing the active shift ID
        if (
          currentShift &&
          note.linkedShifts &&
          note.linkedShifts.includes(currentShift.id)
        ) {
          return true
        }

        // Condition 2: Note has empty associatedShiftIds AND explicitReminderDays contains current day
        if (
          (!note.linkedShifts || note.linkedShifts.length === 0) &&
          note.reminderDays &&
          note.reminderDays.includes(currentDay)
        ) {
          return true
        }

        return false
      })

      // Sort notes by next reminder time
      const sortedNotes = sortNotesByNextReminder(filtered)

      // Limit to 3 notes
      setFilteredNotes(sortedNotes.slice(0, 3))
      setIsLoading(false)
    }

    loadNotes()
  }, [currentShift, sortNotesByNextReminder, shifts])

  // Calculate next reminder time for a note and sort notes
  const sortNotesByNextReminder = useCallback(
    (notes) => {
      const now = new Date()
      const dayMap = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 }

      // Calculate next reminder time for each note
      const notesWithNextReminder = notes.map((note) => {
        let nextReminderDate = null

        if (note.reminderTime) {
          const [hours, minutes] = note.reminderTime.split(':').map(Number)

          // If note is linked to shifts
          if (note.linkedShifts && note.linkedShifts.length > 0) {
            // Get all days from linked shifts
            const shiftDays = new Set()
            note.linkedShifts.forEach((shiftId) => {
              const shift = shifts.find((s) => s.id === shiftId)
              if (shift && shift.daysApplied) {
                shift.daysApplied.forEach((day) => shiftDays.add(day))
              }
            })

            nextReminderDate = calculateNextReminderDate(
              Array.from(shiftDays),
              hours,
              minutes,
              dayMap,
              now
            )
          }
          // If note uses custom days
          else if (note.reminderDays && note.reminderDays.length > 0) {
            nextReminderDate = calculateNextReminderDate(
              note.reminderDays,
              hours,
              minutes,
              dayMap,
              now
            )
          }
        }

        return {
          ...note,
          nextReminderDate,
        }
      })

      // Sort notes by next reminder time (null values at the end)
      return notesWithNextReminder.sort((a, b) => {
        if (!a.nextReminderDate && !b.nextReminderDate) {
          // If both don't have next reminder, sort by updatedAt (most recent first)
          return (
            (b.updatedAt || b.timestamp || 0) -
            (a.updatedAt || a.timestamp || 0)
          )
        }
        if (!a.nextReminderDate) return 1
        if (!b.nextReminderDate) return -1
        return a.nextReminderDate - b.nextReminderDate
      })
    },
    [shifts]
  )

  // Helper function to calculate next reminder date
  const calculateNextReminderDate = (days, hours, minutes, dayMap, now) => {
    const today = now.getDay()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const reminderTime = hours * 60 + minutes

    // Convert days to numbers and sort them
    const dayNumbers = days.map((day) => dayMap[day]).sort((a, b) => a - b)

    // Find the next day that has a reminder
    let nextDay = null
    let daysToAdd = 0

    // First check if there's a reminder later today
    if (dayNumbers.includes(today) && reminderTime > currentTime) {
      nextDay = today
      daysToAdd = 0
    } else {
      // Find the next day in the week
      for (let i = 1; i <= 7; i++) {
        const checkDay = (today + i) % 7
        if (dayNumbers.includes(checkDay)) {
          nextDay = checkDay
          daysToAdd = i
          break
        }
      }
    }

    if (nextDay !== null) {
      const nextDate = new Date(now)
      nextDate.setDate(nextDate.getDate() + daysToAdd)
      nextDate.setHours(hours, minutes, 0, 0)
      return nextDate
    }

    return null
  }

  const handleAddNote = () => {
    navigation.navigate('NoteDetail')
  }

  const handleEditNote = (noteId) => {
    navigation.navigate('NoteDetail', { noteId })
  }

  return (
    <View style={[styles.container, darkMode && styles.darkCard]}>
      <View style={styles.header}>
        <Text style={[styles.title, darkMode && styles.darkText]}>
          {t('Work Notes')}
        </Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('Notes')}
        >
          <Text style={styles.viewAllText}>{t('View All')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, darkMode && styles.darkSubtitle]}>
            {t('Loading notes...')}
          </Text>
        </View>
      ) : filteredNotes.length > 0 ? (
        <ScrollView style={styles.notesScrollView}>
          {filteredNotes.map((note) => (
            <View key={note.id} style={styles.noteItem}>
              <View style={styles.noteContent}>
                <Text
                  style={[styles.noteTitle, darkMode && styles.darkText]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {note.title || ''}
                </Text>
                <Text
                  style={[styles.noteText, darkMode && styles.darkSubtitle]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {note.content || ''}
                </Text>

                <View style={styles.noteFooter}>
                  {note.reminderTime && (
                    <View style={styles.reminderBadge}>
                      <Ionicons
                        name="alarm-outline"
                        size={12}
                        color="#fff"
                        style={styles.reminderIcon}
                      />
                      <Text style={styles.reminderText}>
                        {note.reminderTime}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.noteActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditNote(note.id)}
                >
                  <Ionicons
                    name="pencil"
                    size={18}
                    color={darkMode ? '#aaa' : '#666'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, darkMode && styles.darkSubtitle]}>
            {t('No work notes for today')}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
        <Ionicons name="add-circle" size={20} color="#8a56ff" />
        <Text style={styles.addButtonText}>{t('Add Note')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    color: '#8a56ff',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  notesScrollView: {
    maxHeight: 300,
  },
  noteItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8a56ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reminderIcon: {
    marginRight: 4,
  },
  reminderText: {
    color: '#fff',
    fontSize: 12,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  addButtonText: {
    color: '#8a56ff',
    fontWeight: '500',
    marginLeft: 4,
  },
})

export default WorkNotesSection
