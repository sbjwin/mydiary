import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Database } from '../database/Database';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { theme } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { theme: activeTheme, currentThemeId, setThemeId, presets } = useTheme();
  const currentTheme = activeTheme || theme;
  const [activeTab, setActiveTab] = useState('backup'); // 'backup' | 'theme'
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // 구글 로그인 초기화 및 현재 로그인 상태 확인
    GoogleDriveService.init();
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await GoogleDriveService.getCurrentUser();
      setUserInfo(user);
    } catch (e) {
      console.error('Failed to check user status:', e);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const user = await GoogleDriveService.signIn();
      setUserInfo(user);
      if (user) {
        Alert.alert('로그인 성공', `${user.name || user.email} 계정이 연결되었습니다.`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('로그인 실패', '구글 계정 연결 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      '구글 계정 연결 해제',
      '구글 계정 연결을 해제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await GoogleDriveService.signOut();
              setUserInfo(null);
              Alert.alert('완료', '구글 계정 연결이 해제되었습니다.');
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBackup = async () => {
    try {
      setLoading(true);

      // 1. 모든 데이터 추출
      const allDataString = await Database.exportAllData();

      // 2. 구글 드라이브에 업로드
      await GoogleDriveService.uploadBackup(allDataString);

      // 성공 후 로그인 사용자 정보 갱신
      await checkLoginStatus();

      Alert.alert('백업 성공', '개인 구글 드라이브에 데이터가 성공적으로 백업되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('백업 실패', '백업 중 오류가 발생했습니다. 구글 계정 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      '데이터 복원',
      '구글 드라이브의 백업 데이터로 현재 기기의 데이터를 덮어씁니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복원',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // 1. 구글 드라이브에서 데이터 다운로드
              const backupData = await GoogleDriveService.downloadBackup();

              // 2. 로컬 DB에 덮어쓰기
              await Database.importAllData(backupData);

              await checkLoginStatus();

              Alert.alert('복원 성공', '데이터가 성공적으로 복원되었습니다.');
            } catch (error) {
              console.error(error);
              Alert.alert('복원 실패', '복원 중 오류가 발생했습니다. 백업 파일이 있는지 확인해주세요.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const currentPreset = presets.find((p) => p.id === currentThemeId) || presets[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.headerTitle}>설정</Text>

      {/* 상단 서브 탭 (세그먼트 컨트롤) */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'backup' && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab('backup')}
          activeOpacity={0.7}
        >
          <Feather
            name="database"
            size={16}
            color={activeTab === 'backup' ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
            style={styles.segmentIcon}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'backup' && [styles.segmentTextActive, { color: currentTheme.colors.primary }],
            ]}
          >
            계정 및 백업
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'theme' && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab('theme')}
          activeOpacity={0.7}
        >
          <Feather
            name="droplet"
            size={16}
            color={activeTab === 'theme' ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
            style={styles.segmentIcon}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'theme' && [styles.segmentTextActive, { color: currentTheme.colors.primary }],
            ]}
          >
            테마 색상 설정
          </Text>
        </TouchableOpacity>
      </View>

      {/* 탭 1: 구글 계정 연결 / 데이터 백업 및 복원 */}
      {activeTab === 'backup' && (
        <View>
          {/* 1. 구글 계정 연결 카드 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="user" size={18} color={currentTheme.colors.primary} style={styles.cardHeaderIcon} />
              <Text style={styles.cardTitle}>구글 계정 연결</Text>
            </View>

            {userInfo ? (
              <View style={styles.accountContainer}>
                <View style={styles.userInfoRow}>
                  {userInfo.photo ? (
                    <Image source={{ uri: userInfo.photo }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Feather name="user" size={20} color={currentTheme.colors.primary} />
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{userInfo.name || '구글 사용자'}</Text>
                    <Text style={styles.userEmail}>{userInfo.email}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
                  <Feather name="log-out" size={14} color={currentTheme.colors.error} style={styles.btnIconSmall} />
                  <Text style={styles.signOutText}>연결 해제</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noAccountContainer}>
                <Text style={styles.noAccountText}>
                  개인 구글 드라이브에 안전하게 데이터를 백업 및 복원하려면 구글 계정을 연결해 주세요.
                </Text>
                <TouchableOpacity style={styles.connectButton} onPress={handleSignIn} disabled={loading}>
                  <Feather name="log-in" size={18} color={currentTheme.colors.onPrimary} style={styles.btnIcon} />
                  <Text style={styles.connectButtonText}>구글 계정 연결하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 2. 데이터 백업 및 복원 카드 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="database" size={18} color={currentTheme.colors.primary} style={styles.cardHeaderIcon} />
              <Text style={styles.cardTitle}>데이터 백업 및 복원</Text>
            </View>
            <Text style={styles.cardDescription}>
              연결된 본인의 구글 드라이브 전용 공간에 앱 데이터를 안전하게 보관하거나 기기로 복원합니다.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.backupButton} onPress={handleBackup} disabled={loading}>
                <Feather name="upload-cloud" size={18} color={currentTheme.colors.onPrimary} style={styles.btnIcon} />
                <Text style={styles.buttonText}>구글 드라이브에 백업</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={loading}>
                <Feather name="download-cloud" size={18} color={currentTheme.colors.onPrimary} style={styles.btnIcon} />
                <Text style={styles.buttonText}>구글 드라이브에서 복원</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. 도움말 및 앱 정보 카드 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="info" size={18} color={currentTheme.colors.primary} style={styles.cardHeaderIcon} />
              <Text style={styles.cardTitle}>도움말 및 앱 정보</Text>
            </View>
            <Text style={styles.cardDescription}>
              앱의 주요 기능 사용법, 팁, 만든 사람(개발자) 정보 및 자주 묻는 질문을 확인합니다.
            </Text>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => navigation.navigate('Help')}
              disabled={loading}
            >
              <Feather name="book-open" size={18} color={currentTheme.colors.primary} style={styles.cardHeaderIcon} />
              <Text style={styles.helpButtonText}>사용법 및 만든 사람 보기</Text>
              <Feather name="chevron-right" size={18} color={currentTheme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 탭 2: 화면 테마 색상 설정 */}
      {activeTab === 'theme' && (
        <View>
          {/* 현재 테마 미리보기 카드 */}
          <View style={[styles.previewCard, { borderColor: currentPreset.primary }]}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewBadge, { backgroundColor: currentPreset.primary }]}>
                <Feather name="check" size={12} color="#ffffff" />
                <Text style={styles.previewBadgeText}>현재 적용 테마</Text>
              </View>
              <Text style={[styles.previewThemeName, { color: currentPreset.primary }]}>
                {currentPreset.name}
              </Text>
            </View>
            <Text style={styles.previewDesc}>
              {currentPreset.description}
            </Text>
            <View style={styles.previewPaletteRow}>
              <View style={[styles.paletteSample, { backgroundColor: currentPreset.primary }]}>
                <Text style={styles.paletteSampleText}>메인</Text>
              </View>
              <View style={[styles.paletteSample, { backgroundColor: currentPreset.primaryDark }]}>
                <Text style={styles.paletteSampleText}>다크</Text>
              </View>
              <View style={[styles.paletteSample, { backgroundColor: currentPreset.secondaryContainer }]}>
                <Text style={[styles.paletteSampleText, { color: currentPreset.onSecondaryContainer }]}>강조</Text>
              </View>
              <View
                style={[
                  styles.paletteSample,
                  styles.paletteSampleBg,
                  { backgroundColor: currentPreset.surfaceVariant, borderColor: currentPreset.outline },
                ]}
              >
                <Text style={[styles.paletteSampleText, { color: currentPreset.textSecondary }]}>배경</Text>
              </View>
            </View>
          </View>

          {/* 테마 프리셋 선택 목록 카드 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="droplet" size={18} color={currentTheme.colors.primary} style={styles.cardHeaderIcon} />
              <Text style={styles.cardTitle}>테마 색상 팔레트 선택</Text>
            </View>
            <Text style={styles.cardDescription}>
              원하는 색상 테마를 터치하면 상단바, 하단 탭 메뉴 및 앱 전체 화면에 즉시 실시간으로 적용됩니다.
            </Text>

            <View style={styles.themeGrid}>
              {presets.map((preset) => {
                const isSelected = currentThemeId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.themeOptionCard,
                      isSelected && [
                        styles.themeOptionCardSelected,
                        {
                          borderColor: preset.primary,
                          backgroundColor: (preset.primaryLight || '#e0f2fe') + '35',
                        },
                      ],
                    ]}
                    onPress={() => setThemeId(preset.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.themeColorChip, { backgroundColor: preset.primary }]} />
                    <View style={styles.themeInfo}>
                      <View style={styles.themeTitleRow}>
                        <Text
                          style={[
                            styles.themeName,
                            isSelected && [styles.themeNameSelected, { color: preset.primary }],
                          ]}
                        >
                          {preset.name}
                        </Text>
                        {isSelected && (
                          <Feather name="check" size={16} color={preset.primary} style={styles.themeCheckIcon} />
                        )}
                      </View>
                      <Text style={styles.themeSubtitle}>
                        {preset.subtitle} • {preset.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>처리 중입니다...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8ECF0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    fontWeight: 'bold',
  },

  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.roundness,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  previewThemeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  previewPaletteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paletteSample: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteSampleText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  paletteSampleBg: {
    borderWidth: 1,
  },

  themeGrid: {
    gap: 10,
  },
  themeOptionCardSelected: {
    borderWidth: 2,
  },
  themeNameSelected: {
    fontWeight: 'bold',
  },
  themeCheckIcon: {
    marginLeft: 6,
  },
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: '#FAFAFA',
  },
  themeColorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeName: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  themeSubtitle: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: theme.colors.textPrimary,
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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  accountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  noAccountContainer: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: theme.roundness,
    alignItems: 'center',
  },
  noAccountText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.roundness,
    width: '100%',
  },
  connectButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    gap: 12,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: theme.roundness,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    padding: 14,
    borderRadius: theme.roundness,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  helpButtonText: {
    flex: 1,
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnIconSmall: {
    marginRight: 4,
  },
});
