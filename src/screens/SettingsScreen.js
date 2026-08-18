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

export default function SettingsScreen({ navigation }) {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.headerTitle}>설정</Text>

      {/* 1. 구글 계정 연결 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="user" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>구글 계정 연결</Text>
        </View>

        {userInfo ? (
          <View style={styles.accountContainer}>
            <View style={styles.userInfoRow}>
              {userInfo.photo ? (
                <Image source={{ uri: userInfo.photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Feather name="user" size={20} color={theme.colors.primary} />
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{userInfo.name || '구글 사용자'}</Text>
                <Text style={styles.userEmail}>{userInfo.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
              <Feather name="log-out" size={14} color={theme.colors.error} style={{ marginRight: 4 }} />
              <Text style={styles.signOutText}>연결 해제</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noAccountContainer}>
            <Text style={styles.noAccountText}>
              개인 구글 드라이브에 안전하게 데이터를 백업 및 복원하려면 구글 계정을 연결해 주세요.
            </Text>
            <TouchableOpacity style={styles.connectButton} onPress={handleSignIn} disabled={loading}>
              <Feather name="log-in" size={18} color={theme.colors.onPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.connectButtonText}>구글 계정 연결하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. 데이터 백업 및 복원 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="database" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>데이터 백업 및 복원</Text>
        </View>
        <Text style={styles.cardDescription}>
          연결된 본인의 구글 드라이브 전용 공간에 앱 데이터를 안전하게 보관하거나 기기로 복원합니다.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backupButton} onPress={handleBackup} disabled={loading}>
            <Feather name="upload-cloud" size={18} color={theme.colors.onPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>구글 드라이브에 백업</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={loading}>
            <Feather name="download-cloud" size={18} color={theme.colors.onPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>구글 드라이브에서 복원</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. 도움말 및 앱 정보 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="help-circle" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>도움말 및 앱 정보</Text>
        </View>
        <Text style={styles.cardDescription}>
          mydiary의 사용 가이드, 주요 기능 설명 및 앱 제작자 정보를 확인하실 수 있습니다.
        </Text>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => navigation.navigate('Help')}
          activeOpacity={0.7}
        >
          <View style={styles.helpButtonLeft}>
            <Feather name="book-open" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.helpButtonText}>도움말 및 앱 정보 보기</Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

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
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  helpButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
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
});
