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
  Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Database } from '../database/Database';
import {
  printStudentProfile,
  shareStudentProfile,
  printClassRecords,
  shareClassRecords
} from '../services/PrintService';
import { useTheme } from '../context/ThemeContext';
import { getTodayFormatted } from '../utils/dateUtils';
import StudentStatusModal from '../components/modals/StudentStatusModal';
import RecordPrintModal from '../components/modals/RecordPrintModal';
import Separator from '../components/Separator';
import ActionMenuItem from '../components/ActionMenuItem';
import FloatingActionButton from '../components/FloatingActionButton';
import StatusBadge from '../components/StatusBadge';

export default function StudentListScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

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

  // 수업일지 출력 모달용 기록 목록
  const [selectedStudentRecords, setSelectedStudentRecords] = useState([]);

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
    const recs = await Database.getRecordsByStudent(selectedStudent.id);
    setSelectedStudentRecords(recs || []);
    setPrintOptionModalVisible(true);
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
            <StatusBadge
              status={isPaused ? 'paused' : 'active'}
              size="sm"
              style={styles.statusChipMargin}
            />
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
      <FloatingActionButton
        icon="user-plus"
        label="학생 추가"
        onPress={() => navigation.navigate('StudentDetail')}
      />

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
                <ActionMenuItem
                  icon="book-open"
                  iconColor={theme.colors.primary}
                  iconBgColor={theme.colors.primary + '1F'}
                  title="수업일지 보기 / 작성"
                  subtitle="학생의 수업 기록과 일지를 관리합니다"
                  onPress={handleNavigateToRecord}
                />

                {/* 메뉴 2: 학생 정보 수정 */}
                <ActionMenuItem
                  icon="edit-3"
                  iconColor="#0284C7"
                  iconBgColor="#E0F2FE"
                  title="학생 정보 수정"
                  subtitle="연락처, 주소, 학부모 정보를 수정합니다"
                  onPress={handleNavigateToDetail}
                />

                {/* 메뉴 3: 학생 카드 출력 */}
                <ActionMenuItem
                  icon="user-check"
                  iconColor="#059669"
                  iconBgColor="#ECFDF5"
                  title="학생 카드 출력"
                  subtitle="인적사항 및 학부모 정보 카드를 인쇄/공유합니다"
                  onPress={handleOpenStudentPrint}
                />

                {/* 메뉴 4: 수업일지 보고서 출력 */}
                <ActionMenuItem
                  icon="printer"
                  iconColor="#DB2777"
                  iconBgColor="#FDF2F8"
                  title="수업일지 보고서 출력"
                  subtitle="전체 수업 기록 일지를 인쇄하거나 PDF로 공유합니다"
                  onPress={handleOpenRecordsPrint}
                />

                {/* 메뉴 5: 상태에 따른 휴회 처리 또는 재수강 시작 */}
                {selectedStudent.status === 'paused' ? (
                  <ActionMenuItem
                    icon="play-circle"
                    iconColor="#16A34A"
                    iconBgColor="#DCFCE7"
                    title="재수강(복귀) 시작"
                    subtitle="학생의 새로운 수강 차수를 시작하고 재원생으로 전환합니다"
                    onPress={handleOpenResumeModal}
                  />
                ) : (
                  <ActionMenuItem
                    icon="pause-circle"
                    iconColor="#EA580C"
                    iconBgColor="#FFEDD5"
                    title="휴회 처리"
                    subtitle="현재 수강 차수를 마감하고 휴회 상태로 전환합니다"
                    onPress={handleOpenPauseModal}
                  />
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 휴회 처리 입력 모달 */}
      <StudentStatusModal
        visible={pauseModalVisible}
        type="pause"
        studentName={selectedStudent?.name}
        date={pauseEndDate}
        onDateChange={setPauseEndDate}
        reason={pauseReason}
        onReasonChange={setPauseReason}
        onConfirm={handleConfirmPause}
        onClose={() => setPauseModalVisible(false)}
      />

      {/* 재수강 시작 입력 모달 */}
      <StudentStatusModal
        visible={resumeModalVisible}
        type="resume"
        studentName={selectedStudent?.name}
        date={resumeStartDate}
        onDateChange={setResumeStartDate}
        reason={resumeReason}
        onReasonChange={setResumeReason}
        onConfirm={handleConfirmResume}
        onClose={() => setResumeModalVisible(false)}
      />

      {/* 인쇄 및 PDF 공유 방식 선택 공통 모달 */}
      <RecordPrintModal
        visible={printOptionModalVisible}
        onClose={() => setPrintOptionModalVisible(false)}
        printType={printType}
        student={selectedStudent}
        records={selectedStudentRecords}
        onPrintStudent={(stud) => printStudentProfile(stud)}
        onShareStudent={(stud) => shareStudentProfile(stud)}
        onPrintRecords={(stud, recs, title) => {
          if (!recs.length) {
            Alert.alert('알림', `${stud?.name || '학생'} 학생의 해당 기간 수업 일지가 없습니다.`);
            return;
          }
          printClassRecords(stud, recs, title);
        }}
        onShareRecords={(stud, recs, title) => {
          if (!recs.length) {
            Alert.alert('알림', `${stud?.name || '학생'} 학생의 해당 기간 수업 일지가 없습니다.`);
            return;
          }
          shareClassRecords(stud, recs, title);
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
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
  searchIcon: {
    marginRight: 8,
  },
  addBtnIcon: {
    marginRight: 4,
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
  statusChipMargin: {
    marginLeft: 6,
  },
  termSummaryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
});
