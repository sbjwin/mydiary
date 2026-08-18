import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function HelpScreen() {
  // 접기/펼치기 아코디언 상태 관리
  const [expandedSection, setExpandedSection] = useState('guide');

  const toggleSection = (sectionKey) => {
    setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const handleEmailPress = async () => {
    const emailUrl = 'mailto:sbjwin4271@gmail.com?subject=[mydiary 문의 및 피드백]';
    const canOpen = await Linking.canOpenURL(emailUrl);
    if (canOpen) {
      Linking.openURL(emailUrl);
    } else {
      Alert.alert('안내', '이메일 앱을 열 수 없습니다.\nsbjwin4271@gmail.com 으로 문의해 주세요.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* 1. 앱 헤더 및 기본 정보 배너 */}
      <View style={styles.bannerCard}>
        <View style={styles.appIconWrapper}>
          <MaterialCommunityIcons name="notebook-outline" size={36} color="#ffffff" />
        </View>
        <Text style={styles.appName}>mydiary</Text>
        <Text style={styles.appTagline}>스마트한 학생 레슨 및 수업 일지 다이어리</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>

      {/* 2. 앱 만든 사람 (개발자 정보) 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="user-check" size={18} color={theme.colors.primary} style={styles.headerIcon} />
          <Text style={styles.cardTitle}>앱을 만든 사람</Text>
        </View>
        <View style={styles.creatorContent}>
          <View style={styles.creatorRow}>
            <Text style={styles.creatorLabel}>개발자</Text>
            <Text style={styles.creatorValue}>Baekjin Sung</Text>
          </View>
          <View style={styles.creatorDivider} />
          <View style={styles.creatorRow}>
            <Text style={styles.creatorLabel}>문의 및 피드백</Text>
            <TouchableOpacity onPress={handleEmailPress} style={styles.emailButton}>
              <Feather name="mail" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.emailText}>sbjwin4271@gmail.com</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.creatorDivider} />
          <Text style={styles.creatorDesc}>
            mydiary는 선생님과 강사분들이 수업 일정, 학생 정보, 일지 기록을 더욱 직관적이고 편리하게 관리할 수 있도록 제작되었습니다.
          </Text>
        </View>
      </View>

      {/* 3. 앱 사용법 안내 (가이드) 카드 */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeaderWithToggle}
          onPress={() => toggleSection('guide')}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <Feather name="book-open" size={18} color={theme.colors.primary} style={styles.headerIcon} />
            <Text style={styles.cardTitle}>앱 주요 기능 및 사용법</Text>
          </View>
          <Feather
            name={expandedSection === 'guide' ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSection === 'guide' && (
          <View style={styles.guideList}>
            {/* 가이드 항목 1: 홈 */}
            <View style={styles.guideItem}>
              <View style={[styles.guideIconBox, { backgroundColor: '#E3F2FD' }]}>
                <Feather name="home" size={20} color="#1976D2" />
              </View>
              <View style={styles.guideTextBox}>
                <Text style={styles.guideItemTitle}>1. 홈 (대시보드)</Text>
                <Text style={styles.guideItemContent}>
                  오늘 예정된 수업 목록과 전체 등록 학생 수를 한눈에 확인하고, 간편하게 수업 일지를 작성할 수 있습니다.
                </Text>
              </View>
            </View>

            {/* 가이드 항목 2: 달력 */}
            <View style={styles.guideItem}>
              <View style={[styles.guideIconBox, { backgroundColor: '#EDE7F6' }]}>
                <Feather name="calendar" size={20} color="#5E35B1" />
              </View>
              <View style={styles.guideTextBox}>
                <Text style={styles.guideItemTitle}>2. 달력 (캘린더)</Text>
                <Text style={styles.guideItemContent}>
                  월별 캘린더에서 수업이 있는 날짜를 마커로 확인하고, 특정 날짜를 선택하여 수업 기록을 조회하거나 추가할 수 있습니다.
                </Text>
              </View>
            </View>

            {/* 가이드 항목 3: 학생 관리 */}
            <View style={styles.guideItem}>
              <View style={[styles.guideIconBox, { backgroundColor: '#E8F5E9' }]}>
                <Feather name="users" size={20} color="#2E7D32" />
              </View>
              <View style={styles.guideTextBox}>
                <Text style={styles.guideItemTitle}>3. 학생 관리</Text>
                <Text style={styles.guideItemContent}>
                  학생 신규 등록, 연락처, 수업 요일 및 회차, 특이사항 메모를 관리하며 학생별 수업 일지 내역을 모아서 확인할 수 있습니다.
                </Text>
              </View>
            </View>

            {/* 가이드 항목 4: 수업 일지 기록 */}
            <View style={styles.guideItem}>
              <View style={[styles.guideIconBox, { backgroundColor: '#FFF3E0' }]}>
                <Feather name="edit-3" size={20} color="#F57C00" />
              </View>
              <View style={styles.guideTextBox}>
                <Text style={styles.guideItemTitle}>4. 수업 일지 기록</Text>
                <Text style={styles.guideItemContent}>
                  출결 상태(출석/결석/보강 등), 진도 내용, 과제, 메모 등을 꼼꼼하게 기록하여 학생별 학습 관리를 체계화합니다.
                </Text>
              </View>
            </View>

            {/* 가이드 항목 5: 백업 및 복원 */}
            <View style={styles.guideItem}>
              <View style={[styles.guideIconBox, { backgroundColor: '#E0F2F1' }]}>
                <Feather name="cloud" size={20} color="#00796B" />
              </View>
              <View style={styles.guideTextBox}>
                <Text style={styles.guideItemTitle}>5. 구글 드라이브 백업 & 복원</Text>
                <Text style={styles.guideItemContent}>
                  설정 탭에서 본인의 구글 계정을 연결하여 안전하게 클라우드에 백업하고, 스마트폰을 바꾸더라도 언제든 복원할 수 있습니다.
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 4. 자주 묻는 질문 (FAQ) 카드 */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeaderWithToggle}
          onPress={() => toggleSection('faq')}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <Feather name="help-circle" size={18} color={theme.colors.primary} style={styles.headerIcon} />
            <Text style={styles.cardTitle}>자주 묻는 질문 (FAQ)</Text>
          </View>
          <Feather
            name={expandedSection === 'faq' ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSection === 'faq' && (
          <View style={styles.faqList}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Q. 데이터는 어디에 보관되나요?</Text>
              <Text style={styles.faqAnswer}>
                A. mydiary는 사용자의 기기 내부(로컬 DB)에 안전하게 저장됩니다. 주기적으로 [설정 &gt; 구글 드라이브에 백업]을 진행하시면 데이터를 더욱 안전하게 지킬 수 있습니다.
              </Text>
            </View>
            <View style={styles.faqDivider} />
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Q. 기기를 변경했을 때 어떻게 가져오나요?</Text>
              <Text style={styles.faqAnswer}>
                A. 이전 기기에서 [구글 드라이브에 백업]을 완료한 후, 새 기기에서 동일한 구글 계정으로 로그인하여 [구글 드라이브에서 복원]을 누르면 모든 데이터가 이전됩니다.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 5. 저작권 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.copyrightText}>© 2026 Baekjin Sung. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  appIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 12,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.roundness,
    padding: theme.spacing.lg,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  creatorContent: {
    backgroundColor: '#F9FAFB',
    borderRadius: theme.roundness,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  creatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  creatorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  creatorValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  creatorDivider: {
    height: 1,
    backgroundColor: theme.colors.outline,
    marginVertical: 8,
    opacity: 0.6,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 124, 146, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emailText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  creatorDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  guideList: {
    marginTop: 16,
    gap: 12,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  guideIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  guideTextBox: {
    flex: 1,
  },
  guideItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  guideItemContent: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  faqList: {
    marginTop: 16,
  },
  faqItem: {
    paddingVertical: 4,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  faqDivider: {
    height: 1,
    backgroundColor: theme.colors.outline,
    marginVertical: 10,
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  copyrightText: {
    fontSize: 11,
    color: '#9E9E9E',
  },
});
