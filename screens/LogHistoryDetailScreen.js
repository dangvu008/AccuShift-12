'use client'

import { useState, useEffect, useContext, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { formatTimeDisplay } from '../utils/helpers'

const LogHistoryDetailScreen = ({ navigation, route }) => {
  const { t, darkMode } = useContext(AppContext)
  const { date } = route.params
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const logsKey = `attendanceLogs_${date}`
      const logsJson = await AsyncStorage.getItem(logsKey)

      if (logsJson) {
        const parsedLogs = JSON.parse(logsJson)
        // Sort logs by timestamp (oldest first)
        parsedLogs.sort((a, b) => a.timestamp - b.timestamp)
        setLogs(parsedLogs)
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error('Error loading logs:', error)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const getLogTypeIcon = (type) => {
    switch (type) {
      case 'go_work':
        return { name: 'walk-outline', color: '#8a56ff' }
      case 'check_in':
        return { name: 'log-in-outline', color: '#27ae60' }
      case 'check_out':
        return { name: 'log-out-outline', color: '#3498db' }
      case 'punch':
        return { name: 'finger-print-outline', color: '#e74c3c' }
      case 'complete':
        return { name: 'checkmark-done-outline', color: '#f39c12' }
      default:
        return { name: 'time-outline', color: '#95a5a6' }
    }
  }

  const getLogTypeText = (type) => {
    switch (type) {
      case 'go_work':
        return t('Go Work')
      case 'check_in':
        return t('Check In')
      case 'check_out':
        return t('Check Out')
      case 'punch':
        return t('Punch')
      case 'complete':
        return t('Complete')
      default:
        return type
    }
  }

  const formatDate = (dateString) => {
    const parts = dateString.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const renderLogItem = ({ item, index }) => {
    const icon = getLogTypeIcon(item.type)
    const logTime = new Date(item.timestamp)

    return (
      <View style={[styles.logItem, darkMode && styles.darkLogItem]}>
        <View style={styles.timelineContainer}>
          <View
            style={[styles.timelineLine, { backgroundColor: icon.color }]}
          />
          <View style={[styles.timelineDot, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name} size={16} color="#fff" />
          </View>
          {index === logs.length - 1 && (
            <View
              style={[styles.timelineEnd, { backgroundColor: icon.color }]}
            />
          )}
        </View>

        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <Text style={[styles.logType, darkMode && styles.darkText]}>
              {getLogTypeText(item.type)}
            </Text>
            <Text style={[styles.logTime, darkMode && styles.darkSubtitle]}>
              {formatTimeDisplay(logTime)}
            </Text>
          </View>

          {item.shiftId && (
            <Text style={[styles.logShift, darkMode && styles.darkSubtitle]}>
              {t('Shift')}: {item.shiftName || item.shiftId}
            </Text>
          )}

          {item.photoUri && (
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={() =>
                navigation.navigate('ImageViewer', { uri: item.photoUri })
              }
            >
              <Image
                source={{ uri: item.photoUri }}
                style={styles.photoThumbnail}
              />
              <View style={styles.photoOverlay}>
                <Ionicons name="eye-outline" size={16} color="#fff" />
                <Text style={styles.viewPhotoText}>{t('View')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {item.notes && (
            <Text style={[styles.logNotes, darkMode && styles.darkSubtitle]}>
              {item.notes}
            </Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={[styles.header, darkMode && styles.darkHeader]}>
        <Text style={[styles.headerTitle, darkMode && styles.darkText]}>
          {formatDate(date)}
        </Text>
        <Text style={[styles.headerSubtitle, darkMode && styles.darkSubtitle]}>
          {logs.length} {t('attendance logs')}
        </Text>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.logsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={darkMode ? '#555' : '#ccc'}
            />
            <Text style={[styles.emptyText, darkMode && styles.darkText]}>
              {isLoading ? t('Loading...') : t('No logs found for this date')}
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    flex: 1,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkHeader: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#333',
  },
  darkLogItem: {
    backgroundColor: '#1e1e1e',
  },

  darkSubtitle: {
    color: '#aaa',
  },
  darkText: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    padding: 16,
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    flex: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  logNotes: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  logShift: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  logTime: {
    color: '#666',
    fontSize: 14,
  },
  logType: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logsList: {
    padding: 16,
  },
  photoContainer: {
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderTopLeftRadius: 8,
    bottom: 0,
    flexDirection: 'row',
    padding: 6,
    position: 'absolute',
    right: 0,
  },
  photoThumbnail: {
    borderRadius: 8,
    height: 120,
    width: '100%',
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 40,
  },
  timelineDot: {
    alignItems: 'center',
    backgroundColor: '#8a56ff',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginBottom: 8,
    width: 32,
  },
  timelineEnd: {
    backgroundColor: '#8a56ff',
    bottom: 0,
    height: 16,
    position: 'absolute',
    width: 2,
  },
  timelineLine: {
    backgroundColor: '#8a56ff',
    bottom: 0,
    position: 'absolute',
    top: 24,
    width: 2,
  },
  viewPhotoText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
})

export default LogHistoryDetailScreen
