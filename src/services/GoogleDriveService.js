import { GoogleSignin } from '@react-native-google-signin/google-signin';

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

export const GoogleDriveService = {
  // 초기화 (App.js나 필요한 곳에서 호출 권장)
  init: () => {
    GoogleSignin.configure({
      scopes: SCOPES,
      // webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // 개발자 설정 필요
      // iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // 개발자 설정 필요
    });
  },

  // 로그인 및 토큰 가져오기
  signInAndGetToken: async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  },

  // 구글 드라이브에 백업 업로드
  uploadBackup: async (backupJsonString) => {
    try {
      const accessToken = await GoogleDriveService.signInAndGetToken();
      
      const metadata = {
        name: 'mydiary_backup.json',
        parents: ['appDataFolder'],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([backupJsonString], { type: 'application/json' }));

      // 1. 기존 파일 찾기
      const searchRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="mydiary_backup.json"', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const searchData = await searchRes.json();
      
      let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (searchData.files && searchData.files.length > 0) {
        // 기존 파일 덮어쓰기 (업데이트)
        const fileId = searchData.files[0].id;
        uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
      }

      // 2. 업로드
      const uploadRes = await fetch(uploadUrl, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      return await uploadRes.json();
    } catch (e) {
      console.error('Failed to upload backup:', e);
      throw e;
    }
  },

  // 구글 드라이브에서 백업 다운로드
  downloadBackup: async () => {
    try {
      const accessToken = await GoogleDriveService.signInAndGetToken();

      // 1. 파일 찾기
      const searchRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="mydiary_backup.json"', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const searchData = await searchRes.json();

      if (!searchData.files || searchData.files.length === 0) {
        throw new Error('Backup file not found in Google Drive.');
      }

      const fileId = searchData.files[0].id;

      // 2. 파일 다운로드
      const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      const backupData = await downloadRes.text();
      return JSON.parse(backupData);
    } catch (e) {
      console.error('Failed to download backup:', e);
      throw e;
    }
  },

  // 로그아웃
  signOut: async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
    }
  },
};
