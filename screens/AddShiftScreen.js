'use client'

import { useState, useContext, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native'
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { AppContext } from '../context/AppContext'
import { addShift, updateShift } from '../utils/database'

const AddShiftScreen = ({ navigation, route }) => {
  const { t, darkMode } = useContext(AppContext)
  const editingShift = route.params?.shift

  const [name, setName] = useState(editingShift?.name || '')
  const [startTime, setStartTime] = useState(editingShift?.startTime || '08:00')
  const [endTime, setEndTime] = useState(editingShift?.endTime || '17:00')
  const [adminEndTime, setAdminEndTime] = useState(
    editingShift?.adminEndTime || '17:30'
  )
  const [daysApplied, setDaysApplied] = useState(
    editingShift?.daysApplied || ['T2', 'T3', 'T4', 'T5', 'T6']
  )
  const [reminderBefore, setReminderBefore] = useState(
    editingShift?.reminderBefore?.toString() || '15'
  )
  const [reminderAfter, setReminderAfter] = useState(
    editingShift?.reminderAfter?.toString() || '15'
  )
  const [breakTime, setBreakTime] = useState(
    editingShift?.breakTime?.toString() || '60'
  )
  const [roundUpMinutes, setRoundUpMinutes] = useState(
    editingShift?.roundUpMinutes?.toString() || '30'
  )
  const [showCheckInButton, setShowCheckInButton] = useState(
    editingShift?.showCheckInButton !== false
  )
  const [showCheckInButtonWhileWorking, setShowCheckInButtonWhileWorking] =
    useState(editingShift?.showCheckInButtonWhileWorking !== false)

  // State cho validation errors
  const [errors, setErrors] = useState({})

  // State cho DateTimePicker
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [showAdminEndTimePicker, setShowAdminEndTimePicker] = useState(false)

  // Kiểm tra validation khi component được tải
  useEffect(() => {
    // Kiểm tra thời gian hợp lệ khi component được tải
    // Chuyển đổi chuỗi thời gian thành số để so sánh
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    // Tính tổng phút
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes

    // Kiểm tra ca qua đêm (nếu giờ kết thúc nhỏ hơn giờ bắt đầu, coi như ca qua đêm)
    if (endTotalMinutes < startTotalMinutes) {
      // Ca qua đêm là hợp lệ
      return
    }

    // Kiểm tra giờ kết thúc >= giờ bắt đầu
    const isValid = endTotalMinutes >= startTotalMinutes
    if (!isValid) {
      setErrors({
        ...errors,
        endTime: t('End Time must be after or equal to Start Time'),
      })
    }
  }, [startTime, endTime, errors, t])

  // Hàm chuyển đổi giữa chuỗi thời gian và đối tượng Date
  const timeStringToDate = (timeString) => {
    const today = new Date()
    const [hours, minutes] = timeString.split(':').map(Number)
    today.setHours(hours, minutes, 0, 0)
    return today
  }

  // Hàm chuyển đổi từ đối tượng Date sang chuỗi thời gian
  const dateToTimeString = (date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const weekdays = [
    { id: 'T2', label: 'T2' },
    { id: 'T3', label: 'T3' },
    { id: 'T4', label: 'T4' },
    { id: 'T5', label: 'T5' },
    { id: 'T6', label: 'T6' },
    { id: 'T7', label: 'T7' },
    { id: 'CN', label: 'CN' },
  ]

  const reminderOptions = [
    { value: '5', label: '5 phút' },
    { value: '10', label: '10 phút' },
    { value: '15', label: '15 phút' },
    { value: '30', label: '30 phút' },
    { value: '60', label: '1 giờ' },
  ]

  const roundUpOptions = [
    { value: '5', label: '5 phút' },
    { value: '10', label: '10 phút' },
    { value: '15', label: '15 phút' },
    { value: '30', label: '30 phút' },
    { value: '60', label: '1 giờ' },
  ]

  const toggleDay = (dayId) => {
    if (daysApplied.includes(dayId)) {
      setDaysApplied(daysApplied.filter((day) => day !== dayId))
    } else {
      setDaysApplied([...daysApplied, dayId])
    }
  }

  // Kiểm tra thời gian hợp lệ
  const validateTimes = (start, end) => {
    // Chuyển đổi chuỗi thời gian thành số để so sánh
    const [startHours, startMinutes] = start.split(':').map(Number)
    const [endHours, endMinutes] = end.split(':').map(Number)

    // Tính tổng phút
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes

    // Kiểm tra ca qua đêm (nếu giờ kết thúc nhỏ hơn giờ bắt đầu, coi như ca qua đêm)
    if (endTotalMinutes < startTotalMinutes) {
      return true // Ca qua đêm là hợp lệ
    }

    // Kiểm tra giờ kết thúc >= giờ bắt đầu
    return endTotalMinutes >= startTotalMinutes
  }

  // Xử lý khi người dùng thay đổi giờ bắt đầu
  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(Platform.OS === 'ios')
    if (selectedDate) {
      const newStartTime = dateToTimeString(selectedDate)
      setStartTime(newStartTime)

      // Kiểm tra lại validation khi thay đổi giờ bắt đầu
      if (!validateTimes(newStartTime, endTime)) {
        setErrors({
          ...errors,
          endTime: t('End Time must be after or equal to Start Time'),
        })
      } else {
        // Xóa lỗi nếu hợp lệ
        const newErrors = { ...errors }
        delete newErrors.endTime
        setErrors(newErrors)
      }
    }
  }

  // Xử lý khi người dùng thay đổi giờ kết thúc
  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(Platform.OS === 'ios')
    if (selectedDate) {
      const newEndTime = dateToTimeString(selectedDate)
      setEndTime(newEndTime)

      // Kiểm tra lại validation khi thay đổi giờ kết thúc
      if (!validateTimes(startTime, newEndTime)) {
        setErrors({
          ...errors,
          endTime: t('End Time must be after or equal to Start Time'),
        })
      } else {
        // Xóa lỗi nếu hợp lệ
        const newErrors = { ...errors }
        delete newErrors.endTime
        setErrors(newErrors)
      }
    }
  }

  // Xử lý khi người dùng thay đổi giờ kết thúc hành chính
  const handleAdminEndTimeChange = (event, selectedDate) => {
    setShowAdminEndTimePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setAdminEndTime(dateToTimeString(selectedDate))
    }
  }

  const handleSave = async () => {
    // Kiểm tra dữ liệu đầu vào
    if (!name || !startTime || !endTime) {
      Alert.alert(
        t('Lỗi'),
        t('Vui lòng điền đầy đủ tên ca, giờ bắt đầu và giờ kết thúc'),
        [{ text: t('OK') }]
      )
      return
    }

    // Kiểm tra thời gian hợp lệ
    if (!validateTimes(startTime, endTime)) {
      setErrors({
        ...errors,
        endTime: t('End Time must be after or equal to Start Time'),
      })
      Alert.alert(t('Lỗi'), t('Giờ kết thúc phải sau hoặc bằng giờ bắt đầu'), [
        { text: t('OK') },
      ])
      return
    }

    // Xác nhận trước khi lưu
    Alert.alert(
      t(editingShift ? 'Cập nhật ca làm việc' : 'Thêm ca làm việc'),
      t(
        editingShift
          ? 'Bạn có chắc chắn muốn cập nhật ca làm việc này?'
          : 'Bạn có chắc chắn muốn thêm ca làm việc mới?'
      ),
      [
        {
          text: t('Hủy'),
          style: 'cancel',
        },
        {
          text: t('Xác nhận'),
          onPress: async () => {
            const shiftData = {
              id: editingShift?.id,
              name,
              startTime,
              endTime,
              adminEndTime,
              daysApplied,
              reminderBefore: Number.parseInt(reminderBefore),
              reminderAfter: Number.parseInt(reminderAfter),
              breakTime: Number.parseInt(breakTime),
              roundUpMinutes: Number.parseInt(roundUpMinutes),
              showCheckInButton,
              showCheckInButtonWhileWorking,
            }

            try {
              if (editingShift) {
                await updateShift(shiftData)
              } else {
                await addShift(shiftData)
              }

              // Thông báo thành công
              Alert.alert(
                t('Thành công'),
                t(
                  editingShift
                    ? 'Đã cập nhật ca làm việc thành công'
                    : 'Đã thêm ca làm việc mới thành công'
                ),
                [
                  {
                    text: t('OK'),
                    onPress: () => navigation.goBack(),
                  },
                ]
              )
            } catch (error) {
              // Thông báo lỗi
              Alert.alert(
                t('Lỗi'),
                t('Có lỗi xảy ra khi lưu ca làm việc. Vui lòng thử lại.'),
                [{ text: t('OK') }]
              )
            }
          },
        },
      ]
    )
  }

  const handleReset = () => {
    // Xác nhận trước khi đặt lại
    Alert.alert(
      t('Đặt lại'),
      t('Bạn có chắc chắn muốn đặt lại tất cả các trường?'),
      [
        {
          text: t('Hủy'),
          style: 'cancel',
        },
        {
          text: t('Đặt lại'),
          onPress: () => {
            setName('')
            setStartTime('08:00')
            setEndTime('17:00')
            setAdminEndTime('17:30')
            setDaysApplied(['T2', 'T3', 'T4', 'T5', 'T6'])
            setReminderBefore('15')
            setReminderAfter('15')
            setBreakTime('60')
            setRoundUpMinutes('30')
            setShowCheckInButton(true)
            setShowCheckInButtonWhileWorking(true)
          },
        },
      ]
    )
  }

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Shift Name')}
        </Text>
        <TextInput
          style={[styles.input, darkMode && styles.darkInput]}
          value={name}
          onChangeText={setName}
          placeholder={t('Shift Name')}
          placeholderTextColor={darkMode ? '#777' : '#999'}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Start Time')}
        </Text>
        <TouchableOpacity
          style={[styles.timeInput, darkMode && styles.darkInput]}
          onPress={() => setShowStartTimePicker(true)}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
          <Text style={[styles.timeInputText, darkMode && styles.darkText]}>
            {startTime}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        {showStartTimePicker && (
          <DateTimePicker
            value={timeStringToDate(startTime)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartTimeChange}
            themeVariant={darkMode ? 'dark' : 'light'}
          />
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('End Time')}
        </Text>
        <TouchableOpacity
          style={[styles.timeInput, darkMode && styles.darkInput]}
          onPress={() => setShowEndTimePicker(true)}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
          <Text style={[styles.timeInputText, darkMode && styles.darkText]}>
            {endTime}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        {showEndTimePicker && (
          <DateTimePicker
            value={timeStringToDate(endTime)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndTimeChange}
            themeVariant={darkMode ? 'dark' : 'light'}
          />
        )}
        {errors.endTime && (
          <Text style={[styles.helperText, styles.errorText]}>
            {errors.endTime}
          </Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Administrative End Time')}
        </Text>
        <TouchableOpacity
          style={[styles.timeInput, darkMode && styles.darkInput]}
          onPress={() => setShowAdminEndTimePicker(true)}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
          <Text style={[styles.timeInputText, darkMode && styles.darkText]}>
            {adminEndTime}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        {showAdminEndTimePicker && (
          <DateTimePicker
            value={timeStringToDate(adminEndTime)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleAdminEndTimeChange}
            themeVariant={darkMode ? 'dark' : 'light'}
          />
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Days Applied')}
        </Text>
        <View style={styles.daysContainer}>
          {weekdays.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayButton,
                daysApplied.includes(day.id) && styles.selectedDayButton,
                darkMode && styles.darkDayButton,
                daysApplied.includes(day.id) &&
                  darkMode &&
                  styles.darkSelectedDayButton,
              ]}
              onPress={() => toggleDay(day.id)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  daysApplied.includes(day.id) && styles.selectedDayButtonText,
                  darkMode && styles.darkText,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Reminder Before Work')}
        </Text>
        <View style={[styles.dropdown, darkMode && styles.darkInput]}>
          <Text style={[styles.dropdownText, darkMode && styles.darkText]}>
            {reminderBefore} phút
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Reminder After Work')}
        </Text>
        <View style={[styles.dropdown, darkMode && styles.darkInput]}>
          <Text style={[styles.dropdownText, darkMode && styles.darkText]}>
            {reminderAfter} phút
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Break Time (minutes)')}
        </Text>
        <TextInput
          style={[styles.input, darkMode && styles.darkInput]}
          value={breakTime}
          onChangeText={setBreakTime}
          placeholder="60"
          placeholderTextColor={darkMode ? '#777' : '#999'}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          {t('Round Up Minutes')}
        </Text>
        <View style={[styles.dropdown, darkMode && styles.darkInput]}>
          <Text style={[styles.dropdownText, darkMode && styles.darkText]}>
            {roundUpMinutes} phút
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={darkMode ? '#fff' : '#000'}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, darkMode && styles.darkText]}>
            {t('Show Check-in Button')}
          </Text>
          <Switch
            value={showCheckInButton}
            onValueChange={setShowCheckInButton}
            trackColor={{ false: '#767577', true: '#8a56ff' }}
            thumbColor={showCheckInButton ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Text style={[styles.helperText, darkMode && styles.darkHelperText]}>
          {t('Show Check-in Button While Working')}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            styles.resetButton,
            darkMode && styles.darkResetButton,
          ]}
          onPress={handleReset}
        >
          <Feather
            name="refresh-ccw"
            size={24}
            color={darkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, styles.saveButton]}
          onPress={handleSave}
        >
          <Feather name="save" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  darkText: {
    color: '#fff',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  darkInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderColor: '#444',
  },
  timeInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#000',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  darkHelperText: {
    color: '#aaa',
  },
  errorText: {
    color: '#e74c3c',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -4,
  },
  dayButton: {
    width: '30%',
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 4,
  },
  darkDayButton: {
    backgroundColor: '#2a2a2a',
  },
  selectedDayButton: {
    backgroundColor: '#8a56ff',
  },
  darkSelectedDayButton: {
    backgroundColor: '#8a56ff',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedDayButtonText: {
    color: '#fff',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
    gap: 20,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
  },
  darkResetButton: {
    backgroundColor: '#333',
  },
  saveButton: {
    backgroundColor: '#8a56ff',
  },
})

export default AddShiftScreen
