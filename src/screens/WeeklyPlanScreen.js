import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
  Linking
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Database, getMondayOfWeek, getDateFromMondayOffset, formatPhoneInfo } from '../database/Database';
import { printWeeklyReport, shareWeeklyReport, shareWeeklyReportDocx } from '../services/PrintService';
import { theme } from '../theme';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const TIME_SLOTS = [
  { label: '오전', hour: 9 },
  { label: '10시', hour: 10 },
  { label: '11시', hour: 11 },
  { label: '12시', hour: 12, isLunch: true },
  { label: '1시', hour: 13 },
  { label: '2시', hour: 14 },
  { label: '3시', hour: 15 },
  { label: '4시', hour: 16 },
  { label: '5시', hour: 17 },
  { label: '6시', hour: 18 },
  { label: '7시', hour: 19 },
  { label: '8시', hour: 20 },
];

// 시작 시간 GUI 선택 팝업용 상수
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
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

export default function WeeklyPlanScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // 현재 선택된 주의 월요일 날짜 (YYYY-MM-DD)
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfWeek(new Date()));
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // 뷰 모드: 'table' (주간 전체 타임테이블) | 'timeline' (요일별 상세 타임라인)
  const [viewMode, setViewMode] = useState('table');
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0(월) ~ 6(일)

  // 하단 부가 업무 섹션 접기/펼치기
  const [bottomNotesExpanded, setBottomNotesExpanded] = useState(false);

  // 모달 제어 상태
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // 편집 중인 수업 항목

  // 수업 추가/편집 폼 상태
  const [formStudentId, setFormStudentId] = useState('');
  const [formStudentName, setFormStudentName] = useState('');
  const [formPaymentType, setFormPaymentType] = useState('지사입금');
  const [formSubject, setFormSubject] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhoneInfo, setFormPhoneInfo] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [formStartTime, setFormStartTime] = useState('10:00');
  const [formStatusNote, setFormStatusNote] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(true); // 매주 계속 반복 vs 이번주만
  const [studentPickerVisible, setStudentPickerVisible] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  // 시작 시간 파싱 헬퍼 (HH:mm 포맷)
  const parsedStartTime = useMemo(() => {
    if (!formStartTime) {
      return { ampm: '오전', hour24: 10, minute: '00', isEmpty: true };
    }
    const match = formStartTime.match(/^(\d{1,2}):(\d{2})/);
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
    return { ampm: '오전', hour24: 10, minute: '00', isEmpty: false };
  }, [formStartTime]);

  // 오전/오후 변경 핸들러
  const handleStartTimeAmpmChange = (newAmpm) => {
    let targetHour = parsedStartTime.hour24;
    if (newAmpm === '오전' && targetHour >= 12) {
      targetHour = targetHour === 12 ? 0 : targetHour - 12;
    } else if (newAmpm === '오후' && targetHour < 12) {
      targetHour = targetHour === 0 ? 12 : targetHour + 12;
    }
    const m = parsedStartTime.minute || '00';
    setFormStartTime(`${String(targetHour).padStart(2, '0')}:${m}`);
  };

  // 시(Hour) 선택 핸들러
  const handleStartTimeHourChange = (h24) => {
    const m = parsedStartTime.minute || '00';
    setFormStartTime(`${String(h24).padStart(2, '0')}:${m}`);
  };

  // 분(Minute) 선택 핸들러
  const handleStartTimeMinuteChange = (mStr) => {
    const h24 = parsedStartTime.hour24;
    setFormStartTime(`${String(h24).padStart(2, '0')}:${mStr}`);
  };

  // 작성된 수업 일지 목록 (실시간 완료 매핑용)
  const [allRecords, setAllRecords] = useState([]);

  // 전화관리 추가 폼
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callName, setCallName] = useState('');
  const [callContent, setCallContent] = useState('');

  // 주간 데이터 로드
  const loadWeeklyData = useCallback(async () => {
    setLoading(true);
    try {
      const allStudents = await Database.getAllStudents();
      // 학생 목록 가나다(이름)순 정렬
      const sortedStudents = (allStudents || []).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'ko')
      );
      setStudents(sortedStudents);

      const records = await Database.getAllRecords();
      setAllRecords(records);

      const plan = await Database.getWeeklyPlan(currentMonday);
      setWeeklyPlan(plan);
    } catch (error) {
      console.error('Failed to load weekly plan:', error);
      Alert.alert('오류', '주간 계획 데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentMonday]);

  useEffect(() => {
    if (isFocused) {
      loadWeeklyData();
    }
  }, [isFocused, loadWeeklyData]);

  // 주차 이동 헬퍼
  const handlePrevWeek = () => {
    setCurrentMonday((prev) => getDateFromMondayOffset(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentMonday((prev) => getDateFromMondayOffset(prev, 7));
  };

  const handleThisWeek = () => {
    setCurrentMonday(getMondayOfWeek(new Date()));
  };

  // 주차 타이틀 포맷팅 (예: 2026년 8월 3주차 (8/17 ~ 8/23))
  const weekTitleInfo = useMemo(() => {
    if (!currentMonday) return { title: '', range: '' };
    const [y, m, d] = currentMonday.split('-').map(Number);
    const endObj = new Date(y, m - 1, d + 6);

    const weekNum = Math.ceil(d / 7);
    const title = `${y}년 ${m}월 ${weekNum}주차`;
    const range = `${m}/${d} ~ ${endObj.getMonth() + 1}/${endObj.getDate()}`;
    return { title, range };
  }, [currentMonday]);

  // 특정 요일(1~7)의 날짜 구하기
  const getDayDateString = (dayOfWeek) => {
    return getDateFromMondayOffset(currentMonday, dayOfWeek - 1);
  };

  // 수업 추가/편집 모달 열기
  const openAddModal = (dayOfWeek = 1, defaultHour = 10) => {
    const formattedHour = String(defaultHour).padStart(2, '0') + ':00';
    setSelectedItem(null);
    setFormStudentId('');
    setFormStudentName('');
    setFormPaymentType('지사입금');
    setFormSubject('');
    setFormAddress('');
    setFormPhoneInfo('');
    setFormDayOfWeek(dayOfWeek);
    setFormStartTime(formattedHour);
    setFormStatusNote('');
    setFormIsRecurring(true);
    setEditModalVisible(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormStudentId(item.studentId || '');
    setFormStudentName(item.studentName || '');
    setFormPaymentType(item.paymentType || '지사입금');
    setFormSubject(item.subject || '');
    setFormAddress(item.address || '');
    setFormPhoneInfo(formatPhoneInfo(item.phoneInfo || ''));
    setFormDayOfWeek(Number(item.dayOfWeek) || 1);
    setFormStartTime(item.startTime || '10:00');
    setFormStatusNote(item.statusNote || '');
    setFormIsRecurring(item.isRecurring !== false);
    setEditModalVisible(true);
  };

  // 학생 선택 시 기본 정보 자동 완성
  const handleSelectStudent = (student) => {
    setFormStudentId(student.id);
    setFormStudentName(student.name || '');
    setFormPaymentType(student.payment_type || '지사입금');
    setFormAddress(student.address || '');

    // 1. 해당 요일 또는 학생 기본 일정에 등록된 과목/시간 확인
    let matchedSubject = '';
    let matchedTime = formStartTime;

    if (Array.isArray(student.default_schedules) && student.default_schedules.length > 0) {
      // 현재 선택된 요일(formDayOfWeek)과 일치하는 스케줄 우선 탐색
      const daySchedule = student.default_schedules.find(
        (s) => Number(s.dayOfWeek) === Number(formDayOfWeek)
      );
      if (daySchedule) {
        if (daySchedule.subject) matchedSubject = daySchedule.subject;
        if (daySchedule.startTime) matchedTime = daySchedule.startTime;
      } else {
        // 일치하는 요일이 없으면 첫 번째 유효 과목 탐색
        const firstWithSubject = student.default_schedules.find((s) => s.subject && s.subject.trim());
        if (firstWithSubject) {
          matchedSubject = firstWithSubject.subject;
        }
      }
    }

    // 2. 기본 일정에 과목이 없다면 가장 최근 수업일지(allRecords)의 과목 확인
    if (!matchedSubject && student.id) {
      const studentRecords = allRecords.filter((r) => r.student_id === student.id && r.course);
      if (studentRecords.length > 0) {
        studentRecords.sort((a, b) => (b.class_date || '').localeCompare(a.class_date || ''));
        if (studentRecords[0]?.course) {
          matchedSubject = studentRecords[0].course;
        }
      }
    }

    setFormSubject(matchedSubject || '');
    setFormStartTime(matchedTime || '10:00');

    // 3. 연락처 정보 구성: (본)000-0000-0000, (모)000-0000-0000, (전화)00-000-0000
    const parentPhone = student.parent_mobile_phone || student.parentMobilePhone;
    const studentPhone = student.mobile_phone || student.mobilePhone;
    const homePhone = student.phone_number || student.phoneNumber;

    const phoneList = [];
    if (studentPhone) {
      phoneList.push(`(본)${studentPhone}`);
    }
    if (parentPhone) {
      phoneList.push(`(모)${parentPhone}`);
    }
    if (homePhone) {
      phoneList.push(`(전화)${homePhone}`);
    }
    setFormPhoneInfo(phoneList.join('\n'));

    setStudentPickerVisible(false);
  };

  // 모달 내 요일 변경 핸들러 (학생이 이미 선택되어 있다면 해당 요일의 정규 수업 일정 정보 자동 연동)
  const handleDaySelect = (newDay) => {
    setFormDayOfWeek(newDay);
    if (formStudentId) {
      const student = students.find((s) => s.id === formStudentId);
      if (student && Array.isArray(student.default_schedules)) {
        const daySchedule = student.default_schedules.find(
          (s) => Number(s.dayOfWeek) === Number(newDay)
        );
        if (daySchedule) {
          if (daySchedule.startTime) setFormStartTime(daySchedule.startTime);
          if (daySchedule.subject) setFormSubject(daySchedule.subject);
        }
      }
    }
  };

  // 특정 수업에 매칭되는 실제 수업 일지 찾기 (완료 여부 판별)
  const getMatchedRecord = useCallback(
    (item) => {
      if (!item) return null;
      return allRecords.find(
        (r) =>
          r.class_date === item.date &&
          ((item.studentId && r.student_id === item.studentId) ||
            r.studentName === item.studentName)
      );
    },
    [allRecords]
  );

  // 수업 항목 저장
  const handleSaveScheduleItem = async () => {
    if (!formStudentName.trim()) {
      Alert.alert('알림', '학생 이름을 입력하거나 선택해 주세요.');
      return;
    }

    const targetDate = getDayDateString(formDayOfWeek);
    const newItem = {
      id: selectedItem ? selectedItem.id : Date.now().toString(),
      studentId: formStudentId || null,
      studentName: formStudentName.trim(),
      paymentType: formPaymentType.trim(),
      subject: formSubject.trim(),
      address: formAddress.trim(),
      phoneInfo: formatPhoneInfo(formPhoneInfo.trim()),
      dayOfWeek: Number(formDayOfWeek),
      date: targetDate,
      startTime: formStartTime.trim() || '10:00',
      duration: 60,
      statusTag: formStatusNote ? '변동' : '정규',
      statusNote: formStatusNote.trim(),
      isDefault: false,
      isRecurring: formIsRecurring,
    };

    let updatedItems = [];
    const currentItems = weeklyPlan?.scheduleItems || [];

    if (selectedItem) {
      updatedItems = currentItems.map((it) => (it.id === selectedItem.id ? newItem : it));
    } else {
      updatedItems = [...currentItems, newItem];
    }

    // 시간 순서대로 정렬
    updatedItems.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

    const updatedPlan = {
      ...weeklyPlan,
      scheduleItems: updatedItems,
    };

    try {
      await Database.saveWeeklyPlan(currentMonday, updatedPlan);

      // 매주 계속 반복으로 설정되고 학생 ID가 있으면 학생 기본 시간표(default_schedules)에도 동기화
      if (formIsRecurring && formStudentId) {
        const student = await Database.getStudentById(formStudentId);
        if (student) {
          const currentScheds = Array.isArray(student.default_schedules)
            ? [...student.default_schedules]
            : [];
          const exists = currentScheds.some(
            (s) => Number(s.dayOfWeek) === Number(formDayOfWeek) && s.startTime === formStartTime
          );
          if (!exists) {
            currentScheds.push({
              id: Date.now().toString(),
              dayOfWeek: Number(formDayOfWeek),
              startTime: formStartTime,
              duration: 60,
              subject: formSubject,
            });
            await Database.updateStudent(formStudentId, { default_schedules: currentScheds });
          }
        }
      }

      setWeeklyPlan(updatedPlan);
      setEditModalVisible(false);
    } catch (e) {
      console.error('Failed to save schedule item:', e);
      Alert.alert('오류', '일정을 저장하는 도중 오류가 발생했습니다.');
    }
  };

  // 수업 항목 삭제
  const handleDeleteScheduleItem = async (itemId) => {
    Alert.alert('수업 일정 삭제', '이번 주 시간표에서 해당 수업을 제외하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const currentItems = weeklyPlan?.scheduleItems || [];
          const updatedItems = currentItems.filter((it) => it.id !== itemId);
          const updatedPlan = { ...weeklyPlan, scheduleItems: updatedItems };

          try {
            await Database.saveWeeklyPlan(currentMonday, updatedPlan);
            setWeeklyPlan(updatedPlan);
            setEditModalVisible(false);
          } catch (e) {
            console.error('Failed to delete schedule item:', e);
            Alert.alert('오류', '삭제 도중 오류가 발생했습니다.');
          }
        },
      },
    ]);
  };

  // 하단 메모(주요사항, 전주결석, 특이사항) 저장
  const handleSaveNotes = async (field, value) => {
    const updatedPlan = {
      ...weeklyPlan,
      [field]: value,
    };
    setWeeklyPlan(updatedPlan);
    try {
      await Database.saveWeeklyPlan(currentMonday, updatedPlan);
    } catch (e) {
      console.error('Failed to auto-save notes:', e);
    }
  };

  // 전화 관리 항목 추가
  const handleAddCallItem = async () => {
    if (!callName.trim()) {
      Alert.alert('알림', '회원 이름을 입력해 주세요.');
      return;
    }

    const newCall = {
      id: Date.now().toString(),
      name: callName.trim(),
      content: callContent.trim(),
    };

    const currentCalls = weeklyPlan?.callItems || [];
    const updatedPlan = {
      ...weeklyPlan,
      callItems: [...currentCalls, newCall],
    };

    try {
      await Database.saveWeeklyPlan(currentMonday, updatedPlan);
      setWeeklyPlan(updatedPlan);
      setCallName('');
      setCallContent('');
      setCallModalVisible(false);
    } catch (e) {
      console.error('Failed to add call item:', e);
      Alert.alert('오류', '전화 관리 항목을 저장하지 못했습니다.');
    }
  };

  // 전화 관리 항목 삭제
  const handleDeleteCallItem = async (callId) => {
    const currentCalls = weeklyPlan?.callItems || [];
    const updatedCalls = currentCalls.filter((c) => c.id !== callId);
    const updatedPlan = { ...weeklyPlan, callItems: updatedCalls };

    try {
      await Database.saveWeeklyPlan(currentMonday, updatedPlan);
      setWeeklyPlan(updatedPlan);
    } catch (e) {
      console.error('Failed to delete call item:', e);
    }
  };

  // 수업 일지 바로 작성/수정으로 이동
  const handleGoToClassRecord = (item) => {
    setEditModalVisible(false);
    const matchedRec = getMatchedRecord(item);
    navigation.navigate('ClassRecord', {
      studentId: item.studentId,
      recordId: matchedRec ? matchedRec.id : null,
      initialDate: item.date,
      initialTime: item.startTime,
      initialCourse: item.subject,
    });
  };

  // 전화 걸기 헬퍼
  const handleMakeCall = (phoneStr) => {
    if (!phoneStr) return;
    const match = phoneStr.match(/\d{2,3}-\d{3,4}-\d{4}/);
    if (match) {
      Linking.openURL(`tel:${match[0]}`);
    }
  };

  // 필터링된 학생 목록 (학생 선택 모달용 - 가나다 오름차순 정렬)
  const filteredStudents = useMemo(() => {
    const list = [...students].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'ko')
    );
    if (!studentSearchQuery.trim()) return list;
    return list.filter((s) =>
      (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [students, studentSearchQuery]);

  // 특정 요일/시간 슬롯의 수업 찾기
  const getSlotItems = (dayOfWeek, hour) => {
    const items = weeklyPlan?.scheduleItems || [];
    return items.filter((it) => {
      if (Number(it.dayOfWeek) !== dayOfWeek) return false;
      const rawHour = (it.startTime || '').match(/\d{1,2}/);
      if (!rawHour) return false;
      const h = parseInt(rawHour[0], 10);
      if (hour === 9) return h <= 9;
      if (hour === 20) return h >= 20;
      return h === hour;
    });
  };

  // 선택된 요일의 수업 목록 (타임라인 뷰용)
  const selectedDayItems = useMemo(() => {
    const targetDay = selectedDayOffset + 1; // 1:월 ~ 7:일
    const items = weeklyPlan?.scheduleItems || [];
    return items.filter((it) => Number(it.dayOfWeek) === targetDay);
  }, [weeklyPlan, selectedDayOffset]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. 상단 주차 네비게이션 및 액션 바 */}
      <View style={styles.topControlBar}>
        <View style={styles.weekNavContainer}>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevWeek}>
            <Feather name="chevron-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.weekTitleBox} onPress={handleThisWeek}>
            <Text style={styles.weekMainTitle}>{weekTitleInfo.title}</Text>
            <Text style={styles.weekSubRange}>{weekTitleInfo.range} (이번 주)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextWeek}>
            <Feather name="chevron-right" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.pdfReportBtn}
          onPress={() => setPdfModalVisible(true)}
        >
          <Feather name="file-text" size={16} color={theme.colors.onPrimary} />
          <Text style={styles.pdfReportBtnText}>보고서 내보내기</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 뷰 모드 전환 탭 (타임테이블 vs 요일별 타임라인) */}
      <View style={styles.viewModeToggleRow}>
        <TouchableOpacity
          style={[styles.modeTab, viewMode === 'table' && styles.modeTabActive]}
          onPress={() => setViewMode('table')}
        >
          <MaterialCommunityIcons
            name="table"
            size={16}
            color={viewMode === 'table' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.modeTabText, viewMode === 'table' && styles.modeTabTextActive]}>
            주간 전체 표 (PDF 서식)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, viewMode === 'timeline' && styles.modeTabActive]}
          onPress={() => setViewMode('timeline')}
        >
          <Feather
            name="list"
            size={16}
            color={viewMode === 'timeline' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.modeTabText, viewMode === 'timeline' && styles.modeTabTextActive]}>
            요일별 상세 보기
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>주간 시간표를 불러오는 중입니다...</Text>
        </View>
      ) : (
        <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.mainScrollContent}>
          {/* ======================= 보기 1: 주간 전체 타임테이블 (PDF 서식) ======================= */}
          {viewMode === 'table' && (
            <View style={styles.tableCard}>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={styles.tableInner}>
                  {/* 헤더 행 (월~토) */}
                  <View style={styles.tableHeaderRow}>
                    <View style={styles.timeHeaderCell}>
                      <Text style={styles.timeHeaderLabel}>시간</Text>
                    </View>
                    {[1, 2, 3, 4, 5, 6].map((dayVal) => {
                      const dStr = getDayDateString(dayVal);
                      const [, m, d] = dStr.split('-');
                      return (
                        <View key={dayVal} style={styles.dayHeaderCell}>
                          <Text style={styles.dayHeaderLabel}>
                            {DAY_LABELS[dayVal - 1]}({parseInt(m, 10)}/{parseInt(d, 10)})
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* 시간대별 행 */}
                  {TIME_SLOTS.map((slot) => {
                    if (slot.isLunch) {
                      return (
                        <View key={slot.label} style={styles.lunchRow}>
                          <View style={styles.timeCell}>
                            <Text style={styles.timeCellText}>{slot.label}</Text>
                          </View>
                          <View style={styles.lunchContentCell}>
                            <Text style={styles.lunchText}>즐거운 점심 시간</Text>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={slot.label} style={styles.tableBodyRow}>
                        <View style={styles.timeCell}>
                          <Text style={styles.timeCellText}>{slot.label}</Text>
                        </View>
                        {[1, 2, 3, 4, 5, 6].map((dayVal) => {
                          const items = getSlotItems(dayVal, slot.hour);
                          return (
                            <TouchableOpacity
                              key={dayVal}
                              style={styles.scheduleCell}
                              activeOpacity={0.7}
                              onPress={() => {
                                if (items.length > 0) {
                                  openEditModal(items[0]);
                                } else {
                                  openAddModal(dayVal, slot.hour);
                                }
                              }}
                            >
                              {items.map((item) => {
                                const matchedRec = getMatchedRecord(item);
                                const isDone = Boolean(matchedRec);
                                return (
                                  <View key={item.id} style={[styles.cellItemBox, isDone && styles.cellItemBoxDone]}>
                                    <View style={styles.cellItemHeaderRow}>
                                      <Text style={[styles.cellItemTitle, isDone && styles.cellItemTitleDone]} numberOfLines={1}>
                                        {item.startTime} {item.studentName}
                                      </Text>
                                      {isDone && <Text style={styles.doneCheckMark}>✅</Text>}
                                    </View>
                                    {item.subject ? (
                                      <Text style={styles.cellItemSubject} numberOfLines={1}>
                                        {item.subject}
                                      </Text>
                                    ) : null}
                                    {item.statusNote ? (
                                      <Text style={styles.cellItemNote} numberOfLines={1}>
                                        {item.statusNote}
                                      </Text>
                                    ) : null}
                                  </View>
                                );
                              })}
                              {items.length === 0 && (
                                <View style={styles.cellEmptyPlaceholder}>
                                  <Feather name="plus" size={12} color={theme.colors.outline + '60'} />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* 하단 일요일 시간표 분리 블록 (PDF 서식 일치) */}
              <View style={styles.sundayBlock}>
                <View style={styles.sundayHeaderRow}>
                  <View style={styles.sundayBadge}>
                    <Text style={styles.sundayBadgeText}>
                      일요일 시간표 ({getDayDateString(7).slice(5).replace('-', '/')})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sunAddBtn}
                    onPress={() => openAddModal(7, 10)}
                  >
                    <Feather name="plus" size={13} color={theme.colors.primary} />
                    <Text style={styles.sunAddBtnText}>일요일 수업 추가</Text>
                  </TouchableOpacity>
                </View>

                {weeklyPlan?.scheduleItems?.filter((it) => Number(it.dayOfWeek) === 7).length === 0 ? (
                  <Text style={styles.emptySundayText}>일요일에 등록된 수업 일정이 없습니다.</Text>
                ) : (
                  <View style={styles.sundayGrid}>
                    {weeklyPlan?.scheduleItems
                      ?.filter((it) => Number(it.dayOfWeek) === 7)
                      .map((item) => {
                        const matchedRec = getMatchedRecord(item);
                        const isDone = Boolean(matchedRec);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.sundayCard, isDone && styles.sundayCardDone]}
                            onPress={() => openEditModal(item)}
                          >
                            <View style={styles.sundayCardHeader}>
                              <Text style={styles.sundayTimeText}>{item.startTime}</Text>
                              <Text style={styles.sundayNameText}>{item.studentName}</Text>
                              {isDone && <Text style={styles.doneCheckMark}>✅ 완료</Text>}
                            </View>
                            {item.subject ? <Text style={styles.sundaySubjectText}>{item.subject}</Text> : null}
                            {item.address ? <Text style={styles.sundayAddrText} numberOfLines={1}>{item.address}</Text> : null}
                            {item.statusNote ? <Text style={styles.sundayNoteText}>{item.statusNote}</Text> : null}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ======================= 보기 2: 요일별 상세 타임라인 ======================= */}
          {viewMode === 'timeline' && (
            <View style={styles.timelineContainer}>
              {/* 요일 선택 탭바 */}
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.dayTabBar}>
                {DAY_LABELS.map((label, idx) => {
                  const dStr = getDayDateString(idx + 1);
                  const [, , d] = dStr.split('-');
                  const isSelected = selectedDayOffset === idx;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[styles.dayTabPill, isSelected && styles.dayTabPillActive]}
                      onPress={() => setSelectedDayOffset(idx)}
                    >
                      <Text style={[styles.dayTabLabel, isSelected && styles.dayTabLabelActive]}>
                        {label}
                      </Text>
                      <Text style={[styles.dayTabDate, isSelected && styles.dayTabDateActive]}>
                        {parseInt(d, 10)}일
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 선택된 요일 수업 목록 */}
              <View style={styles.timelineHeaderRow}>
                <Text style={styles.timelineSectionTitle}>
                  {DAY_LABELS[selectedDayOffset]}요일 수업 목록 ({getDayDateString(selectedDayOffset + 1)})
                </Text>
                <TouchableOpacity
                  style={styles.addTimelineBtn}
                  onPress={() => openAddModal(selectedDayOffset + 1, 10)}
                >
                  <Feather name="plus" size={14} color={theme.colors.primary} />
                  <Text style={styles.addTimelineBtnText}>수업 추가</Text>
                </TouchableOpacity>
              </View>

              {selectedDayItems.length === 0 ? (
                <View style={styles.emptyTimelineBox}>
                  <Feather name="calendar" size={32} color={theme.colors.outline} />
                  <Text style={styles.emptyTimelineTitle}>예정된 수업이 없습니다.</Text>
                  <Text style={styles.emptyTimelineSub}>
                    '+ 수업 추가' 버튼을 눌러 새로운 수업 일정을 등록할 수 있습니다.
                  </Text>
                </View>
              ) : (
                selectedDayItems.map((item) => {
                  const matchedRec = getMatchedRecord(item);
                  const isDone = Boolean(matchedRec);
                  return (
                    <View key={item.id} style={[styles.timelineCard, isDone && styles.timelineCardDone]}>
                      <View style={styles.timelineCardTop}>
                        <View style={[styles.timeBadge, isDone && styles.timeBadgeDone]}>
                          <Feather name="clock" size={13} color={isDone ? '#15803D' : theme.colors.primary} />
                          <Text style={[styles.timeBadgeText, isDone && styles.timeBadgeTextDone]}>
                            {item.startTime}
                          </Text>
                        </View>
                        <Text style={styles.timelineStudentName}>{item.studentName}</Text>
                        <View style={[styles.recurringBadge, item.isRecurring === false && styles.recurringBadgeTemp]}>
                          <Text style={[styles.recurringBadgeText, item.isRecurring === false && styles.recurringBadgeTextTemp]}>
                            {item.isRecurring === false ? '이번주만 ⏱️' : '매주 반복 🔄'}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, isDone ? styles.statusBadgeDone : styles.statusBadgePlanned]}>
                          <Text style={[styles.statusBadgeText, isDone ? styles.statusBadgeTextDone : styles.statusBadgeTextPlanned]}>
                            {isDone ? '작성 완료 ✅' : '수업 예정 ⏳'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.cardEditBtn}
                          onPress={() => openEditModal(item)}
                        >
                          <Feather name="edit-2" size={15} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      {item.subject ? (
                        <View style={styles.timelineInfoRow}>
                          <Text style={styles.timelineInfoLabel}>과목:</Text>
                          <Text style={styles.timelineSubjectText}>{item.subject}</Text>
                        </View>
                      ) : null}

                      {item.address ? (
                        <View style={styles.timelineInfoRow}>
                          <Feather name="map-pin" size={13} color={theme.colors.textSecondary} style={styles.mapPinIcon} />
                          <Text style={styles.timelineAddressText}>{item.address}</Text>
                        </View>
                      ) : null}

                      {item.phoneInfo ? (
                        <View style={styles.timelinePhoneRow}>
                          <Feather name="phone" size={13} color={theme.colors.primary} />
                          <Text style={styles.timelinePhoneText}>{formatPhoneInfo(item.phoneInfo).replace(/\n/g, '  |  ')}</Text>
                          <TouchableOpacity
                            style={styles.callSmallBtn}
                            onPress={() => handleMakeCall(item.phoneInfo)}
                          >
                            <Text style={styles.callSmallBtnText}>전화</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {item.statusNote ? (
                        <View style={styles.timelineNoteBox}>
                          <Text style={styles.timelineNoteText}>📌 {item.statusNote}</Text>
                        </View>
                      ) : null}

                      {/* 실제 작성 완료된 진도 내용 요약 */}
                      {isDone && matchedRec?.content ? (
                        <View style={styles.timelineDoneContentBox}>
                          <Text style={styles.timelineDoneContentLabel}>진행된 수업 일지 내용:</Text>
                          <Text style={styles.timelineDoneContentText} numberOfLines={2}>
                            {matchedRec.content}
                          </Text>
                        </View>
                      ) : null}

                      {/* 액션 버튼 */}
                      <View style={styles.timelineActionRow}>
                        <TouchableOpacity
                          style={[styles.writeRecordBtn, isDone && styles.writeRecordBtnDone]}
                          onPress={() => handleGoToClassRecord(item)}
                        >
                          <Feather name="book-open" size={14} color={theme.colors.onPrimary} />
                          <Text style={styles.writeRecordBtnText}>
                            {isDone ? '수업 일지 수정' : '수업 일지 작성'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ======================= 3. 하단 부가 업무 (주요사항, 전주결석, 전화관리) ======================= */}
          <View style={styles.bottomSectionCard}>
            <TouchableOpacity
              style={styles.bottomSectionHeader}
              onPress={() => setBottomNotesExpanded(!bottomNotesExpanded)}
            >
              <View style={styles.bottomHeaderTitleRow}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.bottomHeaderTitle}>기타 업무 및 전화 관리 (보고서 하단)</Text>
              </View>
              <Feather
                name={bottomNotesExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {bottomNotesExpanded && (
              <View style={styles.bottomSectionContent}>
                {/* 금주 주요사항 */}
                <View style={styles.noteInputGroup}>
                  <Text style={styles.noteInputLabel}>&lt;금주 주요사항&gt;</Text>
                  <TextInput
                    style={styles.noteTextInput}
                    value={weeklyPlan?.mainNotes || ''}
                    onChangeText={(val) => handleSaveNotes('mainNotes', val)}
                    placeholder="#개학후 시간변동 체크&#10;#마감보고서 제출"
                    placeholderTextColor={theme.colors.outline}
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>

                {/* 전주 결석 */}
                <View style={styles.noteInputGroup}>
                  <Text style={styles.noteInputLabel}>&lt;전주 결석&gt;</Text>
                  <TextInput
                    style={styles.noteTextInput}
                    value={weeklyPlan?.prevAbsentNotes || ''}
                    onChangeText={(val) => handleSaveNotes('prevAbsentNotes', val)}
                    placeholder="#유귀일: 개인사정"
                    placeholderTextColor={theme.colors.outline}
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>

                {/* 특이사항 */}
                <View style={styles.noteInputGroup}>
                  <Text style={styles.noteInputLabel}>&lt;특이사항 / 공지사항&gt;</Text>
                  <TextInput
                    style={styles.noteTextInput}
                    value={weeklyPlan?.specialNotes || ''}
                    onChangeText={(val) => handleSaveNotes('specialNotes', val)}
                    placeholder="공지사항이나 전달사항을 입력하세요"
                    placeholderTextColor={theme.colors.outline}
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>

                {/* 전화 관리 테이블 */}
                <View style={styles.callSection}>
                  <View style={styles.callHeaderRow}>
                    <Text style={styles.callHeaderTitle}>전화 관리 (3개월 미만 회원 2회)</Text>
                    <TouchableOpacity
                      style={styles.addCallBtn}
                      onPress={() => setCallModalVisible(true)}
                    >
                      <Feather name="plus" size={13} color={theme.colors.primary} />
                      <Text style={styles.addCallBtnText}>통화 추가</Text>
                    </TouchableOpacity>
                  </View>

                  {(weeklyPlan?.callItems || []).length === 0 ? (
                    <Text style={styles.emptyCallText}>등록된 전화 상담 기록이 없습니다.</Text>
                  ) : (
                    (weeklyPlan?.callItems || []).map((call) => (
                      <View key={call.id} style={styles.callItemRow}>
                        <Text style={styles.callItemName}>{call.name}</Text>
                        <Text style={styles.callItemContent}>{call.content}</Text>
                        <TouchableOpacity
                          style={styles.callDeleteBtn}
                          onPress={() => handleDeleteCallItem(call.id)}
                        >
                          <Feather name="x" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ======================= 모달 1: 수업 추가 / 편집 모달 ======================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <View style={styles.editModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedItem ? '수업 일정 변경 / 메모' : '새 주간 수업 등록'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* 일정 주기 구분 (매주 계속 vs 이번주만) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>일정 주기 구분</Text>
                <View style={styles.recurringToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.recurringToggleBtn,
                      formIsRecurring && styles.recurringToggleBtnActive,
                    ]}
                    onPress={() => setFormIsRecurring(true)}
                  >
                    <Text
                      style={[
                        styles.recurringToggleText,
                        formIsRecurring && styles.recurringToggleTextActive,
                      ]}
                    >
                      🔄 매주 계속 반복 (정규)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.recurringToggleBtn,
                      !formIsRecurring && styles.recurringToggleBtnActiveTemp,
                    ]}
                    onPress={() => setFormIsRecurring(false)}
                  >
                    <Text
                      style={[
                        styles.recurringToggleText,
                        !formIsRecurring && styles.recurringToggleTextActiveTemp,
                      ]}
                    >
                      ⏱️ 이번주만 적용 (임시/변동)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 학생 선택 버튼 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>학생 선택 <Text style={styles.reqStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.studentPickerBtn}
                  onPress={() => setStudentPickerVisible(true)}
                >
                  <Text style={formStudentName ? styles.studentPickerText : styles.studentPickerPlaceholder}>
                    {formStudentName || '학생 주소록에서 선택하기'}
                  </Text>
                  <Feather name="search" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* 요일 및 시간 선택 */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>요일</Text>
                  <View style={styles.daySelectRow}>
                    {DAY_LABELS.map((d, idx) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.daySelectPill,
                          formDayOfWeek === idx + 1 && styles.daySelectPillActive,
                        ]}
                        onPress={() => handleDaySelect(idx + 1)}
                      >
                        <Text
                          style={[
                            styles.daySelectPillText,
                            formDayOfWeek === idx + 1 && styles.daySelectPillTextActive,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 시작 시간 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>시작 시간 <Text style={styles.reqStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.timeSelectorBtn}
                  onPress={() => setTimePickerVisible(true)}
                >
                  <Text style={styles.timeSelectorBtnText}>
                    ⏰ {formStartTime || '10:00'}
                  </Text>
                  <Feather name="chevron-down" size={15} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* 과목 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>수업 과목 / 과정</Text>
                <TextInput
                  style={styles.formInput}
                  value={formSubject}
                  onChangeText={setFormSubject}
                  placeholder="예: 파이썬, sketchup, C언어, 자바"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>

              {/* 주소 및 연락처 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>방문 주소</Text>
                <TextInput
                  style={[styles.formInput, styles.multilineInput]}
                  value={formAddress}
                  onChangeText={setFormAddress}
                  placeholder="거주지 주소"
                  placeholderTextColor={theme.colors.outline}
                  multiline={true}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>연락처 정보</Text>
                <TextInput
                  style={[styles.formInput, styles.multilineInput]}
                  value={formPhoneInfo}
                  onChangeText={setFormPhoneInfo}
                  placeholder="(모)010-0000-0000&#10;(본)010-0000-0000"
                  placeholderTextColor={theme.colors.outline}
                  multiline={true}
                />
              </View>

              {/* 변동 메모 및 프리셋 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>이번 주 특이사항 / 변동 메모 (PDF에 인쇄됨)</Text>
                <View style={styles.presetChipRow}>
                  {['=> 이번주만', '=> 8/15일 수업함', '=> 휴일', '=> 아픔', '(30분 수업)'].map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={styles.presetChip}
                      onPress={() => setFormStatusNote(chip)}
                    >
                      <Text style={styles.presetChipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.formInput}
                  value={formStatusNote}
                  onChangeText={setFormStatusNote}
                  placeholder="예: => 이번주만, => 보강"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>

              {/* 하단 액션 버튼 */}
              <View style={styles.modalBtnRow}>
                {selectedItem && (
                  <TouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={() => handleDeleteScheduleItem(selectedItem.id)}
                  >
                    <Feather name="trash-2" size={16} color={theme.colors.error} />
                    <Text style={styles.modalDeleteBtnText}>이번주 제외</Text>
                  </TouchableOpacity>
                )}

                {selectedItem && (
                  <TouchableOpacity
                    style={styles.modalRecordBtn}
                    onPress={() => handleGoToClassRecord(selectedItem)}
                  >
                    <Feather
                      name="book-open"
                      size={16}
                      color={getMatchedRecord(selectedItem) ? '#16A34A' : theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.modalRecordBtnText,
                        getMatchedRecord(selectedItem) && styles.modalRecordBtnTextDone,
                      ]}
                    >
                      {getMatchedRecord(selectedItem) ? '일지 수정' : '일지 작성'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveScheduleItem}
                >
                  <Feather name="check" size={16} color={theme.colors.onPrimary} />
                  <Text style={styles.modalSaveBtnText}>저장하기</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ======================= 모달 2: 학생 선택 팝업 ======================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={studentPickerVisible}
        onRequestClose={() => setStudentPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStudentPickerVisible(false)}
        >
          <View style={styles.pickerModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>학생 선택</Text>
              <TouchableOpacity onPress={() => setStudentPickerVisible(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={16} color={theme.colors.outline} />
              <TextInput
                style={styles.searchInput}
                value={studentSearchQuery}
                onChangeText={setStudentSearchQuery}
                placeholder="학생 이름 검색"
                placeholderTextColor={theme.colors.outline}
              />
            </View>

            <ScrollView style={styles.studentListScroll}>
              {filteredStudents.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.studentItemRow}
                  onPress={() => handleSelectStudent(s)}
                >
                  <View>
                    <Text style={styles.studentItemName}>{s.name}</Text>
                    <Text style={styles.studentItemSub}>{s.school_grade || '학년 미지정'} | {s.study_method || '방문'}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.outline} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ======================= 모달 3: 전화관리 추가 모달 ======================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={callModalVisible}
        onRequestClose={() => setCallModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCallModalVisible(false)}
        >
          <View style={styles.callModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>전화 관리 상담 추가</Text>
              <TouchableOpacity onPress={() => setCallModalVisible(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>회원 이름</Text>
              <TextInput
                style={styles.formInput}
                value={callName}
                onChangeText={setCallName}
                placeholder="예: 홍길동"
                placeholderTextColor={theme.colors.outline}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>통화 요일 및 내용</Text>
              <TextInput
                style={styles.formInput}
                value={callContent}
                onChangeText={setCallContent}
                placeholder="예: 화요일 통화, 교재 변경 안내"
                placeholderTextColor={theme.colors.outline}
              />
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddCallItem}>
              <Text style={styles.modalSaveBtnText}>추가하기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ======================= 모달 4: PDF 출력 / 공유 선택 모달 ======================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pdfModalVisible}
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPdfModalVisible(false)}
        >
          <View style={styles.pdfModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>주간 업무 보고서 출력 및 내보내기</Text>
                <Text style={styles.modalSubtitle}>{weekTitleInfo.title} ({weekTitleInfo.range})</Text>
              </View>
              <TouchableOpacity onPress={() => setPdfModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={async () => {
                setPdfModalVisible(false);
                await printWeeklyReport(weeklyPlan);
              }}
            >
              <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
                <Feather name="printer" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>프린터로 인쇄 (A4 세로 양식)</Text>
                <Text style={styles.actionMenuSub}>Wi-Fi 프린터 또는 시스템 인쇄 화면을 엽니다</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={async () => {
                setPdfModalVisible(false);
                await shareWeeklyReport(weeklyPlan);
              }}
            >
              <View style={[styles.actionIconBadge, styles.pdfShareIconBadge]}>
                <Feather name="share-2" size={22} color="#0284C7" />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>PDF 파일 공유 (카톡 / 이메일)</Text>
                <Text style={styles.actionMenuSub}>카카오톡, 메신저 등으로 보고서 PDF를 전송합니다</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={async () => {
                setPdfModalVisible(false);
                await shareWeeklyReportDocx(weeklyPlan);
              }}
            >
              <View style={[styles.actionIconBadge, styles.docxShareIconBadge]}>
                <MaterialCommunityIcons name="file-word-box-outline" size={22} color="#2563EB" />
              </View>
              <View style={styles.actionMenuTextContainer}>
                <Text style={styles.actionMenuTitle}>구글 문서 / 워드 (.docx) 파일 공유</Text>
                <Text style={styles.actionMenuSub}>구글 드라이브, 카톡 등으로 전송하여 수정/편집</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.outline} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ======================= 모달 5: 시작 시간 GUI 선택 팝업 ======================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={timePickerVisible}
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View style={styles.timePickerModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.timeModalTitleRow}>
                <Feather name="clock" size={20} color={theme.colors.primary} />
                <Text style={styles.modalTitle}>시작 시간 선택</Text>
              </View>
              <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 현재 선택된 시간 디스플레이 */}
              <View style={styles.currentTimeDisplayBox}>
                <Text style={styles.currentTimeDisplayText}>
                  {formStartTime || '10:00'}
                </Text>
                <Text style={styles.currentTimeDisplaySub}>
                  {parsedStartTime.ampm} {parsedStartTime.hour24 >= 12 ? (parsedStartTime.hour24 === 12 ? 12 : parsedStartTime.hour24 - 12) : (parsedStartTime.hour24 === 0 ? 12 : parsedStartTime.hour24)}시 {parsedStartTime.minute}분
                </Text>
              </View>

              {/* 1. 빠른 프리셋 */}
              <Text style={styles.timePickerSectionTitle}>⚡ 추천 / 빠른 선택</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPresetScroll}
              >
                {QUICK_TIME_PRESETS.map((preset) => {
                  const isSelected = formStartTime === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.quickPresetChip,
                        isSelected && styles.quickPresetChipActive,
                      ]}
                      onPress={() => setFormStartTime(preset)}
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
                    parsedStartTime.ampm === '오전' && styles.timeAmpmTabActive,
                  ]}
                  onPress={() => handleStartTimeAmpmChange('오전')}
                >
                  <Text
                    style={[
                      styles.timeAmpmTabText,
                      parsedStartTime.ampm === '오전' && styles.timeAmpmTabTextActive,
                    ]}
                  >
                    오전 (AM)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timeAmpmTab,
                    parsedStartTime.ampm === '오후' && styles.timeAmpmTabActive,
                  ]}
                  onPress={() => handleStartTimeAmpmChange('오후')}
                >
                  <Text
                    style={[
                      styles.timeAmpmTabText,
                      parsedStartTime.ampm === '오후' && styles.timeAmpmTabTextActive,
                    ]}
                  >
                    오후 (PM)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 3. 시(Hour) 선택 */}
              <Text style={styles.timePickerSectionTitle}>
                {parsedStartTime.ampm === '오전' ? '오전 시간 (시)' : '오후 시간 (시)'}
              </Text>
              <View style={styles.timeGridRow}>
                {(parsedStartTime.ampm === '오전' ? MORNING_HOURS : AFTERNOON_HOURS).map((h) => {
                  const isSelected = parsedStartTime.hour24 === h.hour24 && !parsedStartTime.isEmpty;
                  return (
                    <TouchableOpacity
                      key={h.hour24}
                      style={[
                        styles.timeGridBtn,
                        isSelected && styles.timeGridBtnActive,
                      ]}
                      onPress={() => handleStartTimeHourChange(h.hour24)}
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

              {/* 4. 분(Minute) 선택 */}
              <Text style={styles.timePickerSectionTitle}>분 (Min)</Text>
              <View style={styles.timeGridRow}>
                {MINUTE_OPTIONS.map((minStr) => {
                  const isSelected = parsedStartTime.minute === minStr && !parsedStartTime.isEmpty;
                  return (
                    <TouchableOpacity
                      key={minStr}
                      style={[
                        styles.timeGridBtn,
                        isSelected && styles.timeGridBtnActive,
                      ]}
                      onPress={() => handleStartTimeMinuteChange(minStr)}
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

              {/* 확인 완료 버튼 */}
              <TouchableOpacity
                style={styles.timeConfirmBtn}
                onPress={() => setTimePickerVisible(false)}
              >
                <Feather name="check" size={16} color={theme.colors.onPrimary} />
                <Text style={styles.timeConfirmBtnText}>
                  {formStartTime ? `${formStartTime} 선택 완료` : '선택 완료'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline + '20',
  },
  weekNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant + '60',
  },
  weekTitleBox: {
    alignItems: 'center',
  },
  weekMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  weekSubRange: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  pdfReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfReportBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  viewModeToggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline + '20',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant + '50',
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modeTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  tableCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline + '30',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tableInner: {
    minWidth: 460,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
  },
  timeHeaderCell: {
    width: 44,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CBD5E1',
  },
  timeHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  dayHeaderCell: {
    width: 68,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#CBD5E1',
  },
  dayHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 46,
  },
  timeCell: {
    width: 44,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  timeCellText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  scheduleCell: {
    width: 68,
    minHeight: 46,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 3,
    justifyContent: 'center',
  },
  lunchRow: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    height: 28,
  },
  lunchContentCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lunchText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  cellItemBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    padding: 3,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
    marginBottom: 2,
  },
  cellItemTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  cellItemSubject: {
    fontSize: 8,
    color: '#2563EB',
  },
  cellItemNote: {
    fontSize: 7.5,
    color: '#DC2626',
    fontWeight: '700',
  },
  cellEmptyPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  sundayBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sundayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sundayBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sundayBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },
  sunAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
  },
  sunAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptySundayText: {
    fontSize: 11,
    color: theme.colors.outline,
    textAlign: 'center',
    paddingVertical: 8,
  },
  sundayGrid: {
    gap: 6,
  },
  sundayCard: {
    backgroundColor: '#FFF1F2',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  sundayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sundayTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9F1239',
  },
  sundayNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  sundayPayTag: {
    fontSize: 10,
    color: '#4B5563',
  },
  sundaySubjectText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  sundayAddrText: {
    fontSize: 9.5,
    color: '#4B5563',
  },
  sundayNoteText: {
    fontSize: 9.5,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 2,
  },
  timelineContainer: {
    marginBottom: 14,
  },
  dayTabBar: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline + '30',
  },
  dayTabPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayTabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  dayTabLabelActive: {
    color: theme.colors.onPrimary,
  },
  dayTabDate: {
    fontSize: 11,
    color: theme.colors.outline,
    marginTop: 2,
  },
  dayTabDateActive: {
    color: theme.colors.onPrimary,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  addTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addTimelineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyTimelineBox: {
    backgroundColor: theme.colors.surface,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline + '30',
  },
  emptyTimelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  emptyTimelineSub: {
    fontSize: 11,
    color: theme.colors.outline,
    marginTop: 4,
    textAlign: 'center',
  },
  timelineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline + '20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  timelineStudentName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginRight: 6,
  },
  payBadge: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cardEditBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  timelineInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  timelineInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  timelineSubjectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  timelineAddressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  timelinePhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 6,
  },
  timelinePhoneText: {
    fontSize: 11,
    color: '#334155',
    flex: 1,
  },
  callSmallBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  callSmallBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  timelineNoteBox: {
    marginTop: 6,
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  timelineNoteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  timelineActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline + '15',
  },
  writeRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  writeRecordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  bottomSectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline + '30',
    overflow: 'hidden',
    marginBottom: 20,
  },
  bottomSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: theme.colors.surfaceVariant + '40',
  },
  bottomHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  bottomSectionContent: {
    padding: 14,
    gap: 12,
  },
  noteInputGroup: {
    gap: 4,
  },
  noteInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  noteTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.outline + '30',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  callSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline + '20',
  },
  callHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  addCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
  },
  addCallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyCallText: {
    fontSize: 11,
    color: theme.colors.outline,
    textAlign: 'center',
    paddingVertical: 6,
  },
  callItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  callItemName: {
    width: 60,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  callItemContent: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  callDeleteBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalScroll: {
    maxHeight: 480,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  formCol: {
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  reqStar: {
    color: theme.colors.error,
  },
  studentPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant + '50',
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  studentPickerText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  studentPickerPlaceholder: {
    fontSize: 13,
    color: theme.colors.outline,
  },
  daySelectRow: {
    flexDirection: 'row',
    gap: 6,
  },
  daySelectPill: {
    width: 38,
    height: 34,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceVariant + '70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelectPillActive: {
    backgroundColor: theme.colors.primary,
  },
  daySelectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  daySelectPillTextActive: {
    color: theme.colors.onPrimary,
  },
  formInput: {
    backgroundColor: theme.colors.surfaceVariant + '40',
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  presetChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  presetChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
    paddingBottom: 20,
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  modalDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.error,
  },
  modalRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  modalRecordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  modalRecordBtnTextDone: {
    color: '#16A34A',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  pickerModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant + '60',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  studentListScroll: {
    maxHeight: 300,
  },
  studentItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  studentItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  studentItemSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  callModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  pdfModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
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
  mapPinIcon: {
    marginTop: 2,
  },
  flex1: {
    flex: 1,
  },
  flex1Half: {
    flex: 1.5,
  },
  multilineInput: {
    height: 50,
  },
  pdfShareIconBadge: {
    backgroundColor: '#E0F2FE',
  },
  docxShareIconBadge: {
    backgroundColor: '#EFF6FF',
  },
  cellItemBoxDone: {
    backgroundColor: '#DCFCE7',
    borderLeftColor: '#16A34A',
  },
  cellItemTitleDone: {
    color: '#15803D',
  },
  cellItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doneCheckMark: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  sundayCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  timelineCardDone: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  timeBadgeDone: {
    backgroundColor: '#DCFCE7',
  },
  timeBadgeTextDone: {
    color: '#15803D',
  },
  recurringBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  recurringBadgeTemp: {
    backgroundColor: '#FEF3C7',
  },
  recurringBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  recurringBadgeTextTemp: {
    color: '#B45309',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  statusBadgeDone: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePlanned: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeTextDone: {
    color: '#15803D',
  },
  statusBadgeTextPlanned: {
    color: '#D97706',
  },
  timelineDoneContentBox: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  timelineDoneContentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 2,
  },
  timelineDoneContentText: {
    fontSize: 12,
    color: '#166534',
  },
  writeRecordBtnDone: {
    backgroundColor: '#16A34A',
  },
  recurringToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recurringToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringToggleBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  recurringToggleBtnActiveTemp: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  recurringToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  recurringToggleTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  recurringToggleTextActiveTemp: {
    color: '#D97706',
    fontWeight: '700',
  },
  timeSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant + '50',
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  timeSelectorBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timePickerModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  timeModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentTimeDisplayBox: {
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  currentTimeDisplayText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  currentTimeDisplaySub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timePickerSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  quickPresetScroll: {
    paddingVertical: 2,
    marginBottom: 10,
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
    color: theme.colors.onPrimary,
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
    paddingVertical: 8,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timeConfirmBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
