import { GoogleSignin } from '@react-native-google-signin/google-signin';

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

export const GoogleDriveService = {
  // 초기화 (App.js나 필요한 곳에서 호출 권장)
  init: () => {
    GoogleSignin.configure({
      scopes: SCOPES,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
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

      // 1. 기존 파일 찾기
      const q = encodeURIComponent("name='mydiary_backup.json'");
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const searchData = await searchRes.json();
      console.log('Upload Search Data:', searchData);

      if (searchData.error) {
        throw new Error(`Google API Error: ${searchData.error.message}`);
      }
      
      let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (searchData.files && searchData.files.length > 0) {
        // 기존 파일 덮어쓰기 (업데이트)
        const fileId = searchData.files[0].id;
        uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
        delete metadata.parents; // PATCH 요청 시 parents 필드를 포함하면 에러 발생
      }

      // React Native의 FormData/Blob 버그를 우회하기 위해 multipart/related 문자열 바디 구성
      const boundary = 'mydiary_backup_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        backupJsonString +
        closeDelim;

      // 2. 업로드
      const uploadRes = await fetch(uploadUrl, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: body,
      });

      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        throw new Error(`Upload Error: ${uploadData.error.message}`);
      }
      return uploadData;
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
      const q = encodeURIComponent("name='mydiary_backup.json'");
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const searchData = await searchRes.json();
      console.log('Download Search Data:', searchData);

      if (searchData.error) {
        throw new Error(`Google API Error: ${searchData.error.message}`);
      }

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
