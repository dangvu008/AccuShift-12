import React, { useContext, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
// import { useTranslation } from 'react-i18next'
import { AppContext } from '../context/AppContext'
import { getWeatherIcon, formatDate } from '../utils/helpers'
import weatherService from '../services/weatherService'

const WeatherDetailScreen = ({ navigation }) => {
  const { darkMode, homeLocation, workLocation, t } = useContext(AppContext)
  const [currentWeather, setCurrentWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [dailyForecast, setDailyForecast] = useState([])
  const [weatherAlerts, setWeatherAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('home')

  // Di chuyển hàm fetchWeatherData ra ngoài useEffect để có thể sử dụng ở nhiều nơi
  const fetchWeatherData = async (location) => {
    if (!location) return null

    try {
      setLoading(true)

      // Lấy thời tiết hiện tại
      const current = await weatherService.getCurrentWeather(
        location.latitude,
        location.longitude
      )

      // Lấy dự báo theo giờ
      const hourlyForecast = await weatherService.getHourlyForecast(
        location.latitude,
        location.longitude
      )

      // Lấy dự báo theo ngày
      const dailyForecast = await weatherService.getDailyForecast(
        location.latitude,
        location.longitude
      )

      // Lấy cảnh báo thời tiết
      const alerts = await weatherService.getWeatherAlerts(
        location.latitude,
        location.longitude
      )

      setCurrentWeather(current)
      setForecast(hourlyForecast || [])
      setDailyForecast(dailyForecast || [])
      setWeatherAlerts(alerts || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching weather data:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    // Lấy dữ liệu thời tiết dựa trên vị trí đã chọn
    const location = selectedLocation === 'home' ? homeLocation : workLocation
    fetchWeatherData(location)
  }, [homeLocation, workLocation, selectedLocation])

  const renderLocationSelector = () => {
    // Chỉ hiển thị bộ chọn vị trí nếu cả hai vị trí đều có sẵn
    if (!homeLocation || !workLocation) return null

    return (
      <View style={styles.locationSelector}>
        <TouchableOpacity
          style={[
            styles.locationButton,
            selectedLocation === 'home' && styles.selectedLocationButton,
            darkMode && styles.darkLocationButton,
            selectedLocation === 'home' &&
              darkMode &&
              styles.darkSelectedLocationButton,
          ]}
          onPress={() => setSelectedLocation('home')}
        >
          <Ionicons
            name="home"
            size={16}
            color={
              selectedLocation === 'home' ? '#fff' : darkMode ? '#fff' : '#000'
            }
          />
          <Text
            style={[
              styles.locationButtonText,
              selectedLocation === 'home' && styles.selectedLocationText,
              darkMode && styles.darkText,
            ]}
          >
            {t('Home')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.locationButton,
            selectedLocation === 'work' && styles.selectedLocationButton,
            darkMode && styles.darkLocationButton,
            selectedLocation === 'work' &&
              darkMode &&
              styles.darkSelectedLocationButton,
          ]}
          onPress={() => setSelectedLocation('work')}
        >
          <Ionicons
            name="business"
            size={16}
            color={
              selectedLocation === 'work' ? '#fff' : darkMode ? '#fff' : '#000'
            }
          />
          <Text
            style={[
              styles.locationButtonText,
              selectedLocation === 'work' && styles.selectedLocationText,
              darkMode && styles.darkText,
            ]}
          >
            {t('Work')}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, darkMode && styles.darkContainer]}>
        <ActivityIndicator
          size="large"
          color={darkMode ? '#8a56ff' : '#8a56ff'}
        />
      </View>
    )
  }

  if (!homeLocation && !workLocation) {
    return (
      <View style={[styles.container, darkMode && styles.darkContainer]}>
        <View style={styles.noLocationContainer}>
          <Ionicons
            name="location-outline"
            size={48}
            color={darkMode ? '#fff' : '#000'}
          />
          <Text style={[styles.noLocationText, darkMode && styles.darkText]}>
            {t('No location set')}
          </Text>
          <Text
            style={[styles.noLocationSubtext, darkMode && styles.darkSubtitle]}
          >
            {t(
              'Please set up your home or work location to view weather information'
            )}
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.setupButtonText}>{t('Go to Settings')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (!currentWeather) {
    return (
      <View style={[styles.container, darkMode && styles.darkContainer]}>
        <Text style={[styles.errorText, darkMode && styles.darkText]}>
          {t('Unable to load weather data')}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true)
            const location =
              selectedLocation === 'home' ? homeLocation : workLocation
            fetchWeatherData(location)
          }}
        >
          <Text style={styles.retryButtonText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const location = selectedLocation === 'home' ? homeLocation : workLocation
  const locationName = location?.address || t('Current Location')

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      {renderLocationSelector()}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Thông tin thời tiết hiện tại */}
        <View style={[styles.currentWeatherCard, darkMode && styles.darkCard]}>
          <Text style={[styles.locationName, darkMode && styles.darkText]}>
            {locationName}
          </Text>

          <View style={styles.currentWeatherMain}>
            <View style={styles.currentWeatherIcon}>
              {getWeatherIcon(
                currentWeather.weather[0].icon,
                80,
                darkMode ? '#fff' : '#000'
              )}
            </View>

            <View style={styles.currentWeatherInfo}>
              <Text
                style={[styles.currentTemperature, darkMode && styles.darkText]}
              >
                {Math.round(currentWeather.main.temp)}°C
              </Text>
              <Text
                style={[styles.weatherDescription, darkMode && styles.darkText]}
              >
                {currentWeather.weather[0].description}
              </Text>
            </View>
          </View>

          <View style={styles.weatherDetails}>
            <View style={styles.weatherDetailItem}>
              <Ionicons
                name="water-outline"
                size={20}
                color={darkMode ? '#aaa' : '#666'}
              />
              <Text
                style={[
                  styles.weatherDetailText,
                  darkMode && styles.darkSubtitle,
                ]}
              >
                {currentWeather.main.humidity}%
              </Text>
            </View>

            <View style={styles.weatherDetailItem}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color={darkMode ? '#aaa' : '#666'}
              />
              <Text
                style={[
                  styles.weatherDetailText,
                  darkMode && styles.darkSubtitle,
                ]}
              >
                {Math.round(currentWeather.main.pressure)} hPa
              </Text>
            </View>

            <View style={styles.weatherDetailItem}>
              <Ionicons
                name="compass-outline"
                size={20}
                color={darkMode ? '#aaa' : '#666'}
              />
              <Text
                style={[
                  styles.weatherDetailText,
                  darkMode && styles.darkSubtitle,
                ]}
              >
                {Math.round(currentWeather.wind.speed)} m/s
              </Text>
            </View>
          </View>
        </View>

        {/* Cảnh báo thời tiết */}
        {weatherAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
              {t('Weather Alerts')}
            </Text>

            {weatherAlerts.map((alert, index) => (
              <View
                key={index}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor:
                      alert.severity === 'severe' ? '#e74c3c' : '#f39c12',
                  },
                ]}
              >
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={24} color="#fff" />
                  <Text style={styles.alertTitle}>
                    {alert.title || t('Weather Alert')}
                  </Text>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Dự báo theo giờ */}
        <View style={styles.forecastSection}>
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
            {t('Hourly Forecast')}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hourlyForecastContainer}
          >
            {forecast.slice(0, 24).map((item, index) => {
              const time = new Date(item.dt * 1000)
              const hours = time.getHours()
              const minutes = time.getMinutes()
              const formattedTime = `${hours
                .toString()
                .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

              return (
                <View
                  key={index}
                  style={[
                    styles.hourlyForecastItem,
                    darkMode && styles.darkCard,
                  ]}
                >
                  <Text
                    style={[styles.hourlyTime, darkMode && styles.darkSubtitle]}
                  >
                    {formattedTime}
                  </Text>
                  {getWeatherIcon(
                    item.weather[0].icon,
                    36,
                    darkMode ? '#fff' : '#000'
                  )}
                  <Text
                    style={[styles.hourlyTemp, darkMode && styles.darkText]}
                  >
                    {Math.round(item.main.temp)}°C
                  </Text>
                  <Text
                    style={[
                      styles.hourlyDescription,
                      darkMode && styles.darkSubtitle,
                    ]}
                  >
                    {item.weather[0].main}
                  </Text>
                </View>
              )
            })}
          </ScrollView>
        </View>

        {/* Dự báo theo ngày */}
        {dailyForecast.length > 0 && (
          <View style={styles.forecastSection}>
            <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
              {t('Daily Forecast')}
            </Text>

            {dailyForecast.map((item, index) => {
              const date = new Date(item.dt * 1000)
              const dayName = date.toLocaleDateString(undefined, {
                weekday: 'short',
              })
              const formattedDate = formatDate(date)

              return (
                <View
                  key={index}
                  style={[
                    styles.dailyForecastItem,
                    darkMode && styles.darkCard,
                  ]}
                >
                  <View style={styles.dailyForecastDay}>
                    <Text
                      style={[styles.dailyDayName, darkMode && styles.darkText]}
                    >
                      {dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dailyDate,
                        darkMode && styles.darkSubtitle,
                      ]}
                    >
                      {formattedDate}
                    </Text>
                  </View>

                  <View style={styles.dailyForecastIcon}>
                    {getWeatherIcon(
                      item.weather[0].icon,
                      36,
                      darkMode ? '#fff' : '#000'
                    )}
                  </View>

                  <View style={styles.dailyForecastTemp}>
                    <Text
                      style={[
                        styles.dailyTempHigh,
                        darkMode && styles.darkText,
                      ]}
                    >
                      {Math.round(item.temp.max)}°
                    </Text>
                    <Text
                      style={[
                        styles.dailyTempLow,
                        darkMode && styles.darkSubtitle,
                      ]}
                    >
                      {Math.round(item.temp.min)}°
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
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
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },
  locationSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
  },
  darkLocationButton: {
    backgroundColor: '#2a2a2a',
  },
  selectedLocationButton: {
    backgroundColor: '#8a56ff',
  },
  darkSelectedLocationButton: {
    backgroundColor: '#8a56ff',
  },
  locationButtonText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#000',
  },
  selectedLocationText: {
    color: '#fff',
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noLocationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  setupButton: {
    backgroundColor: '#8a56ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
    marginTop: 24,
  },
  retryButton: {
    backgroundColor: '#8a56ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  currentWeatherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  currentWeatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentWeatherIcon: {
    marginRight: 16,
  },
  currentWeatherInfo: {
    flex: 1,
  },
  currentTemperature: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
  },
  weatherDescription: {
    fontSize: 18,
    color: '#000',
    textTransform: 'capitalize',
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  alertsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: '#fff',
  },
  forecastSection: {
    marginBottom: 16,
  },
  hourlyForecastContainer: {
    flexDirection: 'row',
  },
  hourlyForecastItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  hourlyTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  hourlyDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dailyForecastItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyForecastDay: {
    flex: 1,
  },
  dailyDayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  dailyDate: {
    fontSize: 14,
    color: '#666',
  },
  dailyForecastIcon: {
    marginHorizontal: 16,
  },
  dailyForecastTemp: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyTempHigh: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  dailyTempLow: {
    fontSize: 16,
    color: '#666',
  },
})

export default WeatherDetailScreen
