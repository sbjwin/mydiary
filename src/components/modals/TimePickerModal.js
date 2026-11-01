import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme as defaultTheme } from '../../theme';

export const MORNING_HOURS = [
  { hour24: 6, label: '06시' },
  { hour24: 7, label: '07시' },
  { hour24: 8, label: '08시' },
  { hour24: 9, label: '09시' },
  { hour24: 10, label: '10시' },
  { hour24: 11, label: '11시' },
  { hour24: 12, label: '12시' },
];

export const AFTERNOON_HOURS = [
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

export const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const QUICK_TIME_PRESETS = [
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

/**
 * 시작 시간 GUI 선택 공통 팝업 모달 컴포넌트
 * @param {object} props - 모달 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {string} [props.time='10:00'] - 현재 선택된 시간 문자열 (HH:mm 포맷)
 * @param {string} [props.title='시작 시간 선택'] - 모달 상단 제목
 * @param {(newTime: string) => void} props.onSelectTime - 시간 선택 시 호출되는 콜백 함수
 * @param {() => void} props.onClose - 모달 닫기 콜백 함수
 * @returns {React.JSX.Element} 시간 선택 모달 요소
 */
export default function TimePickerModal({
  visible,
  time = '10:00',
  title = '시작 시간 선택',
  onSelectTime,
  onClose,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;

  const parsedTime = useMemo(() => {
    if (!time) {
      return { ampm: '오전', hour24: 10, minute: '00', isEmpty: true };
    }
    const match = time.match(/^(\d{1,2}):(\d{2})/);
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
  }, [time]);

  /**
   * 오전/오후(AM/PM) 전환 시 24시간제 시간을 계산하여 반영합니다.
   * @param {'오전'|'오후'} newAmpm - 변경할 오전/오후 구분값
   */
  const handleAmpmChange = (newAmpm) => {
    let targetHour = parsedTime.hour24;
    if (newAmpm === '오전' && targetHour >= 12) {
      targetHour = targetHour === 12 ? 0 : targetHour - 12;
    } else if (newAmpm === '오후' && targetHour < 12) {
      targetHour = targetHour === 0 ? 12 : targetHour + 12;
    }
    const m = parsedTime.minute || '00';
    onSelectTime(`${String(targetHour).padStart(2, '0')}:${m}`);
  };

  /**
   * 시(Hour) 선택 시 현재 분(Minute)과 결합하여 HH:mm 포맷으로 반영합니다.
   * @param {number} h24 - 24시간제 기준 시(0~23)
   */
  const handleHourChange = (h24) => {
    const m = parsedTime.minute || '00';
    onSelectTime(`${String(h24).padStart(2, '0')}:${m}`);
  };

  /**
   * 분(Minute) 선택 시 현재 시(Hour)와 결합하여 HH:mm 포맷으로 반영합니다.
   * @param {string} mStr - 두 자리 분 문자열 ('00' ~ '55')
   */
  const handleMinuteChange = (mStr) => {
    const h24 = parsedTime.hour24;
    onSelectTime(`${String(h24).padStart(2, '0')}:${mStr}`);
  };

  const displayHour12 = parsedTime.hour24 >= 12
    ? (parsedTime.hour24 === 12 ? 12 : parsedTime.hour24 - 12)
    : (parsedTime.hour24 === 0 ? 12 : parsedTime.hour24);

  return (
    <Modal
      animationType="fade"
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
        <View
          style={[styles.timePickerModalContent, { backgroundColor: theme.colors.white }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <View style={styles.timeModalTitleRow}>
              <Feather name="clock" size={20} color={theme.colors.primary} />
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 현재 선택된 시간 디스플레이 */}
            <View
              style={[
                styles.currentTimeDisplayBox,
                {
                  backgroundColor: theme.colors.secondaryContainer,
                  borderColor: theme.colors.primary + '30',
                },
              ]}
            >
              <Text style={[styles.currentTimeDisplayText, { color: theme.colors.primary }]}>
                {time || '10:00'}
              </Text>
              <Text style={[styles.currentTimeDisplaySub, { color: theme.colors.textSecondary }]}>
                {parsedTime.ampm} {displayHour12}시 {parsedTime.minute}분
              </Text>
            </View>

            {/* 1. 빠른 프리셋 */}
            <Text style={[styles.timePickerSectionTitle, { color: theme.colors.textSecondary }]}>
              ⚡ 추천 / 빠른 선택
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPresetScroll}
            >
              {QUICK_TIME_PRESETS.map((preset) => {
                const isSelected = time === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.quickPresetChip,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline + '40',
                      },
                      isSelected && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => onSelectTime(preset)}
                  >
                    <Text
                      style={[
                        styles.quickPresetText,
                        { color: theme.colors.textSecondary },
                        isSelected && [styles.quickPresetTextActive, { color: theme.colors.onPrimary }],
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2. 오전/오후 탭 */}
            <View style={[styles.timeAmpmRow, { backgroundColor: theme.colors.surfaceVariant }]}>
              <TouchableOpacity
                style={[
                  styles.timeAmpmTab,
                  parsedTime.ampm === '오전' && [styles.timeAmpmTabActive, { backgroundColor: theme.colors.white }],
                ]}
                onPress={() => handleAmpmChange('오전')}
              >
                <Text
                  style={[
                    styles.timeAmpmTabText,
                    { color: theme.colors.textSecondary },
                    parsedTime.ampm === '오전' && [styles.timeAmpmTabTextActive, { color: theme.colors.primary }],
                  ]}
                >
                  오전 (AM)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeAmpmTab,
                  parsedTime.ampm === '오후' && [styles.timeAmpmTabActive, { backgroundColor: theme.colors.white }],
                ]}
                onPress={() => handleAmpmChange('오후')}
              >
                <Text
                  style={[
                    styles.timeAmpmTabText,
                    { color: theme.colors.textSecondary },
                    parsedTime.ampm === '오후' && [styles.timeAmpmTabTextActive, { color: theme.colors.primary }],
                  ]}
                >
                  오후 (PM)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. 시(Hour) 선택 */}
            <Text style={[styles.timePickerSectionTitle, { color: theme.colors.textSecondary }]}>
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
                      {
                        backgroundColor: theme.colors.surfaceVariant + '80',
                        borderColor: theme.colors.outline + '40',
                      },
                      isSelected && {
                        backgroundColor: theme.colors.secondaryContainer,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => handleHourChange(h.hour24)}
                  >
                    <Text
                      style={[
                        styles.timeGridBtnText,
                        { color: theme.colors.textPrimary },
                        isSelected && [styles.timeGridBtnTextActive, { color: theme.colors.onSecondaryContainer }],
                      ]}
                    >
                      {h.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. 분(Minute) 선택 */}
            <Text style={[styles.timePickerSectionTitle, { color: theme.colors.textSecondary }]}>
              분 (Min)
            </Text>
            <View style={styles.timeGridRow}>
              {MINUTE_OPTIONS.map((minStr) => {
                const isSelected = parsedTime.minute === minStr && !parsedTime.isEmpty;
                return (
                  <TouchableOpacity
                    key={minStr}
                    style={[
                      styles.timeGridBtn,
                      {
                        backgroundColor: theme.colors.surfaceVariant + '80',
                        borderColor: theme.colors.outline + '40',
                      },
                      isSelected && {
                        backgroundColor: theme.colors.secondaryContainer,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => handleMinuteChange(minStr)}
                  >
                    <Text
                      style={[
                        styles.timeGridBtnText,
                        { color: theme.colors.textPrimary },
                        isSelected && [styles.timeGridBtnTextActive, { color: theme.colors.onSecondaryContainer }],
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
              style={[styles.timeConfirmBtn, { backgroundColor: theme.colors.primary }]}
              onPress={onClose}
            >
              <Feather name="check" size={16} color={theme.colors.onPrimary} />
              <Text style={[styles.timeConfirmBtnText, { color: theme.colors.onPrimary }]}>
                {time ? `${time} 선택 완료` : '선택 완료'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  timePickerModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  timeModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  currentTimeDisplayBox: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
  },
  currentTimeDisplayText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  currentTimeDisplaySub: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  timePickerSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
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
    marginRight: 6,
    borderWidth: 1,
  },
  quickPresetText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  quickPresetTextActive: {
    fontWeight: 'bold',
  },
  timeAmpmRow: {
    flexDirection: 'row',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  timeAmpmTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeAmpmTabTextActive: {
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
    borderWidth: 1,
  },
  timeGridBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeGridBtnTextActive: {
    fontWeight: 'bold',
  },
  timeConfirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timeConfirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

