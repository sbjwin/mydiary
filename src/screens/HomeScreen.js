import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Database } from '../database/Database';
import { theme } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [todayRecords, setTodayRecords] = useState([]);
  const [studentCount, setStudentCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const records = await Database.getRecordsByDate(today);
      const students = await Database.getAllStudents();

      setTodayRecords(records);
      setStudentCount(students.length);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const getTodayDateString = () => {
    const date = new Date();
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.greetingText}>안녕하세요, 선생님</Text>
          <Text style={styles.dateText}>{getTodayDateString()}</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.iconCircle}>
              <Feather name="calendar" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.summaryValue}>{todayRecords.length}</Text>
            <Text style={styles.summaryLabel}>오늘 수업</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.iconCircle}>
              <Feather name="users" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.summaryValue}>{studentCount}</Text>
            <Text style={styles.summaryLabel}>총 수강생</Text>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오늘의 일정</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAllText}>전체 보기</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : todayRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="coffee" size={32} color={theme.colors.outline} />
              <Text style={styles.emptyText}>오늘은 예정된 수업이 없습니다.</Text>
            </View>
          ) : (
            todayRecords.map((record, index) => (
              <TouchableOpacity
                key={record.id || index}
                style={styles.agendaCard}
                onPress={() => navigation.navigate('ClassRecord', {
                  studentId: record.student_id,
                  recordId: record.id
                })}
              >
                <View style={styles.agendaInfo}>
                  <Text style={styles.studentName}>
                    {record.studentName} {record.class_time ? `(${record.class_time})` : ''}
                  </Text>
                  <Text style={styles.processText}>{record.book_issue_date || '과정 미입력'}</Text>
                  <Text style={styles.agendaContent} numberOfLines={1}>
                    {record.content || '기록된 내용이 없습니다.'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.quickActionGrid}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('StudentList')}
            >
              <Feather name="user-plus" size={20} color={theme.colors.onSecondaryContainer} />
              <Text style={styles.quickActionText}>학생 관리</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Feather name="settings" size={20} color={theme.colors.onSecondaryContainer} />
              <Text style={styles.quickActionText}>설정</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  headerSection: {
    marginBottom: theme.spacing.lg,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg * 1.5,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    backgroundColor: theme.colors.secondaryContainer,
    padding: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.lg * 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  emptyState: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg * 1.5,
    borderRadius: theme.roundness,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  agendaCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  processText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  agendaContent: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondaryContainer,
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSecondaryContainer,
  },
});
