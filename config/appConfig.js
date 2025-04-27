export const API_CONFIG = {
  WEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  KEY_USAGE_LIMIT_PER_MINUTE: 60,
  KEY_USAGE_RESET_INTERVAL: 60 * 1000, // 1 minute
  DEFAULT_LOCATION: {
    lat: 21.0278,
    lon: 105.8342,
  },
}

export const SECURITY_CONFIG = {
  ENCRYPTION_KEY: 'AccShift_Encryption_Key_2025',
  SECURE_PREFIX: 'secure_',
  MASK_VISIBLE_CHARS: 4,
}

export const STORAGE_KEYS = {
  ATTENDANCE_LOGS_PREFIX: 'attendanceLogs_',
  NOTIFICATION_LOGS_PREFIX: 'notificationLogs_',
  DAILY_WORK_STATUS_PREFIX: 'dailyWorkStatus_',
  SHIFT_LIST: 'shifts',
  NOTES: 'notes',
  CURRENT_SHIFT_ID: 'currentShiftId',
  WEATHER_CACHE_PREFIX: 'weather_cache_',
  WEATHER_API_KEYS: 'weatherApiKeys',
  WEATHER_API_STATE: 'weatherApiState',
  WEATHER_ALERTS: 'weatherAlerts',
  DEVICE_ID: 'device_id',
  USER_SETTINGS: 'userSettings',
  ACTIVE_SHIFT_ID: 'activeShiftId',
  IS_WORKING: 'isWorking',
  WORK_START_TIME: 'workStartTime',
  LAST_AUTO_RESET_TIME: 'lastAutoResetTime',
}
