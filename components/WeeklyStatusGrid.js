'use client'

import { useState, useContext, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native'
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Status constants
export const WORK_STATUS = {
  THIEU_LOG: 'THIEU_LOG', // Đi làm nhưng thiếu chấm công
  DU_CONG: 'DU_CONG', // Đủ công
  CHUA_CAP_NHAT: 'CHUA_CAP_NHAT', // Chưa cập nhật
  NGHI_PHEP: 'NGHI_PHEP', // Nghỉ phép
  NGHI_BENH: 'NGHI_BENH', // Nghỉ bệnh
  NGHI_LE: 'NGHI_LE', // Nghỉ lễ
  NGHI_THUONG: 'NGHI_THUONG', // Ngày nghỉ thông thường (thứ 7, chủ nhật)
  VANG_MAT: 'VANG_MAT', // Vắng không lý do
  DI_MUON: 'DI_MUON', // Đi muộn
  VE_SOM: 'VE_SOM', // Về sớm
  DI_MUON_VE_SOM: 'DI_MUON_VE_SOM', // Đi muộn và về sớm
  NGAY_TUONG_LAI: 'NGAY_TUONG_LAI', // Ngày tương lai
}

// Tên viết tắt các ngày trong tuần
const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const WeeklyStatusGrid = () => {
  const { t, darkMode, attendanceLogs, buttonState, currentShift } =
    useContext(AppContext)
  const [weekDays, setWeekDays] = useState([])
  const [dailyStatuses, setDailyStatuses] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)

  // Initialize week days and load statuses
  useEffect(() => {
    generateWeekDays()
    loadDailyStatuses()
  }, [])

  // Cập nhật trạng thái từ attendanceLogs
  const updateStatusFromAttendanceLogs = useCallback(async () => {
    if (!attendanceLogs || attendanceLogs.length === 0) return

    const today = new Date()
    const dateKey = formatDateKey(today)
    const existingStatus = dailyStatuses[dateKey] || {}

    // Lấy thời gian chấm công từ attendanceLogs
    const goWorkLog = attendanceLogs.find((log) => log.type === 'go_work')
    const checkInLog = attendanceLogs.find((log) => log.type === 'check_in')
    const checkOutLog = attendanceLogs.find((log) => log.type === 'check_out')
    const completeLog = attendanceLogs.find((log) => log.type === 'complete')

    // Xác định trạng thái dựa trên các log
    let status = WORK_STATUS.CHUA_CAP_NHAT

    if (goWorkLog && !checkInLog && !checkOutLog) {
      // Chỉ có go_work, thiếu check_in và check_out
      status = WORK_STATUS.THIEU_LOG
    } else if (goWorkLog && checkInLog && !checkOutLog) {
      // Có go_work và check_in, thiếu check_out
      status = WORK_STATUS.THIEU_LOG
    } else if (goWorkLog && checkInLog && checkOutLog) {
      // Đủ các log cần thiết
      if (completeLog) {
        status = WORK_STATUS.DU_CONG
      } else {
        status = WORK_STATUS.THIEU_LOG
      }
    }

    // Cập nhật thời gian chấm công
    const updatedStatus = {
      ...existingStatus,
      status,
      updatedAt: new Date().toISOString(),
    }

    // Lưu thời gian vào/ra
    if (checkInLog) {
      const checkInTime = new Date(checkInLog.timestamp)
      updatedStatus.vaoLogTime = checkInTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    }

    if (checkOutLog) {
      const checkOutTime = new Date(checkOutLog.timestamp)
      updatedStatus.raLogTime = checkOutTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    }

    // Lưu thông tin ca làm việc nếu có
    if (currentShift) {
      updatedStatus.shiftName = currentShift.name
    }

    // Lưu vào AsyncStorage
    await AsyncStorage.setItem(
      `dailyWorkStatus_${dateKey}`,
      JSON.stringify(updatedStatus)
    )

    // Cập nhật state
    setDailyStatuses({
      ...dailyStatuses,
      [dateKey]: updatedStatus,
    })
  }, [attendanceLogs, dailyStatuses, currentShift, formatDateKey])

  // Cập nhật trạng thái khi người dùng bấm nút đi làm
  useEffect(() => {
    if (attendanceLogs && attendanceLogs.length > 0) {
      updateStatusFromAttendanceLogs()
    }
  }, [attendanceLogs, updateStatusFromAttendanceLogs])

  // Generate array of days for the current week (Monday to Sunday)
  const generateWeekDays = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, ...
    const days = []

    // Calculate the date of Monday this week
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)

    // Sử dụng weekdayNames đã được định nghĩa ở trên

    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dayIndex = (1 + i) % 7 // Chuyển đổi từ thứ 2-CN sang index 1-0
      days.push({
        date,
        dayOfMonth: date.getDate(),
        dayOfWeek: weekdayNames[dayIndex],
        isToday: date.toDateString() === today.toDateString(),
        isFuture: date > today,
      })
    }

    setWeekDays(days)
  }

  // Load daily work statuses from AsyncStorage
  const loadDailyStatuses = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const statusKeys = keys.filter((key) =>
        key.startsWith('dailyWorkStatus_')
      )
      const statusPairs = await AsyncStorage.multiGet(statusKeys)

      const statuses = {}
      statusPairs.forEach(([key, value]) => {
        const dateStr = key.replace('dailyWorkStatus_', '')
        statuses[dateStr] = JSON.parse(value)
      })

      setDailyStatuses(statuses)
    } catch (error) {
      console.error('Error loading daily statuses:', error)
    }
  }

  // Format date to YYYY-MM-DD for storage key
  const formatDateKey = useCallback((date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getDate()).padStart(2, '0')}`
  }, [])

  // Get status for a specific day
  const getDayStatus = (day) => {
    const dateKey = formatDateKey(day.date)
    const status = dailyStatuses[dateKey]

    // Kiểm tra xem ngày có phải là ngày nghỉ thông thường không (thứ 7, chủ nhật)
    // dựa trên cài đặt của ca làm việc hiện tại
    const isRegularDayOff = () => {
      if (!currentShift || !currentShift.daysApplied) return false

      // Lấy thứ trong tuần của ngày (0 = CN, 1 = T2, ..., 6 = T7)
      const dayOfWeek = day.date.getDay()

      // Chuyển đổi thành định dạng T2, T3, ..., CN
      const dayCode = weekdayNames[dayOfWeek]

      // Kiểm tra xem ngày này có trong daysApplied của ca làm việc không
      return !currentShift.daysApplied.includes(dayCode)
    }

    // Ngày tương lai luôn hiển thị NGAY_TUONG_LAI
    if (day.isFuture) {
      // Nếu đã có trạng thái nghỉ phép, nghỉ bệnh, nghỉ lễ hoặc vắng mặt thì hiển thị trạng thái đó
      if (
        status &&
        (status.status === WORK_STATUS.NGHI_PHEP ||
          status.status === WORK_STATUS.NGHI_BENH ||
          status.status === WORK_STATUS.NGHI_LE ||
          status.status === WORK_STATUS.VANG_MAT)
      ) {
        return status.status
      }

      // Kiểm tra nếu là ngày nghỉ thông thường
      if (isRegularDayOff()) {
        return WORK_STATUS.NGHI_THUONG
      }

      return WORK_STATUS.NGAY_TUONG_LAI
    }

    // Ngày hiện tại hoặc quá khứ
    if (!status) {
      // Kiểm tra nếu là ngày nghỉ thông thường
      if (isRegularDayOff()) {
        return WORK_STATUS.NGHI_THUONG
      }
      return WORK_STATUS.CHUA_CAP_NHAT
    }

    return status.status || WORK_STATUS.CHUA_CAP_NHAT
  }

  // Update status for a specific day
  const updateDayStatus = async (day, newStatus) => {
    try {
      const dateKey = formatDateKey(day.date)
      const existingStatus = dailyStatuses[dateKey] || {}
      const now = new Date()
      const timeString = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })

      // Sử dụng currentShift từ props thay vì gọi useContext ở đây

      const updatedStatus = {
        ...existingStatus,
        status: newStatus,
        updatedAt: now.toISOString(),
        // Lưu thông tin ca làm việc nếu có
        shiftName: currentShift ? currentShift.name : existingStatus.shiftName,
      }

      // Lưu thời gian chấm công thực tế
      if (
        newStatus === WORK_STATUS.DU_CONG ||
        newStatus === WORK_STATUS.THIEU_LOG ||
        newStatus === WORK_STATUS.DI_MUON ||
        newStatus === WORK_STATUS.VE_SOM ||
        newStatus === WORK_STATUS.DI_MUON_VE_SOM
      ) {
        // Nếu chưa có thời gian vào, lưu thời gian hiện tại
        if (!updatedStatus.vaoLogTime) {
          updatedStatus.vaoLogTime = timeString
        }

        // Nếu đã có thời gian vào nhưng chưa có thời gian ra, lưu thời gian hiện tại
        if (updatedStatus.vaoLogTime && !updatedStatus.raLogTime) {
          updatedStatus.raLogTime = timeString
        }
      }

      await AsyncStorage.setItem(
        `dailyWorkStatus_${dateKey}`,
        JSON.stringify(updatedStatus)
      )

      // Update local state
      setDailyStatuses({
        ...dailyStatuses,
        [dateKey]: updatedStatus,
      })

      // Close modal
      setStatusModalVisible(false)
    } catch (error) {
      console.error('Error updating day status:', error)
    }
  }

  // Get icon for status
  const getStatusIcon = (status) => {
    switch (status) {
      case WORK_STATUS.THIEU_LOG:
        return { name: 'alert-circle', color: '#e74c3c', type: 'ionicons' }
      case WORK_STATUS.DU_CONG:
        return { name: 'checkmark-circle', color: '#27ae60', type: 'ionicons' }
      case WORK_STATUS.NGHI_PHEP:
        return { name: 'mail', color: '#3498db', type: 'ionicons' }
      case WORK_STATUS.NGHI_BENH:
        return { name: 'bed', color: '#9b59b6', type: 'font-awesome' }
      case WORK_STATUS.NGHI_LE:
        return { name: 'flag', color: '#f39c12', type: 'font-awesome' }
      case WORK_STATUS.NGHI_THUONG:
        return { name: 'home', color: '#27ae60', type: 'ionicons' }
      case WORK_STATUS.VANG_MAT:
        return { name: 'close-circle', color: '#e74c3c', type: 'ionicons' }
      case WORK_STATUS.DI_MUON:
        return { name: 'time-outline', color: '#f39c12', type: 'ionicons' }
      case WORK_STATUS.VE_SOM:
        return { name: 'exit-outline', color: '#f39c12', type: 'ionicons' }
      case WORK_STATUS.DI_MUON_VE_SOM:
        return {
          name: 'timer-sand',
          color: '#f39c12',
          type: 'material-community',
        }
      case WORK_STATUS.NGAY_TUONG_LAI:
        return { name: 'remove', color: '#95a5a6', type: 'font-awesome' }
      default:
        return { name: 'help-circle', color: '#95a5a6', type: 'ionicons' }
    }
  }

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case WORK_STATUS.THIEU_LOG:
        return t('Thiếu chấm công')
      case WORK_STATUS.DU_CONG:
        return t('Đủ công')
      case WORK_STATUS.NGHI_PHEP:
        return t('Nghỉ phép')
      case WORK_STATUS.NGHI_BENH:
        return t('Nghỉ bệnh')
      case WORK_STATUS.NGHI_LE:
        return t('Nghỉ lễ')
      case WORK_STATUS.NGHI_THUONG:
        return t('Ngày nghỉ thông thường')
      case WORK_STATUS.VANG_MAT:
        return t('Vắng không lý do')
      case WORK_STATUS.DI_MUON:
        return t('Đi muộn')
      case WORK_STATUS.VE_SOM:
        return t('Về sớm')
      case WORK_STATUS.DI_MUON_VE_SOM:
        return t('Đi muộn & về sớm')
      case WORK_STATUS.NGAY_TUONG_LAI:
        return t('Ngày tương lai')
      default:
        return t('Chưa cập nhật')
    }
  }

  // Get status abbreviation
  const getStatusAbbreviation = (status) => {
    switch (status) {
      case WORK_STATUS.THIEU_LOG:
        return '❗'
      case WORK_STATUS.DU_CONG:
        return '✅'
      case WORK_STATUS.NGHI_PHEP:
        return '📩 P'
      case WORK_STATUS.NGHI_BENH:
        return '🛌 B'
      case WORK_STATUS.NGHI_LE:
        return '🎌 H'
      case WORK_STATUS.NGHI_THUONG:
        return '🏠 N'
      case WORK_STATUS.VANG_MAT:
        return '❌ X'
      case WORK_STATUS.DI_MUON:
        return 'RV↓'
      case WORK_STATUS.VE_SOM:
        return 'RV↑'
      case WORK_STATUS.DI_MUON_VE_SOM:
        return 'RV'
      case WORK_STATUS.NGAY_TUONG_LAI:
        return '--'
      default:
        return '❓'
    }
  }

  // Handle day press - show details
  const handleDayPress = (day) => {
    setSelectedDay(day)
    setDetailModalVisible(true)
  }

  // Handle day long press - update status
  const handleDayLongPress = (day) => {
    // Cho phép cập nhật trạng thái cho tất cả các ngày
    // Nhưng sẽ giới hạn các trạng thái có thể chọn trong modal dựa vào ngày
    setSelectedDay(day)
    setStatusModalVisible(true)
  }

  // Render status icon
  const renderStatusIcon = (status) => {
    const iconConfig = getStatusIcon(status)

    if (iconConfig.type === 'ionicons') {
      return (
        <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
      )
    } else if (iconConfig.type === 'material-community') {
      return (
        <MaterialCommunityIcons
          name={iconConfig.name}
          size={24}
          color={iconConfig.color}
        />
      )
    } else if (iconConfig.type === 'font-awesome') {
      return (
        <FontAwesome5
          name={iconConfig.name}
          size={20}
          color={iconConfig.color}
        />
      )
    }

    return (
      <Text style={{ fontSize: 18, color: iconConfig.color }}>
        {getStatusAbbreviation(status)}
      </Text>
    )
  }

  // Format date for display
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {weekDays.map((day) => {
          const status = getDayStatus(day)
          const statusAbbr = getStatusAbbreviation(status)
          const isToday = day.isToday

          return (
            <TouchableOpacity
              key={day.dayOfWeek}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                darkMode && styles.darkDayCell,
                isToday && darkMode && styles.darkTodayCell,
              ]}
              onPress={() => handleDayPress(day)}
              onLongPress={() => handleDayLongPress(day)}
              delayLongPress={500}
            >
              <Text
                style={[
                  styles.dayOfMonth,
                  isToday && styles.todayText,
                  darkMode && styles.darkText,
                  isToday && darkMode && styles.darkTodayText,
                ]}
              >
                {day.dayOfMonth}
              </Text>
              <Text
                style={[
                  styles.dayOfWeek,
                  isToday && styles.todayText,
                  darkMode && styles.darkText,
                  isToday && darkMode && styles.darkTodayText,
                ]}
              >
                {weekdayNames[new Date(day.date).getDay()]}
              </Text>
              <View style={styles.statusContainer}>
                {renderStatusIcon(status)}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, darkMode && styles.darkModalContent]}
          >
            {selectedDay && (
              <>
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, darkMode && styles.darkText]}
                  >
                    {formatDate(selectedDay.date)} ({selectedDay.dayOfWeek})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={darkMode ? '#fff' : '#000'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailContainer}>
                  <View style={styles.detailRow}>
                    <Text
                      style={[styles.detailLabel, darkMode && styles.darkText]}
                    >
                      {t('Status')}:
                    </Text>
                    <Text
                      style={[styles.detailValue, darkMode && styles.darkText]}
                    >
                      {getStatusText(getDayStatus(selectedDay))}
                    </Text>
                  </View>

                  {/* Show check-in/out times if available */}
                  {dailyStatuses[formatDateKey(selectedDay.date)]
                    ?.vaoLogTime && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {t('Check In')}:
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {
                          dailyStatuses[formatDateKey(selectedDay.date)]
                            .vaoLogTime
                        }
                      </Text>
                    </View>
                  )}

                  {dailyStatuses[formatDateKey(selectedDay.date)]
                    ?.raLogTime && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {t('Check Out')}:
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {
                          dailyStatuses[formatDateKey(selectedDay.date)]
                            .raLogTime
                        }
                      </Text>
                    </View>
                  )}

                  {/* Show shift name if available */}
                  {dailyStatuses[formatDateKey(selectedDay.date)]
                    ?.shiftName && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {t('Shift')}:
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {
                          dailyStatuses[formatDateKey(selectedDay.date)]
                            .shiftName
                        }
                      </Text>
                    </View>
                  )}

                  {/* Show work hours if available */}
                  {dailyStatuses[formatDateKey(selectedDay.date)]
                    ?.workHours && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {t('Work Hours')}:
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {
                          dailyStatuses[formatDateKey(selectedDay.date)]
                            .workHours
                        }
                      </Text>
                    </View>
                  )}

                  {/* Show OT hours if available */}
                  {dailyStatuses[formatDateKey(selectedDay.date)]?.otHours && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {t('OT Hours')}:
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {dailyStatuses[formatDateKey(selectedDay.date)].otHours}
                      </Text>
                    </View>
                  )}

                  {/* Show notes if available */}
                  {dailyStatuses[formatDateKey(selectedDay.date)]?.notes && (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {t('Notes')}:
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {dailyStatuses[formatDateKey(selectedDay.date)].notes}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => {
                    setDetailModalVisible(false)
                    setStatusModalVisible(true)
                  }}
                >
                  <Text style={styles.updateButtonText}>
                    {t('Update Status')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, darkMode && styles.darkModalContent]}
          >
            {selectedDay && (
              <>
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, darkMode && styles.darkText]}
                  >
                    {t('Update Status')} - {formatDate(selectedDay.date)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setStatusModalVisible(false)}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={darkMode ? '#fff' : '#000'}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.statusList}>
                  {/* Hiển thị tất cả các tùy chọn cho ngày hiện tại và quá khứ */}
                  {(!selectedDay.isFuture || selectedDay.isToday) && (
                    <>
                      <TouchableOpacity
                        style={styles.statusOption}
                        onPress={() =>
                          updateDayStatus(selectedDay, WORK_STATUS.DU_CONG)
                        }
                      >
                        <View style={styles.statusIconContainer}>
                          {renderStatusIcon(WORK_STATUS.DU_CONG)}
                        </View>
                        <Text
                          style={[
                            styles.statusOptionText,
                            darkMode && styles.darkText,
                          ]}
                        >
                          {getStatusText(WORK_STATUS.DU_CONG)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.statusOption}
                        onPress={() =>
                          updateDayStatus(selectedDay, WORK_STATUS.THIEU_LOG)
                        }
                      >
                        <View style={styles.statusIconContainer}>
                          {renderStatusIcon(WORK_STATUS.THIEU_LOG)}
                        </View>
                        <Text
                          style={[
                            styles.statusOptionText,
                            darkMode && styles.darkText,
                          ]}
                        >
                          {getStatusText(WORK_STATUS.THIEU_LOG)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.statusOption}
                        onPress={() =>
                          updateDayStatus(selectedDay, WORK_STATUS.DI_MUON)
                        }
                      >
                        <View style={styles.statusIconContainer}>
                          {renderStatusIcon(WORK_STATUS.DI_MUON)}
                        </View>
                        <Text
                          style={[
                            styles.statusOptionText,
                            darkMode && styles.darkText,
                          ]}
                        >
                          {getStatusText(WORK_STATUS.DI_MUON)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.statusOption}
                        onPress={() =>
                          updateDayStatus(selectedDay, WORK_STATUS.VE_SOM)
                        }
                      >
                        <View style={styles.statusIconContainer}>
                          {renderStatusIcon(WORK_STATUS.VE_SOM)}
                        </View>
                        <Text
                          style={[
                            styles.statusOptionText,
                            darkMode && styles.darkText,
                          ]}
                        >
                          {getStatusText(WORK_STATUS.VE_SOM)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.statusOption}
                        onPress={() =>
                          updateDayStatus(
                            selectedDay,
                            WORK_STATUS.DI_MUON_VE_SOM
                          )
                        }
                      >
                        <View style={styles.statusIconContainer}>
                          {renderStatusIcon(WORK_STATUS.DI_MUON_VE_SOM)}
                        </View>
                        <Text
                          style={[
                            styles.statusOptionText,
                            darkMode && styles.darkText,
                          ]}
                        >
                          {getStatusText(WORK_STATUS.DI_MUON_VE_SOM)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.statusOption}
                        onPress={() =>
                          updateDayStatus(selectedDay, WORK_STATUS.VANG_MAT)
                        }
                      >
                        <View style={styles.statusIconContainer}>
                          {renderStatusIcon(WORK_STATUS.VANG_MAT)}
                        </View>
                        <Text
                          style={[
                            styles.statusOptionText,
                            darkMode && styles.darkText,
                          ]}
                        >
                          {getStatusText(WORK_STATUS.VANG_MAT)}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Luôn hiển thị các tùy chọn này cho tất cả các ngày (bao gồm cả ngày tương lai) */}
                  <TouchableOpacity
                    style={styles.statusOption}
                    onPress={() =>
                      updateDayStatus(selectedDay, WORK_STATUS.NGHI_PHEP)
                    }
                  >
                    <View style={styles.statusIconContainer}>
                      {renderStatusIcon(WORK_STATUS.NGHI_PHEP)}
                    </View>
                    <Text
                      style={[
                        styles.statusOptionText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {getStatusText(WORK_STATUS.NGHI_PHEP)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statusOption}
                    onPress={() =>
                      updateDayStatus(selectedDay, WORK_STATUS.NGHI_BENH)
                    }
                  >
                    <View style={styles.statusIconContainer}>
                      {renderStatusIcon(WORK_STATUS.NGHI_BENH)}
                    </View>
                    <Text
                      style={[
                        styles.statusOptionText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {getStatusText(WORK_STATUS.NGHI_BENH)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statusOption}
                    onPress={() =>
                      updateDayStatus(selectedDay, WORK_STATUS.NGHI_LE)
                    }
                  >
                    <View style={styles.statusIconContainer}>
                      {renderStatusIcon(WORK_STATUS.NGHI_LE)}
                    </View>
                    <Text
                      style={[
                        styles.statusOptionText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {getStatusText(WORK_STATUS.NGHI_LE)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statusOption}
                    onPress={() =>
                      updateDayStatus(selectedDay, WORK_STATUS.NGHI_THUONG)
                    }
                  >
                    <View style={styles.statusIconContainer}>
                      {renderStatusIcon(WORK_STATUS.NGHI_THUONG)}
                    </View>
                    <Text
                      style={[
                        styles.statusOptionText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {getStatusText(WORK_STATUS.NGHI_THUONG)}
                    </Text>
                  </TouchableOpacity>

                  {/* Chỉ hiển thị tùy chọn "Chưa cập nhật" cho ngày hiện tại và quá khứ */}
                  {(!selectedDay.isFuture || selectedDay.isToday) && (
                    <TouchableOpacity
                      style={styles.statusOption}
                      onPress={() =>
                        updateDayStatus(selectedDay, WORK_STATUS.CHUA_CAP_NHAT)
                      }
                    >
                      <View style={styles.statusIconContainer}>
                        {renderStatusIcon(WORK_STATUS.CHUA_CAP_NHAT)}
                      </View>
                      <Text
                        style={[
                          styles.statusOptionText,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {getStatusText(WORK_STATUS.CHUA_CAP_NHAT)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Chỉ hiển thị tùy chọn "Ngày tương lai" cho ngày tương lai */}
                  {selectedDay.isFuture && (
                    <TouchableOpacity
                      style={styles.statusOption}
                      onPress={() =>
                        updateDayStatus(selectedDay, WORK_STATUS.NGAY_TUONG_LAI)
                      }
                    >
                      <View style={styles.statusIconContainer}>
                        {renderStatusIcon(WORK_STATUS.NGAY_TUONG_LAI)}
                      </View>
                      <Text
                        style={[
                          styles.statusOptionText,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {getStatusText(WORK_STATUS.NGAY_TUONG_LAI)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 0.7,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkDayCell: {
    backgroundColor: '#2a2a2a',
  },
  todayCell: {
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#8a56ff',
  },
  darkTodayCell: {
    backgroundColor: '#1a365d',
    borderColor: '#8a56ff',
  },
  dayOfMonth: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dayOfWeek: {
    fontSize: 10,
    color: '#666',
  },
  darkText: {
    color: '#fff',
  },
  todayText: {
    color: '#8a56ff',
  },
  darkTodayText: {
    color: '#8a56ff',
  },
  statusContainer: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
  detailContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    width: 100,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  updateButton: {
    backgroundColor: '#8a56ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusList: {
    marginBottom: 16,
    maxHeight: 400,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusIconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
  },
})

export default WeeklyStatusGrid
