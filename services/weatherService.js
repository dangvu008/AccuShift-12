import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureStore, secureRetrieve, maskString } from '../utils/security'
import { API_CONFIG, STORAGE_KEYS } from '../config/appConfig'

// Danh sách API keys
// LƯU Ý: API key chỉ có thể được thay đổi bởi dev thông qua code.
// Người dùng không có quyền thay đổi API key thông qua giao diện.
const API_KEYS = [
  {
    key: 'db077a0c565a5ff3e7a3ca8ff9623575',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: '33b47107af3d15baccd58ff918b6e8e9',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: '949aa0ee4adae3c3fcec31fc01a7fd05',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: '47dc407065ba8fda36983034776b8176',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: 'c1b419e1da6cd8f8f207fe5b7a49d8bb',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: 'ce0efa4bc47ef30427d778f40b05ebf7',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: 'b5be947361e1541457fa2e8bda0c27fd',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: 'd53d270911d2c0f515869c0fe38c5f6f',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: 'ecedca1f66c870e9bff73d2c1da6c2fb',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  {
    key: '1c0952d5a7ca5cf28189ecf9f0d0483a',
    type: 'free',
    priority: 10,
    enabled: true,
  },
  // Dự phòng cho key trả phí trong tương lai
  {
    key: 'your_future_paid_key',
    type: 'paid',
    priority: 1, // Ưu tiên cao nhất
    enabled: false, // Chưa kích hoạt
  },
]

// Theo dõi sử dụng key
const keyUsageCounter = {}
let lastKeyIndex = -1

// Khởi tạo bộ đếm sử dụng key
API_KEYS.forEach((keyObj) => {
  keyUsageCounter[keyObj.key] = {
    count: 0,
    lastReset: Date.now(),
  }
})

// Reset bộ đếm định kỳ
setInterval(() => {
  Object.keys(keyUsageCounter).forEach((key) => {
    keyUsageCounter[key] = {
      count: 0,
      lastReset: Date.now(),
    }
  })
}, API_CONFIG.KEY_USAGE_RESET_INTERVAL)

/**
 * Chọn API key phù hợp
 * @returns {string|null} API key hoặc null nếu không có key khả dụng
 */
const selectApiKey = () => {
  // Lọc các key đang bật
  const enabledKeys = API_KEYS.filter((keyObj) => keyObj.enabled)
  if (enabledKeys.length === 0) return null

  // Sắp xếp theo ưu tiên (số nhỏ = ưu tiên cao)
  const sortedKeys = [...enabledKeys].sort((a, b) => a.priority - b.priority)

  // Lấy các key có ưu tiên cao nhất
  const highestPriority = sortedKeys[0].priority
  const highestPriorityKeys = sortedKeys.filter(
    (keyObj) => keyObj.priority === highestPriority
  )

  // Chọn key theo round-robin trong nhóm ưu tiên cao nhất
  lastKeyIndex = (lastKeyIndex + 1) % highestPriorityKeys.length
  const selectedKeyObj = highestPriorityKeys[lastKeyIndex]

  // Kiểm tra giới hạn sử dụng
  if (
    keyUsageCounter[selectedKeyObj.key].count >=
    API_CONFIG.KEY_USAGE_LIMIT_PER_MINUTE
  ) {
    // Key này đã đạt giới hạn, thử key khác
    const remainingKeys = highestPriorityKeys.filter(
      (keyObj) =>
        keyUsageCounter[keyObj.key].count <
        API_CONFIG.KEY_USAGE_LIMIT_PER_MINUTE
    )

    if (remainingKeys.length === 0) {
      // Tất cả key ưu tiên cao đều đạt giới hạn, thử key ưu tiên thấp hơn
      const lowerPriorityKeys = sortedKeys.filter(
        (keyObj) => keyObj.priority > highestPriority
      )
      if (lowerPriorityKeys.length === 0) return null

      return selectApiKey() // Đệ quy để tìm key ưu tiên thấp hơn
    }

    // Chọn key đầu tiên trong danh sách còn lại
    const alternativeKeyObj = remainingKeys[0]
    keyUsageCounter[alternativeKeyObj.key].count++
    return alternativeKeyObj.key
  }

  // Tăng bộ đếm sử dụng
  keyUsageCounter[selectedKeyObj.key].count++
  return selectedKeyObj.key
}

/**
 * Đánh dấu key bị lỗi
 * @param {string} key API key bị lỗi
 * @param {boolean} disable Có vô hiệu hóa key không
 */
const markKeyError = (key, disable = false) => {
  const keyIndex = API_KEYS.findIndex((keyObj) => keyObj.key === key)
  if (keyIndex !== -1) {
    if (disable) {
      API_KEYS[keyIndex].enabled = false
      console.warn(`API key ${maskString(key, 3)}... đã bị vô hiệu hóa do lỗi`)
    } else {
      // Tăng bộ đếm lên max để tạm thời không dùng key này
      keyUsageCounter[key].count = API_CONFIG.KEY_USAGE_LIMIT_PER_MINUTE
      console.warn(
        `API key ${maskString(key, 3)}... tạm thời không được sử dụng`
      )
    }
  }
}

/**
 * Tạo cache key từ tham số
 * @param {string} endpoint Endpoint API
 * @param {Object} params Tham số
 * @returns {string} Cache key
 */
const createCacheKey = (endpoint, params) => {
  // Làm tròn tọa độ để tăng tỷ lệ cache hit
  if (params.lat && params.lon) {
    params.lat = Math.round(params.lat * 100) / 100
    params.lon = Math.round(params.lon * 100) / 100
  }

  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return `weather_cache_${endpoint}_${sortedParams}`
}

/**
 * Lấy dữ liệu từ cache
 * @param {string} cacheKey Cache key
 * @returns {Promise<Object|null>} Dữ liệu cache hoặc null nếu không có/hết hạn
 */
const getFromCache = async (cacheKey) => {
  try {
    const cachedData = await AsyncStorage.getItem(cacheKey)
    if (!cachedData) return null

    const { data, timestamp } = JSON.parse(cachedData)
    const now = Date.now()

    // Kiểm tra hết hạn
    if (now - timestamp > API_CONFIG.CACHE_TTL) {
      // Cache đã hết hạn
      return null
    }

    return data
  } catch (error) {
    console.error('Lỗi khi đọc cache:', error)
    return null
  }
}

/**
 * Lưu dữ liệu vào cache
 * @param {string} cacheKey Cache key
 * @param {Object} data Dữ liệu cần lưu
 */
const saveToCache = async (cacheKey, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    }
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Lỗi khi lưu cache:', error)
  }
}

/**
 * Gọi API thời tiết với xử lý lỗi và cache
 * @param {string} endpoint Endpoint API (ví dụ: "weather", "forecast")
 * @param {Object} params Tham số
 * @param {number} retryCount Số lần thử lại (mặc định: 3)
 * @returns {Promise<Object>} Dữ liệu thời tiết
 */
export const fetchWeatherData = async (endpoint, params, retryCount = 3) => {
  // Tạo cache key
  const cacheKey = createCacheKey(endpoint, params)

  // Kiểm tra cache
  const cachedData = await getFromCache(cacheKey)
  if (cachedData) {
    console.log('Sử dụng dữ liệu cache cho:', endpoint)
    return cachedData
  }

  // Không có cache, gọi API
  const apiKey = selectApiKey()
  if (!apiKey) {
    throw new Error('Không có API key khả dụng. Vui lòng thử lại sau.')
  }

  try {
    const url = `${
      API_CONFIG.WEATHER_BASE_URL
    }/${endpoint}?${new URLSearchParams({
      ...params,
      appid: apiKey,
      units: 'metric',
      lang: 'vi',
    }).toString()}`

    const response = await fetch(url)

    if (!response.ok) {
      // Xử lý lỗi HTTP
      if (response.status === 401 || response.status === 403) {
        // Key không hợp lệ hoặc bị khóa
        markKeyError(apiKey, true)
        if (retryCount > 0) {
          return fetchWeatherData(endpoint, params, retryCount - 1)
        }
        throw new Error('API key không hợp lệ hoặc bị khóa.')
      } else if (response.status === 429) {
        // Rate limit
        markKeyError(apiKey, false)
        if (retryCount > 0) {
          return fetchWeatherData(endpoint, params, retryCount - 1)
        }
        throw new Error('Đã vượt quá giới hạn gọi API. Vui lòng thử lại sau.')
      } else {
        throw new Error(`Lỗi API: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()

    // Lưu vào cache
    await saveToCache(cacheKey, data)

    return data
  } catch (error) {
    if (error.message.includes('Network request failed') && retryCount > 0) {
      // Lỗi mạng, thử lại
      return fetchWeatherData(endpoint, params, retryCount - 1)
    }
    throw error
  }
}

/**
 * Lấy dữ liệu thời tiết hiện tại
 * @param {number} lat Vĩ độ
 * @param {number} lon Kinh độ
 * @returns {Promise<Object>} Dữ liệu thời tiết hiện tại
 */
export const getCurrentWeather = async (
  lat = API_CONFIG.DEFAULT_LOCATION.lat,
  lon = API_CONFIG.DEFAULT_LOCATION.lon
) => {
  return fetchWeatherData('weather', { lat, lon })
}

/**
 * Lấy dự báo thời tiết
 * @param {number} lat Vĩ độ
 * @param {number} lon Kinh độ
 * @returns {Promise<Object>} Dữ liệu dự báo thời tiết
 */
export const getWeatherForecast = async (
  lat = API_CONFIG.DEFAULT_LOCATION.lat,
  lon = API_CONFIG.DEFAULT_LOCATION.lon
) => {
  return fetchWeatherData('forecast', { lat, lon })
}

/**
 * Xóa tất cả cache thời tiết
 */
export const clearWeatherCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const weatherCacheKeys = keys.filter((key) =>
      key.startsWith('weather_cache_')
    )
    if (weatherCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(weatherCacheKeys)
      console.log(`Đã xóa ${weatherCacheKeys.length} cache thời tiết`)
    }
  } catch (error) {
    console.error('Lỗi khi xóa cache thời tiết:', error)
  }
}

/**
 * Thêm API key mới
 * @param {string} key API key
 * @param {string} type Loại key ("free" hoặc "paid")
 * @param {number} priority Ưu tiên (số nhỏ = ưu tiên cao)
 */
export const addApiKey = async (key, type = 'free', priority = 10) => {
  // Kiểm tra key đã tồn tại chưa
  const existingKeyIndex = API_KEYS.findIndex((keyObj) => keyObj.key === key)
  if (existingKeyIndex !== -1) {
    // Cập nhật key hiện có
    API_KEYS[existingKeyIndex] = {
      ...API_KEYS[existingKeyIndex],
      type,
      priority,
      enabled: true,
    }
  } else {
    // Thêm key mới
    API_KEYS.push({
      key,
      type,
      priority,
      enabled: true,
    })
  }

  // Khởi tạo bộ đếm cho key mới
  if (!keyUsageCounter[key]) {
    keyUsageCounter[key] = {
      count: 0,
      lastReset: Date.now(),
    }
  }

  // Lưu danh sách key vào AsyncStorage (đã mã hóa)
  try {
    await secureStore(STORAGE_KEYS.WEATHER_API_KEYS, API_KEYS)
    return true
  } catch (error) {
    console.error('Lỗi khi lưu API keys:', error)
    return false
  }
}

/**
 * Xóa API key
 * @param {string} key API key cần xóa
 */
export const removeApiKey = async (key) => {
  const keyIndex = API_KEYS.findIndex((keyObj) => keyObj.key === key)
  if (keyIndex !== -1) {
    API_KEYS.splice(keyIndex, 1)
    delete keyUsageCounter[key]

    // Lưu danh sách key vào AsyncStorage (đã mã hóa)
    try {
      await secureStore(STORAGE_KEYS.WEATHER_API_KEYS, API_KEYS)
      return true
    } catch (error) {
      console.error('Lỗi khi lưu API keys:', error)
      return false
    }
  }
  return false
}

/**
 * Kích hoạt/vô hiệu hóa API key
 * @param {string} key API key
 * @param {boolean} enabled Trạng thái kích hoạt
 */
export const toggleApiKey = async (key, enabled) => {
  const keyIndex = API_KEYS.findIndex((keyObj) => keyObj.key === key)
  if (keyIndex !== -1) {
    API_KEYS[keyIndex].enabled = enabled

    // Lưu danh sách key vào AsyncStorage (đã mã hóa)
    try {
      await secureStore(STORAGE_KEYS.WEATHER_API_KEYS, API_KEYS)
      return true
    } catch (error) {
      console.error('Lỗi khi lưu API keys:', error)
      return false
    }
  }
  return false
}

/**
 * Lấy danh sách API key
 * @returns {Array} Danh sách API key
 */
export const getApiKeys = () => {
  return API_KEYS.map((keyObj) => ({
    ...keyObj,
    key: maskString(keyObj.key, 3), // Ẩn key, chỉ hiển thị 3 ký tự đầu và cuối
    usage: keyUsageCounter[keyObj.key]?.count || 0,
  }))
}

/**
 * Khởi tạo service
 */
export const initWeatherService = async () => {
  try {
    // Tải danh sách key từ AsyncStorage (đã mã hóa)
    const savedKeys = await secureRetrieve(STORAGE_KEYS.WEATHER_API_KEYS)
    if (savedKeys) {
      // Cập nhật danh sách key
      API_KEYS.length = 0 // Xóa tất cả phần tử hiện có
      savedKeys.forEach((keyObj) => {
        API_KEYS.push(keyObj)

        // Khởi tạo bộ đếm
        if (!keyUsageCounter[keyObj.key]) {
          keyUsageCounter[keyObj.key] = {
            count: 0,
            lastReset: Date.now(),
          }
        }
      })
    }
  } catch (error) {
    console.error('Lỗi khi khởi tạo Weather Service:', error)
  }
}

// Khởi tạo service khi import
initWeatherService()

/**
 * Lấy dự báo thời tiết theo giờ
 * @param {number} lat Vĩ độ
 * @param {number} lon Kinh độ
 * @returns {Promise<Array>} Dữ liệu dự báo thời tiết theo giờ
 */
export const getHourlyForecast = async (
  lat = API_CONFIG.DEFAULT_LOCATION.lat,
  lon = API_CONFIG.DEFAULT_LOCATION.lon
) => {
  try {
    const forecastData = await fetchWeatherData('forecast', { lat, lon })
    return forecastData.list || [] // Trả về danh sách dự báo theo giờ hoặc mảng rỗng nếu không có dữ liệu
  } catch (error) {
    console.error('Error in getHourlyForecast:', error)
    return [] // Trả về mảng rỗng nếu có lỗi
  }
}

/**
 * Lấy cảnh báo thời tiết
 * @param {number} lat Vĩ độ
 * @param {number} lon Kinh độ
 * @returns {Promise<Array>} Danh sách cảnh báo thời tiết
 */
export const getWeatherAlerts = async (
  lat = API_CONFIG.DEFAULT_LOCATION.lat,
  lon = API_CONFIG.DEFAULT_LOCATION.lon
) => {
  try {
    // OpenWeatherMap API miễn phí không hỗ trợ cảnh báo trực tiếp
    // Chúng ta sẽ kiểm tra điều kiện thời tiết và tạo cảnh báo nếu cần
    const currentWeather = await getCurrentWeather(lat, lon)
    const alerts = []

    // Kiểm tra điều kiện thời tiết khắc nghiệt
    if (
      currentWeather &&
      currentWeather.weather &&
      currentWeather.weather.length > 0
    ) {
      const weatherId = currentWeather.weather[0].id

      // Các mã thời tiết khắc nghiệt: https://openweathermap.org/weather-conditions
      if (weatherId >= 200 && weatherId < 300) {
        // Giông bão
        alerts.push({
          event: 'Giông bão',
          severity: 'severe',
          message:
            'Cảnh báo giông bão trong khu vực của bạn. Hãy cẩn thận khi di chuyển.',
        })
      } else if (weatherId >= 300 && weatherId < 400) {
        // Mưa phùn
        alerts.push({
          event: 'Mưa phùn',
          severity: 'moderate',
          message: 'Mưa phùn có thể gây trơn trượt. Hãy lái xe cẩn thận.',
        })
      } else if (weatherId >= 500 && weatherId < 600) {
        // Mưa
        if (weatherId >= 502) {
          // Mưa lớn
          alerts.push({
            event: 'Mưa lớn',
            severity: 'severe',
            message:
              'Cảnh báo mưa lớn có thể gây ngập lụt. Hạn chế di chuyển nếu có thể.',
          })
        }
      } else if (weatherId >= 600 && weatherId < 700) {
        // Tuyết
        alerts.push({
          event: 'Tuyết rơi',
          severity: 'moderate',
          message:
            'Tuyết rơi có thể gây trơn trượt và tầm nhìn hạn chế. Hãy cẩn thận.',
        })
      } else if (weatherId >= 700 && weatherId < 800) {
        // Sương mù, bụi, tro, cát...
        if (weatherId === 781) {
          // Lốc xoáy
          alerts.push({
            event: 'Lốc xoáy',
            severity: 'severe',
            message:
              'CẢNH BÁO KHẨN CẤP: Lốc xoáy trong khu vực. Tìm nơi trú ẩn ngay lập tức!',
          })
        } else {
          alerts.push({
            event: 'Tầm nhìn hạn chế',
            severity: 'moderate',
            message:
              'Tầm nhìn hạn chế do sương mù hoặc bụi. Hãy lái xe cẩn thận.',
          })
        }
      }

      // Kiểm tra nhiệt độ cực đoan
      if (currentWeather.main) {
        if (currentWeather.main.temp > 35) {
          alerts.push({
            event: 'Nắng nóng',
            severity: 'moderate',
            message:
              'Nhiệt độ cao có thể gây say nắng. Hãy uống đủ nước và tránh hoạt động ngoài trời.',
          })
        } else if (currentWeather.main.temp < 5) {
          alerts.push({
            event: 'Lạnh đậm',
            severity: 'moderate',
            message:
              'Nhiệt độ thấp có thể gây hạ thân nhiệt. Hãy mặc đủ ấm khi ra ngoài.',
          })
        }
      }
    }

    return alerts
  } catch (error) {
    console.error('Lỗi khi lấy cảnh báo thời tiết:', error)
    return []
  }
}

/**
 * Lấy dự báo thời tiết theo ngày
 * @param {number} lat Vĩ độ
 * @param {number} lon Kinh độ
 * @returns {Promise<Array>} Dữ liệu dự báo thời tiết theo ngày
 */
export const getDailyForecast = async (
  lat = API_CONFIG.DEFAULT_LOCATION.lat,
  lon = API_CONFIG.DEFAULT_LOCATION.lon
) => {
  try {
    // OpenWeatherMap API miễn phí không có endpoint riêng cho dự báo theo ngày
    // Chúng ta sẽ chuyển đổi dự báo theo giờ thành dự báo theo ngày
    const hourlyForecast = await getHourlyForecast(lat, lon)

    if (!hourlyForecast || hourlyForecast.length === 0) {
      return []
    }

    // Nhóm dự báo theo ngày
    const dailyMap = new Map()

    hourlyForecast.forEach((item) => {
      const date = new Date(item.dt * 1000)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          dt: item.dt,
          temp: {
            min: item.main.temp,
            max: item.main.temp,
          },
          weather: [item.weather[0]],
          humidity: item.main.humidity,
          pressure: item.main.pressure,
          wind_speed: item.wind.speed,
        })
      } else {
        const dailyData = dailyMap.get(dateKey)

        // Cập nhật nhiệt độ min/max
        dailyData.temp.min = Math.min(dailyData.temp.min, item.main.temp)
        dailyData.temp.max = Math.max(dailyData.temp.max, item.main.temp)

        // Sử dụng thời tiết của giờ giữa ngày (12:00) nếu có
        const hour = date.getHours()
        if (hour === 12 || hour === 13) {
          dailyData.weather = [item.weather[0]]
        }
      }
    })

    // Chuyển đổi Map thành mảng
    return Array.from(dailyMap.values())
  } catch (error) {
    console.error('Lỗi khi lấy dự báo theo ngày:', error)
    return []
  }
}

export default {
  getCurrentWeather,
  getWeatherForecast,
  getHourlyForecast,
  getWeatherAlerts,
  getDailyForecast,
  clearWeatherCache,
  addApiKey,
  removeApiKey,
  toggleApiKey,
  getApiKeys,
  initWeatherService,
}
