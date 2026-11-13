import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme as defaultTheme } from '../../theme';
import TimePickerModal from './TimePickerModal';

const DEFAULT_DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 주간 수업 일정 추가·편집, 학생 검색 선택, 시작 시간 선택 통합 모달 컴포넌트
 * @param {object} props - 모달 속성
 * @returns {React.JSX.Element} 주간 수업 일정 편집 모달 요소
 */
export default function ScheduleEditModal({
  visible,
  onClose,
  selectedItem = null,
  dayLabels = DEFAULT_DAY_LABELS,
  students = [],
  formStudentName = '',
  formDayOfWeek = 1,
  formStartTime = '10:00',
  formSubject = '',
  formAddress = '',
  formPhoneInfo = '',
  formStatusNote = '',
  onChangeSubject,
  onChangeAddress,
  onChangePhoneInfo,
  onChangeStatusNote,
  onChangeStartTime,
  onSelectDay,
  onSelectStudent,
  onSave,
  onDelete,
  matchedRecord = null,
  onGoToClassRecord,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { height: screenHeight } = useWindowDimensions();
  const [studentPickerVisible, setStudentPickerVisible] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const editModalScrollRef = useRef(null);
  const focusedModalFieldRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setStudentPickerVisible(false);
      setStudentSearchQuery('');
      setTimePickerVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        if (e?.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
        if (focusedModalFieldRef.current === 'bottom') {
          setTimeout(() => {
            editModalScrollRef.current?.scrollToEnd({ animated: true });
          }, 80);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        focusedModalFieldRef.current = null;
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const editModalScrollContentDynamicStyle = useMemo(() => [
    styles.modalScrollContent,
    isKeyboardVisible && {
      paddingBottom: Platform.OS === 'android' ? Math.max(keyboardHeight * 0.6, 120) : 48,
    },
  ], [styles.modalScrollContent, isKeyboardVisible, keyboardHeight]);

  // 필터링된 학생 목록 (이름, 학교/학년, 전화번호 검색 + 가나다 오름차순 정렬)
  const filteredStudents = useMemo(() => {
    const list = [...students].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'ko')
    );
    const trimmed = studentSearchQuery.trim();
    if (!trimmed) return list;
    const q = trimmed.toLowerCase();
    const numericQ = q.replace(/-/g, '');
    return list.filter((s) => {
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const gradeMatch = (s.school_grade || '').toLowerCase().includes(q);
      const mobileDigits = (s.mobile_phone || '').replace(/-/g, '').toLowerCase();
      const phoneDigits = (s.phone_number || '').replace(/-/g, '').toLowerCase();
      const mobileMatch =
        (s.mobile_phone || '').toLowerCase().includes(q) ||
        (numericQ && mobileDigits.includes(numericQ));
      const phoneMatch =
        (s.phone_number || '').toLowerCase().includes(q) ||
        (numericQ && phoneDigits.includes(numericQ));
      return nameMatch || gradeMatch || mobileMatch || phoneMatch;
    });
  }, [students, studentSearchQuery]);

  const studentPickerContainerStyle = useMemo(() => {
    if (!isKeyboardVisible) {
      return [styles.studentPickerOverlay, styles.studentPickerOverlayCentered];
    }
    return [
      styles.studentPickerOverlay,
      styles.studentPickerOverlayKeyboard,
    ];
  }, [styles.studentPickerOverlay, styles.studentPickerOverlayCentered, styles.studentPickerOverlayKeyboard, isKeyboardVisible]);

  const studentPickerContentStyle = useMemo(() => {
    if (!isKeyboardVisible) {
      return [
        styles.pickerModalContent,
        styles.pickerModalContentCentered,
        { maxHeight: Math.min(screenHeight * 0.75, 520) },
      ];
    }
    const safeTop = Platform.OS === 'android' ? 36 : 48;
    const availableHeight = screenHeight - keyboardHeight - safeTop - 20;
    return [
      styles.pickerModalContent,
      styles.pickerModalContentKeyboard,
      { maxHeight: Math.max(availableHeight, 240) },
    ];
  }, [styles.pickerModalContent, styles.pickerModalContentCentered, styles.pickerModalContentKeyboard, isKeyboardVisible, keyboardHeight, screenHeight]);

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardAvoid}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              if (isKeyboardVisible) {
                Keyboard.dismiss();
              } else {
                onClose();
              }
            }}
          >
            <View
              style={[
                styles.editModalContent,
                isKeyboardVisible && styles.editModalContentKeyboard,
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedItem ? '수업 일정 변경 / 메모' : '새 주간 수업 등록'}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={editModalScrollRef}
                style={styles.modalScroll}
                contentContainerStyle={editModalScrollContentDynamicStyle}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={true}
              >
                {/* 학생 선택 버튼 */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>학생 선택 <Text style={styles.reqStar}>*</Text></Text>
                  <TouchableOpacity
                    style={styles.studentPickerBtn}
                    onPress={() => {
                      setStudentSearchQuery('');
                      setStudentPickerVisible(true);
                    }}
                  >
                    <Text style={formStudentName ? styles.studentPickerText : styles.studentPickerPlaceholder}>
                      {formStudentName || '학생 주소록에서 선택하기'}
                    </Text>
                    <Feather name="search" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* 요일 선택 */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>요일</Text>
                    <View style={styles.daySelectRow}>
                      {dayLabels.map((d, idx) => (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.daySelectPill,
                            formDayOfWeek === idx + 1 && styles.daySelectPillActive,
                          ]}
                          onPress={() => onSelectDay && onSelectDay(idx + 1)}
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
                    onChangeText={onChangeSubject}
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
                    onChangeText={onChangeAddress}
                    onFocus={() => {
                      focusedModalFieldRef.current = 'bottom';
                      setTimeout(() => {
                        editModalScrollRef.current?.scrollTo({ y: 160, animated: true });
                      }, 120);
                    }}
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
                    onChangeText={onChangePhoneInfo}
                    onFocus={() => {
                      focusedModalFieldRef.current = 'bottom';
                      setTimeout(() => {
                        editModalScrollRef.current?.scrollToEnd({ animated: true });
                      }, 120);
                    }}
                    placeholder="(모)010-0000-0000&#10;(본)010-0000-0000"
                    placeholderTextColor={theme.colors.outline}
                    multiline={true}
                  />
                </View>

                {/* 변동 메모 및 프리셋 */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>이번 주 특이사항 / 변동 메모 (PDF에 인쇄됨)</Text>
                  <View style={styles.presetChipRow}>
                    {['이번주만', '휴일', '아픔', '(30분 수업)'].map((chip) => (
                      <TouchableOpacity
                        key={chip}
                        style={styles.presetChip}
                        onPress={() => onChangeStatusNote && onChangeStatusNote(chip)}
                      >
                        <Text style={styles.presetChipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.formInput}
                    value={formStatusNote}
                    onChangeText={onChangeStatusNote}
                    onFocus={() => {
                      focusedModalFieldRef.current = 'bottom';
                      setTimeout(() => {
                        editModalScrollRef.current?.scrollToEnd({ animated: true });
                      }, 120);
                    }}
                    placeholder="예: => 이번주만, => 보강"
                    placeholderTextColor={theme.colors.outline}
                  />
                </View>
              </ScrollView>

              {/* 하단 액션 버튼 */}
              <View style={styles.modalBtnRow}>
                {selectedItem && (
                  <TouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={onDelete}
                  >
                    <Feather name="trash-2" size={16} color={theme.colors.error} />
                    <Text style={styles.modalDeleteBtnText}>이번주 제외</Text>
                  </TouchableOpacity>
                )}

                {selectedItem && (
                  <TouchableOpacity
                    style={styles.modalRecordBtn}
                    onPress={onGoToClassRecord}
                  >
                    <Feather
                      name="book-open"
                      size={16}
                      color={matchedRecord ? '#16A34A' : theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.modalRecordBtnText,
                        matchedRecord && styles.modalRecordBtnTextDone,
                      ]}
                    >
                      {matchedRecord ? '일지 수정' : '일지 작성'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={onSave}
                >
                  <Feather name="check" size={16} color={theme.colors.onPrimary} />
                  <Text style={styles.modalSaveBtnText}>저장하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* 학생 선택 팝업 모달 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={studentPickerVisible}
        onRequestClose={() => {
          if (isKeyboardVisible) {
            Keyboard.dismiss();
          } else {
            setStudentPickerVisible(false);
          }
        }}
        statusBarTranslucent
      >
        <View style={studentPickerContainerStyle}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              if (isKeyboardVisible) {
                Keyboard.dismiss();
              } else {
                setStudentPickerVisible(false);
              }
            }}
          />

          <View style={studentPickerContentStyle} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.studentPickerTitleRow}>
                <Feather name="users" size={18} color={theme.colors.primary} />
                <Text style={styles.modalTitle}>학생 선택</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setStudentPickerVisible(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={16} color={theme.colors.primary} />
              <TextInput
                style={styles.searchInput}
                value={studentSearchQuery}
                onChangeText={setStudentSearchQuery}
                placeholder="학생 이름, 학교, 전화번호 검색..."
                placeholderTextColor={theme.colors.outline}
                autoCorrect={false}
                returnKeyType="search"
              />
              {studentSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setStudentSearchQuery('')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Feather name="x-circle" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.studentListScroll}
              contentContainerStyle={styles.studentListScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {filteredStudents.length === 0 ? (
                <View style={styles.studentPickerEmpty}>
                  <Feather name="search" size={24} color={theme.colors.outline} />
                  <Text style={styles.studentPickerEmptyText}>
                    {studentSearchQuery ? '일치하는 학생이 없습니다.' : '등록된 학생이 없습니다.'}
                  </Text>
                </View>
              ) : (
                filteredStudents.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.studentItemRow}
                    onPress={() => {
                      Keyboard.dismiss();
                      setStudentPickerVisible(false);
                      if (onSelectStudent) onSelectStudent(s);
                    }}
                  >
                    <View style={styles.studentItemInfo}>
                      <Text style={styles.studentItemName}>{s.name}</Text>
                      <Text style={styles.studentItemSub}>
                        {s.school_grade || '학년 미지정'} | {s.study_method || '방문'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.colors.outline} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 시작 시간 GUI 선택 팝업 */}
      <TimePickerModal
        visible={timePickerVisible}
        time={formStartTime}
        title="시작 시간 선택"
        onSelectTime={(t) => onChangeStartTime && onChangeStartTime(t)}
        onClose={() => setTimePickerVisible(false)}
      />
    </>
  );
}

const createStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    flex: 1,
  },
  editModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 56 : 36,
    maxHeight: '88%',
  },
  editModalContentKeyboard: {
    paddingBottom: 16,
    maxHeight: '94%',
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
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 10,
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
  multilineInput: {
    height: 50,
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
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
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
  studentPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 18,
  },
  studentPickerOverlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentPickerOverlayKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },
  pickerModalContent: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  pickerModalContentCentered: {
    borderRadius: 16,
  },
  pickerModalContentKeyboard: {
    borderRadius: 16,
  },
  studentPickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant + '60',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  studentListScroll: {
    flexShrink: 1,
  },
  studentListScrollContent: {
    paddingBottom: 8,
  },
  studentPickerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  studentPickerEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  studentItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  studentItemInfo: {
    flex: 1,
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
});

