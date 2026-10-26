import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { theme as defaultTheme } from '../theme';

/**
 * 모달 및 바텀시트 메뉴에서 일관된 리스트 아이템 UI를 제공하는 공통 컴포넌트
 */
export default function ActionMenuItem({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  onPress,
  showChevron = true,
  chevronColor,
  style,
  badgeStyle,
  disabled = false,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;

  const defaultIconColor = iconColor || theme.colors.primary;
  const defaultBgColor = iconBgColor || (theme.colors.primary + '1F');
  const defaultChevronColor = chevronColor || theme.colors.outline;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderBottomColor: theme.colors.surfaceVariant },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {!!icon && (
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: defaultBgColor },
            badgeStyle,
          ]}
        >
          <Feather name={icon} size={20} color={defaultIconColor} />
        </View>
      )}

      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {showChevron && (
        <Feather name="chevron-right" size={20} color={defaultChevronColor} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
