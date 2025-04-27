import React, { useContext, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
// import { useTranslation } from 'react-i18next'
import { AppContext } from '../context/AppContext'
import { getWeatherIcon } from '../utils/helpers'
import weatherService from '../services/weatherService'

const WeatherWidget = ({ onPress }) => {
  const { darkMode, homeLocation, workLocation, t } = useContext(AppContext)
  const [currentWeather, setCurrentWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [weatherAlert, setWeatherAlert] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true // Để tránh cập nhật state sau khi component unmount

    const fetchWeatherData = async () => {
      try {
        if (!isMounted) return
        setLoading(true)
        // Sử dụng vị trí nhà làm vị trí chính
        const location = homeLocation || workLocation

        if (!location) {
          if (isMounted) setLoading(false)
          return
        }

        try {
          // Lấy thời tiết hiện tại
          const current = await weatherService.getCurrentWeather(
            location.latitude,
            location.longitude
          )

          if (!isMounted) return
          setCurrentWeather(current)

          try {
            // Lấy dự báo theo giờ
            const hourlyForecast = await weatherService.getHourlyForecast(
              location.latitude,
              location.longitude
            )

            if (!isMounted) return

            // Lọc dự báo để lấy 3 giờ tiếp theo (cách 1 giờ)
            if (hourlyForecast && hourlyForecast.length > 0) {
              // Lấy 3 giờ tiếp theo, cách nhau 1 giờ
              const filteredForecast = []
              let hourIndex = 0

              // Lấy giờ đầu tiên
              if (hourlyForecast[hourIndex]) {
                filteredForecast.push(hourlyForecast[hourIndex])
              }

              // Lấy giờ thứ hai (cách 1 giờ)
              hourIndex = Math.min(1, hourlyForecast.length - 1)
              if (hourlyForecast[hourIndex]) {
                filteredForecast.push(hourlyForecast[hourIndex])
              }

              // Lấy giờ thứ ba (cách 1 giờ nữa)
              hourIndex = Math.min(2, hourlyForecast.length - 1)
              if (hourlyForecast[hourIndex]) {
                filteredForecast.push(hourlyForecast[hourIndex])
              }

              setForecast(filteredForecast)
            } else {
              setForecast([])
            }

            try {
              // Lấy cảnh báo thời tiết
              const alerts = await weatherService.getWeatherAlerts(
                location.latitude,
                location.longitude
              )

              if (!isMounted) return
              setWeatherAlert(alerts && alerts.length > 0 ? alerts[0] : null)
            } catch (alertError) {
              console.error('Error fetching weather alerts:', alertError)
              // Không làm gì nếu không lấy được cảnh báo
            }
          } catch (forecastError) {
            console.error('Error fetching hourly forecast:', forecastError)
            // Vẫn tiếp tục nếu không lấy được dự báo
          }
        } catch (currentWeatherError) {
          console.error('Error fetching current weather:', currentWeatherError)
          // Không thể lấy thời tiết hiện tại, hiển thị thông báo lỗi
        }

        if (isMounted) setLoading(false)
      } catch (error) {
        console.error('Error in weather data fetching process:', error)
        if (isMounted) setLoading(false)
      }
    }

    fetchWeatherData()

    // Cleanup function để tránh memory leak
    return () => {
      isMounted = false
    }
  }, [homeLocation, workLocation])

  if (loading) {
    return (
      <View style={[styles.container, darkMode && styles.darkCard]}>
        <ActivityIndicator
          size="large"
          color={darkMode ? '#8a56ff' : '#8a56ff'}
        />
      </View>
    )
  }

  if (!homeLocation && !workLocation) {
    return (
      <TouchableOpacity
        style={[styles.container, darkMode && styles.darkCard]}
        onPress={onPress}
      >
        <View style={styles.setupPrompt}>
          <Ionicons
            name="location-outline"
            size={24}
            color={darkMode ? '#fff' : '#000'}
          />
          <Text style={[styles.setupPromptText, darkMode && styles.darkText]}>
            {t('Set up your location for weather information')}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (!currentWeather) {
    return (
      <TouchableOpacity
        style={[styles.container, darkMode && styles.darkCard]}
        onPress={onPress}
      >
        <Text style={[styles.errorText, darkMode && styles.darkText]}>
          {t('Unable to load weather data')}
        </Text>
      </TouchableOpacity>
    )
  }

  const location = homeLocation || workLocation

  // Lấy tên địa điểm từ địa chỉ đầy đủ
  let locationName = t('Current Location')
  if (location?.address) {
    // Nếu có địa chỉ đầy đủ, lấy phần tên địa điểm (thường là phần đầu tiên)
    const addressParts = location.address.split(',')
    if (addressParts.length > 0) {
      // Lấy phần đầu tiên của địa chỉ (thường là tên đường hoặc địa điểm)
      const firstPart = addressParts[0].trim()
      // Nếu phần đầu quá dài, cắt bớt
      locationName =
        firstPart.length > 25 ? firstPart.substring(0, 22) + '...' : firstPart
    } else {
      locationName = location.address
    }
  }

  return (
    <TouchableOpacity
      style={[styles.container, darkMode && styles.darkCard]}
      onPress={onPress}
    >
      {/* Dòng 1: Icon thời tiết hiện tại, Nhiệt độ hiện tại, Tên vị trí */}
      <View style={styles.currentWeatherRow}>
        <View style={styles.weatherIconContainer}>
          {getWeatherIcon(
            currentWeather.weather[0].icon,
            40,
            darkMode ? '#fff' : '#000'
          )}
        </View>
        <View style={styles.weatherInfoContainer}>
          <Text style={[styles.temperature, darkMode && styles.darkText]}>
            {Math.round(currentWeather.main.temp)}°C
          </Text>
          <Text style={[styles.location, darkMode && styles.darkSubtitle]}>
            {locationName}
          </Text>
        </View>
      </View>

      {/* Dòng 2: Mô tả ngắn gọn */}
      <Text style={[styles.description, darkMode && styles.darkText]}>
        {currentWeather.weather[0].description}
      </Text>

      {/* Dòng 3: Dự báo 3 giờ tiếp theo (cách 1 giờ) */}

      <View style={styles.forecastContainer}>
        {forecast.map((item, index) => {
          const time = new Date(item.dt * 1000)
          const hours = time.getHours()
          const minutes = time.getMinutes()
          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}`

          return (
            <View key={index} style={styles.forecastItem}>
              <Text
                style={[styles.forecastTime, darkMode && styles.darkSubtitle]}
              >
                {formattedTime}
              </Text>
              {getWeatherIcon(
                item.weather[0].icon,
                28,
                darkMode ? '#fff' : '#000'
              )}
              <Text style={[styles.forecastTemp, darkMode && styles.darkText]}>
                {Math.round(item.main.temp)}°C
              </Text>
              <Text
                style={[styles.forecastDesc, darkMode && styles.darkSubtitle]}
              >
                {item.weather[0].main}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Dòng 4: Vùng Cảnh báo Thời tiết (nếu có) */}
      {weatherAlert && (
        <View
          style={[
            styles.alertContainer,
            {
              backgroundColor:
                weatherAlert.severity === 'severe' ? '#e74c3c' : '#f39c12',
            },
          ]}
        >
          <Ionicons
            name="warning"
            size={20}
            color="#fff"
            style={styles.alertIcon}
          />
          <Text style={styles.alertText}>{weatherAlert.message}</Text>
        </View>
      )}
    </TouchableOpacity>
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
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },
  setupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  setupPromptText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    padding: 16,
  },
  currentWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  weatherIconContainer: {
    marginRight: 16,
  },
  weatherInfoContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
    textTransform: 'capitalize',
  },

  forecastContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  forecastItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
  },
  forecastTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  forecastDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  alertIcon: {
    marginRight: 8,
  },
  alertText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
})

export default WeatherWidget
