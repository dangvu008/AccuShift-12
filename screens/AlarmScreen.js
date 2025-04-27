'use client'

import { useState, useEffect, useContext, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Dimensions,
  BackHandler,
  StatusBar,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { AppContext } from '../context/AppContext'
import { formatTime, formatDate } from '../utils/helpers'
import { addCheckInRecord } from '../utils/database'
import alarmManager from '../utils/alarmManager'

const { width, height } = Dimensions.get('window')

const AlarmScreen = ({ navigation, route }) => {
  const { t, darkMode, notificationSound, notificationVibration } =
    useContext(AppContext)
  const [sound, setSound] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [currentTime, setCurrentTime] = useState(new Date())

  // Lấy thông tin từ route params
  const {
    type = 'shift', // 'shift', 'note', 'check_in', 'check_out'
    title = t('Alarm'),
    body = '',
    shiftId = null,
    noteId = null,
    action = 'reminder', // 'reminder', 'check_in', 'check_out'
    data = {},
  } = route.params || {}

  // Cập nhật thời gian hiện tại mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Hiệu ứng nhấp nháy và xuất hiện
  useEffect(() => {
    // Hiệu ứng nhấp nháy
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Hiệu ứng xuất hiện
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }, [pulseAnim, scaleAnim, opacityAnim])

  // Phát âm thanh và rung khi mở màn hình
  useEffect(() => {
    const playSound = async () => {
      if (notificationSound) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/alarm-sound.mp3'),
            {
              shouldPlay: true,
              isLooping: true,
              volume: 1.0,
            }
          )
          setSound(sound)
          setIsPlaying(true)
        } catch (error) {
          console.error('Lỗi khi phát âm thanh báo thức:', error)
        }
      }
    }

    const startVibration = () => {
      if (notificationVibration) {
        // Mẫu rung mạnh: 500ms rung, 300ms nghỉ, lặp lại
        Vibration.vibrate([500, 300, 500, 300], true)
      }
    }

    playSound()
    startVibration()

    // Ngăn người dùng quay lại bằng nút back
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    )

    // Đảm bảo màn hình luôn sáng
    StatusBar.setHidden(true)

    return () => {
      if (sound) {
        sound.stopAsync()
        sound.unloadAsync()
      }
      Vibration.cancel()
      backHandler.remove()
      StatusBar.setHidden(false)
    }
  }, [notificationSound, notificationVibration, sound])

  // Xử lý khi người dùng tắt báo thức
  const handleDismiss = async () => {
    // Dừng âm thanh và rung
    if (sound) {
      await sound.stopAsync()
      setIsPlaying(false)
    }
    Vibration.cancel()

    // Xử lý hành động tương ứng với loại báo thức
    if (type === 'shift' || type === 'check_in' || type === 'check_out') {
      if (action === 'check_in') {
        // Thêm bản ghi check-in
        await addCheckInRecord({
          type: 'check_in',
          shiftId,
          timestamp: new Date().getTime(),
        })
      } else if (action === 'check_out') {
        // Thêm bản ghi check-out
        await addCheckInRecord({
          type: 'check_out',
          shiftId,
          timestamp: new Date().getTime(),
        })
      }
    } else if (type === 'note' && noteId) {
      // Đánh dấu ghi chú đã xem
      // Trong trường hợp thực tế, có thể cập nhật trạng thái ghi chú
    }

    // Đóng màn hình báo thức
    navigation.goBack()
  }

  // Xử lý khi người dùng chọn báo lại sau
  const handleSnooze = async () => {
    // Dừng âm thanh và rung
    if (sound) {
      await sound.stopAsync()
      setIsPlaying(false)
    }
    Vibration.cancel()

    // Lên lịch báo lại sau 5 phút
    const now = new Date()
    const snoozeTime = new Date(now.getTime() + 5 * 60 * 1000) // 5 phút sau

    // Lên lịch báo thức mới
    await alarmManager.snoozeAlarm(
      {
        id: `${type}_${shiftId || noteId || Date.now()}`,
        title,
        body,
        type,
        data: {
          shiftId,
          noteId,
          action,
          ...data,
        },
      },
      5
    )

    // Đóng màn hình báo thức
    navigation.goBack()
  }

  // Xác định màu nền và biểu tượng dựa trên loại báo thức
  const getAlarmStyle = () => {
    switch (type) {
      case 'check_in':
        return {
          backgroundColor: '#27ae60', // Xanh lá
          icon: 'log-in-outline',
          color: '#27ae60',
        }
      case 'check_out':
        return {
          backgroundColor: '#3498db', // Xanh dương
          icon: 'log-out-outline',
          color: '#3498db',
        }
      case 'shift':
        return {
          backgroundColor: '#8a56ff', // Tím
          icon: 'alarm',
          color: '#8a56ff',
        }
      case 'note':
        return {
          backgroundColor: '#f39c12', // Cam
          icon: 'document-text',
          color: '#f39c12',
        }
      default:
        return {
          backgroundColor: '#8a56ff', // Tím
          icon: 'alarm',
          color: '#8a56ff',
        }
    }
  }

  const alarmStyle = getAlarmStyle()

  // Xác định nút hành động chính dựa trên loại báo thức
  const getPrimaryActionButton = () => {
    if (type === 'check_in') {
      return (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#27ae60' }]}
          onPress={handleDismiss}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('Đã Check-in')}</Text>
        </TouchableOpacity>
      )
    } else if (type === 'check_out') {
      return (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#3498db' }]}
          onPress={handleDismiss}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('Đã Check-out')}</Text>
        </TouchableOpacity>
      )
    } else {
      return (
        <TouchableOpacity
          style={[styles.button, styles.dismissButton]}
          onPress={handleDismiss}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('Tắt báo thức')}</Text>
        </TouchableOpacity>
      )
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: alarmStyle.backgroundColor }]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.alarmLabel}>
            {type === 'check_in'
              ? 'CHECK-IN!'
              : type === 'check_out'
              ? 'CHECK-OUT!'
              : type === 'shift'
              ? 'ĐẾN GIỜ ĐI LÀM!'
              : 'NHẮC VIỆC!'}
          </Text>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        </View>

        {/* Biểu tượng báo thức */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${alarmStyle.color}20`,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons name={alarmStyle.icon} size={80} color={alarmStyle.color} />
        </Animated.View>

        {/* Tiêu đề và nội dung */}
        <View style={styles.contentContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.bodyText}>{body}</Text>
        </View>

        {/* Nút hành động */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.snoozeButton]}
            onPress={handleSnooze}
          >
            <Ionicons name="time-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>{t('Báo lại sau 5 phút')}</Text>
          </TouchableOpacity>

          {getPrimaryActionButton()}
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  alarmLabel: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  timeContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 5,
  },
  timeText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contentContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  snoozeButton: {
    backgroundColor: '#f39c12',
  },
  dismissButton: {
    backgroundColor: '#8a56ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
})

export default AlarmScreen
