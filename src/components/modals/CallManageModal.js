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
 * 주간 시간표 전화관리 상담 항목 추가 모달 컴포넌트
 * @param {object} props - 모달 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {() => void} props.onClose - 모달 닫기 콜백 함수
 * @param {string} props.callName - 상담 대상 회원 이름 입력값
 * @param {(text: string) => void} props.onChangeCallName - 회원 이름 변경 핸들러
 * @param {string} props.callContent - 통화 요일 및 상담 내용 입력값
 * @param {(text: string) => void} props.onChangeCallContent - 상담 내용 변경 핸들러
 * @param {() => void} props.onAdd - 상담 항목 추가 확정 콜백 함수
 * @returns {React.JSX.Element} 전화관리 상담 추가 모달 요소
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            isKeyboardVisible && styles.modalOverlayKeyboard,
            isKeyboardVisible && Platform.OS === 'android' && { paddingBottom: Math.max(keyboardHeight * 0.5, 80) },
          ]}
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
  modalOverlayKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 48 : 64,
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
