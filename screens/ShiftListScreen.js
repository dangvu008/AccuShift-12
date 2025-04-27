'use client'

import { useContext, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native'
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons'
import { AppContext } from '../context/AppContext'
import { getShifts, deleteShift, getCurrentShift } from '../utils/database'
import ShiftFormModal from '../components/ShiftFormModal'

const ShiftListScreen = ({ navigation }) => {
  const { t, darkMode, setCurrentShift } = useContext(AppContext)
  const [shifts, setShifts] = useState([])
  const [currentShiftId, setCurrentShiftId] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      // Tải danh sách ca làm việc
      const loadedShifts = await getShifts()
      setShifts(loadedShifts)

      // Tải ca làm việc hiện tại
      const currentShift = await getCurrentShift()
      if (currentShift) {
        setCurrentShiftId(currentShift.id)
      }
    }

    loadData()

    // Refresh data when navigating back to this screen
    const unsubscribe = navigation.addListener('focus', loadData)
    return unsubscribe
  }, [navigation])

  const handleEditShift = (shift) => {
    setEditingShiftId(shift.id)
    setModalVisible(true)
  }

  const handleAddShift = () => {
    setEditingShiftId(null)
    setModalVisible(true)
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingShiftId(null)
  }

  const handleShiftSaved = async (shiftId, isDeleted = false) => {
    try {
      // Reload shifts after save/delete
      const loadedShifts = await getShifts()
      setShifts(loadedShifts)

      // If current shift was deleted, reset currentShiftId
      if (isDeleted && shiftId === currentShiftId) {
        setCurrentShiftId(null)
      }

      // Log success
      console.log('Shifts reloaded successfully after save/delete')
    } catch (error) {
      console.error('Error reloading shifts:', error)
    }
  }

  const handleDeleteShift = async (id) => {
    Alert.alert(
      t('Confirm Deletion'),
      t('Are you sure you want to delete this shift?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteShift(id)
            if (success) {
              setShifts(shifts.filter((shift) => shift.id !== id))

              // If current shift was deleted, reset currentShiftId
              if (id === currentShiftId) {
                setCurrentShiftId(null)
              }

              Alert.alert(t('Success'), t('Shift deleted successfully'))
            } else {
              Alert.alert(t('Error'), t('Failed to delete shift'))
            }
          },
        },
      ]
    )
  }

  const handleSelectShift = (shift) => {
    setCurrentShift(shift)
    navigation.navigate('Home')
  }

  const handleApplyShift = async (shift) => {
    // Nếu ca này đã được áp dụng, hiển thị thông báo
    if (currentShiftId === shift.id) {
      Alert.alert(
        t('Thông báo'),
        t('Ca làm việc này đã được áp dụng cho tuần hiện tại'),
        [{ text: t('OK') }]
      )
      return
    }

    // Xác nhận trước khi áp dụng ca mới
    Alert.alert(
      t('Áp dụng ca làm việc'),
      t(
        'Bạn có chắc chắn muốn áp dụng ca làm việc này cho tuần hiện tại không?'
      ),
      [
        {
          text: t('Hủy'),
          style: 'cancel',
        },
        {
          text: t('Áp dụng'),
          onPress: async () => {
            // Cập nhật ca làm việc hiện tại
            await setCurrentShift(shift)
            setCurrentShiftId(shift.id)

            // Hiển thị thông báo thành công
            Alert.alert(
              t('Thành công'),
              t('Đã áp dụng ca làm việc cho tuần hiện tại'),
              [{ text: t('OK') }]
            )
          },
        },
      ]
    )
  }

  const renderShiftItem = ({ item }) => {
    // Kiểm tra xem ca này có phải là ca đang được áp dụng không
    const isCurrentShift = item.id === currentShiftId

    return (
      <View
        style={[
          styles.shiftItem,
          darkMode && styles.darkShiftItem,
          isCurrentShift && styles.currentShiftItem,
          isCurrentShift && darkMode && styles.darkCurrentShiftItem,
        ]}
      >
        <TouchableOpacity
          style={styles.shiftInfo}
          onPress={() => handleSelectShift(item)}
        >
          <View style={styles.shiftHeader}>
            <Text style={[styles.shiftName, darkMode && styles.darkText]}>
              {item.name || 'Ca làm việc'}
            </Text>
            {isCurrentShift && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>{t('Đang áp dụng')}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.shiftTime, darkMode && styles.darkSubtitle]}>
            {item.startTime || '08:00'} - {item.endTime || '17:00'}
          </Text>
          <Text style={[styles.shiftDays, darkMode && styles.darkSubtitle]}>
            {item.daysApplied && item.daysApplied.length > 0
              ? item.daysApplied.join(', ')
              : 'T2, T3, T4, T5, T6'}
          </Text>
        </TouchableOpacity>

        <View style={styles.shiftActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.applyButton,
              isCurrentShift && styles.appliedButton,
            ]}
            onPress={() => handleApplyShift(item)}
          >
            <MaterialIcons
              name={isCurrentShift ? 'check-circle' : 'play-circle-outline'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditShift(item)}
          >
            <Feather name="edit" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteShift(item.id)}
          >
            <Feather name="trash-2" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <FlatList
        data={shifts}
        renderItem={renderShiftItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.addButton} onPress={handleAddShift}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Shift Form Modal */}
      <ShiftFormModal
        visible={modalVisible}
        shiftId={editingShiftId}
        onClose={handleModalClose}
        onSaved={handleShiftSaved}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#aaa',
  },
  listContent: {
    padding: 16,
  },
  shiftItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  darkShiftItem: {
    backgroundColor: '#1e1e1e',
  },
  currentShiftItem: {
    backgroundColor: '#f0f7ff',
    borderWidth: 2,
    borderColor: '#8a56ff',
  },
  darkCurrentShiftItem: {
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#8a56ff',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shiftName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: '#8a56ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shiftTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  shiftDays: {
    fontSize: 14,
    color: '#666',
  },
  shiftActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  applyButton: {
    backgroundColor: '#27ae60',
  },
  appliedButton: {
    backgroundColor: '#8a56ff',
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8a56ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
})

export default ShiftListScreen
