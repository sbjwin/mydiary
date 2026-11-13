import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Keyboard,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Database } from '../database/Database';
import { getMondayOfWeek, getDateFromMondayOffset, getTodayFormatted } from '../utils/dateUtils';
import { formatPhoneInfo } from '../utils/stringUtils';
import { printWeeklyReport, shareWeeklyReport, shareWeeklyReportDocx, shareWeeklyReportHwpx } from '../services/PrintService';
import { useTheme } from '../context/ThemeContext';
import CallManageModal from '../components/modals/CallManageModal';
import WeeklyExportModal from '../components/modals/WeeklyExportModal';
import ScheduleEditModal from '../components/modals/ScheduleEditModal';

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

/**
 * 주간 시간표(전체 표 및 요일별 타임라인) 조회, 수업 일정 추가·편집, 전화관리 및 부가 업무를 수행하는 화면 컴포넌트
 * @returns {React.JSX.Element} 주간 시간표 화면 요소
 */
export default function WeeklyPlanScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // 현재 선택된 주의 월요일 날짜 (YYYY-MM-DD)
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfWeek(new Date()));
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [students, setStudents] = useState([]);
  const [pausedStudentIds, setPausedStudentIds] = useState(() => new Set());
  const [pausedStudentNames, setPausedStudentNames] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  // 뷰 모드: 'table' (주간 전체 타임테이블) | 'timeline' (요일별 상세 타임라인)
  const [viewMode, setViewMode] = useState('table');
  const [selectedDayOffset, setSelectedDayOffset] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }); // 0(월) ~ 6(일)
  const todayStr = useMemo(() => getTodayFormatted(), []);

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const mainScrollRef = useRef(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        if (e?.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const mainScrollContentDynamicStyle = useMemo(() => [
    styles.mainScrollContent,
    isKeyboardVisible && {
      paddingBottom: Platform.OS === 'android' ? keyboardHeight + 40 : 120,
    },
  ], [styles.mainScrollContent, isKeyboardVisible, keyboardHeight]);

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

      // 휴회 학생 식별 (시간표 표기에서 제외하기 위함)
      const pausedList = (allStudents || []).filter((s) => s.status === 'paused');
      setPausedStudentIds(new Set(pausedList.map((s) => s.id)));
      setPausedStudentNames(new Set(pausedList.map((s) => s.name)));

      // 시간표에는 재원생만 등록/선택하므로 재원생(status !== 'paused')만 students에 저장
      const activeStudents = (allStudents || []).filter((s) => s.status !== 'paused');
      const sortedStudents = activeStudents.sort((a, b) =>
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
    setEditModalVisible(true);
  };

  // 학생 선택 시 기본 정보 자동 완성 (해당 요일의 정규 수업 일정 정보 연동)
  const handleSelectStudent = (student) => {
    setFormStudentId(student.id);
    setFormStudentName(student.name || '');
    setFormPaymentType(student.payment_type || '지사입금');
    setFormAddress(student.address || '');

    // 1. 해당 요일(formDayOfWeek)에 등록된 정규 수업 일정(과목, 시간) 확인
    let matchedSubject = '';
    let matchedTime = formStartTime;

    if (Array.isArray(student.default_schedules) && student.default_schedules.length > 0) {
      const daySchedule = student.default_schedules.find(
        (s) => Number(s.dayOfWeek) === Number(formDayOfWeek)
      );
      if (daySchedule) {
        if (daySchedule.subject) matchedSubject = daySchedule.subject;
        if (daySchedule.startTime) matchedTime = daySchedule.startTime;
      }
    }

    setFormSubject(matchedSubject || '');
    setFormStartTime(matchedTime || '10:00');

    // 2. 연락처 정보 구성: (본)000-0000-0000, (모)000-0000-0000, (전화)00-000-0000
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
          if (daySchedule.subject !== undefined) setFormSubject(daySchedule.subject || '');
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

  // 수업 항목 저장 실행 헬퍼
  const executeSaveScheduleItem = async (newItem) => {
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
      setWeeklyPlan(updatedPlan);
      setEditModalVisible(false);
    } catch (e) {
      console.error('Failed to save schedule item:', e);
      Alert.alert('오류', '일정을 저장하는 도중 오류가 발생했습니다.');
    }
  };

  // 수업 항목 저장 (중복 검사 포함)
  const handleSaveScheduleItem = async () => {
    if (!formStudentName.trim()) {
      Alert.alert('알림', '학생 이름을 입력하거나 선택해 주세요.');
      return;
    }

    const targetDate = getDayDateString(formDayOfWeek);
    const cleanStartTime = formStartTime.trim() || '10:00';
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
      startTime: cleanStartTime,
      duration: 60,
      statusTag: formStatusNote ? '변동' : '정규',
      statusNote: formStatusNote.trim(),
      isDefault: false,
      isRecurring: true,
    };

    const currentItems = weeklyPlan?.scheduleItems || [];

    // 동일 요일 / 동일 시작 시간 충돌 검사 (현재 편집 중인 항목 제외)
    const timeConflictItem = currentItems.find(
      (it) =>
        it.id !== (selectedItem?.id) &&
        Number(it.dayOfWeek) === Number(formDayOfWeek) &&
        it.startTime === cleanStartTime
    );

    if (timeConflictItem) {
      Alert.alert(
        '시간 중복 알림',
        `${DAY_LABELS[formDayOfWeek - 1]}요일 ${cleanStartTime}에 이미 [${timeConflictItem.studentName}] 학생의 수업이 등록되어 있습니다.\n\n동일 시간대로 함께 등록하시겠습니까?`,
        [
          { text: '시간 변경 (취소)', style: 'cancel' },
          {
            text: '동일 시간 등록',
            onPress: () => executeSaveScheduleItem(newItem),
          },
        ]
      );
      return;
    }

    // 동일 요일에 동일 학생 중복 검사 (수업 추가 시)
    if (!selectedItem) {
      const studentConflictItem = currentItems.find(
        (it) =>
          Number(it.dayOfWeek) === Number(formDayOfWeek) &&
          ((formStudentId && it.studentId === formStudentId) ||
            (!formStudentId && it.studentName === formStudentName.trim()))
      );

      if (studentConflictItem) {
        Alert.alert(
          '학생 중복 알림',
          `${DAY_LABELS[formDayOfWeek - 1]}요일에 이미 [${formStudentName.trim()}] 학생의 수업(${studentConflictItem.startTime})이 등록되어 있습니다.\n\n해당 요일에 추가 수업으로 등록하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            {
              text: '추가 등록',
              onPress: () => executeSaveScheduleItem(newItem),
            },
          ]
        );
        return;
      }
    }

    await executeSaveScheduleItem(newItem);
  };

  // 지난주 시간표 복사
  const handleCopyPrevWeek = async () => {
    const prevMonday = getDateFromMondayOffset(currentMonday, -7);
    const prevPlan = await Database.getWeeklyPlan(prevMonday);
    const prevItems = (prevPlan?.scheduleItems || []).filter((it) => {
      if (it.studentId && pausedStudentIds.has(it.studentId)) return false;
      if (!it.studentId && it.studentName && pausedStudentNames.has(it.studentName)) return false;
      return true;
    });

    if (prevItems.length === 0) {
      Alert.alert('알림', '복사해 올 지난주 시간표에 등록된 수업이 없습니다.');
      return;
    }

    Alert.alert(
      '지난주 시간표 복사',
      `지난주(${prevMonday})의 정규 수업 ${prevItems.length}건을 이번 주 시간표로 복사하시겠습니까?\n\n※ 현재 이번 주에 작성된 시간표가 있다면 지난주 시간표로 대체됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복사하기',
          onPress: async () => {
            try {
              setLoading(true);
              const updatedPlan = await Database.copyWeeklyPlan(prevMonday, currentMonday);
              setWeeklyPlan(updatedPlan);
              Alert.alert('완료', `지난주 시간표 ${prevItems.length}건을 성공적으로 복사해 왔습니다.`);
            } catch (e) {
              console.error('Failed to copy prev weekly plan:', e);
              Alert.alert('오류', '지난주 시간표를 복사하는 도중 오류가 발생했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // 학생 기본 시간표 불러오기
  const handleLoadDefaultSchedule = async () => {
    Alert.alert(
      '기본 시간표 불러오기',
      '학생 원장에 등록된 정규 수업 시간표를 불러오시겠습니까?\n\n※ 중복 시간은 1건으로 자동 정제되며, 현재 이번 주 시간표가 대체됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '불러오기',
          onPress: async () => {
            try {
              setLoading(true);
              const updatedPlan = await Database.loadWeeklyPlanFromStudentDefaults(currentMonday);
              setWeeklyPlan(updatedPlan);
              const count = updatedPlan?.scheduleItems?.length || 0;
              Alert.alert('완료', `기본 시간표 ${count}건을 불러왔습니다.`);
            } catch (e) {
              console.error('Failed to load default schedules:', e);
              Alert.alert('오류', '기본 시간표를 불러오는 도중 오류가 발생했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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

  // 전화 걸기 헬퍼 (다중 연락처 시 선택창 표시)
  const handleMakeCall = (phoneStr) => {
    if (!phoneStr) return;
    const matches = phoneStr.match(/(?:\([^)]+\)\s*)?\d{2,3}-\d{3,4}-\d{4}/g);
    if (!matches || matches.length === 0) return;

    const dialNumber = (raw) => {
      const numMatch = raw.match(/\d{2,3}-\d{3,4}-\d{4}/);
      if (numMatch) {
        Linking.openURL(`tel:${numMatch[0]}`);
      }
    };

    if (matches.length === 1) {
      dialNumber(matches[0]);
      return;
    }

    Alert.alert(
      '통화할 번호 선택',
      '연결할 전화번호를 선택해 주세요.',
      [
        ...matches.map((item) => ({
          text: item.trim(),
          onPress: () => dialNumber(item),
        })),
        { text: '취소', style: 'cancel' },
      ]
    );
  };

  // 시간표에는 재원생만 표기: 휴회 중인 학생의 수업은 시간표 렌더링에서 제외
  const activeScheduleItems = useMemo(() => {
    const items = weeklyPlan?.scheduleItems || [];
    if (!items.length) return [];
    return items.filter((it) => {
      if (it.studentId && pausedStudentIds.has(it.studentId)) return false;
      if (!it.studentId && it.studentName && pausedStudentNames.has(it.studentName)) return false;
      return true;
    });
  }, [weeklyPlan?.scheduleItems, pausedStudentIds, pausedStudentNames]);

  // 보고서 출력/공유용 주간 계획 (재원생 수업만 포함)
  const activeWeeklyPlan = useMemo(() => {
    if (!weeklyPlan) return null;
    return {
      ...weeklyPlan,
      scheduleItems: activeScheduleItems,
    };
  }, [weeklyPlan, activeScheduleItems]);

  // 특정 요일/시간 슬롯의 수업 찾기 (재원생만)
  const getSlotItems = (dayOfWeek, hour) => {
    return activeScheduleItems.filter((it) => {
      if (Number(it.dayOfWeek) !== dayOfWeek) return false;
      const rawHour = (it.startTime || '').match(/\d{1,2}/);
      if (!rawHour) return false;
      const h = parseInt(rawHour[0], 10);
      if (hour === 9) return h <= 9;
      if (hour === 20) return h >= 20;
      return h === hour;
    });
  };

  // 선택된 요일의 수업 목록 (타임라인 뷰용 - 재원생만)
  const selectedDayItems = useMemo(() => {
    const targetDay = selectedDayOffset + 1; // 1:월 ~ 7:일
    return activeScheduleItems.filter((it) => Number(it.dayOfWeek) === targetDay);
  }, [activeScheduleItems, selectedDayOffset]);

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

      {/* 2.5. 시간표 빠른 작업 바 (지난주 복사 / 기본 일정 불러오기 / 수업 추가) */}
      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={handleCopyPrevWeek}
          activeOpacity={0.7}
        >
          <Feather name="copy" size={13} color={theme.colors.primary} />
          <Text style={styles.quickActionBtnText}>지난주 시간표 복사</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={handleLoadDefaultSchedule}
          activeOpacity={0.7}
        >
          <Feather name="download-cloud" size={13} color={theme.colors.secondary || '#4F46E5'} />
          <Text style={styles.quickActionBtnText}>기본 일정 불러오기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionBtn, styles.quickActionAddBtn]}
          onPress={() => openAddModal(selectedDayOffset + 1, 10)}
          activeOpacity={0.7}
        >
          <Feather name="plus-circle" size={13} color={theme.colors.onPrimary} />
          <Text style={styles.quickActionAddBtnText}>새 수업 등록</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>주간 시간표를 불러오는 중입니다...</Text>
        </View>
      ) : (
        <ScrollView
          ref={mainScrollRef}
          style={styles.mainScrollView}
          contentContainerStyle={mainScrollContentDynamicStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
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
                      const isToday = dStr === todayStr;
                      return (
                        <View
                          key={dayVal}
                          style={[styles.dayHeaderCell, isToday && styles.dayHeaderCellToday]}
                        >
                          <Text style={[styles.dayHeaderLabel, isToday && styles.dayHeaderLabelToday]}>
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
                              onPress={() => openAddModal(dayVal, slot.hour)}
                            >
                              {items.map((item) => {
                                const matchedRec = getMatchedRecord(item);
                                const isDone = Boolean(matchedRec);
                                return (
                                  <TouchableOpacity
                                    key={item.id}
                                    style={[styles.cellItemBox, isDone && styles.cellItemBoxDone]}
                                    activeOpacity={0.75}
                                    onPress={() => openEditModal(item)}
                                  >
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
                                  </TouchableOpacity>
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

                {activeScheduleItems.filter((it) => Number(it.dayOfWeek) === 7).length === 0 ? (
                  <Text style={styles.emptySundayText}>일요일에 등록된 수업 일정이 없습니다.</Text>
                ) : (
                  <View style={styles.sundayGrid}>
                    {activeScheduleItems
                      .filter((it) => Number(it.dayOfWeek) === 7)
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
                  const isToday = dStr === todayStr;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.dayTabPill,
                        isToday && !isSelected && styles.dayTabPillToday,
                        isSelected && styles.dayTabPillActive,
                      ]}
                      onPress={() => setSelectedDayOffset(idx)}
                    >
                      <Text
                        style={[
                          styles.dayTabLabel,
                          isToday && !isSelected && styles.dayTabLabelToday,
                          isSelected && styles.dayTabLabelActive,
                        ]}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.dayTabDate,
                          isToday && !isSelected && styles.dayTabLabelToday,
                          isSelected && styles.dayTabDateActive,
                        ]}
                      >
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
                    새로운 수업 일정을 등록하거나 지난주 시간표를 복사해 올 수 있습니다.
                  </Text>
                  <View style={styles.emptyTimelineBtnRow}>
                    <TouchableOpacity
                      style={styles.emptySubBtn}
                      onPress={handleCopyPrevWeek}
                    >
                      <Feather name="copy" size={13} color={theme.colors.primary} />
                      <Text style={styles.emptySubBtnText}>지난주 시간표 복사</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.emptyAddBtn}
                      onPress={() => openAddModal(selectedDayOffset + 1, 10)}
                    >
                      <Feather name="plus" size={13} color={theme.colors.onPrimary} />
                      <Text style={styles.emptyAddBtnText}>+ 새 수업 추가</Text>
                    </TouchableOpacity>
                  </View>
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
                    onFocus={() => {
                      setTimeout(() => {
                        mainScrollRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }}
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
                    onFocus={() => {
                      setTimeout(() => {
                        mainScrollRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }}
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
                    onFocus={() => {
                      setTimeout(() => {
                        mainScrollRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }}
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

      {/* ======================= 모달 1~2 & 시간 피커: 수업 추가 / 편집 통합 모달 ======================= */}
      <ScheduleEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        selectedItem={selectedItem}
        dayLabels={DAY_LABELS}
        students={students}
        formStudentName={formStudentName}
        formDayOfWeek={formDayOfWeek}
        formStartTime={formStartTime}
        formSubject={formSubject}
        formAddress={formAddress}
        formPhoneInfo={formPhoneInfo}
        formStatusNote={formStatusNote}
        onChangeSubject={setFormSubject}
        onChangeAddress={setFormAddress}
        onChangePhoneInfo={setFormPhoneInfo}
        onChangeStatusNote={setFormStatusNote}
        onChangeStartTime={setFormStartTime}
        onSelectDay={handleDaySelect}
        onSelectStudent={handleSelectStudent}
        onSave={handleSaveScheduleItem}
        onDelete={() => selectedItem && handleDeleteScheduleItem(selectedItem.id)}
        matchedRecord={selectedItem ? getMatchedRecord(selectedItem) : null}
        onGoToClassRecord={() => selectedItem && handleGoToClassRecord(selectedItem)}
      />

      {/* ======================= 모달 3: 전화관리 추가 모달 ======================= */}
      <CallManageModal
        visible={callModalVisible}
        onClose={() => setCallModalVisible(false)}
        callName={callName}
        onChangeCallName={setCallName}
        callContent={callContent}
        onChangeCallContent={setCallContent}
        onAdd={handleAddCallItem}
      />

      {/* ======================= 모달 4: PDF 출력 / 공유 선택 모달 ======================= */}
      <WeeklyExportModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        weekTitleInfo={weekTitleInfo}
        onPrint={() => printWeeklyReport(activeWeeklyPlan)}
        onSharePdf={() => shareWeeklyReport(activeWeeklyPlan)}
        onShareDocx={() => shareWeeklyReportDocx(activeWeeklyPlan)}
        onShareHwpx={() => shareWeeklyReportHwpx(activeWeeklyPlan)}
      />

    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
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
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline + '20',
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quickActionAddBtn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickActionAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onPrimary,
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
    minWidth: 500,
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
    width: 76,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#CBD5E1',
  },
  dayHeaderCellToday: {
    backgroundColor: theme.colors.primary,
  },
  dayHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  dayHeaderLabelToday: {
    color: theme.colors.onPrimary,
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
    width: 76,
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
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    padding: 3,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
    marginBottom: 2,
  },
  cellItemTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  cellItemSubject: {
    fontSize: 9.5,
    color: '#2563EB',
  },
  cellItemNote: {
    fontSize: 9,
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
  dayTabPillToday: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.primary,
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
  dayTabLabelToday: {
    color: theme.colors.primary,
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
  emptyTimelineBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  emptySubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary + '60',
  },
  emptySubBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onPrimary,
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
  mapPinIcon: {
    marginTop: 2,
  },
  flex1: {
    flex: 1,
  },
  flex1Half: {
    flex: 1.5,
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
});
