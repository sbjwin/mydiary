import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { theme as defaultTheme } from '../theme';

/**
 * 화면 우하단에서 주요 생성/추가 작업을 트리거하는 공통 플로팅 액션 버튼(FAB)
 * - label이 없으면: 56x56 원형 FAB
 * - label이 있으면: 알약형 Extended FAB (아이콘 + 텍스트)
 */
export default function FloatingActionButton({
  onPress,
  icon = 'plus',
  iconSize = 20,
  iconColor,
  backgroundColor,
  label,
  labelStyle,
  style,
  testID,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;

  const bg = backgroundColor || theme.colors.primary;
  const color = iconColor || theme.colors.onPrimary || '#FFFFFF';
  const isExtended = !!label;

  return (
    <TouchableOpacity
      style={[
        styles.fabBase,
        isExtended ? styles.fabExtended : styles.fabCircular,
        { backgroundColor: bg },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
    >
      {!!icon && (
        <Feather
          name={icon}
          size={isExtended ? iconSize : 24}
          color={color}
          style={isExtended ? styles.iconExtended : null}
        />
      )}
      {isExtended && (
        <Text style={[styles.labelText, { color }, labelStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabBase: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabCircular: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fabExtended: {
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  iconExtended: {
    marginRight: 6,
  },
  labelText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
