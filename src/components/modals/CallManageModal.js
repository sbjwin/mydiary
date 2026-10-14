import React, { useState, useEffect } from 'react';
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
 * 주간 시간표 전화관리 상담 항목 추가 모달
 */
export default function CallManageModal({
  visible,
  onClose,
  callName,
  onChangeCallName,
  callContent,
  onChangeCallContent,
  onAdd,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
          <View style={[styles.callModalContent, { backgroundColor: theme.colors.surface || theme.colors.white }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>전화 관리 상담 추가</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>회원 이름</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.colors.surfaceVariant + '30',
                    borderColor: theme.colors.outline + '40',
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={callName}
                onChangeText={onChangeCallName}
                placeholder="예: 홍길동"
                placeholderTextColor={theme.colors.outline}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>통화 요일 및 내용</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.colors.surfaceVariant + '30',
                    borderColor: theme.colors.outline + '40',
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={callContent}
                onChangeText={onChangeCallContent}
                placeholder="예: 화요일 통화, 교재 변경 안내"
                placeholderTextColor={theme.colors.outline}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: theme.colors.primary }]}
              onPress={onAdd}
            >
              <Text style={[styles.modalSaveBtnText, { color: theme.colors.onPrimary }]}>추가하기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  callModalContent: {
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  modalSaveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
