import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Database } from '../database/Database';
import { GoogleDriveService } from '../services/GoogleDriveService';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 구글 로그인 초기화
    GoogleDriveService.init();
  }, []);

  const handleBackup = async () => {
    try {
      setLoading(true);
      
      // 1. 모든 데이터 추출
      const allDataString = await Database.exportAllData();
      
      // 2. 구글 드라이브에 업로드
      await GoogleDriveService.uploadBackup(allDataString);
      
      Alert.alert('백업 성공', '구글 드라이브에 데이터가 성공적으로 백업되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('백업 실패', '백업 중 오류가 발생했습니다. 개발자 설정을 확인해주세요.');
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
    <View style={styles.container}>
      <Text style={styles.title}>데이터 백업 및 복원</Text>
      <Text style={styles.description}>
        앱 데이터를 구글 드라이브에 안전하게 보관하세요.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backupButton} onPress={handleBackup} disabled={loading}>
          <Text style={styles.buttonText}>구글 드라이브에 백업</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={loading}>
          <Text style={styles.buttonText}>구글 드라이브에서 복원</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>처리 중입니다...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 15,
  },
  backupButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
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
    fontSize: 16,
    color: '#333',
  },
});
