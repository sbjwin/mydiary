import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Database } from '../database/Database';
import { printStudentProfile, shareStudentProfile } from '../services/PrintService';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

export default function StudentDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { studentId } = route.params || {};

  const isEditMode = !!studentId;

  // 학생 데이터 상태 (이름 제외하고 기본값은 빈 문자열)
  const [name, setName] = useState('');
  const [schoolGrade, setSchoolGrade] = useState('');
  const [residentNumber, setResidentNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [studyMethod, setStudyMethod] = useState('');

  // 학부모 데이터 상태
  const [parentName, setParentName] = useState('');
  const [parentMobilePhone, setParentMobilePhone] = useState('');

  // 정규 기본 수업 일정 상태 (배열: [{ id, dayOfWeek: 1~7, startTime: '10:00', duration: 60, subject: '' }])
  const [defaultSchedules, setDefaultSchedules] = useState([]);

  // 기타 데이터 상태
  const [notes, setNotes] = useState('');

  // 출력 모달 제어 상태
  const [printModalVisible, setPrintModalVisible] = useState(false);

  // 현재 입력 상태 기반 학생 객체
  const getCurrentStudentData = () => ({
    name: name.trim(),
    school_grade: schoolGrade.trim() || null,
    resident_number: residentNumber.trim() || null,
    address: address.trim() || null,
    phone_number: phoneNumber.trim() || null,
    email: email.trim() || null,
    mobile_phone: mobilePhone.trim() || null,
    study_method: studyMethod.trim() || null,
    parent_name: parentName.trim() || null,
    parent_mobile_phone: parentMobilePhone.trim() || null,
    default_schedules: defaultSchedules,
    notes: notes.trim() || null,
  });

  // 상단 헤더 우측 인쇄 버튼
  useLayoutEffect(() => {
    if (isEditMode) {
      navigation.setOptions({
        // eslint-disable-next-line react/no-unstable-nested-components
        headerRight: () => (
          <TouchableOpacity
            style={styles.headerRightBtn}
            onPress={() => setPrintModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="학생 카드 출력 및 공유"
            accessibilityRole="button"
          >
            <Feather name="printer" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, isEditMode]);

  // 입력 자동 포맷팅 핸들러
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('02')) {
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 5) return cleaned.replace(/(\d{2})(\d{1,3})/, '$1-$2');
      if (cleaned.length <= 9) return cleaned.replace(/(\d{2})(\d{3})(\d{1,4})/, '$1-$2-$3');
      return cleaned.replace(/(\d{2})(\d{4})(\d{1,4})/, '$1-$2-$3');
    }
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return cleaned.replace(/(\d{3})(\d{1,4})/, '$1-$2');
    return cleaned.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1-$2-$3');
  };

  const handleResidentNumberChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 6)}-${cleaned.slice(6, 13)}`;
    }
    setResidentNumber(formatted);
  };

  // 기존 데이터 불러오기
  useEffect(() => {
    if (isEditMode) {
      const fetchStudent = async () => {
        try {
          const student = await Database.getStudentById(studentId);
          if (student) {
            setName(student.name || '');
            setSchoolGrade(student.school_grade || '');
            setResidentNumber(student.resident_number || '');
            setAddress(student.address || '');
            setPhoneNumber(student.phone_number || '');
            setEmail(student.email || '');
            setMobilePhone(student.mobile_phone || '');
            setStudyMethod(student.study_method || '');

            setParentName(student.parent_name || '');
            setParentMobilePhone(student.parent_mobile_phone || '');

            setDefaultSchedules(Array.isArray(student.default_schedules) ? student.default_schedules : []);

            setNotes(student.notes || '');
          }
        } catch (e) {
          console.error('Failed to load student details:', e);
          Alert.alert('오류', '학생 정보를 불러오지 못했습니다.');
        }
      };
      fetchStudent();
    }
  }, [studentId, isEditMode]);

  // 기본 수업 일정 추가/삭제 헬퍼
  const handleAddDefaultSchedule = () => {
    const newSchedule = {
      id: Date.now().toString(),
      dayOfWeek: 1, // 월요일 기본
      startTime: '10:00',
      duration: 60,
      subject: '',
    };
    setDefaultSchedules([...defaultSchedules, newSchedule]);
  };

  const handleRemoveDefaultSchedule = (id) => {
    setDefaultSchedules(defaultSchedules.filter((s) => s.id !== id));
  };

  const handleUpdateDefaultSchedule = (id, field, value) => {
    setDefaultSchedules(
      defaultSchedules.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // 저장 처리
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름은 필수 항목입니다.');
      return;
    }

    const studentData = {
      name: name.trim(),
      school_grade: schoolGrade.trim() || null,
      resident_number: residentNumber.trim() || null,
      address: address.trim() || null,
      phone_number: phoneNumber.trim() || null,
      email: email.trim() || null,
      mobile_phone: mobilePhone.trim() || null,
      study_method: studyMethod.trim() || null,
      parent_name: parentName.trim() || null,
      parent_mobile_phone: parentMobilePhone.trim() || null,
      default_schedules: defaultSchedules,
      notes: notes.trim() || null,
    };

    try {
      if (isEditMode) {
        await Database.updateStudent(studentId, studentData);
        Alert.alert('완료', '학생 정보가 수정되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      } else {
        await Database.addStudent(studentData);
        Alert.alert('완료', '새로운 학생이 등록되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      console.error('Failed to save student:', e);
      Alert.alert('오류', '학생 정보를 저장하는 도중 오류가 발생했습니다.');
    }
  };

  // 삭제 처리
  const handleDelete = () => {
    Alert.alert(
      '학생 삭제',
      `정말로 ${name} 학생을 삭제하시겠습니까?\n(해당 학생의 수업 기록도 모두 삭제됩니다.)`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await Database.deleteStudent(studentId);
              Alert.alert('완료', '학생 주소록이 삭제되었습니다.', [
                { text: '확인', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              console.error('Failed to delete student:', e);
              Alert.alert('오류', '삭제하는 동안 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* 학생 기본 정보 */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Feather name="user" size={16} color={theme.colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>학생 기본 정보</Text>
            </View>
            {isEditMode && (
              <View style={styles.headerBtnGroup}>
                <TouchableOpacity
                  style={styles.printHeaderBtn}
                  onPress={() => setPrintModalVisible(true)}
                >
                  <Feather name="printer" size={14} color={theme.colors.primary} style={styles.headerBtnIcon} />
                  <Text style={styles.printHeaderBtnText}>카드 출력</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewRecordHeaderBtn}
                  onPress={() => navigation.navigate('ClassRecord', { studentId })}
                >
                  <Feather name="book-open" size={14} color={theme.colors.primary} style={styles.headerBtnIcon} />
                  <Text style={styles.viewRecordHeaderBtnText}>수업일지</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.cardContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이름 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="이름을 입력하세요"
                placeholderTextColor={theme.colors.outline}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>학교 및 학년</Text>
              <TextInput
                style={styles.input}
                value={schoolGrade}
                onChangeText={setSchoolGrade}
                placeholder="예: 서초초 3학년"
                placeholderTextColor={theme.colors.outline}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>주민등록번호</Text>
              <TextInput
                style={styles.input}
                value={residentNumber}
                onChangeText={handleResidentNumberChange}
                placeholder="###### - #######"
                placeholderTextColor={theme.colors.outline}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>주소</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="거주지 주소를 상세히 입력하세요"
                placeholderTextColor={theme.colors.outline}
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>전화번호</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                placeholder="02-000-0000"
                placeholderTextColor={theme.colors.outline}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>휴대전화</Text>
              <TextInput
                style={styles.input}
                value={mobilePhone}
                onChangeText={(text) => setMobilePhone(formatPhoneNumber(text))}
                placeholder="010-0000-0000"
                placeholderTextColor={theme.colors.outline}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@studio.com"
                placeholderTextColor={theme.colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>학습 방법</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleBtn, studyMethod === '방문' && styles.toggleBtnActive]}
                  onPress={() => setStudyMethod('방문')}
                >
                  <Text style={[styles.toggleBtnText, studyMethod === '방문' && styles.toggleBtnTextActive]}>방문</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, studyMethod === '센터' && styles.toggleBtnActive]}
                  onPress={() => setStudyMethod('센터')}
                >
                  <Text style={[styles.toggleBtnText, studyMethod === '센터' && styles.toggleBtnTextActive]}>센터</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 학부모 정보 */}
          <View style={[styles.sectionHeader, styles.sectionHeaderMargin]}>
            <Feather name="users" size={16} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>학부모 정보</Text>
          </View>

          <View style={styles.cardContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>성함</Text>
              <TextInput
                style={styles.input}
                value={parentName}
                onChangeText={setParentName}
                placeholder="학부모 성함"
                placeholderTextColor={theme.colors.outline}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>휴대전화</Text>
              <TextInput
                style={styles.input}
                value={parentMobilePhone}
                onChangeText={(text) => setParentMobilePhone(formatPhoneNumber(text))}
                placeholder="010-0000-0000"
                placeholderTextColor={theme.colors.outline}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* 정규 기본 수업 일정 (주간 시간표 자동 배치용) */}
          <View style={[styles.sectionHeaderRow, styles.sectionHeaderMargin]}>
            <View style={styles.sectionHeaderLeft}>
              <Feather name="calendar" size={16} color={theme.colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>정규 수업 일정 (주간 시간표)</Text>
            </View>
            <TouchableOpacity
              style={styles.addSchedBtn}
              onPress={handleAddDefaultSchedule}
            >
              <Feather name="plus" size={14} color={theme.colors.primary} />
              <Text style={styles.addSchedBtnText}>시간 추가</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.schedListContainer}>
            {defaultSchedules.length === 0 ? (
              <View style={styles.emptySchedBox}>
                <Text style={styles.emptySchedText}>등록된 기본 수업 일정이 없습니다.</Text>
                <Text style={styles.emptySchedSubText}>위 '+ 시간 추가' 버튼을 눌러 정규 수업 요일/시간을 등록하시면 매주 주간 시간표가 자동 완성됩니다.</Text>
              </View>
            ) : (
              defaultSchedules.map((sched, idx) => (
                <View key={sched.id || idx} style={styles.schedCard}>
                  {/* 요일 선택 바 */}
                  <View style={styles.schedDayRow}>
                    {[
                      { label: '월', val: 1 },
                      { label: '화', val: 2 },
                      { label: '수', val: 3 },
                      { label: '목', val: 4 },
                      { label: '금', val: 5 },
                      { label: '토', val: 6 },
                      { label: '일', val: 7 },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.val}
                        style={[
                          styles.dayPill,
                          sched.dayOfWeek === d.val && styles.dayPillActive,
                        ]}
                        onPress={() => handleUpdateDefaultSchedule(sched.id, 'dayOfWeek', d.val)}
                      >
                        <Text
                          style={[
                            styles.dayPillText,
                            sched.dayOfWeek === d.val && styles.dayPillTextActive,
                          ]}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.schedDeleteBtn}
                      onPress={() => handleRemoveDefaultSchedule(sched.id)}
                    >
                      <Feather name="trash-2" size={15} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>

                  {/* 시간 및 과목 입력 */}
                  <View style={styles.schedInputRow}>
                    <View style={styles.schedInputColSmall}>
                      <Text style={styles.schedInputLabel}>시작 시간</Text>
                      <TextInput
                        style={styles.schedInput}
                        value={sched.startTime || '10:00'}
                        onChangeText={(val) => handleUpdateDefaultSchedule(sched.id, 'startTime', val)}
                        placeholder="10:00"
                        placeholderTextColor={theme.colors.outline}
                      />
                    </View>
                    <View style={styles.schedInputColLarge}>
                      <Text style={styles.schedInputLabel}>수업 과목/내용</Text>
                      <TextInput
                        style={styles.schedInput}
                        value={sched.subject || ''}
                        onChangeText={(val) => handleUpdateDefaultSchedule(sched.id, 'subject', val)}
                        placeholder="예: 파이썬, C언어, 자바"
                        placeholderTextColor={theme.colors.outline}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* 기타 사항 */}
          <View style={[styles.sectionHeader, styles.sectionHeaderMargin]}>
            <Feather name="file-text" size={16} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>기타 사항</Text>
          </View>

          <View style={styles.notesContainer}>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="학생에 대한 특이사항이나 수업 참고 내용을 입력하세요"
              placeholderTextColor={theme.colors.outline}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Image Banner */}
          <View style={styles.bannerContainer}>
            <ImageBackground
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr63oG3o8oYQu2EEaS-Thd2tVZ52GxTs5FrMlz_tebRgA4Yhd83V_uHhl2nfKZP18Kki-n0Ot9zb-B5Eojx2iQAAe4wZ98zoe90e9f1IjEAzBkVYZhobCHjY_H-Ux5hvw6d4uS98V-0XcP3GOKpsI-PHfEgLmKZ92SKMpydjFVSU0mt-XzlAqmbXvSrtUGoD6KWSBOSu_tT-mutd-gbuf9HAy1zCGPwHhzrrfwRf4K6UNLnrcQrKwIxkq4hmbthDDk8u-M2Co7UVA' }}
              style={styles.bannerImage}
              imageStyle={styles.bannerImageBorder}
            >
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerText}>기록은 성장의 밑거름입니다.</Text>
              </View>
            </ImageBackground>
          </View>

        </ScrollView>

        {/* Fixed Bottom Actions */}
        <View style={[styles.bottomFixedBar, { paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'ios' ? 48 : 36) }]}>
          <View style={styles.bottomActionsContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Feather name="save" size={18} color={theme.colors.onPrimary} style={styles.saveBtnIcon} />
              <Text style={styles.saveButtonText}>저장하기</Text>
            </TouchableOpacity>

            {isEditMode && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Feather name="trash-2" size={16} color={theme.colors.error} style={styles.deleteBtnIcon} />
                <Text style={styles.deleteButtonText}>학생 정보 삭제</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 학생 카드 출력 모달 (프린터 인쇄 vs PDF 공유) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={printModalVisible}
          onRequestClose={() => setPrintModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setPrintModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>학생 정보 카드 출력</Text>
                  <Text style={styles.modalSubtitle}>{name || '학생'} 학생의 인적사항 양식</Text>
                </View>
                <TouchableOpacity onPress={() => setPrintModalVisible(false)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 메뉴 1: 무선/유선 프린터로 인쇄 */}
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={async () => {
                  setPrintModalVisible(false);
                  await printStudentProfile(getCurrentStudentData());
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
                  await shareStudentProfile(getCurrentStudentData());
                }}
              >
                <View style={[styles.actionIconBadge, styles.pdfShareIconBadge]}>
                  <Feather name="share-2" size={22} color="#0284C7" />
                </View>
                <View style={styles.actionMenuTextContainer}>
                  <Text style={styles.actionMenuTitle}>PDF 파일 공유 (카톡/메시지)</Text>
                  <Text style={styles.actionMenuSub}>카카오톡, 문자, 이메일로 PDF 문서를 전송합니다</Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 160,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  printHeaderBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  viewRecordHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.roundness,
  },
  viewRecordHeaderBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  cardContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.roundness,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: 9999,
    padding: 4,
    maxWidth: 240,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: theme.colors.primary,
  },
  notesContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.roundness,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    minHeight: 120,
  },
  notesInput: {
    flex: 1,
    padding: 16,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  bannerContainer: {
    marginTop: 24,
    marginBottom: 16,
    height: 128,
    borderRadius: theme.roundness,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 20,
  },
  bannerText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomFixedBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 40,
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 14,
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
    paddingBottom: 36,
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
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  modalCloseBtn: {
    padding: 4,
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
  headerBtnIcon: {
    marginRight: 4,
  },
  sectionHeaderMargin: {
    marginTop: 24,
  },
  bannerImageBorder: {
    borderRadius: 20,
  },
  pdfShareIconBadge: {
    backgroundColor: '#E0F2FE',
  },
  addSchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addSchedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  schedListContainer: {
    marginTop: 10,
    gap: 10,
  },
  emptySchedBox: {
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptySchedText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  emptySchedSubText: {
    fontSize: 11,
    color: theme.colors.outline,
    textAlign: 'center',
    lineHeight: 16,
  },
  schedCard: {
    backgroundColor: theme.colors.white,
    padding: 14,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  schedDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayPill: {
    width: 34,
    height: 32,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceVariant + '70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: theme.colors.primary,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dayPillTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  schedDeleteBtn: {
    padding: 6,
  },
  schedInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  schedInputColSmall: {
    width: 90,
  },
  schedInputColLarge: {
    flex: 1,
  },
  schedInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  schedInput: {
    backgroundColor: theme.colors.surfaceVariant + '40',
    borderWidth: 1,
    borderColor: theme.colors.outline + '40',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
});
