'use client'

import { useContext, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import { formatDuration } from '../utils/helpers'
import MultiFunctionButton from '../components/MultiFunctionButton'
import WeeklyStatusGrid from '../components/WeeklyStatusGrid'
import WeatherWidget from '../components/WeatherWidget'
import WorkNotesSection from '../components/WorkNotesSection'

const HomeScreen = ({ navigation }) => {
  const {
    t,
    darkMode,
    currentShift,
    isWorking,
    workStartTime,
    alarmPermissionGranted,
    requestAlarmPermission,
  } = useContext(AppContext)

  const [currentTime, setCurrentTime] = useState(new Date())
  const [workDuration, setWorkDuration] = useState(0)
  const [showAlarmPermissionAlert, setShowAlarmPermissionAlert] = useState(
    !alarmPermissionGranted
  )

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())

      // Calculate work duration if working
      if (isWorking && workStartTime) {
        const duration = Math.floor((new Date() - workStartTime) / (1000 * 60))
        setWorkDuration(duration)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isWorking, workStartTime])

  // Show alarm permission alert once
  useEffect(() => {
    if (!alarmPermissionGranted && showAlarmPermissionAlert) {
      Alert.alert(
        t('Alarm Permission Required'),
        t(
          'AccShift needs permission to send alarm notifications even when your device is in Do Not Disturb mode.'
        ),
        [
          {
            text: t('Later'),
            onPress: () => setShowAlarmPermissionAlert(false),
            style: 'cancel',
          },
          {
            text: t('Grant Permission'),
            onPress: async () => {
              const granted = await requestAlarmPermission()
              setShowAlarmPermissionAlert(!granted)
            },
          },
        ]
      )
    }
  }, [
    alarmPermissionGranted,
    showAlarmPermissionAlert,
    requestAlarmPermission,
    t,
  ])

  const formatTimeDisplay = (date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const formatDateDisplay = (date) => {
    const days = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ]
    return `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}`
  }

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      {/* 1. Thanh trên cùng (Ngày/giờ, nút Cài đặt) */}
      <View style={styles.header}>
        <View style={styles.dateTimeContainer}>
          <Text style={[styles.currentTime, darkMode && styles.darkText]}>
            {formatTimeDisplay(currentTime)}
          </Text>
          <Text style={[styles.dateDisplay, darkMode && styles.darkSubtitle]}>
            {formatDateDisplay(currentTime)}
          </Text>
        </View>
        {/* Đã loại bỏ các nút thống kê và cài đặt */}
      </View>

      {/* 2. Khu vực Thời tiết Hiện tại & Dự báo Ngắn hạn */}
      <WeatherWidget onPress={() => navigation.navigate('WeatherDetail')} />

      {/* Vùng Cảnh báo Thời tiết (nếu có) - Đã được tích hợp vào WeatherWidget */}

      {/* 3. Tên ca làm việc đang áp dụng */}
      <TouchableOpacity
        style={[styles.shiftContainer, darkMode && styles.darkCard]}
        onPress={() => navigation.navigate('ShiftManagement')}
      >
        <Text style={[styles.shiftText, darkMode && styles.darkText]}>
          {t('Work Shift')}
        </Text>
        <Text style={[styles.shiftTimeText, darkMode && styles.darkSubtitle]}>
          {currentShift
            ? `${currentShift.name} (${currentShift.startTime} - ${currentShift.endTime})`
            : t('No shift selected')}
        </Text>
        <View style={styles.shiftEditIcon}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={darkMode ? '#aaa' : '#666'}
          />
        </View>
      </TouchableOpacity>

      {/* Hiển thị trạng thái làm việc nếu đang làm việc */}
      {isWorking && (
        <View style={[styles.workStatusContainer, darkMode && styles.darkCard]}>
          <View style={styles.checkMark}>
            <Ionicons name="checkmark" size={24} color="#fff" />
          </View>
          <View style={styles.workStatusTextContainer}>
            <Text style={[styles.workStatusText, darkMode && styles.darkText]}>
              {t('Working')} {currentShift ? currentShift.name : ''}
            </Text>
            <Text
              style={[styles.workDurationText, darkMode && styles.darkSubtitle]}
            >
              {t('Worked for')} {formatDuration(workDuration)}
            </Text>
          </View>
        </View>
      )}

      {/* 4. Nút Đa Năng lớn */}
      <MultiFunctionButton />

      {/* 6. Lịch sử bấm nút (được hiển thị trong MultiFunctionButton) */}

      {/* 7. Lưới trạng thái tuần */}
      <View style={[styles.weeklyStatusContainer, darkMode && styles.darkCard]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
            {t('Weekly Status')}
          </Text>
          <TouchableOpacity
            style={styles.viewStatsButton}
            onPress={() => navigation.navigate('AttendanceStats')}
          >
            <Text style={styles.viewStatsButtonText}>{t('View Patterns')}</Text>
          </TouchableOpacity>
        </View>
        <WeeklyStatusGrid />
      </View>

      {/* 8. Khu vực Ghi Chú Công Việc */}
      <WorkNotesSection navigation={navigation} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTimeContainer: {
    alignItems: 'flex-start',
  },
  currentTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  dateDisplay: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },

  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  shiftContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  shiftText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  shiftTimeText: {
    fontSize: 14,
    color: '#666',
  },
  shiftEditIcon: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -10,
  },
  workStatusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8a56ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workStatusTextContainer: {
    flex: 1,
  },
  workStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  workDurationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  weeklyStatusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewStatsButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  viewStatsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
})

export default HomeScreen
