import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Alert,
  FlatList,
  Modal
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Database } from '../database/Database';

export default function ClassRecordScreen() {
  const route = useRoute();
  const { studentId, recordId, selectedDate } = route.params || {};

  const [student, setStudent] = useState(null);
  
  // 날짜별 수업 리스트
  const [records, setRecords] = useState([]);
  
  // 개별 기록 작성/수정 모달 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingBookIssue, setEditingBookIssue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 기록 추가 모달 열기
  const openAddModal = useCallback((dateStr = '') => {
    const today = dateStr || new Date().toISOString().split('T')[0];
    setEditingRecord(null);
    setEditingDate(today);
    setEditingTime('');
    setEditingContent('');
    setEditingBookIssue('');
    setModalVisible(true);
  }, []);

  // 기록 수정 모달 열기
  const openEditModal = useCallback((record) => {
    setEditingRecord(record);
    setEditingDate(record.class_date);
    setEditingTime(record.class_time || '');
    setEditingContent(record.content || '');
    setEditingBookIssue(record.book_issue_date || '');
    setModalVisible(true);
  }, []);

  // 학생 정보 및 수업 기록 로드
  const loadData = useCallback(async () => {
    try {
      const stud = await Database.getStudentById(studentId);
      setStudent(stud);

      const recs = await Database.getRecordsByStudent(studentId);
      // 날짜 최신순 정렬
      const sortedRecs = recs.sort((a, b) => b.class_date.localeCompare(a.class_date));
      setRecords(sortedRecs);

      // 만약 특정 recordId가 파라미터로 넘어왔다면 즉시 편집창을 연다
      if (recordId) {
        const rec = recs.find(r => r.id === recordId);
        if (rec) {
          openEditModal(rec);
        }
      } else if (selectedDate) {
        // 특정 날짜가 전달되었고 기존 기록이 없다면 새 기록 작성창을 연다
        const existing = recs.find(r => r.class_date === selectedDate);
        if (existing) {
          openEditModal(existing);
        } else {
          openAddModal(selectedDate);
        }
      }
    } catch (e) {
      console.error('Failed to load class record screen data:', e);
    }
  }, [studentId, recordId, selectedDate, openEditModal, openAddModal]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // 기록 저장 처리 (추가 또는 수정)
  const handleSaveRecord = async () => {
    if (!editingDate) {
      Alert.alert('알림', '날짜를 지정해야 합니다.');
      return;
    }

    const recordData = {
      student_id: studentId,
      class_date: editingDate,
      class_time: editingTime.trim() || null,
      book_issue_date: editingBookIssue.trim() || null,
      content: editingContent.trim() || null,
    };

    try {
      if (editingRecord) {
        // 수정
        await Database.updateClassRecord(editingRecord.id, recordData);
      } else {
        // 추가
        await Database.addClassRecord(recordData);
      }
      setModalVisible(false);
      loadData();
    } catch (e) {
      console.error('Failed to save record:', e);
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  // 기록 삭제 처리
  const handleDeleteRecord = async (id) => {
    Alert.alert('기록 삭제', '이 수업 일지를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await Database.deleteClassRecord(id);
            loadData();
            if (modalVisible) setModalVisible(false);
          } catch (e) {
            console.error('Failed to delete record:', e);
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        }
      }
    ]);
  };

  const renderRecordCard = ({ item }) => {
    return (
      <View style={styles.sheetContainer}>
        <View style={styles.sheetTopRow}>
          <Text style={styles.sheetTopText}>
            시간: <Text style={styles.sheetValueText}>{item.class_time || '(시간 미지정)'}</Text>
            {'  |  '}출고/과정: <Text style={styles.sheetValueText}>{item.book_issue_date || '(미입력)'}</Text>
          </Text>
        </View>
        
        {/* 그림 2 하단 사선 디자인 날짜 칸 + 수업 내용 */}
        <View style={styles.sheetBody}>
          <View style={styles.diagonalDateContainer}>
            {/* 사선 효과 및 날짜 정보 */}
            <View style={styles.diagonalLine} />
            <Text style={styles.diagonalMonthText}>{item.class_date.split('-')[1]}월</Text>
            <Text style={styles.diagonalDayText}>{item.class_date.split('-')[2]}일</Text>
          </View>
          <View style={styles.sheetContentArea}>
            <Text style={styles.sheetContentText}>
              {item.content || '기록된 내용이 없습니다.'}
            </Text>
          </View>
        </View>

        {/* 카드 제어 버튼 */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.cardActionButton} 
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editActionText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cardActionButton} 
            onPress={() => handleDeleteRecord(item.id)}
          >
            <Text style={styles.deleteActionText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 학생 기본 정보 */}
      {student && (
        <View style={styles.studentBar}>
          <Text style={styles.studentName}>{student.name} 학생</Text>
          <Text style={styles.studentDetails}>{student.school_grade || '학교/학년 미지정'}</Text>
        </View>
      )}

      {/* 수업 목록 */}
      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>등록된 수업 일지가 없습니다.</Text>
          <TouchableOpacity 
            style={styles.addRecordButton}
            onPress={() => openAddModal()}
          >
            <Text style={styles.addRecordButtonText}>+ 첫 수업 일지 작성하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordCard}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 우측 하단 플로팅 버튼 */}
      {records.length > 0 && (
        <TouchableOpacity 
          style={styles.fabButton}
          onPress={() => openAddModal()}
        >
          <Text style={styles.fabButtonText}>+ 일지 추가</Text>
        </TouchableOpacity>
      )}

      {/* 일지 등록/수정 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingRecord ? '수업 일지 수정' : '새 수업 일지 등록'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* 날짜 선택 필드 */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>수업 날짜 *</Text>
                <TouchableOpacity 
                  style={styles.dateSelector}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <Text style={styles.dateSelectorText}>
                    📅 {editingDate || '날짜 선택'}
                  </Text>
                </TouchableOpacity>

                {/* 인라인 달력 (날짜 선택 활성화 시) */}
                {showDatePicker && (
                  <View style={styles.inlineCalendar}>
                    <Calendar
                      current={editingDate}
                      onDayPress={(day) => {
                        setEditingDate(day.dateString);
                        setShowDatePicker(false);
                      }}
                      theme={{
                        selectedDayBackgroundColor: '#6366F1',
                        todayTextColor: '#6366F1',
                        arrowColor: '#6366F1',
                      }}
                    />
                  </View>
                )}
              </View>

              {/* 수업 시간 입력 필드 */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>수업 시간</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingTime}
                  onChangeText={setEditingTime}
                  placeholder="예: 14:00 또는 14시~15시"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* 그림 2 상단 설정 매핑 */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>교재 출고 정보 (출고일/과정)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingBookIssue}
                  onChangeText={setEditingBookIssue}
                  placeholder="예: 6/25 출고, A과정"
                  placeholderTextColor="#9CA3AF"
                />
              </View>


              {/* 수업 내용 */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>수업 내용 기록 *</Text>
                <TextInput
                  style={[styles.modalInput, styles.contentTextArea]}
                  value={editingContent}
                  onChangeText={setEditingContent}
                  placeholder="오늘 진행한 수업 내용을 기록하세요."
                  placeholderTextColor="#9CA3AF"
                  multiline={true}
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* 저장 및 제어 버튼 */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveModalBtn]}
                  onPress={handleSaveRecord}
                >
                  <Text style={styles.saveModalBtnText}>저장하기</Text>
                </TouchableOpacity>
                
                {editingRecord && (
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.deleteModalBtn]}
                    onPress={() => handleDeleteRecord(editingRecord.id)}
                  >
                    <Text style={styles.deleteModalBtnText}>일지 삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  studentBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  studentDetails: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  addRecordButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addRecordButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  // 그림 2 양식 느낌의 낱장 시트 형태 카드
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sheetTopRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#9CA3AF',
    backgroundColor: '#F9FAFB',
  },
  sheetTopText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sheetValueText: {
    color: '#111827',
    fontWeight: 'normal',
  },
  sheetBody: {
    flexDirection: 'row',
    height: 110,
  },
  diagonalDateContainer: {
    width: 80,
    borderRightWidth: 1.5,
    borderRightColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  // 사선 효과 재현 (CSS 보더)
  diagonalLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
    transform: [{ rotate: '38deg' }],
    opacity: 0.4,
  },
  diagonalMonthText: {
    position: 'absolute',
    top: 15,
    left: 12,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
  },
  diagonalDayText: {
    position: 'absolute',
    bottom: 15,
    right: 12,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  sheetContentArea: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FAFDFB', // 연한 필기용 모눈종이 느낌의 배경
  },
  sheetContentText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 16,
  },
  cardActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editActionText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  deleteActionText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 6,
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  dateSelectorText: {
    fontSize: 14,
    color: '#111827',
  },
  inlineCalendar: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  contentTextArea: {
    height: 120,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalBtn: {
    backgroundColor: '#4F46E5',
  },
  saveModalBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  deleteModalBtn: {
    backgroundColor: '#EF4444',
  },
  deleteModalBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
