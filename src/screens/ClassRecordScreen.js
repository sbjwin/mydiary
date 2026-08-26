import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
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
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import { Database } from '../database/Database';
import { printClassRecords, shareClassRecords } from '../services/PrintService';
import { theme } from '../theme';

const PAGE_SIZE = 15;

// 수업 시간 선택 GUI용 상수
const MORNING_HOURS = [
  { hour24: 6, label: '06시' },
  { hour24: 7, label: '07시' },
  { hour24: 8, label: '08시' },
  { hour24: 9, label: '09시' },
  { hour24: 10, label: '10시' },
  { hour24: 11, label: '11시' },
  { hour24: 12, label: '12시' },
];

const AFTERNOON_HOURS = [
  { hour24: 13, label: '13시 (1시)' },
  { hour24: 14, label: '14시 (2시)' },
  { hour24: 15, label: '15시 (3시)' },
  { hour24: 16, label: '16시 (4시)' },
  { hour24: 17, label: '17시 (5시)' },
  { hour24: 18, label: '18시 (6시)' },
  { hour24: 19, label: '19시 (7시)' },
  { hour24: 20, label: '20시 (8시)' },
  { hour24: 21, label: '21시 (9시)' },
  { hour24: 22, label: '22시 (10시)' },
  { hour24: 23, label: '23시 (11시)' },
];

const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const QUICK_TIME_PRESETS = [
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

export default function ClassRecordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { studentId, recordId, selectedDate, initialDate, initialTime, initialCourse } = route.params || {};

  const [student, setStudent] = useState(null);

  // 전체 일지 리스트와 화면에 보여질 리스트(무한 스크롤 용)
  const [allRecords, setAllRecords] = useState([]);
  const [displayedRecords, setDisplayedRecords] = useState([]);
  const [page, setPage] = useState(1);

  // 출력 모달 및 기간 필터 상태 ('all': 전체, '1m': 최근 1개월, '3m': 최근 3개월, 'current_month': 이번 달, 'custom': 직접 설정)
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('all');

  const getTodayFormatted = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [customEndDate, setCustomEndDate] = useState(getTodayFormatted());
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'start' | 'end' | null

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
  }, [navigation]);

  // 필터링된 일지 목록 및 기간명 계산
  const { filteredRecordsForPrint, periodTitle } = useMemo(() => {
    if (!allRecords.length) {
      return { filteredRecordsForPrint: [], periodTitle: '전체 기간' };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (periodFilter === 'custom') {
      const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
      const end = customStartDate <= customEndDate ? customEndDate : customStartDate;
      const filtered = allRecords.filter(r => r.class_date >= start && r.class_date <= end);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `지정 기간 (${start} ~ ${end})`,
      };
    }

    if (periodFilter === '1m') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      const limitStr = oneMonthAgo.toISOString().split('T')[0];
      const filtered = allRecords.filter(r => r.class_date >= limitStr);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `최근 1개월 (${limitStr} ~ ${todayStr})`,
      };
    }

    if (periodFilter === '3m') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      const limitStr = threeMonthsAgo.toISOString().split('T')[0];
      const filtered = allRecords.filter(r => r.class_date >= limitStr);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `최근 3개월 (${limitStr} ~ ${todayStr})`,
      };
    }

    if (periodFilter === 'current_month') {
      const yearMonth = todayStr.substring(0, 7); // YYYY-MM
      const filtered = allRecords.filter(r => r.class_date && r.class_date.startsWith(yearMonth));
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `${today.getFullYear()}년 ${today.getMonth() + 1}월`,
      };
    }

    // 기본: 전체 기간
    const sorted = [...allRecords].sort((a, b) => a.class_date.localeCompare(b.class_date));
    const start = sorted[0]?.class_date || todayStr;
    const end = sorted[sorted.length - 1]?.class_date || todayStr;
    return {
      filteredRecordsForPrint: allRecords,
      periodTitle: `전체 기간 (${start} ~ ${end})`,
    };
  }, [allRecords, periodFilter, customStartDate, customEndDate]);

  // 개별 기록 작성/수정 모달 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingCourse, setEditingCourse] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 시간 파싱 헬퍼 (HH:mm 포맷)
  const parsedTime = useMemo(() => {
    if (!editingTime) {
      return { ampm: '오전', hour24: 10, minute: '00', isEmpty: true };
    }
    const match = editingTime.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = match[2];
      return {
        ampm: h >= 12 ? '오후' : '오전',
        hour24: h,
        minute: m,
        isEmpty: false,
      };
    }
    return { ampm: '오후', hour24: 14, minute: '00', isEmpty: false };
  }, [editingTime]);

  // 오전/오후 변경 핸들러
  const handleTimeAmpmChange = (newAmpm) => {
    let targetHour = parsedTime.hour24;
    if (newAmpm === '오전' && targetHour >= 12) {
      targetHour = targetHour === 12 ? 0 : targetHour - 12;
    } else if (newAmpm === '오후' && targetHour < 12) {
      targetHour = targetHour === 0 ? 12 : targetHour + 12;
    }
    const m = parsedTime.minute || '00';
    setEditingTime(`${String(targetHour).padStart(2, '0')}:${m}`);
  };

  // 시(Hour) 선택 핸들러
  const handleTimeHourChange = (h24) => {
    const m = parsedTime.minute || '00';
    setEditingTime(`${String(h24).padStart(2, '0')}:${m}`);
  };

  // 분(Minute) 선택 핸들러
  const handleTimeMinuteChange = (mStr) => {
    const h24 = parsedTime.hour24;
    setEditingTime(`${String(h24).padStart(2, '0')}:${mStr}`);
  };

  // 기록 추가 모달 열기
  const openAddModal = useCallback((dateStr = '', timeStr = '', courseStr = '') => {
    const today = dateStr || getTodayFormatted();
    setEditingRecord(null);
    setEditingDate(today);
    setEditingTime(timeStr || '');
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
    setEditingTime(record.class_time || '');
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
          openAddModal(targetDate, initialTime, initialCourse || (stud?.school_grade ? `${stud.school_grade} 과정` : ''));
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
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => openAddModal()}
        >
          <Feather name="plus" size={20} color={theme.colors.onPrimary} style={styles.fabPlusIcon} />
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
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
                  style={[styles.dateSelector, showDatePicker && styles.dateSelectorActive]}
                  onPress={() => {
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
                    setShowTimePicker(!showTimePicker);
                    if (!showTimePicker) setShowDatePicker(false);
                  }}
                >
                  <View style={styles.selectorContentRow}>
                    <Text style={[styles.dateSelectorText, !editingTime && styles.placeholderText]}>
                      ⏰ {editingTime || '수업 시간 선택'}
                    </Text>
                    <Feather
                      name={showTimePicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.outline}
                    />
                  </View>
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={styles.inlineTimePicker}>
                    {/* 1. 빠른 프리셋 */}
                    <Text style={styles.timePickerSectionTitle}>⚡ 빠른 선택</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.quickPresetScroll}
                    >
                      {QUICK_TIME_PRESETS.map((preset) => {
                        const isSelected = editingTime === preset;
                        return (
                          <TouchableOpacity
                            key={preset}
                            style={[
                              styles.quickPresetChip,
                              isSelected && styles.quickPresetChipActive,
                            ]}
                            onPress={() => {
                              setEditingTime(preset);
                            }}
                          >
                            <Text
                              style={[
                                styles.quickPresetText,
                                isSelected && styles.quickPresetTextActive,
                              ]}
                            >
                              {preset}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* 2. 오전/오후 탭 */}
                    <View style={styles.timeAmpmRow}>
                      <TouchableOpacity
                        style={[
                          styles.timeAmpmTab,
                          parsedTime.ampm === '오전' && styles.timeAmpmTabActive,
                        ]}
                        onPress={() => handleTimeAmpmChange('오전')}
                      >
                        <Text
                          style={[
                            styles.timeAmpmTabText,
                            parsedTime.ampm === '오전' && styles.timeAmpmTabTextActive,
                          ]}
                        >
                          오전 (AM)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.timeAmpmTab,
                          parsedTime.ampm === '오후' && styles.timeAmpmTabActive,
                        ]}
                        onPress={() => handleTimeAmpmChange('오후')}
                      >
                        <Text
                          style={[
                            styles.timeAmpmTabText,
                            parsedTime.ampm === '오후' && styles.timeAmpmTabTextActive,
                          ]}
                        >
                          오후 (PM)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 3. 시간(시) 선택 그리드 */}
                    <Text style={styles.timePickerSectionTitle}>
                      {parsedTime.ampm === '오전' ? '오전 시간 (시)' : '오후 시간 (시)'}
                    </Text>
                    <View style={styles.timeGridRow}>
                      {(parsedTime.ampm === '오전' ? MORNING_HOURS : AFTERNOON_HOURS).map((h) => {
                        const isSelected = parsedTime.hour24 === h.hour24 && !parsedTime.isEmpty;
                        return (
                          <TouchableOpacity
                            key={h.hour24}
                            style={[
                              styles.timeGridBtn,
                              isSelected && styles.timeGridBtnActive,
                            ]}
                            onPress={() => handleTimeHourChange(h.hour24)}
                          >
                            <Text
                              style={[
                                styles.timeGridBtnText,
                                isSelected && styles.timeGridBtnTextActive,
                              ]}
                            >
                              {h.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* 4. 분(Minute) 선택 그리드 */}
                    <Text style={styles.timePickerSectionTitle}>분 (Min)</Text>
                    <View style={styles.timeGridRow}>
                      {MINUTE_OPTIONS.map((minStr) => {
                        const isSelected = parsedTime.minute === minStr && !parsedTime.isEmpty;
                        return (
                          <TouchableOpacity
                            key={minStr}
                            style={[
                              styles.timeGridBtn,
                              isSelected && styles.timeGridBtnActive,
                            ]}
                            onPress={() => handleTimeMinuteChange(minStr)}
                          >
                            <Text
                              style={[
                                styles.timeGridBtnText,
                                isSelected && styles.timeGridBtnTextActive,
                              ]}
                            >
                              {minStr}분
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* 선택 완료 버튼 */}
                    <TouchableOpacity
                      style={styles.timeConfirmBtn}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.timeConfirmBtnText}>
                        {editingTime ? `${editingTime} 선택 완료` : '선택 완료'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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
        </KeyboardAvoidingView>
      </Modal>

        {/* 수업 일지 출력 모달 (기간 선택 + 프린터 인쇄 vs PDF 공유) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={printModalVisible}
          onRequestClose={() => setPrintModalVisible(false)}
          statusBarTranslucent
        >
          <TouchableOpacity
            style={styles.actionModalOverlay}
            activeOpacity={1}
            onPress={() => setPrintModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.actionModalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.actionModalHeader}>
                  <View style={styles.actionModalTitleContainer}>
                    <Text style={styles.actionModalTitle}>수업 일지 보고서 출력</Text>
                    <Text style={styles.actionModalSubtitle}>
                      {student?.name || '학생'} 학생의 수업 기록 ({filteredRecordsForPrint.length}건 선택됨)
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setPrintModalVisible(false)} style={styles.actionModalCloseBtn}>
                    <Feather name="x" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* 기간 필터 선택 칩 */}
                <Text style={styles.filterSectionLabel}>출력 기간 선택</Text>
                <View style={styles.filterChipGroup}>
                  <TouchableOpacity
                    style={[styles.filterChip, periodFilter === 'all' && styles.filterChipActive]}
                    onPress={() => {
                      setPeriodFilter('all');
                      setActiveDatePicker(null);
                    }}
                  >
                    <Text style={[styles.filterChipText, periodFilter === 'all' && styles.filterChipTextActive]}>
                      전체 기간
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, periodFilter === 'current_month' && styles.filterChipActive]}
                    onPress={() => {
                      setPeriodFilter('current_month');
                      setActiveDatePicker(null);
                    }}
                  >
                    <Text style={[styles.filterChipText, periodFilter === 'current_month' && styles.filterChipTextActive]}>
                      이번 달
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, periodFilter === '1m' && styles.filterChipActive]}
                    onPress={() => {
                      setPeriodFilter('1m');
                      setActiveDatePicker(null);
                    }}
                  >
                    <Text style={[styles.filterChipText, periodFilter === '1m' && styles.filterChipTextActive]}>
                      최근 1개월
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, periodFilter === '3m' && styles.filterChipActive]}
                    onPress={() => {
                      setPeriodFilter('3m');
                      setActiveDatePicker(null);
                    }}
                  >
                    <Text style={[styles.filterChipText, periodFilter === '3m' && styles.filterChipTextActive]}>
                      최근 3개월
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, periodFilter === 'custom' && styles.filterChipActive]}
                    onPress={() => {
                      setPeriodFilter('custom');
                      setActiveDatePicker(null);
                    }}
                  >
                    <Text style={[styles.filterChipText, periodFilter === 'custom' && styles.filterChipTextActive]}>
                      직접 설정
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 직접 설정 선택 시 시작일 ~ 종료일 선택기 */}
                {periodFilter === 'custom' && (
                  <View style={styles.customDateContainer}>
                    <View style={styles.customDateRow}>
                      <TouchableOpacity
                        style={[
                          styles.customDateBtn,
                          activeDatePicker === 'start' && styles.customDateBtnActive
                        ]}
                        onPress={() => setActiveDatePicker(activeDatePicker === 'start' ? null : 'start')}
                      >
                        <Text style={styles.customDateLabel}>시작일</Text>
                        <Text style={styles.customDateText}>{customStartDate}</Text>
                      </TouchableOpacity>

                      <Text style={styles.customDateTilde}>~</Text>

                      <TouchableOpacity
                        style={[
                          styles.customDateBtn,
                          activeDatePicker === 'end' && styles.customDateBtnActive
                        ]}
                        onPress={() => setActiveDatePicker(activeDatePicker === 'end' ? null : 'end')}
                      >
                        <Text style={styles.customDateLabel}>종료일</Text>
                        <Text style={styles.customDateText}>{customEndDate}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 날짜 선택 인라인 캘린더 */}
                    {activeDatePicker && (
                      <View style={styles.inlineCustomCalendar}>
                        <View style={styles.inlineCustomCalendarHeader}>
                          <Text style={styles.inlineCustomCalendarTitle}>
                            {activeDatePicker === 'start' ? '시작 날짜 선택' : '종료 날짜 선택'}
                          </Text>
                        </View>
                        <Calendar
                          current={activeDatePicker === 'start' ? customStartDate : customEndDate}
                          onDayPress={(day) => {
                            if (activeDatePicker === 'start') {
                              setCustomStartDate(day.dateString);
                              if (day.dateString > customEndDate) {
                                setCustomEndDate(day.dateString);
                              }
                            } else {
                              setCustomEndDate(day.dateString);
                              if (day.dateString < customStartDate) {
                                setCustomStartDate(day.dateString);
                              }
                            }
                            setActiveDatePicker(null);
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
                )}

                {/* 선택된 대상 요약 배너 */}
                <View style={styles.summaryBadgeBox}>
                  <Feather name="info" size={14} color={theme.colors.primary} style={styles.summaryBadgeIcon} />
                  <Text style={styles.summaryBadgeText}>
                    조회: {periodTitle} ({filteredRecordsForPrint.length}회차 기록)
                  </Text>
                </View>

                {/* 메뉴 1: 무선/유선 프린터로 인쇄 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={async () => {
                    setPrintModalVisible(false);
                    await printClassRecords(student, filteredRecordsForPrint, periodTitle);
                  }}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
                    <Feather name="printer" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>프린터로 인쇄 (A4)</Text>
                    <Text style={styles.actionMenuSub}>Wi-Fi 프린터 연결 또는 시스템 인쇄 창을 엽니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 2: PDF 파일 공유 (카톡/메시지) */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={async () => {
                    setPrintModalVisible(false);
                    await shareClassRecords(student, filteredRecordsForPrint, periodTitle);
                  }}
                >
                  <View style={[styles.actionIconBadge, styles.pdfShareIconBadge]}>
                    <Feather name="share-2" size={22} color="#0284C7" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>PDF 파일 공유 (카톡/메시지)</Text>
                    <Text style={styles.actionMenuSub}>학부모님 카톡, 문자, 이메일로 보고서를 발송합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
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
  inlineTimePicker: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.secondaryContainer,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.white,
    padding: 12,
  },
  timePickerSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  quickPresetScroll: {
    paddingVertical: 2,
    marginBottom: 8,
  },
  quickPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceVariant,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
  },
  quickPresetChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickPresetText: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  quickPresetTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  timeAmpmRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
    marginTop: 4,
  },
  timeAmpmTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeAmpmTabActive: {
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  timeAmpmTabText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  timeAmpmTabTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  timeGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  timeGridBtn: {
    flexBasis: '22.5%',
    flexGrow: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant + '80',
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
  },
  timeGridBtnActive: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.primary,
  },
  timeGridBtnText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  timeGridBtnTextActive: {
    color: theme.colors.onSecondaryContainer,
    fontWeight: 'bold',
  },
  timeConfirmBtn: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeConfirmBtnText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: 'bold',
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
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  actionModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  actionModalTitleContainer: {
    flex: 1,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  actionModalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actionModalCloseBtn: {
    padding: 4,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  filterChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  summaryBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryBadgeText: {
    fontSize: 12.5,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  customDateContainer: {
    backgroundColor: theme.colors.surfaceVariant + '60',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customDateBtn: {
    flex: 1,
    backgroundColor: theme.colors.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: 'center',
  },
  customDateBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  customDateLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  customDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  customDateTilde: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginHorizontal: 8,
  },
  inlineCustomCalendar: {
    marginTop: 10,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
  },
  inlineCustomCalendarHeader: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
    marginBottom: 6,
    alignItems: 'center',
  },
  inlineCustomCalendarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surfaceVariant + '80',
    marginBottom: 12,
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionMenuTextContainer: {
    flex: 1,
  },
  actionMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  actionMenuSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
  fabPlusIcon: {
    marginRight: 4,
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  summaryBadgeIcon: {
    marginRight: 6,
  },
  pdfShareIconBadge: {
    backgroundColor: '#E0F2FE',
  },
});
