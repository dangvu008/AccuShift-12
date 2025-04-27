'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import { getNotes, deleteNote } from '../utils/database'
import { useFocusEffect } from '@react-navigation/native'
import NoteFormModal from '../components/NoteFormModal'

const NotesScreen = ({ navigation }) => {
  const { t, darkMode } = useContext(AppContext)
  const [notes, setNotes] = useState([])
  const [filteredNotes, setFilteredNotes] = useState([])
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)

  // Load notes when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadNotes = async () => {
        setIsLoading(true)
        const loadedNotes = await getNotes()
        setNotes(loadedNotes)
        setFilteredNotes(loadedNotes)
        setIsLoading(false)
      }

      loadNotes()
    }, [])
  )

  // Filter notes when search text changes
  useEffect(() => {
    if (searchText) {
      const filtered = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchText.toLowerCase()) ||
          note.content.toLowerCase().includes(searchText.toLowerCase())
      )
      setFilteredNotes(filtered)
    } else {
      setFilteredNotes(notes)
    }
  }, [searchText, notes])

  const handleDeleteNote = async (id) => {
    Alert.alert(
      t('Confirm Deletion'),
      t('Are you sure you want to delete this note?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteNote(id)
            if (success) {
              setNotes(notes.filter((note) => note.id !== id))
              setFilteredNotes(filteredNotes.filter((note) => note.id !== id))
              Alert.alert(t('Success'), t('Note deleted successfully'))
            } else {
              Alert.alert(t('Error'), t('Failed to delete note'))
            }
          },
        },
      ]
    )
  }

  const handleAddNote = () => {
    setEditingNoteId(null)
    setModalVisible(true)
  }

  const handleEditNote = (noteId) => {
    setEditingNoteId(noteId)
    setModalVisible(true)
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingNoteId(null)
  }

  const handleNoteSaved = async (note, isDeleted = false) => {
    try {
      // Reload notes after save/delete
      const loadedNotes = await getNotes()
      setNotes(loadedNotes)
      setFilteredNotes(
        loadedNotes.filter(
          (note) =>
            !searchText ||
            note.title.toLowerCase().includes(searchText.toLowerCase()) ||
            note.content.toLowerCase().includes(searchText.toLowerCase())
        )
      )

      // Log success
      console.log('Notes reloaded successfully after save/delete')
    } catch (error) {
      console.error('Error reloading notes:', error)
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return `${date.getDate().toString().padStart(2, '0')}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${date.getFullYear()}`
  }

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const renderNoteItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.noteItem, darkMode && styles.darkNoteItem]}
      onPress={() => handleEditNote(item.id)}
    >
      <View style={styles.noteContent}>
        <Text style={[styles.noteTitle, darkMode && styles.darkText]}>
          {truncateText(item.title, 40)}
        </Text>
        <Text style={[styles.noteText, darkMode && styles.darkText]}>
          {truncateText(item.content, 80)}
        </Text>

        <View style={styles.noteFooter}>
          <View style={styles.reminderContainer}>
            {item.reminderTime && (
              <View style={styles.reminderBadge}>
                <Ionicons
                  name="alarm-outline"
                  size={14}
                  color="#fff"
                  style={styles.reminderIcon}
                />
                <Text style={styles.reminderText}>{item.reminderTime}</Text>
              </View>
            )}
            {item.linkedShifts && item.linkedShifts.length > 0 && (
              <View style={[styles.reminderBadge, styles.shiftBadge]}>
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color="#fff"
                  style={styles.reminderIcon}
                />
                <Text style={styles.reminderText}>
                  {item.linkedShifts.length}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.noteDate, darkMode && styles.darkSubtitle]}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNote(item.id)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={darkMode ? '#ff6b6b' : '#e74c3c'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Search Bar */}
      <View
        style={[styles.searchContainer, darkMode && styles.darkSearchContainer]}
      >
        <Ionicons name="search" size={20} color={darkMode ? '#aaa' : '#666'} />
        <TextInput
          style={[styles.searchInput, darkMode && styles.darkSearchInput]}
          placeholder={t('Search notes...')}
          placeholderTextColor={darkMode ? '#777' : '#999'}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons
              name="close-circle"
              size={20}
              color={darkMode ? '#aaa' : '#666'}
            />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8a56ff" />
          <Text style={[styles.loadingText, darkMode && styles.darkText]}>
            {t('Loading notes...')}
          </Text>
        </View>
      ) : filteredNotes.length > 0 ? (
        <FlatList
          data={filteredNotes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={searchText ? 'search-outline' : 'document-text-outline'}
            size={64}
            color={darkMode ? '#555' : '#ccc'}
          />
          <Text style={[styles.emptyText, darkMode && styles.darkText]}>
            {searchText
              ? t('No notes found matching your search')
              : t('No notes yet')}
          </Text>
          {searchText && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchText('')}
            >
              <Text style={styles.clearSearchText}>{t('Clear search')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Note Form Modal */}
      <NoteFormModal
        visible={modalVisible}
        noteId={editingNoteId}
        onClose={handleModalClose}
        onSaved={handleNoteSaved}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  darkSearchContainer: {
    backgroundColor: '#2a2a2a',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  darkSearchInput: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  notesList: {
    padding: 16,
    paddingTop: 0,
  },
  noteItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  darkNoteItem: {
    backgroundColor: '#1e1e1e',
  },
  noteContent: {
    flex: 1,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderContainer: {
    flexDirection: 'row',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8a56ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  shiftBadge: {
    backgroundColor: '#3498db',
  },
  reminderIcon: {
    marginRight: 4,
  },
  reminderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#8a56ff',
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8a56ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
})

export default NotesScreen
