import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function HelpScreen() {
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'about' | 'faq'

  const appGuides = [
    {
      id: 'home',
      icon: 'home',
      title: '1. 홈 대시보드',
      desc: '오늘 예정된 수업 일정과 총 수강생 현황을 한눈에 파악하고, 자주 사용하는 기능으로 빠르게 이동할 수 있습니다.',
      tips: [
        '오늘의 일정 카드를 터치하면 해당 수업의 상세 일지 기록으로 바로 이동합니다.',
        '빠른 메뉴를 통해 학생 등록 및 구글 드라이브 백업 설정으로 즉시 이동 가능합니다.'
      ]
    },
    {
      id: 'calendar',
      icon: 'calendar',
      title: '2. 달력 & 수업 일지 관리',
      desc: '월별 달력을 통해 날짜별 수업 일정을 확인하고, 새로운 수업 기록을 손쉽게 작성하거나 편집할 수 있습니다.',
      tips: [
        '원하는 날짜를 선택한 뒤 하단의 "+" 버튼을 눌러 수업 일지를 등록합니다.',
        '수강 학생, 수업 시간, 진행 과정, 수업 내용 및 과제/메모를 체계적으로 기록할 수 있습니다.',
        '기존 수업 카드를 터치하여 수정하거나 삭제할 수 있습니다.'
      ]
    },
    {
      id: 'students',
      icon: 'users',
      title: '3. 학생 관리 & 이력 조회',
      desc: '수강생들의 기본 정보(연락처, 수강 과정, 등록일 등)를 관리하고, 학생별 전체 수업 일지 기록과 통계를 한곳에서 확인합니다.',
      tips: [
        '우측 상단 "+" 버튼으로 신규 학생을 손쉽게 등록할 수 있습니다.',
        '학생 카드를 터치하면 해당 학생이 지금까지 수강한 모든 수업 기록과 출석 횟수, 총 학습 내용을 확인할 수 있습니다.',
        '전화번호 터치 시 전화 걸기 또는 문자 메시지 전송이 연동됩니다.'
      ]
    },
    {
      id: 'settings',
      icon: 'settings',
      title: '4. 데이터 백업 & 복원',
      desc: '소중한 수업 및 학생 데이터를 개인 구글 드라이브에 안전하게 보관하여 기기 변경이나 분실 시에도 완벽하게 복원할 수 있습니다.',
      tips: [
        '[설정] 탭에서 구글 계정으로 로그인한 뒤 "구글 드라이브에 백업"을 누르면 즉시 저장됩니다.',
        '새 기기에서 동일한 구글 계정으로 로그인 후 "구글 드라이브에서 복원"을 누르면 이전 데이터가 복구됩니다.'
      ]
    }
  ];

  const faqs = [
    {
      q: '인터넷 연결 없이도 앱을 사용할 수 있나요?',
      a: '네, 가능합니다! mydiary는 모든 데이터가 기기 내부(SQLite DB)에 안전하게 저장되므로 오프라인 상태에서도 수업 일지 작성 및 학생 조회가 자유롭습니다. 단, 구글 드라이브 백업/복원 시에만 인터넷 연결이 필요합니다.'
    },
    {
      q: '휴대폰을 바꿨을 때는 어떻게 데이터를 옮기나요?',
      a: '기존 기기의 [설정] 메뉴에서 "구글 드라이브에 백업"을 실행한 후, 새 기기에서 동일한 구글 계정으로 로그인하여 "구글 드라이브에서 복원"을 진행하시면 모든 기록이 그대로 복원됩니다.'
    },
    {
      q: '작성한 수업 일지를 학생별로 모아볼 수 있나요?',
      a: '[학생] 탭에서 해당 학생의 이름을 선택하면, 그동안 진행했던 모든 날짜별 수업 내용과 피드백을 한눈에 확인할 수 있습니다.'
    }
  ];

  return (
    <View style={styles.container}>
      {/* 상단 탭 선택 바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'guide' && styles.activeTabButton]}
          onPress={() => setActiveTab('guide')}
        >
          <Feather
            name="book-open"
            size={16}
            color={activeTab === 'guide' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'guide' && styles.activeTabText]}>
            앱 사용법
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'about' && styles.activeTabButton]}
          onPress={() => setActiveTab('about')}
        >
          <Feather
            name="user"
            size={16}
            color={activeTab === 'about' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
            만든 사람
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'faq' && styles.activeTabButton]}
          onPress={() => setActiveTab('faq')}
        >
          <Feather
            name="help-circle"
            size={16}
            color={activeTab === 'faq' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
            FAQ & 팁
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. 앱 사용법 탭 */}
        {activeTab === 'guide' && (
          <View>
            <View style={styles.bannerCard}>
              <MaterialCommunityIcons name="book-open-page-variant" size={28} color={theme.colors.primary} />
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>mydiary 사용 가이드</Text>
                <Text style={styles.bannerSubtitle}>
                  선생님과 강사님들의 효율적인 수업 및 학생 관리를 위한 안내서입니다.
                </Text>
              </View>
            </View>

            {appGuides.map((guide) => (
              <View key={guide.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Feather name={guide.icon} size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.cardTitle}>{guide.title}</Text>
                </View>
                <Text style={styles.cardDesc}>{guide.desc}</Text>

                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsHeading}>💡 핵심 활용 팁</Text>
                  {guide.tips.map((tip, idx) => (
                    <View key={idx} style={styles.tipItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 2. 만든 사람 탭 */}
        {activeTab === 'about' && (
          <View>
            {/* 프로필 카드 */}
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Feather name="code" size={32} color={theme.colors.primary} />
              </View>
              <Text style={styles.profileName}>Sung Baekjin (성백진)</Text>
              <Text style={styles.profileRole}>Developer & Creator</Text>
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>mydiary v1.0.0</Text>
                </View>
              </View>
            </View>

            {/* 개발 취지 및 소개 카드 */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="heart" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>앱 기획 및 개발 취지</Text>
              </View>
              <Text style={styles.aboutParagraph}>
                선생님들이 수업 일지와 학생 관리에 들이는 시간을 줄이고, 오롯이 교육에 집중할 수 있도록 돕기 위해 개발된 개인 맞춤형 수업 다이어리 앱입니다.
              </Text>
              <Text style={styles.aboutParagraph}>
                복잡하고 불필요한 기능은 덜어내고, 직관적인 달력 일정 관리와 수강생별 맞춤 수업 이력 조회, 그리고 안전한 구글 드라이브 백업 기능을 최우선으로 담았습니다.
              </Text>
            </View>

            {/* 문의 및 피드백 카드 */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="mail" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>문의 및 지원</Text>
              </View>
              <Text style={styles.cardDesc}>
                앱 사용 중 궁금하신 점이나 개선 아이디어, 버그 제보가 있으시면 언제든지 편하게 연락해 주세요.
              </Text>

              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL('mailto:sbjwin4271@gmail.com')}
              >
                <Feather name="send" size={16} color={theme.colors.primary} />
                <Text style={styles.contactEmail}>sbjwin4271@gmail.com</Text>
                <Feather name="external-link" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 저작권 표시 */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>© 2026 Sung Baekjin (성백진). All rights reserved.</Text>
              <Text style={styles.footerSubText}>Designed & Built with React Native & Expo</Text>
            </View>
          </View>
        )}

        {/* 3. FAQ 탭 */}
        {activeTab === 'faq' && (
          <View>
            <View style={styles.bannerCard}>
              <Feather name="help-circle" size={28} color={theme.colors.primary} />
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>자주 묻는 질문 (FAQ)</Text>
                <Text style={styles.bannerSubtitle}>
                  사용자분들이 자주 궁금해하시는 질문과 해결 팁을 모았습니다.
                </Text>
              </View>
            </View>

            {faqs.map((faq, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.faqQRow}>
                  <Text style={styles.faqQBadge}>Q</Text>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                </View>
                <View style={styles.faqDivider} />
                <View style={styles.faqARow}>
                  <Text style={styles.faqABadge}>A</Text>
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    paddingHorizontal: theme.spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: theme.roundness,
    padding: theme.spacing.md,
    marginBottom: 16,
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSecondaryContainer,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
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
    marginBottom: 10,
  },
  iconCircle: {
    backgroundColor: theme.colors.secondaryContainer,
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  tipsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  tipsHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 6,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 6,
    lineHeight: 18,
  },
  tipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  profileCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.roundness,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.onSecondaryContainer,
  },
  aboutParagraph: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    gap: 8,
  },
  contactEmail: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  footerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  footerSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  faqQRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  faqQBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    borderRadius: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  faqARow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  faqABadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    borderRadius: 12,
  },
  faqAnswer: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
