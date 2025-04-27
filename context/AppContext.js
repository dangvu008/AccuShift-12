'use client'

import { createContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import {
  getShifts,
  getCheckInHistory,
  getCurrentShift,
  getNotes,
  addNote,
  updateNote,
  deleteNote,
} from '../utils/database'
import { translations } from '../utils/translations'
import { getWeatherData, formatDate } from '../utils/helpers'
// Thêm import alarmManager
import alarmManager from '../utils/alarmManager'
import { Platform, Alert } from 'react-native'
// Thêm import location utilities
import locationUtils from '../utils/location'
// Thêm import weather alert service
import weatherAlertService from '../services/weatherAlertService'

export const AppContext = createContext()

// Multi-Function Button states
export const BUTTON_STATES = {
  GO_WORK: 'go_work',
  WAITING_CHECK_IN: 'waiting_check_in',
  CHECK_IN: 'check_in',
  WORKING: 'working',
  CHECK_OUT: 'check_out',
  READY_COMPLETE: 'ready_complete',
  COMPLETE: 'complete',
  COMPLETED: 'completed',
}

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState('vi')
  const [darkMode, setDarkMode] = useState(true)
  const [currentShift, setCurrentShift] = useState(null)
  const [checkInHistory, setCheckInHistory] = useState([])
  const [shifts, setShifts] = useState([])
  const [notes, setNotes] = useState([])
  const [weatherData, setWeatherData] = useState({})
  const [weatherAlerts, setWeatherAlerts] = useState([])
  const [notificationSound, setNotificationSound] = useState(true)
  const [notificationVibration, setNotificationVibration] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [workStartTime, setWorkStartTime] = useState(null)
  const [alarmPermissionGranted, setAlarmPermissionGranted] = useState(false)

  // Location states
  const [homeLocation, setHomeLocation] = useState(null)
  const [workLocation, setWorkLocation] = useState(null)
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false)

  // Multi-Function Button states
  const [buttonState, setButtonState] = useState(BUTTON_STATES.GO_WORK)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [onlyGoWorkMode, setOnlyGoWorkMode] = useState(false)
  const [showPunchButton, setShowPunchButton] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadSettings = async () => {
      try {
        if (!isMounted) return

        const storedLanguage = await AsyncStorage.getItem('language')
        if (storedLanguage && isMounted) setLanguage(storedLanguage)

        const storedDarkMode = await AsyncStorage.getItem('darkMode')
        if (storedDarkMode && isMounted) setDarkMode(storedDarkMode === 'true')

        const storedNotificationSound = await AsyncStorage.getItem(
          'notificationSound'
        )
        if (storedNotificationSound && isMounted)
          setNotificationSound(storedNotificationSound === 'true')

        const storedNotificationVibration = await AsyncStorage.getItem(
          'notificationVibration'
        )
        if (storedNotificationVibration && isMounted)
          setNotificationVibration(storedNotificationVibration === 'true')

        // Load Multi-Function Button settings
        const storedOnlyGoWorkMode = await AsyncStorage.getItem(
          'onlyGoWorkMode'
        )
        if (storedOnlyGoWorkMode && isMounted)
          setOnlyGoWorkMode(storedOnlyGoWorkMode === 'true')

        // Load shifts
        const loadedShifts = await getShifts()
        if (isMounted) setShifts(loadedShifts)

        // Load check-in history
        const history = await getCheckInHistory()
        if (isMounted) setCheckInHistory(history)

        // Load notes
        const loadedNotes = await getNotes()
        if (isMounted) setNotes(loadedNotes)

        // Get current shift if any
        const shift = await getCurrentShift()
        if (isMounted) {
          // Chỉ cập nhật currentShift nếu nó khác với giá trị hiện tại
          // Điều này giúp tránh vòng lặp vô hạn
          if (JSON.stringify(shift) !== JSON.stringify(currentShift)) {
            setCurrentShift(shift)
          }

          // Set showPunchButton based on current shift
          if (shift && shift.showCheckInButtonWhileWorking) {
            setShowPunchButton(true)
          }
        }

        // Check if currently working
        const workingStatus = await AsyncStorage.getItem('isWorking')
        if (workingStatus === 'true' && isMounted) {
          setIsWorking(true)
          const startTime = await AsyncStorage.getItem('workStartTime')
          if (startTime && isMounted)
            setWorkStartTime(new Date(Number.parseInt(startTime)))
        }

        try {
          // Load weather data - Bọc trong try-catch riêng để không ảnh hưởng đến các phần khác
          const weather = await getWeatherData()
          if (isMounted) setWeatherData(weather)
        } catch (weatherError) {
          console.error('Error loading weather data:', weatherError)
        }

        try {
          // Lấy cảnh báo thời tiết chưa đọc
          const unreadAlerts = await weatherAlertService.getWeatherAlerts(true)
          if (unreadAlerts && unreadAlerts.length > 0 && isMounted) {
            setWeatherAlerts(unreadAlerts)
          }
        } catch (alertError) {
          console.error('Error loading weather alerts:', alertError)
        }

        try {
          // Lên lịch kiểm tra thời tiết cho ca hiện tại
          if (shift && isMounted) {
            await weatherAlertService.scheduleWeatherCheck(shift)
          }
        } catch (scheduleError) {
          console.error('Error scheduling weather check:', scheduleError)
        }

        // Check notification permissions
        const { status } = await Notifications.getPermissionsAsync()
        if (isMounted) setAlarmPermissionGranted(status === 'granted')

        try {
          // Load saved locations
          const savedHomeLocation = await locationUtils.getHomeLocation()
          if (savedHomeLocation && isMounted) {
            setHomeLocation(savedHomeLocation)
          }

          const savedWorkLocation = await locationUtils.getWorkLocation()
          if (savedWorkLocation && isMounted) {
            setWorkLocation(savedWorkLocation)
          }

          // Check location permission
          const locationPermission =
            await Location.getForegroundPermissionsAsync()
          if (isMounted)
            setLocationPermissionGranted(
              locationPermission.status === 'granted'
            )
        } catch (locationError) {
          console.error('Error loading location data:', locationError)
        }

        // Load today's attendance logs
        const today = formatDate(new Date())
        const storedLogs = await AsyncStorage.getItem(`attendanceLogs_${today}`)
        if (storedLogs && isMounted) {
          const logs = JSON.parse(storedLogs)
          setAttendanceLogs(logs)

          // Set button state based on the last log
          if (logs.length > 0) {
            const lastLog = logs[logs.length - 1]
            switch (lastLog.type) {
              case 'go_work':
                setButtonState(BUTTON_STATES.WAITING_CHECK_IN)
                break
              case 'check_in':
                setButtonState(BUTTON_STATES.WORKING)
                break
              case 'check_out':
                setButtonState(BUTTON_STATES.READY_COMPLETE)
                break
              case 'complete':
                setButtonState(BUTTON_STATES.COMPLETED)
                break
              default:
                setButtonState(BUTTON_STATES.GO_WORK)
            }
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }

    loadSettings()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [currentShift])

  const saveSettings = async (key, value) => {
    try {
      await AsyncStorage.setItem(
        key,
        typeof value === 'boolean' ? value.toString() : value
      )
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
    saveSettings('language', lang)
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    saveSettings('darkMode', !darkMode)
  }

  const toggleNotificationSound = () => {
    setNotificationSound(!notificationSound)
    saveSettings('notificationSound', !notificationSound)
  }

  const toggleNotificationVibration = () => {
    setNotificationVibration(!notificationVibration)
    saveSettings('notificationVibration', !notificationVibration)
  }

  const toggleOnlyGoWorkMode = () => {
    setOnlyGoWorkMode(!onlyGoWorkMode)
    saveSettings('onlyGoWorkMode', !onlyGoWorkMode)
  }

  const updateCurrentShift = async (shift) => {
    setCurrentShift(shift)
    if (shift) {
      await AsyncStorage.setItem('currentShiftId', shift.id)
    } else {
      await AsyncStorage.removeItem('currentShiftId')
    }
  }

  const startWork = async () => {
    const now = new Date()
    setIsWorking(true)
    setWorkStartTime(now)
    await AsyncStorage.setItem('isWorking', 'true')
    await AsyncStorage.setItem('workStartTime', now.getTime().toString())

    // Add to check-in history
    const newCheckIn = {
      id: Date.now().toString(),
      type: 'checkIn',
      timestamp: now.getTime(),
      shiftId: currentShift ? currentShift.id : null,
    }

    const updatedHistory = [...checkInHistory, newCheckIn]
    setCheckInHistory(updatedHistory)
    await AsyncStorage.setItem('checkInHistory', JSON.stringify(updatedHistory))

    // Cancel any existing check-out reminders
    await Notifications.cancelAllScheduledNotificationsAsync()

    // Schedule check-out reminder if we have a current shift
    if (currentShift && currentShift.reminderAfter > 0) {
      const endTimeHours = Number.parseInt(currentShift.endTime.split(':')[0])
      const endTimeMinutes = Number.parseInt(currentShift.endTime.split(':')[1])

      const endTime = new Date()
      endTime.setHours(endTimeHours)
      endTime.setMinutes(endTimeMinutes)
      endTime.setSeconds(0)

      // Nếu thời gian kết thúc sớm hơn thời gian hiện tại, có thể là ca qua đêm
      if (endTime < now) {
        endTime.setDate(endTime.getDate() + 1)
      }

      // Tính thời gian nhắc nhở (trước khi kết thúc ca)
      const reminderTime = new Date(
        endTime.getTime() - currentShift.reminderAfter * 60 * 1000
      )

      if (reminderTime > now) {
        // Sử dụng alarmManager để lên lịch báo thức check-out
        await alarmManager.scheduleCheckOutAlarm(currentShift, reminderTime)
      }
    }
  }

  const endWork = async () => {
    const now = new Date()
    setIsWorking(false)
    setWorkStartTime(null)
    await AsyncStorage.setItem('isWorking', 'false')
    await AsyncStorage.removeItem('workStartTime')

    // Add to check-in history
    const newCheckOut = {
      id: Date.now().toString(),
      type: 'checkOut',
      timestamp: now.getTime(),
      shiftId: currentShift ? currentShift.id : null,
    }

    const updatedHistory = [...checkInHistory, newCheckOut]
    setCheckInHistory(updatedHistory)
    await AsyncStorage.setItem('checkInHistory', JSON.stringify(updatedHistory))

    // Cancel any scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync()

    // Hủy tất cả báo thức liên quan đến ca làm việc hiện tại
    if (currentShift) {
      await alarmManager.cancelAlarmsByPrefix(`shift_${currentShift.id}`)
    }
  }

  const completeWork = async () => {
    const now = new Date()
    setIsWorking(false)
    setWorkStartTime(null)
    await AsyncStorage.setItem('isWorking', 'false')
    await AsyncStorage.removeItem('workStartTime')

    // Add to check-in history
    const newComplete = {
      id: Date.now().toString(),
      type: 'complete',
      timestamp: now.getTime(),
      shiftId: currentShift ? currentShift.id : null,
    }

    const updatedHistory = [...checkInHistory, newComplete]
    setCheckInHistory(updatedHistory)
    await AsyncStorage.setItem('checkInHistory', JSON.stringify(updatedHistory))

    // Cancel any scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync()

    // Hủy tất cả báo thức liên quan đến ca làm việc hiện tại
    if (currentShift) {
      await alarmManager.cancelAlarmsByPrefix(`shift_${currentShift.id}`)
    }
  }

  // Multi-Function Button actions
  const handleMultiFunctionButton = async () => {
    const now = new Date()
    const today = formatDate(now)

    // Kiểm tra thời gian giữa các lần bấm nút
    const checkTimeBetweenButtonActions = (previousType, minTimeInMinutes) => {
      if (attendanceLogs.length === 0) return true

      const lastLog = attendanceLogs.find((log) => log.type === previousType)
      if (!lastLog) return true

      const lastTimestamp = new Date(lastLog.timestamp)
      const diffInMinutes =
        (now.getTime() - lastTimestamp.getTime()) / (1000 * 60)

      return diffInMinutes >= minTimeInMinutes
    }

    // Xử lý hành động nút sau khi đã kiểm tra thời gian
    const processButtonAction = async (actionType) => {
      let newLog = null
      let newState = buttonState

      switch (actionType) {
        case 'go_work':
          // Kiểm tra và lưu vị trí nhà nếu chưa có
          if (!homeLocation && locationPermissionGranted) {
            try {
              // Yêu cầu quyền vị trí nếu chưa được cấp
              if (!locationPermissionGranted) {
                const granted = await requestLocationPermission()
                if (!granted) {
                  Alert.alert(
                    t('Location Permission Required'),
                    t(
                      'AccShift needs precise location permission to determine your home location for weather alerts.'
                    ),
                    [{ text: t('OK') }]
                  )
                  return
                }
              }

              const currentLocation = await locationUtils.getCurrentLocation()
              if (currentLocation) {
                const address = await locationUtils.getAddressFromCoordinates(
                  currentLocation.latitude,
                  currentLocation.longitude
                )

                // Hiển thị hộp thoại xác nhận vị trí
                locationUtils.showLocationConfirmDialog(
                  t('Confirm Home Location'),
                  address || t('Unknown address'),
                  async () => {
                    await saveHomeLocationData(currentLocation, address)
                  }
                )
              }
            } catch (error) {
              console.error('Error getting home location:', error)
            }
          }

          newLog = {
            id: Date.now().toString(),
            type: 'go_work',
            timestamp: now.getTime(),
            shiftId: currentShift ? currentShift.id : null,
          }

          // Nếu ở chế độ "Chỉ Đi Làm", chuyển thẳng sang trạng thái COMPLETE
          if (onlyGoWorkMode) {
            newState = BUTTON_STATES.COMPLETE
          } else {
            newState = BUTTON_STATES.WAITING_CHECK_IN
          }
          break

        case 'check_in':
          // Kiểm tra và lưu vị trí công ty nếu chưa có
          if (!workLocation && locationPermissionGranted) {
            try {
              // Yêu cầu quyền vị trí nếu chưa được cấp
              if (!locationPermissionGranted) {
                const granted = await requestLocationPermission()
                if (!granted) {
                  Alert.alert(
                    t('Location Permission Required'),
                    t(
                      'AccShift needs precise location permission to determine your work location for weather alerts.'
                    ),
                    [{ text: t('OK') }]
                  )
                  return
                }
              }

              const currentLocation = await locationUtils.getCurrentLocation()
              if (currentLocation) {
                const address = await locationUtils.getAddressFromCoordinates(
                  currentLocation.latitude,
                  currentLocation.longitude
                )

                // Hiển thị hộp thoại xác nhận vị trí
                locationUtils.showLocationConfirmDialog(
                  t('Confirm Work Location'),
                  address || t('Unknown address'),
                  async () => {
                    await saveWorkLocationData(currentLocation, address)

                    // Kiểm tra các điều kiện để hỏi về việc sử dụng vị trí chung
                    if (homeLocation) {
                      // 1. Kiểm tra khoảng cách
                      const distanceCheck = checkLocationDistance()

                      // 2. Kiểm tra thời gian giữa go_work và check_in
                      const lastGoWorkLog = attendanceLogs.find(
                        (log) => log.type === 'go_work'
                      )
                      const lastCheckInLog = newLog // Log check_in hiện tại
                      const timeCheck = checkTimeBetweenEvents(
                        lastGoWorkLog,
                        lastCheckInLog
                      )

                      // 3. Kiểm tra chế độ nút
                      const modeCheck = checkMultiButtonMode()

                      // Nếu bất kỳ điều kiện nào thỏa mãn, hiển thị hộp thoại xác nhận
                      if (
                        distanceCheck.shouldAskSingleLocation ||
                        timeCheck.shouldAskSingleLocation ||
                        modeCheck.shouldAskSingleLocation
                      ) {
                        // Chọn thông báo phù hợp
                        let message = ''
                        if (distanceCheck.shouldAskSingleLocation) {
                          message = distanceCheck.message
                        } else if (timeCheck.shouldAskSingleLocation) {
                          message = timeCheck.message
                        } else {
                          message = modeCheck.message
                        }

                        // Hiển thị hộp thoại xác nhận
                        locationUtils.showUseSingleLocationDialog(
                          message,
                          async () => {
                            // Người dùng chọn "Dùng chung"
                            await locationUtils.updateUseSingleLocation(true)
                          },
                          async () => {
                            // Người dùng chọn "Dùng riêng"
                            await locationUtils.updateUseSingleLocation(false)
                          }
                        )
                      } else if (distanceCheck.hasWarning) {
                        // Hiển thị cảnh báo khoảng cách nếu có
                        Alert.alert(
                          t('Distance Warning'),
                          distanceCheck.message,
                          [{ text: t('OK') }]
                        )
                      }
                    }
                  }
                )
              }
            } catch (error) {
              console.error('Error getting work location:', error)
            }
          }

          newLog = {
            id: Date.now().toString(),
            type: 'check_in',
            timestamp: now.getTime(),
            shiftId: currentShift ? currentShift.id : null,
          }
          newState = BUTTON_STATES.WORKING
          setIsWorking(true)
          setWorkStartTime(now)
          await AsyncStorage.setItem('isWorking', 'true')
          await AsyncStorage.setItem('workStartTime', now.getTime().toString())
          break

        case 'check_out':
          newLog = {
            id: Date.now().toString(),
            type: 'check_out',
            timestamp: now.getTime(),
            shiftId: currentShift ? currentShift.id : null,
          }
          newState = BUTTON_STATES.READY_COMPLETE
          setIsWorking(false)
          setWorkStartTime(null)
          await AsyncStorage.setItem('isWorking', 'false')
          await AsyncStorage.removeItem('workStartTime')
          break

        case 'complete':
          newLog = {
            id: Date.now().toString(),
            type: 'complete',
            timestamp: now.getTime(),
            shiftId: currentShift ? currentShift.id : null,
          }
          newState = BUTTON_STATES.COMPLETED
          break
      }

      if (newLog) {
        // Add to attendance logs
        let updatedLogs

        // Nếu ở chế độ "Chỉ Đi Làm" và đang bấm nút "Đi Làm", xóa các log check_in và check_out nếu có
        if (onlyGoWorkMode && actionType === 'go_work') {
          const filteredLogs = attendanceLogs.filter(
            (log) => log.type !== 'check_in' && log.type !== 'check_out'
          )
          updatedLogs = [...filteredLogs, newLog]
        } else {
          updatedLogs = [...attendanceLogs, newLog]
        }

        setAttendanceLogs(updatedLogs)
        await AsyncStorage.setItem(
          `attendanceLogs_${today}`,
          JSON.stringify(updatedLogs)
        )

        // Update button state
        setButtonState(newState)
      }
    }

    // Xử lý các trạng thái nút
    switch (buttonState) {
      case BUTTON_STATES.GO_WORK:
        // Không cần kiểm tra thời gian cho hành động đầu tiên
        await processButtonAction('go_work')
        break

      case BUTTON_STATES.WAITING_CHECK_IN:
      case BUTTON_STATES.CHECK_IN:
        // Kiểm tra thời gian giữa go_work và check_in (tối thiểu 5 phút)
        if (checkTimeBetweenButtonActions('go_work', 5)) {
          await processButtonAction('check_in')
        } else {
          // Hiển thị hộp thoại xác nhận nếu thời gian không đủ
          Alert.alert(
            t('Confirmation Required'),
            t(
              'Are you sure you want to check in? It\'s been less than 5 minutes since you pressed "Go Work".'
            ),
            [
              {
                text: t('Cancel'),
                style: 'cancel',
              },
              {
                text: t('Continue'),
                onPress: async () => await processButtonAction('check_in'),
              },
            ]
          )
        }
        break

      case BUTTON_STATES.WORKING:
      case BUTTON_STATES.CHECK_OUT:
        // Kiểm tra thời gian giữa check_in và check_out (tối thiểu 2 giờ = 120 phút)
        if (checkTimeBetweenButtonActions('check_in', 120)) {
          await processButtonAction('check_out')
        } else {
          // Hiển thị hộp thoại xác nhận nếu thời gian không đủ
          Alert.alert(
            t('Confirmation Required'),
            t(
              "Are you sure you want to check out? It's been less than 2 hours since you checked in."
            ),
            [
              {
                text: t('Cancel'),
                style: 'cancel',
              },
              {
                text: t('Continue'),
                onPress: async () => await processButtonAction('check_out'),
              },
            ]
          )
        }
        break

      case BUTTON_STATES.READY_COMPLETE:
      case BUTTON_STATES.COMPLETE:
        // Không cần kiểm tra thời gian cho hành động hoàn tất
        await processButtonAction('complete')
        break

      default:
        return // Do nothing for COMPLETED state
    }
  }

  const handlePunchButton = async () => {
    const now = new Date()
    const today = formatDate(now)

    const newLog = {
      id: Date.now().toString(),
      type: 'punch',
      timestamp: now.getTime(),
      shiftId: currentShift ? currentShift.id : null,
    }

    // Add to attendance logs
    const updatedLogs = [...attendanceLogs, newLog]
    setAttendanceLogs(updatedLogs)
    await AsyncStorage.setItem(
      `attendanceLogs_${today}`,
      JSON.stringify(updatedLogs)
    )
  }

  const resetAttendanceLogs = async () => {
    // Hiển thị hộp thoại xác nhận trước khi thực hiện reset
    Alert.alert(
      t('Reset Confirmation'),
      t(
        'Are you sure you want to reset your work status for today? This will clear all attendance logs for today.'
      ),
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Reset'),
          style: 'destructive',
          onPress: async () => {
            const today = formatDate(new Date())

            // Clear attendance logs for today
            setAttendanceLogs([])
            await AsyncStorage.removeItem(`attendanceLogs_${today}`)

            // Reset button state
            setButtonState(BUTTON_STATES.GO_WORK)

            // Reset working status
            setIsWorking(false)
            setWorkStartTime(null)
            await AsyncStorage.setItem('isWorking', 'false')
            await AsyncStorage.removeItem('workStartTime')

            // Cancel any scheduled notifications
            await Notifications.cancelAllScheduledNotificationsAsync()

            // Reschedule notifications if needed
            if (currentShift) {
              // Kích hoạt lại các nhắc nhở trong ngày
              try {
                if (currentShift.reminderAfter > 0) {
                  const now = new Date()
                  const endTimeHours = Number.parseInt(
                    currentShift.endTime.split(':')[0]
                  )
                  const endTimeMinutes = Number.parseInt(
                    currentShift.endTime.split(':')[1]
                  )

                  const endTime = new Date()
                  endTime.setHours(endTimeHours)
                  endTime.setMinutes(endTimeMinutes)
                  endTime.setSeconds(0)

                  // Nếu thời gian kết thúc sớm hơn thời gian hiện tại, có thể là ca qua đêm
                  if (endTime < now) {
                    endTime.setDate(endTime.getDate() + 1)
                  }

                  // Tính thời gian nhắc nhở (trước khi kết thúc ca)
                  const reminderTime = new Date(
                    endTime.getTime() - currentShift.reminderAfter * 60 * 1000
                  )

                  if (reminderTime > now) {
                    // Lên lịch lại các báo thức
                    await weatherAlertService.scheduleWeatherCheck(currentShift)
                  }
                }
              } catch (error) {
                console.error('Error rescheduling notifications:', error)
              }
            }
          },
        },
      ]
    )
  }

  const requestAlarmPermission = async () => {
    // Yêu cầu quyền thông báo thông qua alarmManager
    const granted = await alarmManager.requestPermissions()
    setAlarmPermissionGranted(granted)

    // Nếu được cấp quyền và đang ở Android, yêu cầu tắt tối ưu hóa pin
    if (granted && Platform.OS === 'android') {
      await alarmManager.requestDisableBatteryOptimization()
    }

    return granted
  }

  // Hàm yêu cầu quyền truy cập vị trí
  const requestLocationPermission = async () => {
    try {
      // Yêu cầu quyền truy cập vị trí chính xác
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status === 'granted') {
        // Nếu được cấp quyền, yêu cầu quyền vị trí chính xác
        const accuracyStatus = await Location.requestPermissionsAsync()
        setLocationPermissionGranted(accuracyStatus.status === 'granted')
        return accuracyStatus.status === 'granted'
      } else {
        setLocationPermissionGranted(false)
        return false
      }
    } catch (error) {
      console.error('Error requesting location permission:', error)
      setLocationPermissionGranted(false)
      return false
    }
  }

  // Hàm lưu vị trí nhà
  const saveHomeLocationData = async (location, address) => {
    const success = await locationUtils.saveHomeLocation(location, address)
    if (success) {
      const locationData = {
        name: 'Home',
        address: address || '',
        latitude: location.latitude,
        longitude: location.longitude,
      }
      setHomeLocation(locationData)
    }
    return success
  }

  // Hàm lưu vị trí công ty
  const saveWorkLocationData = async (location, address) => {
    const success = await locationUtils.saveWorkLocation(location, address)
    if (success) {
      const locationData = {
        name: 'Work',
        address: address || '',
        latitude: location.latitude,
        longitude: location.longitude,
      }
      setWorkLocation(locationData)
    }
    return success
  }

  // Hàm kiểm tra và cảnh báo khoảng cách
  const checkLocationDistance = () => {
    if (homeLocation && workLocation) {
      const distance = locationUtils.calculateDistance(
        homeLocation,
        workLocation
      )

      // Nếu khoảng cách <= 20km, hỏi người dùng có muốn sử dụng chung vị trí không
      if (distance <= 20) {
        return {
          hasWarning: false,
          shouldAskSingleLocation: true,
          distance: distance.toFixed(1),
          message: t(
            'Vị trí nhà và công ty của bạn khá gần nhau (khoảng cách ${distance} km). Bạn có muốn sử dụng chung một vị trí (vị trí nhà) cho tất cả cảnh báo thời tiết không?'
          ),
        }
      } else if (distance > 20) {
        return {
          hasWarning: true,
          shouldAskSingleLocation: false,
          distance: distance.toFixed(1),
          message: t(
            'Khoảng cách giữa nhà và công ty của bạn là ${distance} km. Hệ thống sẽ sử dụng hai vị trí riêng biệt cho cảnh báo thời tiết.'
          ),
        }
      }
    }
    return { hasWarning: false, shouldAskSingleLocation: false }
  }

  // Hàm kiểm tra thời gian giữa hai sự kiện
  const checkTimeBetweenEvents = (goWorkLog, checkInLog) => {
    if (goWorkLog && checkInLog) {
      const timeDiff = locationUtils.getTimeBetweenEvents(
        goWorkLog.timestamp,
        checkInLog.timestamp
      )

      // Nếu thời gian giữa hai sự kiện < 60 giây, hỏi người dùng có muốn sử dụng chung vị trí không
      if (timeDiff < 60) {
        return {
          shouldAskSingleLocation: true,
          timeDiff,
          message: t(
            'Bạn bấm nút đi làm và chấm công vào rất nhanh (${timeDiff.toFixed(0)} giây). Bạn có muốn sử dụng chung một vị trí (vị trí nhà) cho tất cả cảnh báo thời tiết không?'
          ),
        }
      }
    }
    return { shouldAskSingleLocation: false }
  }

  // Hàm kiểm tra chế độ nút đa năng
  const checkMultiButtonMode = () => {
    if (onlyGoWorkMode) {
      return {
        shouldAskSingleLocation: true,
        message: t(
          'Bạn đang sử dụng chế độ nút đơn giản. Bạn có muốn sử dụng chung một vị trí (vị trí nhà) cho tất cả cảnh báo thời tiết không?'
        ),
      }
    }
    return { shouldAskSingleLocation: false }
  }

  const t = (key) => {
    return translations[language][key] || key
  }

  const addNoteWithReminder = async (noteData) => {
    try {
      // Thêm ghi chú vào cơ sở dữ liệu
      const newNote = await addNote(noteData)

      if (newNote && newNote.reminderTime) {
        // Xử lý thời gian nhắc nhở
        const [hours, minutes] = newNote.reminderTime.split(':').map(Number)

        // Nếu ghi chú liên kết với ca làm việc
        if (newNote.linkedShifts && newNote.linkedShifts.length > 0) {
          for (const shiftId of newNote.linkedShifts) {
            const shift = shifts.find((s) => s.id === shiftId)
            if (!shift) continue

            // Lên lịch nhắc nhở cho các ngày áp dụng của ca
            for (const day of shift.daysApplied) {
              const dayOfWeek = getDayOfWeek(day) // Hàm chuyển đổi T2->2, T3->3, ...
              if (dayOfWeek) {
                const now = new Date()
                const reminderTime = new Date()
                reminderTime.setHours(hours, minutes, 0, 0)

                await alarmManager.scheduleAlarm({
                  title: newNote.title || t('Note Reminder'),
                  body: newNote.content || '',
                  scheduledTime: reminderTime,
                  type: 'note',
                  id: `note_${newNote.id}_${day}`,
                  data: { noteId: newNote.id, shiftId },
                  repeats: true,
                  weekday: dayOfWeek,
                })
              }
            }
          }
        }
        // Nếu ghi chú sử dụng ngày tùy chỉnh
        else if (newNote.reminderDays && newNote.reminderDays.length > 0) {
          for (const day of newNote.reminderDays) {
            const dayOfWeek = getDayOfWeek(day)
            if (dayOfWeek) {
              const now = new Date()
              const reminderTime = new Date()
              reminderTime.setHours(hours, minutes, 0, 0)

              await alarmManager.scheduleAlarm({
                title: newNote.title || t('Note Reminder'),
                body: newNote.content || '',
                scheduledTime: reminderTime,
                type: 'note',
                id: `note_${newNote.id}_${day}`,
                data: { noteId: newNote.id },
                repeats: true,
                weekday: dayOfWeek,
              })
            }
          }
        }
      }

      // Cập nhật danh sách ghi chú
      const updatedNotes = await getNotes()
      setNotes(updatedNotes)

      return newNote
    } catch (error) {
      console.error('Error adding note with reminder:', error)
      return null
    }
  }

  const updateNoteWithReminder = async (updatedNote) => {
    try {
      // Cập nhật ghi chú trong cơ sở dữ liệu
      const result = await updateNote(updatedNote)

      // Hủy tất cả báo thức cũ
      await alarmManager.cancelAlarmsByPrefix(`note_${updatedNote.id}`)

      if (result && updatedNote.reminderTime) {
        // Xử lý thời gian nhắc nhở
        const [hours, minutes] = updatedNote.reminderTime.split(':').map(Number)

        // Nếu ghi chú liên kết với ca làm việc
        if (updatedNote.linkedShifts && updatedNote.linkedShifts.length > 0) {
          for (const shiftId of updatedNote.linkedShifts) {
            const shift = shifts.find((s) => s.id === shiftId)
            if (!shift) continue

            // Lên lịch nhắc nhở cho các ngày áp dụng của ca
            for (const day of shift.daysApplied) {
              const dayOfWeek = getDayOfWeek(day) // Hàm chuyển đổi T2->2, T3->3, ...
              if (dayOfWeek) {
                const now = new Date()
                const reminderTime = new Date()
                reminderTime.setHours(hours, minutes, 0, 0)

                await alarmManager.scheduleAlarm({
                  title: updatedNote.title || t('Note Reminder'),
                  body: updatedNote.content || '',
                  scheduledTime: reminderTime,
                  type: 'note',
                  id: `note_${updatedNote.id}_${day}`,
                  data: { noteId: updatedNote.id, shiftId },
                  repeats: true,
                  weekday: dayOfWeek,
                })
              }
            }
          }
        }
        // Nếu ghi chú sử dụng ngày tùy chỉnh
        else if (
          updatedNote.reminderDays &&
          updatedNote.reminderDays.length > 0
        ) {
          for (const day of updatedNote.reminderDays) {
            const dayOfWeek = getDayOfWeek(day)
            if (dayOfWeek) {
              const now = new Date()
              const reminderTime = new Date()
              reminderTime.setHours(hours, minutes, 0, 0)

              await alarmManager.scheduleAlarm({
                title: updatedNote.title || t('Note Reminder'),
                body: updatedNote.content || '',
                scheduledTime: reminderTime,
                type: 'note',
                id: `note_${updatedNote.id}_${day}`,
                data: { noteId: updatedNote.id },
                repeats: true,
                weekday: dayOfWeek,
              })
            }
          }
        }
      }

      // Cập nhật danh sách ghi chú
      const updatedNotes = await getNotes()
      setNotes(updatedNotes)

      return result
    } catch (error) {
      console.error('Error updating note with reminder:', error)
      return null
    }
  }

  const deleteNoteWithReminder = async (noteId) => {
    try {
      // Xóa ghi chú khỏi cơ sở dữ liệu
      const success = await deleteNote(noteId)

      // Hủy tất cả báo thức liên quan
      await alarmManager.cancelAlarmsByPrefix(`note_${noteId}`)

      if (success) {
        // Cập nhật danh sách ghi chú
        const updatedNotes = await getNotes()
        setNotes(updatedNotes)
      }

      return success
    } catch (error) {
      console.error('Error deleting note with reminder:', error)
      return false
    }
  }

  // Hàm trợ giúp chuyển đổi ngày trong tuần
  function getDayOfWeek(day) {
    const dayMap = { CN: 1, T2: 2, T3: 3, T4: 4, T5: 5, T6: 6, T7: 7 }
    return dayMap[day]
  }

  return (
    <AppContext.Provider
      value={{
        language,
        darkMode,
        currentShift,
        checkInHistory,
        shifts,
        notes,
        weatherData,
        weatherAlerts,
        notificationSound,
        notificationVibration,
        isWorking,
        workStartTime,
        alarmPermissionGranted,
        // Location states
        homeLocation,
        workLocation,
        locationPermissionGranted,
        // Multi-Function Button states
        buttonState,
        attendanceLogs,
        onlyGoWorkMode,
        showPunchButton,
        t,
        changeLanguage,
        toggleDarkMode,
        toggleNotificationSound,
        toggleNotificationVibration,
        toggleOnlyGoWorkMode,
        startWork,
        endWork,
        completeWork,
        setCurrentShift: updateCurrentShift,
        setShifts,
        setNotes,
        requestAlarmPermission,
        // Location functions
        requestLocationPermission,
        saveHomeLocationData,
        saveWorkLocationData,
        checkLocationDistance,
        // Multi-Function Button actions
        handleMultiFunctionButton,
        handlePunchButton,
        resetAttendanceLogs,
        addNoteWithReminder,
        updateNoteWithReminder,
        deleteNoteWithReminder,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
