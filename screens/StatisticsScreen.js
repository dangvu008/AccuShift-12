'use client'

import { useState, useEffect, useContext, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import { formatDate, formatDuration } from '../utils/helpers'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { STORAGE_KEYS } from '../config/appConfig'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WORK_STATUS } from '../components/WeeklyStatusGrid'

const StatisticsScreen = ({ navigation }) => {
  const { t, darkMode, shifts, attendanceLogs } = useContext(AppContext)
  const [timeRange, setTimeRange] = useState('month') // 'week', 'month', 'year', 'custom'
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalWorkTime: 0,
    overtime: 0,
    statusCounts: {},
    dailyData: [],
  })

  // Custom date range
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [customRangeModalVisible, setCustomRangeModalVisible] = useState(false)
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportFormat, setExportFormat] = useState('csv') // 'csv', 'pdf', 'excel'
  const [exportProgress, setExportProgress] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  const getDateRange = useCallback(
    (range) => {
      const now = new Date()
      let rangeEnd = new Date(now)
      let rangeStart = new Date(now)

      // Get day of week outside switch
      const dayOfWeek = now.getDay() || 7 // Convert Sunday (0) to 7

      switch (range) {
        case 'week':
          // Start from beginning of current week (Monday)
          rangeStart.setDate(now.getDate() - dayOfWeek + 1) // Monday
          break
        case 'month':
          // Start from beginning of current month
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          // Start from beginning of current year
          rangeStart = new Date(now.getFullYear(), 0, 1)
          break
        case 'custom':
          // Use custom date range
          rangeStart = new Date(startDate)
          rangeEnd = new Date(endDate)
          break
      }

      // Reset hours to get full days
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd.setHours(23, 59, 59, 999)

      return { rangeStart, rangeEnd }
    },
    [startDate, endDate]
  )

  const loadAttendanceLogs = async (startDate, endDate) => {
    try {
      // Get all keys from AsyncStorage
      const allLogs = []

      // For each day in the range, try to load logs
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateKey = formatDate(currentDate)
        const logsKey = `${STORAGE_KEYS.ATTENDANCE_LOGS_PREFIX}${dateKey}`

        try {
          const logsJson = await AsyncStorage.getItem(logsKey)
          if (logsJson) {
            const dayLogs = JSON.parse(logsJson)
            allLogs.push(...dayLogs)
          }
        } catch (error) {
          console.error(`Error loading logs for ${dateKey}:`, error)
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return allLogs
    } catch (error) {
      console.error('Error loading attendance logs:', error)
      return []
    }
  }

  const processDayLogs = useCallback(
    (logs) => {
      // Initialize day stats
      const dayStats = {
        status: 'missingLog',
        workTime: 0,
        overtime: 0,
        checkIn: null,
        checkOut: null,
      }

      // Find check-in and check-out logs
      const checkInLog = logs.find((log) => log.type === 'check_in')
      const checkOutLog = logs.find((log) => log.type === 'check_out')

      if (checkInLog) {
        dayStats.checkIn = new Date(checkInLog.timestamp)
      }

      if (checkOutLog) {
        dayStats.checkOut = new Date(checkOutLog.timestamp)
      }

      // Calculate work time if both check-in and check-out exist
      if (dayStats.checkIn && dayStats.checkOut) {
        // Get shift for this log if available
        const shiftId = checkInLog.shiftId || checkOutLog.shiftId
        const shift = shifts.find((s) => s.id === shiftId)

        // Calculate work duration in minutes
        const workDurationMs =
          dayStats.checkOut.getTime() - dayStats.checkIn.getTime()
        const workDurationMinutes = Math.floor(workDurationMs / (1000 * 60))

        // Subtract break time if shift is available
        const breakTime = shift ? shift.breakTime || 0 : 0
        dayStats.workTime = Math.max(0, workDurationMinutes - breakTime)

        // Calculate overtime if shift is available
        if (shift) {
          // Parse shift times
          const [startHour, startMinute] = shift.startTime
            .split(':')
            .map(Number)
          const [endHour, endMinute] = shift.endTime.split(':').map(Number)

          // Create Date objects for shift times
          const shiftStart = new Date(dayStats.checkIn)
          shiftStart.setHours(startHour, startMinute, 0, 0)

          const shiftEnd = new Date(dayStats.checkIn)
          shiftEnd.setHours(endHour, endMinute, 0, 0)

          // If shift end is before shift start, it's an overnight shift
          if (shiftEnd < shiftStart) {
            shiftEnd.setDate(shiftEnd.getDate() + 1)
          }

          // Calculate regular shift duration in minutes
          const shiftDurationMs = shiftEnd.getTime() - shiftStart.getTime()
          const shiftDurationMinutes =
            Math.floor(shiftDurationMs / (1000 * 60)) - breakTime

          // Calculate overtime (work time exceeding shift duration)
          dayStats.overtime = Math.max(
            0,
            dayStats.workTime - shiftDurationMinutes
          )

          // Determine status based on check-in and check-out times
          const isLate = dayStats.checkIn > shiftStart
          const isEarlyLeave = dayStats.checkOut < shiftEnd

          if (isLate && isEarlyLeave) {
            dayStats.status = 'lateAndEarly'
          } else if (isLate) {
            dayStats.status = 'late'
          } else if (isEarlyLeave) {
            dayStats.status = 'earlyLeave'
          } else {
            dayStats.status = 'completed'
          }
        } else {
          // No shift information, just mark as completed
          dayStats.status = 'completed'
        }
      } else if (logs.some((log) => log.type === 'go_work')) {
        // Has go_work log but missing check-in or check-out
        dayStats.status = 'missingLog'
      }

      return dayStats
    },
    [shifts]
  )

  const calculateStatistics = useCallback(
    (logs, startDate, endDate) => {
      // Initialize statistics
      const stats = {
        totalWorkTime: 0,
        overtime: 0,
        statusCounts: {
          completed: 0,
          late: 0,
          earlyLeave: 0,
          lateAndEarly: 0,
          missingLog: 0,
          leave: 0,
        },
        dailyData: [],
      }

      // Group logs by day
      const logsByDay = {}

      logs.forEach((log) => {
        const date = new Date(log.timestamp)
        const dateKey = formatDate(date)

        if (!logsByDay[dateKey]) {
          logsByDay[dateKey] = []
        }

        logsByDay[dateKey].push(log)
      })

      // Process each day's logs
      Object.keys(logsByDay).forEach((dateKey) => {
        const dayLogs = logsByDay[dateKey]
        const dayStats = processDayLogs(dayLogs)

        // Add to total stats
        stats.totalWorkTime += dayStats.workTime
        stats.overtime += dayStats.overtime

        // Update status counts
        if (dayStats.status === 'completed') stats.statusCounts.completed++
        else if (dayStats.status === 'late') stats.statusCounts.late++
        else if (dayStats.status === 'earlyLeave')
          stats.statusCounts.earlyLeave++
        else if (dayStats.status === 'lateAndEarly')
          stats.statusCounts.lateAndEarly++
        else if (dayStats.status === 'missingLog')
          stats.statusCounts.missingLog++
        else if (dayStats.status === 'leave') stats.statusCounts.leave++

        // Add to daily data
        stats.dailyData.push({
          date: dateKey,
          ...dayStats,
        })
      })

      // Check for missing days in the range and mark as missing log
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateKey = formatDate(currentDate)

        // Skip weekends
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Not Sunday or Saturday
          if (!logsByDay[dateKey]) {
            // No logs for this day, mark as missing
            stats.statusCounts.missingLog++
            stats.dailyData.push({
              date: dateKey,
              status: 'missingLog',
              workTime: 0,
              overtime: 0,
              checkIn: null,
              checkOut: null,
            })
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Sort daily data by date
      stats.dailyData.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'))
        const dateB = new Date(b.date.split('/').reverse().join('-'))
        return dateA - dateB
      })

      return stats
    },
    [processDayLogs]
  )

  const formatDateRange = () => {
    const { rangeStart, rangeEnd } = getDateRange(timeRange)
    return `${formatDate(rangeStart)} - ${formatDate(rangeEnd)}`
  }

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false)
    if (selectedDate) {
      setStartDate(selectedDate)
    }
  }

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false)
    if (selectedDate) {
      setEndDate(selectedDate)
    }
  }

  const applyCustomDateRange = () => {
    setTimeRange('custom')
    setCustomRangeModalVisible(false)
  }

  const loadStatistics = useCallback(async () => {
    setIsLoading(true)

    try {
      // Get date range
      const { rangeStart, rangeEnd } = getDateRange(timeRange)

      // Load attendance logs
      const logs = await loadAttendanceLogs(rangeStart, rangeEnd)

      // Calculate statistics
      const calculatedStats = calculateStatistics(logs, rangeStart, rangeEnd)

      setStats(calculatedStats)
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, calculateStatistics, getDateRange])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  const exportReport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Generate report content based on format
      let content = ''
      let fileName = ''

      if (exportFormat === 'csv') {
        content = generateCSVReport()
        fileName = `accshift_report_${formatDate(new Date()).replace(
          /\//g,
          '-'
        )}.csv`
      } else {
        // For now, we'll just use CSV for all formats
        content = generateCSVReport()
        fileName = `accshift_report_${formatDate(new Date()).replace(
          /\//g,
          '-'
        )}.${exportFormat}`
      }

      setExportProgress(50)

      // Save file
      const filePath = `${FileSystem.documentDirectory}${fileName}`
      await FileSystem.writeAsStringAsync(filePath, content)

      setExportProgress(80)

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath)
        setExportProgress(100)
      } else {
        throw new Error('Sharing is not available on this device')
      }
    } catch (error) {
      console.error('Export error:', error)
      Alert.alert(
        t('Export Error'),
        t('An error occurred while exporting the report')
      )
    } finally {
      setIsExporting(false)
      setExportModalVisible(false)
    }
  }

  const generateCSVReport = () => {
    // CSV header
    let csv = `${t('Date')},${t('Weekday')},${t('Check In')},${t(
      'Check Out'
    )},${t('Work Hours')},${t('OT Hours')},${t('Status')}\n`

    // Add data rows
    stats.dailyData.forEach((day) => {
      const date = day.date
      const weekday = getWeekdayName(
        new Date(day.date.split('/').reverse().join('-')).getDay()
      )
      const checkIn = day.checkIn ? formatTime(day.checkIn) : '--:--'
      const checkOut = day.checkOut ? formatTime(day.checkOut) : '--:--'
      const workHours = formatDuration(day.workTime)
      const otHours = formatDuration(day.overtime)
      const status = t(getStatusTranslationKey(day.status))

      csv += `${date},${weekday},${checkIn},${checkOut},${workHours},${otHours},${status}\n`
    })

    return csv
  }

  const formatTime = (date) => {
    if (!date) return '--:--'
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  }

  const getWeekdayName = (day) => {
    const weekdays = [
      t('Sunday'),
      t('Monday'),
      t('Tuesday'),
      t('Wednesday'),
      t('Thursday'),
      t('Friday'),
      t('Saturday'),
    ]
    return weekdays[day]
  }

  const getStatusTranslationKey = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'late':
        return 'Late'
      case 'earlyLeave':
        return 'Early Leave'
      case 'lateAndEarly':
        return 'Late & Early'
      case 'missingLog':
        return 'Missing Log'
      case 'leave':
        return 'Leave'
      default:
        return 'Not Updated'
    }
  }

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Header with back button */}
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
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeSelector}>
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'week' && styles.activeTimeRangeButton,
            darkMode && styles.darkTimeRangeButton,
            timeRange === 'week' &&
              darkMode &&
              styles.darkActiveTimeRangeButton,
          ]}
          onPress={() => setTimeRange('week')}
        >
          <Text
            style={[
              styles.timeRangeButtonText,
              timeRange === 'week' && styles.activeTimeRangeButtonText,
              darkMode && styles.darkText,
            ]}
          >
            {t('Tuần này')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'month' && styles.activeTimeRangeButton,
            darkMode && styles.darkTimeRangeButton,
            timeRange === 'month' &&
              darkMode &&
              styles.darkActiveTimeRangeButton,
          ]}
          onPress={() => setTimeRange('month')}
        >
          <Text
            style={[
              styles.timeRangeButtonText,
              timeRange === 'month' && styles.activeTimeRangeButtonText,
              darkMode && styles.darkText,
            ]}
          >
            {t('Tháng này')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'year' && styles.activeTimeRangeButton,
            darkMode && styles.darkTimeRangeButton,
            timeRange === 'year' &&
              darkMode &&
              styles.darkActiveTimeRangeButton,
          ]}
          onPress={() => setTimeRange('year')}
        >
          <Text
            style={[
              styles.timeRangeButtonText,
              timeRange === 'year' && styles.activeTimeRangeButtonText,
              darkMode && styles.darkText,
            ]}
          >
            {t('Năm nay')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Range */}
      <View style={styles.dateRangeContainer}>
        <Text style={[styles.dateRange, darkMode && styles.darkText]}>
          {formatDateRange()}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8a56ff" />
          <Text style={[styles.loadingText, darkMode && styles.darkText]}>
            {t('Đang tải thống kê...')}
          </Text>
        </View>
      ) : (
        <>
          {/* Tổng giờ làm */}
          <View style={[styles.statCard, darkMode && styles.darkCard]}>
            <Text style={[styles.statTitle, darkMode && styles.darkText]}>
              {t('Tổng giờ làm')}
            </Text>
            <Text style={[styles.statValue, styles.workTimeValue]}>
              {formatDuration(stats.totalWorkTime)}
            </Text>
          </View>

          {/* Tổng giờ OT */}
          <View style={[styles.statCard, darkMode && styles.darkCard]}>
            <Text style={[styles.statTitle, darkMode && styles.darkText]}>
              {t('Tổng giờ OT')}
            </Text>
            <Text style={[styles.statValue, styles.otValue]}>
              {formatDuration(stats.overtime)}
            </Text>
          </View>

          {/* Ngày làm việc */}
          <View style={[styles.statCard, darkMode && styles.darkCard]}>
            <Text style={[styles.statTitle, darkMode && styles.darkText]}>
              {t('Ngày làm việc')}
            </Text>
            <Text style={[styles.statValue, styles.workDaysValue]}>
              {Object.values(stats.statusCounts).reduce((a, b) => a + b, 0)}
            </Text>
          </View>

          {/* Phân bố trạng thái */}
          <View style={[styles.statCard, darkMode && styles.darkCard]}>
            <Text style={[styles.statTitle, darkMode && styles.darkText]}>
              {t('Phân bố trạng thái')}
            </Text>

            <View style={styles.statusGrid}>
              {/* Hoàn thành */}
              <View style={styles.statusItem}>
                <View style={[styles.statusBox, styles.completedBox]}>
                  <Text style={styles.statusBoxValue}>
                    {stats.statusCounts.completed || 0}
                  </Text>
                </View>
                <Text style={[styles.statusLabel, darkMode && styles.darkText]}>
                  {t('Hoàn thành')}
                </Text>
              </View>

              {/* Đi muộn */}
              <View style={styles.statusItem}>
                <View style={[styles.statusBox, styles.lateBox]}>
                  <Text style={styles.statusBoxValue}>
                    {stats.statusCounts.late || 0}
                  </Text>
                </View>
                <Text style={[styles.statusLabel, darkMode && styles.darkText]}>
                  {t('Đi muộn')}
                </Text>
              </View>

              {/* Về sớm */}
              <View style={styles.statusItem}>
                <View style={[styles.statusBox, styles.earlyBox]}>
                  <Text style={styles.statusBoxValue}>
                    {stats.statusCounts.earlyLeave || 0}
                  </Text>
                </View>
                <Text style={[styles.statusLabel, darkMode && styles.darkText]}>
                  {t('Về sớm')}
                </Text>
              </View>

              {/* Muộn & sớm */}
              <View style={styles.statusItem}>
                <View style={[styles.statusBox, styles.lateEarlyBox]}>
                  <Text style={styles.statusBoxValue}>
                    {stats.statusCounts.lateAndEarly || 0}
                  </Text>
                </View>
                <Text style={[styles.statusLabel, darkMode && styles.darkText]}>
                  {t('Muộn & sớm')}
                </Text>
              </View>

              {/* Thiếu log */}
              <View style={styles.statusItem}>
                <View style={[styles.statusBox, styles.missingBox]}>
                  <Text style={styles.statusBoxValue}>
                    {stats.statusCounts.missingLog || 0}
                  </Text>
                </View>
                <Text style={[styles.statusLabel, darkMode && styles.darkText]}>
                  {t('Thiếu log')}
                </Text>
              </View>

              {/* Nghỉ phép */}
              <View style={styles.statusItem}>
                <View style={[styles.statusBox, styles.leaveBox]}>
                  <Text style={styles.statusBoxValue}>
                    {stats.statusCounts.leave || 0}
                  </Text>
                </View>
                <Text style={[styles.statusLabel, darkMode && styles.darkText]}>
                  {t('Nghỉ phép')}
                </Text>
              </View>
            </View>
          </View>

          {/* Bảng chi tiết */}
          <View style={[styles.tableContainer, darkMode && styles.darkCard]}>
            <View style={styles.tableHeader}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.dayCell,
                  darkMode && styles.darkText,
                ]}
              >
                {t('Ngày')}
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.weekdayCell,
                  darkMode && styles.darkText,
                ]}
              >
                {t('Thứ')}
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.timeCell,
                  darkMode && styles.darkText,
                ]}
              >
                {t('Vào ca')}
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.timeCell,
                  darkMode && styles.darkText,
                ]}
              >
                {t('Tan ca')}
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.hoursCell,
                  darkMode && styles.darkText,
                ]}
              >
                {t('Giờ HC')}
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.otCell,
                  darkMode && styles.darkText,
                ]}
              >
                {t('OT')}
              </Text>
            </View>

            <View style={styles.tableBody}>
              {stats.dailyData.length > 0 ? (
                stats.dailyData.map((day, index) => {
                  const date = new Date(day.date.split('/').reverse().join('-'))
                  const weekday = getWeekdayName(date.getDay())

                  return (
                    <View
                      key={index}
                      style={[
                        styles.tableRow,
                        index % 2 === 0 && styles.evenRow,
                        darkMode && styles.darkRow,
                        darkMode && index % 2 === 0 && styles.darkEvenRow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tableCell,
                          styles.dayCell,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {day.date}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.weekdayCell,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {weekday}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.timeCell,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {day.checkIn ? formatTime(day.checkIn) : '--:--'}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.timeCell,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {day.checkOut ? formatTime(day.checkOut) : '--:--'}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.hoursCell,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {formatDuration(day.workTime)}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.otCell,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {formatDuration(day.overtime)}
                      </Text>
                    </View>
                  )
                })
              ) : (
                <Text style={[styles.noDataText, darkMode && styles.darkText]}>
                  {t('Không có dữ liệu trong khoảng thời gian này')}
                </Text>
              )}
            </View>
          </View>
        </>
      )}

      {/* Custom Date Range Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={customRangeModalVisible}
        onRequestClose={() => setCustomRangeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, darkMode && styles.darkModalContent]}
          >
            <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
              {t('Select Date Range')}
            </Text>

            <View style={styles.datePickerContainer}>
              <Text
                style={[styles.datePickerLabel, darkMode && styles.darkText]}
              >
                {t('Start Date')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  darkMode && styles.darkDatePickerButton,
                ]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text
                  style={[
                    styles.datePickerButtonText,
                    darkMode && styles.darkText,
                  ]}
                >
                  {formatDate(startDate)}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={darkMode ? '#fff' : '#000'}
                />
              </TouchableOpacity>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                />
              )}
            </View>

            <View style={styles.datePickerContainer}>
              <Text
                style={[styles.datePickerLabel, darkMode && styles.darkText]}
              >
                {t('End Date')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  darkMode && styles.darkDatePickerButton,
                ]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text
                  style={[
                    styles.datePickerButtonText,
                    darkMode && styles.darkText,
                  ]}
                >
                  {formatDate(endDate)}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={darkMode ? '#fff' : '#000'}
                />
              </TouchableOpacity>

              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                />
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCustomRangeModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={applyCustomDateRange}
              >
                <Text style={styles.applyButtonText}>{t('Apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exportModalVisible}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, darkMode && styles.darkModalContent]}
          >
            <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
              {t('Export Report')}
            </Text>

            {isExporting ? (
              <View style={styles.exportProgressContainer}>
                <ActivityIndicator size="large" color="#8a56ff" />
                <Text
                  style={[
                    styles.exportProgressText,
                    darkMode && styles.darkText,
                  ]}
                >
                  {t('Exporting')}... {exportProgress}%
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.exportFormatLabel,
                    darkMode && styles.darkText,
                  ]}
                >
                  {t('Select Format')}
                </Text>

                <View style={styles.exportFormatOptions}>
                  <TouchableOpacity
                    style={[
                      styles.exportFormatOption,
                      exportFormat === 'csv' && styles.selectedExportFormat,
                      darkMode && styles.darkExportFormatOption,
                      exportFormat === 'csv' &&
                        darkMode &&
                        styles.darkSelectedExportFormat,
                    ]}
                    onPress={() => setExportFormat('csv')}
                  >
                    <Text
                      style={[
                        styles.exportFormatText,
                        exportFormat === 'csv' &&
                          styles.selectedExportFormatText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      CSV
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.exportFormatOption,
                      exportFormat === 'pdf' && styles.selectedExportFormat,
                      darkMode && styles.darkExportFormatOption,
                      exportFormat === 'pdf' &&
                        darkMode &&
                        styles.darkSelectedExportFormat,
                    ]}
                    onPress={() => setExportFormat('pdf')}
                  >
                    <Text
                      style={[
                        styles.exportFormatText,
                        exportFormat === 'pdf' &&
                          styles.selectedExportFormatText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      PDF
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.exportFormatOption,
                      exportFormat === 'excel' && styles.selectedExportFormat,
                      darkMode && styles.darkExportFormatOption,
                      exportFormat === 'excel' &&
                        darkMode &&
                        styles.darkSelectedExportFormat,
                    ]}
                    onPress={() => setExportFormat('excel')}
                  >
                    <Text
                      style={[
                        styles.exportFormatText,
                        exportFormat === 'excel' &&
                          styles.selectedExportFormatText,
                        darkMode && styles.darkText,
                      ]}
                    >
                      Excel
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setExportModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.exportActionButton]}
                    onPress={exportReport}
                  >
                    <Text style={styles.exportActionButtonText}>
                      {t('Export')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  activeTimeRangeButton: {
    backgroundColor: '#8a56ff',
  },
  activeTimeRangeButtonText: {
    color: '#fff',
  },
  applyButton: {
    backgroundColor: '#8a56ff',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  completedBox: {
    backgroundColor: '#27ae60',
  },
  container: {
    backgroundColor: '#121212',
    flex: 1,
    padding: 16,
  },
  darkActiveTimeRangeButton: {
    backgroundColor: '#8a56ff',
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkDatePickerButton: {
    backgroundColor: '#2a2a2a',
  },
  darkEvenRow: {
    backgroundColor: '#1a1a1a',
  },
  darkExportFormatOption: {
    backgroundColor: '#2a2a2a',
  },
  darkModalContent: {
    backgroundColor: '#1e1e1e',
  },
  darkRow: {
    borderBottomColor: '#333',
  },
  darkSelectedExportFormat: {
    backgroundColor: '#8a56ff',
  },
  darkText: {
    color: '#fff',
  },
  darkTimeRangeButton: {
    backgroundColor: '#2a2a2a',
  },
  datePickerButton: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  datePickerButtonText: {
    color: '#333',
    fontSize: 16,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerLabel: {
    color: '#333',
    fontSize: 16,
    marginBottom: 8,
  },
  dateRange: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  dateRangeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dayCell: {
    flex: 1.5,
  },
  earlyBox: {
    backgroundColor: '#e67e22',
  },
  evenRow: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hoursCell: {
    flex: 1,
    textAlign: 'center',
  },
  lateBox: {
    backgroundColor: '#e74c3c',
  },
  lateEarlyBox: {
    backgroundColor: '#9b59b6',
  },
  leaveBox: {
    backgroundColor: '#34495e',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  missingBox: {
    backgroundColor: '#f1c40f',
  },
  modalButton: {
    borderRadius: 8,
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noDataText: {
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
    textAlign: 'center',
  },
  otCell: {
    flex: 1,
    textAlign: 'center',
  },
  otValue: {
    color: '#3498db',
    fontSize: 28,
    fontWeight: 'bold',
  },
  selectedExportFormat: {
    backgroundColor: '#8a56ff',
  },
  selectedExportFormatText: {
    color: '#fff',
  },
  statCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  statTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8a56ff',
  },
  statusBox: {
    alignItems: 'center',
    borderRadius: 8,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusBoxValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusItem: {
    marginBottom: 12,
    width: '30%',
  },
  statusLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  tableBody: {
    padding: 8,
  },
  tableCell: {
    color: '#fff',
    fontSize: 14,
  },
  tableContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  tableHeaderCell: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableRow: {
    borderBottomColor: '#333',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  timeCell: {
    flex: 1.5,
    textAlign: 'center',
  },
  timeRangeButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
  },
  timeRangeButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  timeRangeSelector: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
  },
  weekdayCell: {
    flex: 1,
  },
  workDaysValue: {
    color: '#27ae60',
    fontSize: 28,
    fontWeight: 'bold',
  },
  workTimeValue: {
    color: '#8a56ff',
    fontSize: 28,
    fontWeight: 'bold',
  },
})

export default StatisticsScreen
