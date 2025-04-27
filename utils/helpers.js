// Format time from Date object to HH:MM format
export const formatTime = (date) => {
  if (!date) return '--:--'

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${hours}:${minutes}`
}

// Format time from Date object to HH:MM:SS format
export const formatTimeDisplay = (date) => {
  if (!date) return '--:--:--'

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// Format duration in minutes to hours and minutes
export const formatDuration = (minutes) => {
  if (!minutes) return '0h 0m'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return `${hours}h ${mins}m`
}

// Format date to DD/MM/YYYY
export const formatDate = (date) => {
  if (!date) return ''

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

// Get day of week in Vietnamese
export const getVietnameseDayOfWeek = (date) => {
  if (!date) return ''

  const days = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ]
  return days[date.getDay()]
}

// Calculate work duration between two dates in minutes
export const calculateWorkDuration = (startTime, endTime, breakMinutes = 0) => {
  if (!startTime || !endTime) return 0

  const durationMs = endTime.getTime() - startTime.getTime()
  const durationMinutes = Math.floor(durationMs / (1000 * 60))

  return Math.max(0, durationMinutes - breakMinutes)
}

// Check if a time is within a shift
export const isTimeInShift = (time, shift) => {
  if (!time || !shift) return false

  const timeHours = time.getHours()
  const timeMinutes = time.getMinutes()
  const timeString = `${timeHours.toString().padStart(2, '0')}:${timeMinutes
    .toString()
    .padStart(2, '0')}`

  // Handle overnight shifts
  if (shift.startTime > shift.endTime) {
    return timeString >= shift.startTime || timeString <= shift.endTime
  } else {
    return timeString >= shift.startTime && timeString <= shift.endTime
  }
}

// Import weather service
import { getCurrentWeather } from '../services/weatherService'

// Get current weather data
export const getWeatherData = async (lat = 21.0278, lon = 105.8342) => {
  try {
    // Mặc định là Hà Nội nếu không có tọa độ
    const weatherData = await getCurrentWeather(lat, lon)

    // Định dạng dữ liệu thời tiết để phù hợp với định dạng hiện tại
    const currentHour = new Date().getHours()

    // Tạo dữ liệu theo định dạng cũ
    const formattedData = {
      [`${currentHour}:00`]: {
        temp: `${Math.round(weatherData.main.temp)}°C`,
        iconCode: weatherData.weather[0].icon,
      },
      [`${currentHour + 1}:00`]: {
        temp: `${Math.round(weatherData.main.temp)}°C`,
        iconCode: weatherData.weather[0].icon,
      },
      [`${currentHour + 2}:00`]: {
        temp: `${Math.round(weatherData.main.temp)}°C`,
        iconCode: weatherData.weather[0].icon,
      },
    }

    return formattedData
  } catch (error) {
    console.error('Error getting weather data:', error)
    // Trả về dữ liệu mẫu nếu có lỗi
    return {
      '15:00': { temp: '28°C', iconCode: '01d' },
      '16:00': { temp: '27°C', iconCode: '02d' },
      '17:00': { temp: '26°C', iconCode: '10d' },
    }
  }
}

// Map OpenWeatherMap icon code to our icon names and render the appropriate icon
export const getWeatherIcon = (iconCode, size = 24, color = '#000') => {
  // Import React and Ionicons at the top of the file
  const React = require('react')
  const { Ionicons } = require('@expo/vector-icons')

  // Map OpenWeatherMap icon codes to Ionicons names
  const iconMap = {
    '01d': 'sunny', // clear sky day
    '01n': 'moon', // clear sky night
    '02d': 'partly-sunny', // few clouds day
    '02n': 'cloudy-night', // few clouds night
    '03d': 'cloud', // scattered clouds day
    '03n': 'cloud', // scattered clouds night
    '04d': 'cloudy', // broken clouds day
    '04n': 'cloudy', // broken clouds night
    '09d': 'rainy', // shower rain day
    '09n': 'rainy', // shower rain night
    '10d': 'rainy', // rain day
    '10n': 'rainy', // rain night
    '11d': 'thunderstorm', // thunderstorm day
    '11n': 'thunderstorm', // thunderstorm night
    '13d': 'snow', // snow day
    '13n': 'snow', // snow night
    '50d': 'water', // mist day
    '50n': 'water', // mist night
  }

  const iconName = iconMap[iconCode] || 'cloud'

  // Return the Ionicons component with the appropriate icon
  return React.createElement(Ionicons, {
    name: iconName,
    size: size,
    color: color,
  })
}

// Check if there's an extreme weather alert
export const checkExtremeWeather = async (lat = 21.0278, lon = 105.8342) => {
  try {
    const weatherData = await getCurrentWeather(lat, lon)

    // Kiểm tra điều kiện thời tiết cực đoan
    const temp = weatherData.main.temp
    const windSpeed = weatherData.wind.speed
    const weatherId = weatherData.weather[0].id

    // Các điều kiện cực đoan
    const isExtremeHeat = temp > 35
    const isExtremeCold = temp < 10
    const isStrongWind = windSpeed > 10
    const isThunderstorm = weatherId >= 200 && weatherId < 300
    const isHeavyRain =
      weatherId >= 500 &&
      weatherId < 600 &&
      weatherData.rain &&
      weatherData.rain['1h'] > 10

    if (
      isExtremeHeat ||
      isExtremeCold ||
      isStrongWind ||
      isThunderstorm ||
      isHeavyRain
    ) {
      let message = ''

      if (isExtremeHeat) {
        message = `Nhiệt độ cao bất thường (${Math.round(
          temp
        )}°C). Hãy uống nhiều nước và tránh hoạt động ngoài trời.`
      } else if (isExtremeCold) {
        message = `Nhiệt độ thấp bất thường (${Math.round(
          temp
        )}°C). Hãy mặc ấm khi ra ngoài.`
      } else if (isStrongWind) {
        message = `Gió mạnh (${Math.round(
          windSpeed
        )} m/s). Cẩn thận khi di chuyển ngoài trời.`
      } else if (isThunderstorm) {
        message = 'Có dông. Tránh các khu vực trống trải và cao.'
      } else if (isHeavyRain) {
        message = 'Mưa lớn. Cẩn thận ngập lụt và hạn chế di chuyển.'
      }

      return {
        hasAlert: true,
        message,
      }
    }

    return {
      hasAlert: false,
      message: '',
    }
  } catch (error) {
    console.error('Error checking extreme weather:', error)
    return {
      hasAlert: false,
      message: '',
    }
  }
}
