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
import { Feather } from '@expo/vector-icons';
import { Database } from '../database/Database';
import { theme } from '../theme';

const PAGE_SIZE = 15;

export default function ClassRecordScreen() {
  const route = useRoute();
  const { studentId, recordId, selectedDate } = route.params || {};

  const [student, setStudent] = useState(null);

  // 전체 일지 리스트와 화면에 보여질 리스트(무한 스크롤 용)
  const [allRecords, setAllRecords] = useState([]);
  const [displayedRecords, setDisplayedRecords] = useState([]);
  const [page, setPage] = useState(1);

  // 개별 기록 작성/수정 모달 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingCourse, setEditingCourse] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 기록 추가 모달 열기
  const openAddModal = useCallback((dateStr = '') => {
    const today = dateStr || new Date().toISOString().split('T')[0];
    setEditingRecord(null);
    setEditingDate(today);
    setEditingTime('');
    setEditingContent('');
    setEditingCourse('');
    setModalVisible(true);
  }, []);

  // 기록 수정 모달 열기
  const openEditModal = useCallback((record) => {
    setEditingRecord(record);
    setEditingDate(record.class_date);
    setEditingTime(record.class_time || '');
    setEditingContent(record.content || '');
    setEditingCourse(record.course || '');
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
      setAllRecords(sortedRecs);

      // 초기 렌더링 (첫 페이지 로드)
      setDisplayedRecords(sortedRecs.slice(0, PAGE_SIZE));
      setPage(1);

      // 만약 특정 recordId가 파라미터로 넘어왔다면 즉시 편집창을 연다
      if (recordId) {
        const rec = sortedRecs.find(r => r.id === recordId);
        if (rec) {
          openEditModal(rec);
        }
      } else if (selectedDate) {
        // 특정 날짜가 전달되었고 기존 기록이 없다면 새 기록 작성창을 연다
        const existing = sortedRecs.find(r => r.class_date === selectedDate);
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

  // 무한 스크롤 페이징 처리
  const handleLoadMore = () => {
    const nextItemIndex = page * PAGE_SIZE;
    if (nextItemIndex < allRecords.length) {
      const nextPageRecords = allRecords.slice(nextItemIndex, nextItemIndex + PAGE_SIZE);
      setDisplayedRecords((prev) => [...prev, ...nextPageRecords]);
      setPage((prevPage) => prevPage + 1);
    }
  };

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
      course: editingCourse.trim() || null,
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
      loadData(); // 최신 데이터 다시 로드
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

  const renderRecordCard = useCallback(({ item }) => {
    const [, month, day] = item.class_date.split('-');
    return (
      <View style={styles.cardContainer}>
        {/* 카드 헤더 (날짜 및 뱃지) */}
        <View style={styles.cardHeader}>
          <View style={styles.dateBadge}>
            <Feather name="calendar" size={14} color={theme.colors.primary} />
            <Text style={styles.dateBadgeText}>{month}월 {day}일</Text>
          </View>
          <View style={styles.timeCourseWrapper}>
            <Text style={styles.timeText}>{item.class_time || '(미지정)'}</Text>
            <View style={styles.dotSeparator} />
            <Text style={styles.courseText} numberOfLines={1}>{item.course || '과정 미입력'}</Text>
          </View>
        </View>

        {/* 카드 본문 */}
        <View style={styles.cardBody}>
          <Text style={styles.contentText}>
            {item.content || '기록된 내용이 없습니다.'}
          </Text>
        </View>

        {/* 카드 액션 버튼 */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
            <Feather name="edit-2" size={16} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteRecord(item.id)}>
            <Feather name="trash-2" size={16} color={theme.colors.error} />
            <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [openEditModal, handleDeleteRecord]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 학생 기본 정보 바 */}
      {student && (
        <View style={styles.studentBar}>
          <View>
            <Text style={styles.studentName}>{student.name} 학생</Text>
            <Text style={styles.studentDetails}>{student.school_grade || '학교/학년 미지정'}</Text>
          </View>
          <View style={styles.recordCountBadge}>
            <Text style={styles.recordCountText}>총 {allRecords.length}회 기록</Text>
          </View>
        </View>
      )}

      {/* 수업 목록 */}
      {allRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="folder-minus" size={48} color={theme.colors.outline} style={{ marginBottom: 16 }} />
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
          data={displayedRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordCard}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          // --- 최적화 옵션 시작 ---
          removeClippedSubviews={true} // 화면 밖 아이템 메모리 해제
          initialNumToRender={15}      // 초기 렌더링 개수
          maxToRenderPerBatch={10}     // 한 번에 렌더링할 개수
          windowSize={5}               // 위아래로 렌더링해둘 여유 공간 (기본값 21보다 훨씬 적게)
          updateCellsBatchingPeriod={50} // 렌더링 배치 간격(ms)
        // --- 최적화 옵션 끝 ---
        />
      )}

      {/* 우측 하단 플로팅 버튼 */}
      {allRecords.length > 0 && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => openAddModal()}
        >
          <Feather name="plus" size={20} color={theme.colors.onPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.fabButtonText}>일지 추가</Text>
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
                  <Feather name="x" size={24} color={theme.colors.outline} />
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

                {showDatePicker && (
                  <View style={styles.inlineCalendar}>
                    <Calendar
                      current={editingDate}
                      onDayPress={(day) => {
                        setEditingDate(day.dateString);
                        setShowDatePicker(false);
                      }}
                      theme={{
                        selectedDayBackgroundColor: theme.colors.primary,
                        todayTextColor: theme.colors.primary,
                        arrowColor: theme.colors.primary,
                      }}
                    />
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>수업 시간</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingTime}
                  onChangeText={setEditingTime}
                  placeholder="예: 14:00 또는 14시~15시"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>수업과정</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingCourse}
                  onChangeText={setEditingCourse}
                  placeholder="예: 파이썬 기초, 리액트 심화 등"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>수업 내용 기록 *</Text>
                <TextInput
                  style={[styles.modalInput, styles.contentTextArea]}
                  value={editingContent}
                  onChangeText={setEditingContent}
                  placeholder="오늘 진행한 수업 내용을 기록하세요."
                  placeholderTextColor={theme.colors.outline}
                  multiline={true}
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

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
    backgroundColor: theme.colors.surfaceVariant,
  },
  studentBar: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  studentDetails: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  recordCountBadge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.roundness,
  },
  recordCountText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  addRecordButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.roundness,
  },
  addRecordButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 90,
  },
  // 모던 카드 UI 
  cardContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.roundness,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondaryContainer,
    paddingBottom: theme.spacing.sm,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  dateBadgeText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  timeCourseWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    marginHorizontal: 8,
  },
  courseText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    maxWidth: 100,
  },
  cardBody: {
    paddingVertical: theme.spacing.sm,
    minHeight: 60,
  },
  contentText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    bottom: 60,
    right: 24,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.roundness,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  dateSelectorText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  inlineCalendar: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.secondaryContainer,
    borderRadius: theme.roundness,
    overflow: 'hidden',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.roundness,
    padding: 14,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
  },
  contentTextArea: {
    height: 120,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    height: 48,
    borderRadius: theme.roundness,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveModalBtnText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteModalBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteModalBtnText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
