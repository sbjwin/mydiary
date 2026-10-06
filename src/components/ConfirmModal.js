import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

/**
 * 앱 전반에서 일관된 UX를 제공하는 공통 확인/삭제 모달 컴포넌트
 */
const ConfirmModal = ({
  visible,
  title = '확인',
  message = '',
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  isDestructive = false,
  loading = false,
  iconName = isDestructive ? 'alert-triangle' : 'help-circle',
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.dialogCard} onStartShouldSetResponder={() => true}>
          {/* 아이콘 및 헤더 */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconWrap,
                isDestructive ? styles.iconWrapDestructive : styles.iconWrapNormal,
              ]}
            >
              <Feather
                name={iconName}
                size={22}
                color={isDestructive ? (theme.colors.error || '#BA1A1A') : (theme.colors.primary || '#4A7C92')}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* 본문 메시지 */}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {/* 하단 액션 버튼 */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                isDestructive ? styles.confirmButtonDestructive : styles.confirmButtonNormal,
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface || '#FFFFFF',
    borderRadius: theme.roundness || 12,
    padding: 20,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconWrapDestructive: {
    backgroundColor: '#FEE2E2',
  },
  iconWrapNormal: {
    backgroundColor: theme.colors.primaryLight || '#E0F2F1',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary || '#1A1C1E',
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary || '#44474E',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant || '#F1F4F7',
    minWidth: 72,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary || '#44474E',
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  confirmButtonNormal: {
    backgroundColor: theme.colors.primary || '#4A7C92',
  },
  confirmButtonDestructive: {
    backgroundColor: theme.colors.error || '#BA1A1A',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ConfirmModal;
