import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import { Database } from '../database/Database';
import { printClassRecords, shareClassRecords } from '../services/PrintService';
import { getTodayFormatted } from '../utils/dateUtils';
import { formatDisplayTime } from '../utils/stringUtils';
import { useTheme } from '../context/ThemeContext';
import FloatingActionButton from '../components/FloatingActionButton';
import TimePickerModal from '../components/modals/TimePickerModal';
import RecordPrintModal from '../components/modals/RecordPrintModal';

export { formatDisplayTime };

const PAGE_SIZE = 15;

export default function ClassRecordScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const route = useRoute();
  const { studentId, recordId, selectedDate, initialDate, initialTime, initialCourse } = route.params || {};

  const [student, setStudent] = useState(null);

  // 전체 일지 리스트와 화면에 보여질 리스트(무한 스크롤 용)
  const [allRecords, setAllRecords] = useState([]);
  const [displayedRecords, setDisplayedRecords] = useState([]);
  const [page, setPage] = useState(1);

  // 출력 모달 상태
  const [printModalVisible, setPrintModalVisible] = useState(false);

  // 상단 헤더 우측 인쇄/공유 버튼
  useLayoutEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerRightBtn}
          onPress={() => setPrintModalVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="수업 일지 출력 및 공유"
          accessibilityRole="button"
        >
          <Feather name="printer" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme.colors.primary, styles.headerRightBtn]);

  // 개별 기록 작성/수정 모달 관련 상태
  const modalScrollRef = useRef(null);
  const focusedFieldRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingCourse, setEditingCourse] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 안드로이드/iOS 키보드 노출 감지 및 높이 추적
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        if (e?.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
        // 키보드가 화면에 완전히 올라온 시점에 최적 위치 스크롤 재보장
        if (focusedFieldRef.current === 'content') {
          setTimeout(() => {
            modalScrollRef.current?.scrollToEnd({ animated: true });
          }, 80);
        } else if (focusedFieldRef.current === 'course') {
          setTimeout(() => {
            modalScrollRef.current?.scrollTo({ y: 120, animated: true });
          }, 80);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        focusedFieldRef.current = null;
        modalScrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 모달 오픈 시 스크롤 위치 초기화
  useEffect(() => {
    if (modalVisible) {
      setTimeout(() => {
        modalScrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    }
  }, [modalVisible]);

  // 입력 필드 포커스 시 키보드 위로 최적 위치 자동 스크롤 (이중 타이밍 보장)
  const handleContentFocus = () => {
    focusedFieldRef.current = 'content';
    setTimeout(() => {
      modalScrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
    setTimeout(() => {
      modalScrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleCourseFocus = () => {
    focusedFieldRef.current = 'course';
    setTimeout(() => {
      modalScrollRef.current?.scrollTo({ y: 120, animated: true });
    }, 120);
    setTimeout(() => {
      modalScrollRef.current?.scrollTo({ y: 120, animated: true });
    }, 300);
  };

  // 키보드 노출 시 동적 하단 패딩 및 상단 정렬 스타일 (ESLint 인라인 스타일 규칙 준수)
  const modalScrollContentStyle = useMemo(() => [
    styles.modalScroll,
    isKeyboardVisible && styles.modalScrollWithKeyboard,
    isKeyboardVisible && {
      paddingBottom: Platform.OS === 'android' ? keyboardHeight + 36 : 36,
    },
  ], [isKeyboardVisible, keyboardHeight, styles.modalScroll, styles.modalScrollWithKeyboard]);

  // 기록 추가 모달 열기
  const openAddModal = useCallback((dateStr = '', timeStr = '', courseStr = '') => {
    const today = dateStr || getTodayFormatted();
    setEditingRecord(null);
    setEditingDate(today);
    const formattedTime = timeStr ? (formatDisplayTime(timeStr) === '(미지정)' ? '' : formatDisplayTime(timeStr)) : '';
    setEditingTime(formattedTime);
    setEditingContent('');
    setEditingCourse(courseStr || '');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setModalVisible(true);
  }, []);

  // 기록 수정 모달 열기
  const openEditModal = useCallback((record) => {
    setEditingRecord(record);
    setEditingDate(record.class_date);
    const formattedTime = record.class_time ? (formatDisplayTime(record.class_time) === '(미지정)' ? '' : formatDisplayTime(record.class_time)) : '';
    setEditingTime(formattedTime);
    setEditingContent(record.content || '');
    setEditingCourse(record.course || '');
    setShowDatePicker(false);
    setShowTimePicker(false);
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
      } else if (initialDate || selectedDate) {
        const targetDate = initialDate || selectedDate;
        const existing = sortedRecs.find(r => r.class_date === targetDate);
        if (existing) {
          openEditModal(existing);
        } else {
          let fallbackCourse = initialCourse || '';
          if (!fallbackCourse && stud) {
            // 학생 정규 일정 또는 최근 일지에서 과목 탐색
            if (Array.isArray(stud.default_schedules) && stud.default_schedules.length > 0) {
              const dObj = new Date(targetDate);
              const dayVal = dObj.getDay() === 0 ? 7 : dObj.getDay(); // 1~7
              const matchedSched = stud.default_schedules.find((s) => Number(s.dayOfWeek) === dayVal && s.subject);
              if (matchedSched) {
                fallbackCourse = matchedSched.subject;
              } else {
                const firstSched = stud.default_schedules.find((s) => s.subject);
                if (firstSched) fallbackCourse = firstSched.subject;
              }
            }
            if (!fallbackCourse && sortedRecs.length > 0 && sortedRecs[0]?.course) {
              fallbackCourse = sortedRecs[0].course;
            }
          }
          openAddModal(targetDate, initialTime, fallbackCourse);
        }
      }
    } catch (e) {
      console.error('Failed to load class record screen data:', e);
    }
  }, [studentId, recordId, selectedDate, initialDate, initialTime, initialCourse, openEditModal, openAddModal]);

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
  const handleDeleteRecord = useCallback((id) => {
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
  }, [loadData, modalVisible]);

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
            <Text style={styles.timeText}>{formatDisplayTime(item.class_time)}</Text>
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
  }, [openEditModal, handleDeleteRecord, theme.colors.primary, theme.colors.error, styles]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 학생 기본 정보 바 */}
      {student && (
        <View style={styles.studentBar}>
          <View style={styles.studentBarLeft}>
            <Text style={styles.studentName}>{student.name} 학생</Text>
            <Text style={styles.studentDetails}>{student.school_grade || '학교/학년 미지정'}</Text>
          </View>
          <View style={styles.studentBarRight}>
            <TouchableOpacity
              style={styles.printBarBtn}
              onPress={() => setPrintModalVisible(true)}
            >
              <Feather name="printer" size={14} color={theme.colors.primary} style={styles.printBarIcon} />
              <Text style={styles.printBarBtnText}>일지 출력</Text>
            </TouchableOpacity>
            <View style={styles.recordCountBadge}>
              <Text style={styles.recordCountText}>총 {allRecords.length}회</Text>
            </View>
          </View>
        </View>
      )}

      {/* 수업 목록 */}
      {allRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="folder-minus" size={48} color={theme.colors.outline} style={styles.emptyFolderIcon} />
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
        <FloatingActionButton
          icon="plus"
          label="일지 추가"
          onPress={() => openAddModal()}
        />
      )}

      {/* 일지 등록/수정 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (isKeyboardVisible) {
            Keyboard.dismiss();
          } else {
            setModalVisible(false);
          }
        }}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidContainer}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              ref={modalScrollRef}
              contentContainerStyle={modalScrollContentStyle}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View
                style={styles.modalContent}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingRecord ? '수업 일지 수정' : '새 수업 일지 등록'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setModalVisible(false);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={24} color={theme.colors.outline} />
                  </TouchableOpacity>
                </View>

                {/* 날짜 선택 필드 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>수업 날짜 *</Text>
                  <TouchableOpacity
                    style={[styles.dateSelector, showDatePicker && styles.dateSelectorActive]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowDatePicker(!showDatePicker);
                      if (!showDatePicker) setShowTimePicker(false);
                    }}
                  >
                    <View style={styles.selectorContentRow}>
                      <Text style={styles.dateSelectorText}>
                        📅 {editingDate || '날짜 선택'}
                      </Text>
                      <Feather
                        name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={theme.colors.outline}
                      />
                    </View>
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

                {/* 수업 시간 선택 필드 (GUI 피커) */}
                <View style={styles.inputGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>수업 시간</Text>
                    {editingTime ? (
                      <TouchableOpacity
                        onPress={() => setEditingTime('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.clearBtnText}>시간 비우기</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.dateSelector, showTimePicker && styles.dateSelectorActive]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowDatePicker(false);
                      setShowTimePicker(true);
                    }}
                  >
                    <View style={styles.selectorContentRow}>
                      <Text style={[styles.dateSelectorText, !editingTime && styles.placeholderText]}>
                        ⏰ {editingTime || '수업 시간 선택'}
                      </Text>
                      <Feather
                        name="chevron-down"
                        size={18}
                        color={theme.colors.outline}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>수업과정</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingCourse}
                    onChangeText={setEditingCourse}
                    onFocus={handleCourseFocus}
                    onBlur={() => {
                      if (focusedFieldRef.current === 'course') focusedFieldRef.current = null;
                    }}
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
                    onFocus={handleContentFocus}
                    onBlur={() => {
                      if (focusedFieldRef.current === 'content') focusedFieldRef.current = null;
                    }}
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
        </KeyboardAvoidingView>
      </Modal>

      {/* 공통 수업 시간 선택 모달 */}
      <TimePickerModal
        visible={showTimePicker}
        time={editingTime || '10:00'}
        title="수업 시간 선택"
        onSelectTime={setEditingTime}
        onClose={() => setShowTimePicker(false)}
      />

      {/* 공통 수업 일지 출력 모달 */}
      <RecordPrintModal
        visible={printModalVisible}
        onClose={() => setPrintModalVisible(false)}
        printType="records"
        student={student}
        records={allRecords}
        onPrintRecords={(stud, recs, title) => printClassRecords(stud, recs, title)}
        onShareRecords={(stud, recs, title) => shareClassRecords(stud, recs, title)}
      />

    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  headerRightBtn: {
    marginRight: 16,
    padding: 4,
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
  studentBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  printBarBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
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
    paddingHorizontal: 10,
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
  keyboardAvoidContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalScrollWithKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 36,
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
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearBtnText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: '600',
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.roundness,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  dateSelectorActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  selectorContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSelectorText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  placeholderText: {
    color: theme.colors.outline,
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
  studentBarLeft: {
    flex: 1,
  },
  printBarIcon: {
    marginRight: 4,
  },
  emptyFolderIcon: {
    marginBottom: 16,
  },
});
