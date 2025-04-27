'use client'

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { getCurrentWeather, getWeatherForecast } from './weatherService'
import { STORAGE_KEYS } from '../config/appConfig'
import locationUtils from '../utils/location'

// Ngưỡng cảnh báo thời tiết cực đoan
const EXTREME_WEATHER_THRESHOLDS = {
  RAIN: 10, // mm/h
  HIGH_TEMP: 35, // °C
  LOW_TEMP: 10, // °C
  WIND: 10, // m/s
  SNOW: 1, // mm/h
}

// Danh sách cảnh báo đã hiển thị
let displayedAlerts = []

/**
 * Kiểm tra thời tiết cực đoan
 * @param {Object} weatherData Dữ liệu thời tiết
 * @returns {Object} Thông tin cảnh báo
 */
const checkExtremeConditions = (weatherData) => {
  if (!weatherData) return { hasAlert: false }

  const temp = weatherData.main.temp
  const windSpeed = weatherData.wind.speed
  const weatherId = weatherData.weather[0].id
  const rain = weatherData.rain ? weatherData.rain['1h'] || 0 : 0
  const snow = weatherData.snow ? weatherData.snow['1h'] || 0 : 0

  // Các điều kiện cực đoan
  const isExtremeHeat = temp > EXTREME_WEATHER_THRESHOLDS.HIGH_TEMP
  const isExtremeCold = temp < EXTREME_WEATHER_THRESHOLDS.LOW_TEMP
  const isStrongWind = windSpeed > EXTREME_WEATHER_THRESHOLDS.WIND
  const isThunderstorm = weatherId >= 200 && weatherId < 300
  const isHeavyRain = rain > EXTREME_WEATHER_THRESHOLDS.RAIN
  const isSnow = snow > EXTREME_WEATHER_THRESHOLDS.SNOW

  const conditions = []

  if (isExtremeHeat) {
    conditions.push({
      type: 'high_temp',
      severity: 'high',
      message: `Nhiệt độ cao bất thường (${Math.round(temp)}°C)`,
      suggestion: 'Hãy uống nhiều nước và tránh hoạt động ngoài trời.',
    })
  }

  if (isExtremeCold) {
    conditions.push({
      type: 'low_temp',
      severity: 'high',
      message: `Nhiệt độ thấp bất thường (${Math.round(temp)}°C)`,
      suggestion: 'Hãy mặc ấm khi ra ngoài.',
    })
  }

  if (isStrongWind) {
    conditions.push({
      type: 'wind',
      severity: 'moderate',
      message: `Gió mạnh (${Math.round(windSpeed)} m/s)`,
      suggestion: 'Cẩn thận khi di chuyển ngoài trời.',
    })
  }

  if (isThunderstorm) {
    conditions.push({
      type: 'thunderstorm',
      severity: 'high',
      message: 'Có dông',
      suggestion: 'Tránh các khu vực trống trải và cao.',
    })
  }

  if (isHeavyRain) {
    conditions.push({
      type: 'rain',
      severity: 'high',
      message: `Mưa lớn (${rain.toFixed(1)} mm/h)`,
      suggestion: 'Cẩn thận ngập lụt và hạn chế di chuyển.',
    })
  }

  if (isSnow) {
    conditions.push({
      type: 'snow',
      severity: 'moderate',
      message: `Có tuyết (${snow.toFixed(1)} mm/h)`,
      suggestion: 'Đường trơn trượt, hãy di chuyển cẩn thận.',
    })
  }

  return {
    hasAlert: conditions.length > 0,
    conditions,
    location: weatherData.name,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Lấy vị trí kiểm tra thời tiết dựa trên thời điểm và cài đặt người dùng
 * @param {string} timeType 'departure' hoặc 'return'
 * @param {Object} userSettings Cài đặt người dùng
 * @returns {Object|null} Vị trí kiểm tra hoặc null nếu không có
 */
const getCheckLocation = (timeType, userSettings) => {
  if (!userSettings || !userSettings.weatherLocation) return null

  // Kiểm tra lúc đi (quanh departureTime): Luôn sử dụng vị trí nhà
  if (timeType === 'departure') {
    return userSettings.weatherLocation.home
  }

  // Kiểm tra lúc về (quanh officeEndTime)
  if (timeType === 'return') {
    // Nếu useSingleLocation là true HOẶC chưa có vị trí công ty: Sử dụng vị trí nhà
    if (
      userSettings.weatherLocation.useSingleLocation === true ||
      !userSettings.weatherLocation.work
    ) {
      return userSettings.weatherLocation.home
    }

    // Nếu useSingleLocation là false VÀ có vị trí công ty: Sử dụng vị trí công ty
    return userSettings.weatherLocation.work
  }

  return null
}

/**
 * Kiểm tra thời tiết cực đoan cho một ca làm việc
 * @param {Object} shift Ca làm việc
 * @returns {Promise<Object>} Thông tin cảnh báo
 */
export const checkWeatherForShift = async (shift) => {
  try {
    // Lấy cài đặt người dùng
    const userSettingsJson = await AsyncStorage.getItem(
      STORAGE_KEYS.USER_SETTINGS
    )
    if (!userSettingsJson) return { hasAlert: false }

    const userSettings = JSON.parse(userSettingsJson)

    // Kiểm tra điều kiện kích hoạt
    if (
      !userSettings.weatherWarningEnabled ||
      !userSettings.weatherLocation ||
      !userSettings.weatherLocation.home
    ) {
      return { hasAlert: false }
    }

    // Lấy vị trí kiểm tra cho thời điểm đi làm
    const departureLocation = getCheckLocation('departure', userSettings)
    if (!departureLocation) return { hasAlert: false }

    // Lấy vị trí kiểm tra cho thời điểm về nhà
    const returnLocation = getCheckLocation('return', userSettings)
    if (!returnLocation) return { hasAlert: false }

    // Lấy dự báo thời tiết cho vị trí đi làm
    const departureWeather = await getCurrentWeather(
      departureLocation.lat,
      departureLocation.lon
    )

    // Lấy dự báo thời tiết cho vị trí về nhà
    const returnWeather = await getCurrentWeather(
      returnLocation.lat,
      returnLocation.lon
    )

    // Kiểm tra điều kiện cực đoan
    const departureAlert = checkExtremeConditions(departureWeather)
    const returnAlert = checkExtremeConditions(returnWeather)

    // Tổng hợp cảnh báo
    const hasAlert = departureAlert.hasAlert || returnAlert.hasAlert

    if (hasAlert) {
      const alerts = []

      if (departureAlert.hasAlert) {
        alerts.push({
          ...departureAlert,
          timeType: 'departure',
          locationName: 'nhà',
          shiftId: shift.id,
          shiftName: shift.name,
        })
      }

      if (returnAlert.hasAlert) {
        alerts.push({
          ...returnAlert,
          timeType: 'return',
          locationName: userSettings.weatherLocation.useSingleLocation
            ? 'nhà'
            : 'công ty',
          shiftId: shift.id,
          shiftName: shift.name,
        })
      }

      return {
        hasAlert,
        alerts,
        shift,
      }
    }

    return { hasAlert: false }
  } catch (error) {
    console.error('Lỗi khi kiểm tra thời tiết cho ca làm việc:', error)
    return { hasAlert: false }
  }
}

/**
 * Lên lịch kiểm tra thời tiết cho một ca làm việc
 * @param {Object} shift Ca làm việc
 */
export const scheduleWeatherCheck = async (shift) => {
  try {
    // Lấy cài đặt người dùng
    const userSettingsJson = await AsyncStorage.getItem(
      STORAGE_KEYS.USER_SETTINGS
    )
    if (!userSettingsJson) return

    const userSettings = JSON.parse(userSettingsJson)

    // Kiểm tra điều kiện kích hoạt
    if (
      !userSettings.weatherWarningEnabled ||
      !userSettings.weatherLocation ||
      !userSettings.weatherLocation.home ||
      !shift ||
      !shift.startTime
    ) {
      return
    }

    // Tính thời gian kiểm tra (1 giờ trước departureTime)
    const now = new Date()
    const [departureHours, departureMinutes] = shift.startTime
      .split(':')
      .map(Number)

    const checkTime = new Date(now)
    checkTime.setHours(departureHours - 1, departureMinutes, 0)

    // Nếu thời gian kiểm tra đã qua, đặt lịch cho ngày mai
    if (checkTime < now) {
      checkTime.setDate(checkTime.getDate() + 1)
    }

    // Lên lịch kiểm tra
    const trigger = checkTime

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Kiểm tra thời tiết',
        body: `Kiểm tra thời tiết cho ca ${shift.name}`,
        data: { type: 'weather_check', shiftId: shift.id },
      },
      trigger,
    })

    console.log(
      `Đã lên lịch kiểm tra thời tiết cho ca ${
        shift.name
      } vào ${checkTime.toLocaleString()}`
    )
  } catch (error) {
    console.error('Lỗi khi lên lịch kiểm tra thời tiết:', error)
  }
}

/**
 * Hiển thị cảnh báo thời tiết
 * @param {Object} alertData Dữ liệu cảnh báo
 */
export const showWeatherAlert = async (alertData) => {
  try {
    if (!alertData || !alertData.hasAlert) return

    // Tạo ID duy nhất cho cảnh báo
    const alertId = `${alertData.shift.id}_${new Date().toISOString()}`

    // Kiểm tra xem cảnh báo đã hiển thị chưa
    if (displayedAlerts.includes(alertId)) return

    // Thêm vào danh sách đã hiển thị
    displayedAlerts.push(alertId)

    // Giới hạn số lượng cảnh báo đã hiển thị
    if (displayedAlerts.length > 10) {
      displayedAlerts = displayedAlerts.slice(-10)
    }

    // Tạo nội dung cảnh báo
    let title = `Cảnh báo thời tiết - Ca ${alertData.shift.name}`
    let body = ''

    alertData.alerts.forEach((alert) => {
      const locationText =
        alert.timeType === 'departure'
          ? 'đi làm từ nhà'
          : `về nhà từ ${alert.locationName}`

      alert.conditions.forEach((condition) => {
        body += `${condition.message} khi ${locationText}. ${condition.suggestion}\n`
      })
    })

    // Lưu cảnh báo vào AsyncStorage
    const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.WEATHER_ALERTS)
    let alerts = alertsJson ? JSON.parse(alertsJson) : []

    alerts.push({
      id: alertId,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
      data: alertData,
    })

    // Giới hạn số lượng cảnh báo lưu trữ
    if (alerts.length > 20) {
      alerts = alerts.slice(-20)
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.WEATHER_ALERTS,
      JSON.stringify(alerts)
    )

    // Hiển thị thông báo
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'weather_alert', alertId },
      },
      trigger: null, // Hiển thị ngay lập tức
    })

    console.log('Đã hiển thị cảnh báo thời tiết:', title)

    return alertId
  } catch (error) {
    console.error('Lỗi khi hiển thị cảnh báo thời tiết:', error)
    return null
  }
}

/**
 * Đánh dấu cảnh báo đã đọc
 * @param {string} alertId ID cảnh báo
 */
export const markAlertAsRead = async (alertId) => {
  try {
    const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.WEATHER_ALERTS)
    if (!alertsJson) return

    const alerts = JSON.parse(alertsJson)
    const alertIndex = alerts.findIndex((alert) => alert.id === alertId)

    if (alertIndex !== -1) {
      alerts[alertIndex].read = true
      await AsyncStorage.setItem(
        STORAGE_KEYS.WEATHER_ALERTS,
        JSON.stringify(alerts)
      )
    }
  } catch (error) {
    console.error('Lỗi khi đánh dấu cảnh báo đã đọc:', error)
  }
}

/**
 * Lấy danh sách cảnh báo
 * @param {boolean} onlyUnread Chỉ lấy cảnh báo chưa đọc
 * @returns {Promise<Array>} Danh sách cảnh báo
 */
export const getWeatherAlerts = async (onlyUnread = false) => {
  try {
    const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.WEATHER_ALERTS)
    if (!alertsJson) return []

    const alerts = JSON.parse(alertsJson)

    if (onlyUnread) {
      return alerts.filter((alert) => !alert.read)
    }

    return alerts
  } catch (error) {
    console.error('Lỗi khi lấy danh sách cảnh báo:', error)
    return []
  }
}

/**
 * Xóa tất cả cảnh báo
 */
export const clearAllAlerts = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.WEATHER_ALERTS)
    displayedAlerts = []
  } catch (error) {
    console.error('Lỗi khi xóa tất cả cảnh báo:', error)
  }
}

export default {
  checkWeatherForShift,
  scheduleWeatherCheck,
  showWeatherAlert,
  markAlertAsRead,
  getWeatherAlerts,
  clearAllAlerts,
}
