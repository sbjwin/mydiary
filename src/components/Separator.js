import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

/**
 * 리스트 아이템 사이 또는 섹션 구분을 위한 공통 구분선 컴포넌트
 */
const Separator = React.memo(({ style }) => {
  return <View style={[styles.separator, style]} />;
});

Separator.displayName = 'Separator';

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: theme.colors.outline || '#E2E8F0',
  },
});

export default Separator;
