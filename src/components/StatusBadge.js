import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { theme as defaultTheme } from '../theme';

/**
 * 수업 상태(예정/완료) 및 학생 재원 상태(재원/휴원)를 시각화하는 공통 뱃지 컴포넌트
 */
export default function StatusBadge({
  status = 'planned',
  label,
  size = 'md',
  icon,
  style,
  textStyle,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;

  const isSmall = size === 'sm';

  // 상태별 색상 및 기본 라벨 정의
  let bg = theme.colors.surfaceVariant;
  let text = theme.colors.textSecondary;
  let border = null;
  let defaultLabel = '';
  let defaultIcon = null;

  switch (status) {
    case 'done':
      bg = theme.colors.successLight || '#DCFCE7';
      text = theme.colors.successDark || '#15803D';
      defaultLabel = '수업 완료';
      defaultIcon = 'check';
      break;
    case 'planned':
      bg = theme.colors.amberLight || '#FEF3C7';
      text = theme.colors.amberDark || '#D97706';
      defaultLabel = '수업 예정';
      defaultIcon = 'clock';
      break;
    case 'active':
      bg = '#EFF6FF';
      border = '#BFDBFE';
      text = '#1E40AF';
      defaultLabel = '재원';
      break;
    case 'paused':
      bg = '#F3F4F6';
      border = '#E5E7EB';
      text = '#6B7280';
      defaultLabel = '휴원';
      break;
    case 'error':
      bg = '#FEE2E2';
      text = '#B91C1C';
      defaultLabel = '오류';
      break;
    default:
      bg = theme.colors.surfaceVariant;
      text = theme.colors.textSecondary;
      defaultLabel = '';
      break;
  }

  const displayText = label !== undefined ? label : defaultLabel;
  const displayIcon = icon !== undefined ? icon : defaultIcon;

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: bg },
        border ? [styles.badgeBorder, { borderColor: border }] : null,
        style,
      ]}
    >
      {!!displayIcon && (
        <Feather
          name={displayIcon}
          size={isSmall ? 10 : 12}
          color={text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          isSmall ? styles.textSm : styles.textMd,
          { color: text },
          textStyle,
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBorder: {
    borderWidth: 1,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
});
