'use client'

import { useContext, useState, useEffect } from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { AppContext } from '../context/AppContext'
import NoteFormModal from '../components/NoteFormModal'

const NoteDetailScreen = ({ navigation, route }) => {
  const { t, darkMode } = useContext(AppContext)
  const noteId = route.params?.noteId
  const [isLoading, setIsLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    // Show modal immediately
    setIsLoading(false)
    setModalVisible(true)
  }, [])

  const handleModalClose = () => {
    setModalVisible(false)
    // Navigate back after modal is closed
    navigation.goBack()
  }

  const handleNoteSaved = (note, isDeleted = false) => {
    // Close modal and navigate back
    setModalVisible(false)
    navigation.goBack()
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          darkMode && styles.darkContainer,
          styles.loadingContainer,
        ]}
      >
        <ActivityIndicator size="large" color="#8a56ff" />
        <Text style={[styles.loadingText, darkMode && styles.darkText]}>
          {t('Loading...')}
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Hiển thị modal */}
      <NoteFormModal
        visible={modalVisible}
        noteId={noteId}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
})

export default NoteDetailScreen
