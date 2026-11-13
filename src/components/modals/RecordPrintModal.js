import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme as defaultTheme } from '../../theme';
import { getTodayFormatted } from '../../utils/dateUtils';
import ActionMenuItem from '../ActionMenuItem';

/**
 * 학생 카드 및 수업 일지 기간별 출력(프린터 인쇄 / PDF 공유) 공통 모달 컴포넌트
 * @param {object} props - 모달 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {() => void} props.onClose - 닫기 콜백
 * @param {'student'|'records'} [props.printType='records'] - 출력 유형 ('student': 학생 카드, 'records': 수업 일지)
 * @param {object|null} [props.student] - 대상 학생 객체
 * @param {Array<object>} [props.records=[]] - 대상 학생의 전체 수업 일지 배열
 * @param {(student: object) => void} [props.onPrintStudent] - 학생 카드 인쇄 콜백
 * @param {(student: object) => void} [props.onShareStudent] - 학생 카드 PDF 공유 콜백
 * @param {(student: object, filteredRecords: Array<object>, periodTitle: string) => void} [props.onPrintRecords] - 수업 일지 인쇄 콜백
 * @param {(student: object, filteredRecords: Array<object>, periodTitle: string) => void} [props.onShareRecords] - 수업 일지 PDF 공유 콜백
 * @returns {React.JSX.Element} 출력 선택 모달 요소
 */
export default function RecordPrintModal({
  visible,
  onClose,
  printType = 'records',
  student,
  records = [],
  onPrintStudent,
  onShareStudent,
  onPrintRecords,
  onShareRecords,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => getTodayFormatted());
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'start' | 'end' | null

  useEffect(() => {
    if (visible) {
      setPeriodFilter('all');
      setActiveDatePicker(null);
    }
  }, [visible]);

  const { filteredRecordsForPrint, periodTitle } = useMemo(() => {
    if (!records || !records.length) {
      return { filteredRecordsForPrint: [], periodTitle: '전체 기간' };
    }

    const today = new Date();
    const todayStr = getTodayFormatted();

    if (periodFilter === 'custom') {
      const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
      const end = customStartDate <= customEndDate ? customEndDate : customStartDate;
      const filtered = records.filter((r) => r.class_date >= start && r.class_date <= end);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `지정 기간 (${start} ~ ${end})`,
      };
    }

    if (periodFilter === '1m') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      const limitStr = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, '0')}-${String(oneMonthAgo.getDate()).padStart(2, '0')}`;
      const filtered = records.filter((r) => r.class_date >= limitStr);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `최근 1개월 (${limitStr} ~ ${todayStr})`,
      };
    }

    if (periodFilter === '3m') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      const limitStr = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(threeMonthsAgo.getDate()).padStart(2, '0')}`;
      const filtered = records.filter((r) => r.class_date >= limitStr);
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `최근 3개월 (${limitStr} ~ ${todayStr})`,
      };
    }

    if (periodFilter === 'current_month') {
      const yearMonth = todayStr.substring(0, 7);
      const filtered = records.filter((r) => r.class_date && r.class_date.startsWith(yearMonth));
      return {
        filteredRecordsForPrint: filtered,
        periodTitle: `${today.getFullYear()}년 ${today.getMonth() + 1}월`,
      };
    }

    const sorted = [...records].sort((a, b) => a.class_date.localeCompare(b.class_date));
    const start = sorted[0]?.class_date || todayStr;
    const end = sorted[sorted.length - 1]?.class_date || todayStr;
    return {
      filteredRecordsForPrint: records,
      periodTitle: `전체 기간 (${start} ~ ${end})`,
    };
  }, [records, periodFilter, customStartDate, customEndDate]);

  const handlePrint = () => {
    onClose();
    if (printType === 'student') {
      if (onPrintStudent) onPrintStudent(student);
    } else if (onPrintRecords) {
      onPrintRecords(student, filteredRecordsForPrint, periodTitle);
    }
  };

  const handleShare = () => {
    onClose();
    if (printType === 'student') {
      if (onShareStudent) onShareStudent(student);
    } else if (onShareRecords) {
      onShareRecords(student, filteredRecordsForPrint, periodTitle);
    }
  };

  const studentName = student?.name || '학생';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
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
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>
                  {printType === 'student' ? '학생 정보 카드 출력' : '수업 일지 보고서 출력'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {printType === 'student'
                    ? `${studentName} 학생의 인적사항 양식`
                    : `${studentName} 학생의 수업 기록 (${filteredRecordsForPrint.length}건 선택됨)`}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Feather name="x" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {printType === 'records' && (
              <>
                <Text style={styles.filterSectionLabel}>출력 기간 선택</Text>
                <View style={styles.filterChipGroup}>
                  {[
                    { id: 'all', label: '전체 기간' },
                    { id: 'current_month', label: '이번 달' },
                    { id: '1m', label: '최근 1개월' },
                    { id: '3m', label: '최근 3개월' },
                    { id: 'custom', label: '직접 설정' },
                  ].map((chip) => {
                    const isActive = periodFilter === chip.id;
                    return (
                      <TouchableOpacity
                        key={chip.id}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => {
                          setPeriodFilter(chip.id);
                          setActiveDatePicker(null);
                        }}
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {periodFilter === 'custom' && (
                  <View style={styles.customDateContainer}>
                    <View style={styles.customDateRow}>
                      <TouchableOpacity
                        style={[
                          styles.customDateBtn,
                          activeDatePicker === 'start' && styles.customDateBtnActive,
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
                          activeDatePicker === 'end' && styles.customDateBtnActive,
                        ]}
                        onPress={() => setActiveDatePicker(activeDatePicker === 'end' ? null : 'end')}
                      >
                        <Text style={styles.customDateLabel}>종료일</Text>
                        <Text style={styles.customDateText}>{customEndDate}</Text>
                      </TouchableOpacity>
                    </View>

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

                <View style={styles.summaryBadgeBox}>
                  <Feather name="info" size={14} color={theme.colors.primary} style={styles.summaryBadgeIcon} />
                  <Text style={styles.summaryBadgeText}>
                    조회: {periodTitle} ({filteredRecordsForPrint.length}회차 기록)
                  </Text>
                </View>
              </>
            )}

            <ActionMenuItem
              icon="printer"
              iconColor={theme.colors.primary}
              iconBgColor={theme.colors.primary + '1F'}
              title="프린터로 인쇄 (A4)"
              subtitle="Wi-Fi 프린터 연결 또는 시스템 인쇄 창을 엽니다"
              onPress={handlePrint}
            />

            <ActionMenuItem
              icon="share-2"
              iconColor="#0284C7"
              iconBgColor="#E0F2FE"
              title="PDF 파일 공유 (카톡/메시지)"
              subtitle={
                printType === 'student'
                  ? '카카오톡, 문자, 이메일로 PDF 문서를 전송합니다'
                  : '학부모님 카톡, 문자, 이메일로 보고서를 발송합니다'
              }
              onPress={handleShare}
            />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (theme) => StyleSheet.create({
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
  modalScrollContent: {
    paddingBottom: 10,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
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
    backgroundColor: theme.colors.secondaryContainer,
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
    backgroundColor: theme.colors.secondaryContainer,
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
  summaryBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryBadgeIcon: {
    marginRight: 6,
  },
  summaryBadgeText: {
    fontSize: 12.5,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

