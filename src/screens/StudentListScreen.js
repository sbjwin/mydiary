import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import { Database } from '../database/Database';
import {
  printStudentProfile,
  shareStudentProfile,
  printClassRecords,
  shareClassRecords
} from '../services/PrintService';
import { theme } from '../theme';

const Separator = () => <View style={styles.separator} />;

export default function StudentListScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const getTodayFormatted = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 수강 상태 필터: 'active'(재원생) | 'paused'(휴회생) | 'all'(전체)
  const [statusFilter, setStatusFilter] = useState('active');

  // 모달 제어용 상태
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [printOptionModalVisible, setPrintOptionModalVisible] = useState(false);
  const [printType, setPrintType] = useState('student'); // 'student' 또는 'records'

  // 휴회 처리 모달 상태
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [pauseEndDate, setPauseEndDate] = useState(getTodayFormatted());
  const [pauseReason, setPauseReason] = useState('');

  // 재수강 시작 모달 상태
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [resumeStartDate, setResumeStartDate] = useState(getTodayFormatted());
  const [resumeReason, setResumeReason] = useState('');

  // 학생 수 집계 (재원생 / 휴회생 / 전체)
  const { activeCount, pausedCount, totalCount } = useMemo(() => {
    let active = 0;
    let paused = 0;
    students.forEach((s) => {
      if (s.status === 'paused') {
        paused++;
      } else {
        active++;
      }
    });
    return { activeCount: active, pausedCount: paused, totalCount: students.length };
  }, [students]);

  // 수업일지 출력 기간 필터 관련 상태
  const [selectedStudentRecords, setSelectedStudentRecords] = useState([]);
  const [periodFilter, setPeriodFilter] = useState('all');
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

  // 필터링된 일지 목록 및 기간명 계산
  const { filteredRecordsForPrint, periodTitle } = useMemo(() => {
    if (!selectedStudentRecords.length) {
      return { filteredRecordsForPrint: [], periodTitle: '전체 기간' };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (periodFilter === 'custom') {
      const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
      const end = customStartDate <= customEndDate ? customEndDate : customStartDate;
      const filtered = selectedStudentRecords.filter(r => r.class_date >= start && r.class_date <= end);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `지정 기간 (${start} ~ ${end})`,
      };
    }

    if (periodFilter === '1m') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      const limitStr = oneMonthAgo.toISOString().split('T')[0];
      const filtered = selectedStudentRecords.filter(r => r.class_date >= limitStr);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `최근 1개월 (${limitStr} ~ ${todayStr})`,
      };
    }

    if (periodFilter === '3m') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      const limitStr = threeMonthsAgo.toISOString().split('T')[0];
      const filtered = selectedStudentRecords.filter(r => r.class_date >= limitStr);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `최근 3개월 (${limitStr} ~ ${todayStr})`,
      };
    }

    if (periodFilter === 'current_month') {
      const yearMonth = todayStr.substring(0, 7); // YYYY-MM
      const filtered = selectedStudentRecords.filter(r => r.class_date && r.class_date.startsWith(yearMonth));
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `${today.getFullYear()}년 ${today.getMonth() + 1}월`,
      };
    }

    // 기본: 전체 기간
    const sorted = [...selectedStudentRecords].sort((a, b) => a.class_date.localeCompare(b.class_date));
    const start = sorted[0]?.class_date || todayStr;
    const end = sorted[sorted.length - 1]?.class_date || todayStr;
    return {
      filteredRecordsForPrint: selectedStudentRecords,
      periodTitle: `전체 기간 (${start} ~ ${end})`,
    };
  }, [selectedStudentRecords, periodFilter, customStartDate, customEndDate]);

  // 학생 클릭 처리: 선택 모달 노출
  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setActionModalVisible(true);
  };

  // 수업일지 화면으로 이동
  const handleNavigateToRecord = () => {
    if (!selectedStudent) return;
    setActionModalVisible(false);
    navigation.navigate('ClassRecord', { studentId: selectedStudent.id });
  };

  // 학생 정보 수정 화면으로 이동
  const handleNavigateToDetail = () => {
    if (!selectedStudent) return;
    setActionModalVisible(false);
    navigation.navigate('StudentDetail', { studentId: selectedStudent.id });
  };

  // 학생 카드 출력 모달 열기
  const handleOpenStudentPrint = () => {
    setActionModalVisible(false);
    setPrintType('student');
    setPrintOptionModalVisible(true);
  };

  // 수업일지 출력 모달 열기
  const handleOpenRecordsPrint = async () => {
    if (!selectedStudent) return;
    setActionModalVisible(false);
    setPrintType('records');
    setPeriodFilter('all');
    setActiveDatePicker(null);
    const recs = await Database.getRecordsByStudent(selectedStudent.id);
    setSelectedStudentRecords(recs || []);
    setPrintOptionModalVisible(true);
  };

  // 인쇄 실행
  const handleExecutePrint = async () => {
    if (!selectedStudent) return;
    setPrintOptionModalVisible(false);

    if (printType === 'student') {
      await printStudentProfile(selectedStudent);
    } else {
      if (filteredRecordsForPrint.length === 0) {
        Alert.alert('알림', `${selectedStudent.name} 학생의 해당 기간 수업 일지가 없습니다.`);
        return;
      }
      await printClassRecords(selectedStudent, filteredRecordsForPrint, periodTitle);
    }
  };

  // PDF 공유 실행
  const handleExecuteShare = async () => {
    if (!selectedStudent) return;
    setPrintOptionModalVisible(false);

    if (printType === 'student') {
      await shareStudentProfile(selectedStudent);
    } else {
      if (filteredRecordsForPrint.length === 0) {
        Alert.alert('알림', `${selectedStudent.name} 학생의 해당 기간 수업 일지가 없습니다.`);
        return;
      }
      await shareClassRecords(selectedStudent, filteredRecordsForPrint, periodTitle);
    }
  };

  // 학생 목록 가져오기
  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await Database.getAllStudents();
      // 가나다순 정렬
      const sortedData = data.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      setStudents(sortedData);
      setFilteredStudents(sortedData);
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  };

  // 포커스되거나 처음 들어올 때 로드
  useEffect(() => {
    if (isFocused) {
      loadStudents();
    }
  }, [isFocused]);

  // 휴회 처리 모달 열기
  const handleOpenPauseModal = () => {
    setActionModalVisible(false);
    setPauseEndDate(getTodayFormatted());
    setPauseReason('');
    setPauseModalVisible(true);
  };

  // 재수강 시작 모달 열기
  const handleOpenResumeModal = () => {
    setActionModalVisible(false);
    setResumeStartDate(getTodayFormatted());
    const nextTerm = (selectedStudent?.terms?.length || 0) + 1;
    setResumeReason(`${nextTerm}차 재수강`);
    setResumeModalVisible(true);
  };

  // 휴회 확정 저장
  const handleConfirmPause = async () => {
    if (!selectedStudent) return;
    try {
      await Database.pauseStudentTerm(selectedStudent.id, {
        endDate: pauseEndDate,
        reason: pauseReason.trim(),
      });
      setPauseModalVisible(false);
      Alert.alert('완료', `${selectedStudent.name} 학생이 휴회 처리되었습니다.`);
      await loadStudents();
    } catch (e) {
      console.error('Failed to pause student:', e);
      Alert.alert('오류', '휴회 처리에 실패했습니다.');
    }
  };

  // 재수강 확정 저장
  const handleConfirmResume = async () => {
    if (!selectedStudent) return;
    try {
      await Database.resumeStudentTerm(selectedStudent.id, {
        startDate: resumeStartDate,
        reason: resumeReason.trim(),
      });
      setResumeModalVisible(false);
      Alert.alert('완료', `${selectedStudent.name} 학생의 재수강이 시작되었습니다.`);
      await loadStudents();
    } catch (e) {
      console.error('Failed to resume student:', e);
      Alert.alert('오류', '재수강 처리에 실패했습니다.');
    }
  };

  // 검색 쿼리 및 수강 상태(statusFilter)가 변경될 때 필터링
  useEffect(() => {
    let baseList = students;

    // 1. 수강 상태 필터링
    if (statusFilter === 'active') {
      baseList = baseList.filter((s) => s.status !== 'paused');
    } else if (statusFilter === 'paused') {
      baseList = baseList.filter((s) => s.status === 'paused');
    }

    // 2. 검색어 필터링
    if (searchQuery.trim() === '') {
      setFilteredStudents(baseList);
    } else {
      const q = searchQuery.trim().toLowerCase();
      const qDigits = q.replace(/-/g, '');
      const filtered = baseList.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const schoolMatch = s.school_grade && s.school_grade.toLowerCase().includes(q);
        const mobileMatch = s.mobile_phone && s.mobile_phone.replace(/-/g, '').includes(qDigits);
        const phoneMatch = s.phone_number && s.phone_number.replace(/-/g, '').includes(qDigits);
        return nameMatch || schoolMatch || mobileMatch || phoneMatch;
      });
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students, statusFilter]);

  const renderStudentItem = ({ item }) => {
    const isPaused = item.status === 'paused';
    const terms = Array.isArray(item.terms) && item.terms.length > 0 ? item.terms : [];
    const currentTerm = terms.length > 0 ? terms[terms.length - 1] : null;

    let termSummary = '';
    if (isPaused) {
      const lastEndDate = currentTerm?.end_date || '휴회';
      termSummary = `휴회 (${lastEndDate}~)`;
      if (currentTerm?.reason) {
        termSummary += ` · ${currentTerm.reason}`;
      }
    } else {
      const termNum = item.current_term_number || currentTerm?.term_number || 1;
      const startDate = currentTerm?.start_date || item.first_enrolled_date || '';
      termSummary = `${termNum}차 수강중` + (startDate ? ` (${startDate}~)` : '');
    }

    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() => handleStudentPress(item)}
      >
        <View style={styles.studentInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.studentName}>{item.name}</Text>
            {item.school_grade ? (
              <Text style={styles.schoolGrade}>{item.school_grade}</Text>
            ) : null}
            <View
              style={[
                styles.statusChip,
                isPaused ? styles.statusChipPaused : styles.statusChipActive,
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  isPaused ? styles.statusChipTextPaused : styles.statusChipTextActive,
                ]}
              >
                {isPaused ? '휴회' : '재원'}
              </Text>
            </View>
          </View>
          <Text style={styles.termSummaryText}>{termSummary}</Text>
          <Text style={styles.mobilePhone}>
            {item.mobile_phone ? `📱 ${item.mobile_phone}` : item.phone_number ? `📞 ${item.phone_number}` : '전화번호 없음'}
          </Text>
        </View>
        <View style={styles.arrowIcon}>
          <Feather name="chevron-right" size={18} color={theme.colors.outline} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 바 */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 학교, 전화번호 검색..."
          placeholderTextColor={theme.colors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Feather name="x" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 상태 필터 세그먼트 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, statusFilter === 'active' && styles.tabButtonActive]}
          onPress={() => setStatusFilter('active')}
        >
          <Text style={[styles.tabButtonText, statusFilter === 'active' && styles.tabButtonTextActive]}>
            {`재원생 (${activeCount})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, statusFilter === 'paused' && styles.tabButtonActive]}
          onPress={() => setStatusFilter('paused')}
        >
          <Text style={[styles.tabButtonText, statusFilter === 'paused' && styles.tabButtonTextActive]}>
            {`휴회생 (${pausedCount})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, statusFilter === 'all' && styles.tabButtonActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.tabButtonText, statusFilter === 'all' && styles.tabButtonTextActive]}>
            {`전체 (${totalCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 목록 본문 */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? '검색 결과에 맞는 학생이 없습니다.' : '등록된 학생 주소록이 없습니다.'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.addButtonInline}
              onPress={() => navigation.navigate('StudentDetail')}
            >
              <Feather name="plus" size={16} color={theme.colors.onPrimary} style={styles.addBtnIcon} />
              <Text style={styles.addButtonInlineText}>새 학생 등록하기</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
        />
      )}

      {/* 새 학생 등록 FAB */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('StudentDetail')}
      >
        <Feather name="user-plus" size={18} color={theme.colors.onPrimary} style={styles.fabUserIcon} />
        <Text style={styles.fabButtonText}>학생 추가</Text>
      </TouchableOpacity>

      {/* 학생 메뉴 선택 모달 (수업일지 보기 vs 정보 수정) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedStudent && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalStudentName}>{selectedStudent.name}</Text>
                    {selectedStudent.school_grade ? (
                      <Text style={styles.modalStudentSub}>{selectedStudent.school_grade}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => setActionModalVisible(false)} style={styles.modalCloseBtn}>
                    <Feather name="x" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* 메뉴 1: 수업일지 보기 / 작성 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleNavigateToRecord}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
                    <Feather name="book-open" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>수업일지 보기 / 작성</Text>
                    <Text style={styles.actionMenuSub}>학생의 수업 기록과 일지를 관리합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 2: 학생 정보 수정 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleNavigateToDetail}
                >
                  <View style={[styles.actionIconBadge, styles.editIconBadge]}>
                    <Feather name="edit-3" size={20} color="#0284C7" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>학생 정보 수정</Text>
                    <Text style={styles.actionMenuSub}>연락처, 주소, 학부모 정보를 수정합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 3: 학생 카드 출력 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleOpenStudentPrint}
                >
                  <View style={[styles.actionIconBadge, styles.studentCardIconBadge]}>
                    <Feather name="user-check" size={20} color="#059669" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>학생 카드 출력</Text>
                    <Text style={styles.actionMenuSub}>인적사항 및 학부모 정보 카드를 인쇄/공유합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 4: 수업일지 보고서 출력 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleOpenRecordsPrint}
                >
                  <View style={[styles.actionIconBadge, styles.recordsPrintIconBadge]}>
                    <Feather name="printer" size={20} color="#DB2777" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>수업일지 보고서 출력</Text>
                    <Text style={styles.actionMenuSub}>전체 수업 기록 일지를 인쇄하거나 PDF로 공유합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 5: 상태에 따른 휴회 처리 또는 재수강 시작 */}
                {selectedStudent.status === 'paused' ? (
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={handleOpenResumeModal}
                  >
                    <View style={[styles.actionIconBadge, styles.resumeIconBadge]}>
                      <Feather name="play-circle" size={20} color="#16A34A" />
                    </View>
                    <View style={styles.actionMenuTextContainer}>
                      <Text style={styles.actionMenuTitle}>재수강(복귀) 시작</Text>
                      <Text style={styles.actionMenuSub}>학생의 새로운 수강 차수를 시작하고 재원생으로 전환합니다</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={handleOpenPauseModal}
                  >
                    <View style={[styles.actionIconBadge, styles.pauseIconBadge]}>
                      <Feather name="pause-circle" size={20} color="#EA580C" />
                    </View>
                    <View style={styles.actionMenuTextContainer}>
                      <Text style={styles.actionMenuTitle}>휴회 처리</Text>
                      <Text style={styles.actionMenuSub}>현재 수강 차수를 마감하고 휴회 상태로 전환합니다</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 휴회 처리 입력 모달 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={pauseModalVisible}
        onRequestClose={() => setPauseModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.centerModalOverlay}
          activeOpacity={1}
          onPress={() => setPauseModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.dialogCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dialogHeader}>
              <Feather name="pause-circle" size={24} color="#EA580C" style={styles.dialogHeaderIcon} />
              <Text style={styles.dialogTitle}>학생 휴회 처리</Text>
            </View>
            <Text style={styles.dialogSubtitle}>
              {`${selectedStudent?.name} 학생을 휴회 상태로 전환합니다.`}
            </Text>

            <Text style={styles.inputLabel}>마지막 수업일 (종료일)</Text>
            <TextInput
              style={styles.dialogInput}
              value={pauseEndDate}
              onChangeText={setPauseEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.outline}
            />

            <Text style={styles.inputLabel}>휴회 사유 (선택 입력)</Text>
            <TextInput
              style={styles.dialogInput}
              value={pauseReason}
              onChangeText={setPauseReason}
              placeholder="예: 여름방학 휴회, 개인 사정 등"
              placeholderTextColor={theme.colors.outline}
            />

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setPauseModalVisible(false)}
              >
                <Text style={styles.dialogCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, styles.dialogPauseBtn]}
                onPress={handleConfirmPause}
              >
                <Text style={styles.dialogConfirmBtnText}>휴회 확정</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 재수강 시작 입력 모달 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={resumeModalVisible}
        onRequestClose={() => setResumeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.centerModalOverlay}
          activeOpacity={1}
          onPress={() => setResumeModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.dialogCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dialogHeader}>
              <Feather name="play-circle" size={24} color="#16A34A" style={styles.dialogHeaderIcon} />
              <Text style={styles.dialogTitle}>재수강(복귀) 시작</Text>
            </View>
            <Text style={styles.dialogSubtitle}>
              {`${selectedStudent?.name} 학생의 새로운 수강 차수를 시작합니다.`}
            </Text>

            <Text style={styles.inputLabel}>재수강 시작일</Text>
            <TextInput
              style={styles.dialogInput}
              value={resumeStartDate}
              onChangeText={setResumeStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.outline}
            />

            <Text style={styles.inputLabel}>재등록 사유/메모 (선택 입력)</Text>
            <TextInput
              style={styles.dialogInput}
              value={resumeReason}
              onChangeText={setResumeReason}
              placeholder="예: 2학기 재등록"
              placeholderTextColor={theme.colors.outline}
            />

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setResumeModalVisible(false)}
              >
                <Text style={styles.dialogCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, styles.dialogResumeBtn]}
                onPress={handleConfirmResume}
              >
                <Text style={styles.dialogConfirmBtnText}>재수강 시작</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 인쇄 및 PDF 공유 방식 선택 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={printOptionModalVisible}
        onRequestClose={() => setPrintOptionModalVisible(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPrintOptionModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedStudent && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleContainer}>
                      <Text style={styles.modalStudentName}>
                        {printType === 'student' ? '학생 정보 카드 출력' : '수업 일지 보고서 출력'}
                      </Text>
                      <Text style={styles.modalStudentSub}>
                        {printType === 'student'
                          ? `${selectedStudent.name} 학생 대상`
                          : `${selectedStudent.name} 학생의 수업 기록 (${filteredRecordsForPrint.length}건 선택됨)`}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setPrintOptionModalVisible(false)} style={styles.modalCloseBtn}>
                      <Feather name="x" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* 수업일지 보고서 출력인 경우에만 기간 선택 영역 노출 */}
                  {printType === 'records' && (
                    <>
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
                    </>
                  )}

                  {/* 옵션 1: 무선/유선 프린터로 인쇄 */}
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={handleExecutePrint}
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

                  {/* 옵션 2: PDF 파일 공유 (카톡/메시지) */}
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={handleExecuteShare}
                  >
                    <View style={[styles.actionIconBadge, styles.pdfShareIconBadge]}>
                      <Feather name="share-2" size={22} color="#0284C7" />
                    </View>
                    <View style={styles.actionMenuTextContainer}>
                      <Text style={styles.actionMenuTitle}>PDF 파일 공유 (카톡/메시지)</Text>
                      <Text style={styles.actionMenuSub}>
                        {printType === 'student'
                          ? '카카오톡, 문자, 이메일로 PDF 문서를 전송합니다'
                          : '학부모님 카톡, 문자, 이메일로 보고서를 발송합니다'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                  </TouchableOpacity>
                </>
              )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    padding: 6,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  addButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.roundness,
  },
  addButtonInlineText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    backgroundColor: theme.colors.white,
    paddingBottom: 80,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.white,
  },
  studentInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  schoolGrade: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mobilePhone: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  arrowIcon: {
    paddingLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
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
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalStudentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modalStudentSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  modalCloseBtn: {
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
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  actionMenuSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  searchIcon: {
    marginRight: 8,
  },
  addBtnIcon: {
    marginRight: 4,
  },
  fabUserIcon: {
    marginRight: 6,
  },
  editIconBadge: {
    backgroundColor: '#E0F2FE',
  },
  studentCardIconBadge: {
    backgroundColor: '#ECFDF5',
  },
  recordsPrintIconBadge: {
    backgroundColor: '#FDF2F8',
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
  resumeIconBadge: {
    backgroundColor: '#DCFCE7',
  },
  pauseIconBadge: {
    backgroundColor: '#FFEDD5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant + '70',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  statusChipActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusChipPaused: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusChipTextActive: {
    color: '#2563EB',
  },
  statusChipTextPaused: {
    color: '#6B7280',
  },
  termSummaryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.white,
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogHeaderIcon: {
    marginRight: 8,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  dialogSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 6,
  },
  dialogInput: {
    backgroundColor: theme.colors.surfaceVariant + '60',
    borderWidth: 1,
    borderColor: theme.colors.outline + '60',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  dialogCancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogPauseBtn: {
    backgroundColor: '#EA580C',
  },
  dialogResumeBtn: {
    backgroundColor: '#16A34A',
  },
  dialogConfirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
});
