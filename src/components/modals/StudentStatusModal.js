import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme as defaultTheme } from '../../theme';

/**
 * 학생 수강 상태(휴회 / 재수강 복귀)를 전환하는 공통 모달 컴포넌트
 */
export default function StudentStatusModal({
  visible,
  type = 'pause', // 'pause' | 'resume'
  studentName = '',
  date = '',
  onDateChange,
  reason = '',
  onReasonChange,
  onConfirm,
  onClose,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;

  const isPause = type === 'pause';
  const iconName = isPause ? 'pause-circle' : 'play-circle';
  const iconColor = isPause ? theme.colors.warning : theme.colors.success;
  const title = isPause ? '학생 휴회 처리' : '재수강(복귀) 시작';
  const subtitle = isPause
    ? `${studentName || '학생'}을 휴회 상태로 전환합니다.`
    : `${studentName || '학생'}의 새로운 수강 차수를 시작합니다.`;
  const dateLabel = isPause ? '마지막 수업일 (종료일)' : '재수강 시작일';
  const reasonLabel = isPause ? '휴회 사유 (선택 입력)' : '재등록 사유/메모 (선택 입력)';
  const reasonPlaceholder = isPause
    ? '예: 여름방학 휴회, 개인 사정 등'
    : '예: 2학기 재등록';
  const confirmBtnText = isPause ? '휴회 확정' : '재수강 시작';
  const confirmBtnBg = isPause ? theme.colors.warning : theme.colors.success;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <TouchableOpacity
          style={styles.centerModalOverlay}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <TouchableOpacity
            style={[styles.dialogCard, { backgroundColor: theme.colors.surface || theme.colors.white }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dialogHeader}>
              <Feather name={iconName} size={24} color={iconColor} style={styles.dialogHeaderIcon} />
              <Text style={[styles.dialogTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
            </View>
            <Text style={[styles.dialogSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>{dateLabel}</Text>
            <TextInput
              style={[
                styles.dialogInput,
                {
                  borderColor: theme.colors.outline + '40',
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceVariant + '30',
                },
              ]}
              value={date}
              onChangeText={onDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.outline}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>{reasonLabel}</Text>
            <TextInput
              style={[
                styles.dialogInput,
                {
                  borderColor: theme.colors.outline + '40',
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceVariant + '30',
                },
              ]}
              value={reason}
              onChangeText={onReasonChange}
              placeholder={reasonPlaceholder}
              placeholderTextColor={theme.colors.outline}
            />

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity
                style={[styles.dialogCancelBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={onClose}
              >
                <Text style={[styles.dialogCancelBtnText, { color: theme.colors.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: confirmBtnBg }]}
                onPress={onConfirm}
              >
                <Text style={styles.dialogConfirmBtnText}>{confirmBtnText}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
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
  },
  dialogSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 12,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialogConfirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogConfirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
