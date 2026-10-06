/**
 * MyDiary 공통 문자열 및 포맷팅 유틸리티 모듈
 */

/**
 * HTML 특수문자 이스케이프
 * @param {string} text
 * @returns {string}
 */
export const escapeHtml = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * XML 특수문자 이스케이프 (HWPX, DOCX 내보내기용)
 * @param {string} unsafe
 * @returns {string}
 */
export const escapeXml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * 다양한 형태의 시간 문자열을 'HH:mm' 24시간 디지털 형식으로 정규화
 * 예: '오전 11시' -> '11:00', '오후 2시 30분' -> '14:30', '11:00' -> '11:00'
 * @param {string} timeStr
 * @returns {string}
 */
export const formatDisplayTime = (timeStr) => {
  if (!timeStr || !timeStr.trim()) return '(미지정)';
  const str = timeStr.trim();

  // 1. 이미 HH:mm 또는 H:mm 형식인 경우
  const digitalMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (digitalMatch) {
    const h = String(parseInt(digitalMatch[1], 10)).padStart(2, '0');
    return `${h}:${digitalMatch[2]}`;
  }

  // 2. 한글 오전/오후 및 시/분이 포함된 경우
  const isPM = str.includes('오후') || str.includes('PM') || str.includes('pm');
  const isAM = str.includes('오전') || str.includes('AM') || str.includes('am');

  const hourMatch = str.match(/(\d{1,2})\s*시/) || str.match(/(\d{1,2}):/) || str.match(/\b(\d{1,2})\b/);
  const minMatch = str.match(/(\d{1,2})\s*분/) || str.match(/:(\d{2})/);

  if (hourMatch) {
    let hour = parseInt(hourMatch[1], 10);
    const minute = minMatch ? String(parseInt(minMatch[1], 10)).padStart(2, '0') : '00';

    if (isPM && hour < 12) {
      hour += 12;
    } else if (isAM && hour === 12) {
      hour = 0;
    }

    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  return str;
};

/**
 * 연락처 정보 정규화 헬퍼: 학부모는 (모)010-..., 학생 본인은 (본)010-... 형태로 통일
 * @param {string} phoneInfo
 * @returns {string}
 */
export const formatPhoneInfo = (phoneInfo) => {
  if (!phoneInfo || typeof phoneInfo !== 'string') return '';

  return phoneInfo
    .split('\n')
    .map((line) => {
      let trimmed = line.trim();
      if (!trimmed) return '';

      // 1. 학부모 관련 표기 교정 -> (모)010-XXXX-XXXX
      if (/^\(학부모[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\(학부모[^)]*\)\s*/, '(모)');
      } else if (/^학부모[:\s]*/.test(trimmed)) {
        trimmed = trimmed.replace(/^학부모[:\s]*/, '(모)');
      } else if (/^\(모[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\(모[^)]*\)\s*/, '(모)');
      } else if (/^모[:\s]*/.test(trimmed)) {
        trimmed = trimmed.replace(/^모[:\s]*/, '(모)');
      }

      // 2. 학생 본인 관련 표기 교정 -> (본)010-XXXX-XXXX
      else if (/^\(학생[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\(학생[^)]*\)\s*/, '(본)');
      } else if (/^학생[:\s]*/.test(trimmed)) {
        trimmed = trimmed.replace(/^학생[:\s]*/, '(본)');
      } else if (/^\(본인[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\(본인[^)]*\)\s*/, '(본)');
      } else if (/^본인[:\s]*/.test(trimmed)) {
        trimmed = trimmed.replace(/^본인[:\s]*/, '(본)');
      } else if (/^\(본[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\(본[^)]*\)\s*/, '(본)');
      }

      // 3. 아버지 관련 표기 교정 -> (부)010-XXXX-XXXX
      else if (/^\(아버지[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\(아버지[^)]*\)\s*/, '(부)');
      } else if (/^아버지[:\s]*/.test(trimmed)) {
        trimmed = trimmed.replace(/^아버지[:\s]*/, '(부)');
      } else if (/^\(부[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\(부[^)]*\)\s*/, '(부)');
      }

      // 4. 일반 전화 표기 교정 -> (전화)000-000-0000
      else if (/^\(집전화[^)]*\)/.test(trimmed) || /^\(자택[^)]*\)/.test(trimmed) || /^\(전화[^)]*\)/.test(trimmed)) {
        trimmed = trimmed.replace(/^\([^)]*\)\s*/, '(전화)');
      }

      return trimmed;
    })
    .filter(Boolean)
    .join('\n');
};

/**
 * 간단한 UUID 생성 헬퍼
 * @returns {string}
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
};
