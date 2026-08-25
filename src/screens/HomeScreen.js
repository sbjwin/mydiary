import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Database } from '../database/Database';
import { theme } from '../theme';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function HomeScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [dailyItems, setDailyItems] = useState([]);
  const [studentCount, setStudentCount] = useState(0);

  const getTodayFormatted = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = getTodayFormatted();
      // 주간시간표에 계획된 수업 + 실제 작성된 수업 일지 통합 조회
      const items = await Database.getDailyScheduleAndRecords(today);
      const students = await Database.getAllStudents();

      setDailyItems(items || []);
      setStudentCount(students?.length || 0);
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

  // 오늘 날짜 및 요일 문자열
  const todayInfo = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const dayName = DAY_NAMES[d.getDay()];
    return {
      dateText: `${year}년 ${month}월 ${date}일`,
      dayBadge: `${dayName}요일`,
    };
  }, []);

  // 오늘 수업 통계 (총 수업 수, 완료 수, 진행률)
  const stats = useMemo(() => {
    const total = dailyItems.length;
    const completed = dailyItems.filter(
      (it) => it.status === 'completed' || it.status === 'completed_extra'
    ).length;
    const remaining = total - completed;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, remaining, progressPercent };
  }, [dailyItems]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 1. 상단 환영 & 브리핑 헤더 */}
        <View style={styles.headerSection}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greetingTitle}>안녕하세요, 선생님 👋</Text>
              <View style={styles.dateBadgeRow}>
                <Text style={styles.dateText}>{todayInfo.dateText}</Text>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{todayInfo.dayBadge}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 실시간 수업 진행 상태 알림 바 */}
          <View style={styles.briefingBanner}>
            <View style={styles.briefingIconBox}>
              <Feather
                name={stats.total > 0 && stats.completed === stats.total ? 'check-circle' : 'activity'}
                size={18}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.briefingTextBox}>
              {stats.total === 0 ? (
                <Text style={styles.briefingMainText}>오늘은 예정된 수업 일정이 없습니다.</Text>
              ) : (
                <Text style={styles.briefingMainText}>
                  오늘 수업 <Text style={styles.highlightText}>{stats.total}개</Text> 중{' '}
                  <Text style={styles.highlightGreen}>{stats.completed}개 완료</Text> ({stats.progressPercent}%)
                </Text>
              )}
              <Text style={styles.briefingSubText}>
                {stats.total === 0
                  ? '여유로운 하루 보내세요 ☕'
                  : stats.remaining > 0
                    ? `앞으로 ${stats.remaining}개의 수업 일지가 대기 중입니다.`
                    : '오늘의 모든 수업 일지를 완벽히 작성하셨습니다! 🎉'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. 3단 통계 & 숏컷 메트릭 카드 */}
        <View style={styles.metricCardRow}>
          {/* 카드 1: 오늘 수업 현황 */}
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <View style={styles.metricTop}>
              <View style={[styles.metricIconWrap, styles.bgIndigoLight]}>
                <Feather name="calendar" size={18} color="#4F46E5" />
              </View>
              <Text style={styles.metricBadgeLabel}>오늘 수업</Text>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricBigValue}>{stats.total}</Text>
              <Text style={styles.metricSubCount}>({stats.completed} 완료)</Text>
            </View>
            {/* 미니 프로그레스 게이지 */}
            <View style={styles.progressBg}>
              <View style={[styles.progressBar, { width: `${stats.progressPercent}%` }]} />
            </View>
          </View>

          {/* 카드 2: 총 수강생 */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('StudentList')}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconWrap, styles.bgEmeraldLight]}>
                <Feather name="users" size={18} color="#059669" />
              </View>
              <Text style={styles.metricBadgeLabel}>총 수강생</Text>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricBigValue}>{studentCount}</Text>
              <Text style={styles.metricSubCount}>명</Text>
            </View>
            <Text style={styles.metricBottomHint}>학생 주소록 관리 ➔</Text>
          </TouchableOpacity>

          {/* 카드 3: 주간 보고서 PDF */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('WeeklyPlan')}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconWrap, styles.bgAmberLight]}>
                <MaterialCommunityIcons name="file-document-outline" size={19} color="#D97706" />
              </View>
              <Text style={styles.metricBadgeLabel}>주간 보고서</Text>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={styles.pdfMetricValue}>PDF</Text>
            </View>
            <Text style={styles.metricBottomHint}>A4 서식 출력 ➔</Text>
          </TouchableOpacity>
        </View>

        {/* 3. 오늘의 수업 타임라인 (주간시간표 연동) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Feather name="clock" size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>오늘의 수업 일정</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Text style={styles.seeAllText}>달력 전체보기 ➔</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : dailyItems.length === 0 ? (
            <View style={styles.emptyScheduleBox}>
              <View style={styles.emptyIconCircle}>
                <Feather name="coffee" size={28} color={theme.colors.outline} />
              </View>
              <Text style={styles.emptyTitle}>오늘 예정된 수업 일정이 없습니다.</Text>
              <Text style={styles.emptySub}>
                [주간 시간표]에서 수업 일정을 등록하거나, 아래 버튼으로 즉시 작성할 수 있습니다.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate('WeeklyPlan')}
              >
                <Feather name="calendar" size={14} color={theme.colors.primary} />
                <Text style={styles.emptyAddBtnText}>주간 시간표로 이동</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dailyItems.map((item, index) => {
              const isDone = item.status === 'completed' || item.status === 'completed_extra';
              const recordObj = item.record || item;

              return (
                <TouchableOpacity
                  key={item.id || index}
                  style={[styles.scheduleCard, isDone ? styles.scheduleCardDone : styles.scheduleCardPlanned]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isDone) {
                      navigation.navigate('ClassRecord', {
                        studentId: item.studentId || recordObj.student_id,
                        recordId: recordObj.id,
                      });
                    } else {
                      navigation.navigate('ClassRecord', {
                        studentId: item.studentId,
                        initialDate: getTodayFormatted(),
                        initialTime: item.classTime,
                        initialCourse: item.course,
                      });
                    }
                  }}
                >
                  <View style={styles.scheduleCardMain}>
                    {/* 시간 컬럼 */}
                    <View style={[styles.timePill, isDone && styles.timePillDone]}>
                      <Feather
                        name="clock"
                        size={12}
                        color={isDone ? '#15803D' : '#B45309'}
                      />
                      <Text style={[styles.timePillText, isDone && styles.timePillTextDone]}>
                        {item.classTime || '10:00'}
                      </Text>
                    </View>

                    {/* 정보 컬럼 */}
                    <View style={styles.scheduleInfo}>
                      <View style={styles.studentNameRow}>
                        <Text style={styles.scheduleStudentName}>{item.studentName}</Text>
                        <View style={[styles.statusBadge, isDone ? styles.statusBadgeDone : styles.statusBadgePlanned]}>
                          <Text style={[styles.statusBadgeText, isDone ? styles.statusBadgeTextDone : styles.statusBadgeTextPlanned]}>
                            {isDone ? '작성 완료 ✅' : '수업 예정 ⏳'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.courseTagRow}>
                        <Text style={styles.courseTagText}>{item.course || '과정 미지정'}</Text>
                        {item.paymentType ? (
                          <Text style={styles.payTagText}>• {item.paymentType}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* 액션 버튼 */}
                    <View style={styles.actionBtnContainer}>
                      {isDone ? (
                        <View style={styles.editIconBadge}>
                          <Feather name="edit-2" size={14} color="#15803D" />
                        </View>
                      ) : (
                        <View style={styles.writePromptBtn}>
                          <Text style={styles.writePromptBtnText}>일지 작성</Text>
                          <Feather name="chevron-right" size={14} color={theme.colors.onPrimary} />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* 하단 진도 내용 or 주소/메모 미리보기 */}
                  {isDone ? (
                    <View style={styles.recordPreviewBox}>
                      <Text style={styles.recordPreviewText} numberOfLines={1}>
                        📝 {recordObj.content || '기록된 수업 일지 내용이 있습니다.'}
                      </Text>
                    </View>
                  ) : item.statusNote ? (
                    <View style={styles.notePreviewBox}>
                      <Text style={styles.notePreviewText} numberOfLines={1}>
                        📌 {item.statusNote}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* 4. 모던 빠른 메뉴 (2x2 그리드 타일) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>주요 바로가기</Text>
          <View style={styles.quickGrid}>
            {/* 1) 주간 시간표 */}
            <TouchableOpacity
              style={[styles.quickTile, styles.quickTileIndigo]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('WeeklyPlan')}
            >
              <View style={[styles.tileIconCircle, styles.tileIconIndigo]}>
                <Feather name="calendar" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.tileTitle}>주간 시간표</Text>
              <Text style={styles.tileSub}>방문 스케줄 & PDF 보고서</Text>
            </TouchableOpacity>

            {/* 2) 달력 일지 */}
            <TouchableOpacity
              style={[styles.quickTile, styles.quickTileEmerald]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Calendar')}
            >
              <View style={[styles.tileIconCircle, styles.tileIconEmerald]}>
                <Feather name="book-open" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.tileTitle}>달력 수업일지</Text>
              <Text style={styles.tileSub}>날짜별 수업 진도 기록</Text>
            </TouchableOpacity>

            {/* 3) 학생 관리 */}
            <TouchableOpacity
              style={[styles.quickTile, styles.quickTileGreen]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('StudentList')}
            >
              <View style={[styles.tileIconCircle, styles.tileIconGreen]}>
                <Feather name="users" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.tileTitle}>학생 주소록</Text>
              <Text style={styles.tileSub}>수강생 정보 & 기본일정</Text>
            </TouchableOpacity>

            {/* 4) 클라우드 백업 & 설정 */}
            <TouchableOpacity
              style={[styles.quickTile, styles.quickTileAmber]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={[styles.tileIconCircle, styles.tileIconAmber]}>
                <Feather name="cloud" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.tileTitle}>백업 및 설정</Text>
              <Text style={styles.tileSub}>구글 드라이브 동기화</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerSection: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  dateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  dayBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  briefingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  briefingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefingTextBox: {
    flex: 1,
  },
  briefingMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  highlightText: {
    color: '#2563EB',
    fontWeight: '800',
  },
  highlightGreen: {
    color: '#16A34A',
    fontWeight: '800',
  },
  briefingSubText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  metricCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  metricCardPrimary: {
    borderColor: '#C7D2FE',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBadgeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  metricBigValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricSubCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  progressBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
  metricBottomHint: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#4F46E5',
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  loader: {
    marginVertical: 20,
  },
  emptyScheduleBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleCardPlanned: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFDF9',
  },
  scheduleCardDone: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FAFCFA',
  },
  scheduleCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 10,
  },
  timePillDone: {
    backgroundColor: '#DCFCE7',
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  timePillTextDone: {
    color: '#15803D',
  },
  scheduleInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  scheduleStudentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgePlanned: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeDone: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusBadgeTextPlanned: {
    color: '#D97706',
  },
  statusBadgeTextDone: {
    color: '#15803D',
  },
  courseTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  payTagText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionBtnContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  writePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  writePromptBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordPreviewBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  recordPreviewText: {
    fontSize: 12,
    color: '#166534',
  },
  notePreviewBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notePreviewText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickTile: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tileIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  tileSub: {
    fontSize: 10.5,
    color: '#64748B',
  },
  bgIndigoLight: {
    backgroundColor: '#EEF2FF',
  },
  bgEmeraldLight: {
    backgroundColor: '#ECFDF5',
  },
  bgAmberLight: {
    backgroundColor: '#FFFBEB',
  },
  pdfMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B45309',
  },
  quickTileIndigo: {
    backgroundColor: '#EEF2FF',
  },
  tileIconIndigo: {
    backgroundColor: '#4F46E5',
  },
  quickTileEmerald: {
    backgroundColor: '#ECFDF5',
  },
  tileIconEmerald: {
    backgroundColor: '#059669',
  },
  quickTileGreen: {
    backgroundColor: '#F0FDF4',
  },
  tileIconGreen: {
    backgroundColor: '#16A34A',
  },
  quickTileAmber: {
    backgroundColor: '#FFFBEB',
  },
  tileIconAmber: {
    backgroundColor: '#D97706',
  },
});
