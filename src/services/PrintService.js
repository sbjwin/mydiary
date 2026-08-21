import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const TEACHER_NAME = '성백진';

// HTML 특수문자 이스케이프 헬퍼 (XSS 및 레이아웃 깨짐 방지)
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// 오늘 날짜 포맷팅 (YYYY. MM. DD)
const getFormattedToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}`;
};

// 공통 인쇄용 CSS 스타일
const getCommonStyle = () => `
  @page {
    size: A4;
    margin: 15mm 15mm 15mm 15mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif;
  }
  body {
    background-color: #FFFFFF;
    color: #1F2937;
    padding: 10px;
  }
  .doc-header {
    border-bottom: 2.5px solid #2563EB;
    padding-bottom: 12px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .doc-title-box h1 {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.5px;
    margin-bottom: 3px;
  }
  .doc-title-box p {
    font-size: 11px;
    color: #6B7280;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .doc-meta {
    text-align: right;
    font-size: 11px;
    color: #4B5563;
    line-height: 1.5;
  }
  .doc-meta strong {
    color: #111827;
  }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1D4ED8;
    margin: 16px 0 6px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .form-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }
  .form-table th, .form-table td {
    border: 1px solid #D1D5DB;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.4;
  }
  .form-table th {
    background-color: #F9FAFB;
    color: #374151;
    font-weight: 600;
    text-align: center;
    width: 20%;
  }
  .form-table td {
    color: #1F2937;
    background-color: #FFFFFF;
  }
  .badge-chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: #EFF6FF;
    color: #1D4ED8;
  }
  .memo-box {
    border: 1px solid #D1D5DB;
    border-radius: 4px;
    padding: 10px 12px;
    min-height: 80px;
    background: #F9FAFB;
    font-size: 12px;
    line-height: 1.6;
    color: #374151;
    white-space: pre-wrap;
  }
  .record-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  .record-table th {
    background-color: #F3F4F6;
    border: 1px solid #D1D5DB;
    padding: 8px 6px;
    font-size: 11.5px;
    font-weight: 700;
    color: #374151;
    text-align: center;
  }
  .record-table td {
    border: 1px solid #D1D5DB;
    padding: 8px 8px;
    font-size: 11.5px;
    line-height: 1.4;
  }
  .record-table tr:nth-child(even) td {
    background-color: #FAFAFA;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .doc-footer {
    margin-top: 26px;
    padding-top: 14px;
    border-top: 1px dashed #D1D5DB;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #6B7280;
  }
  .sign-area {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #111827;
  }
  .sign-line {
    display: inline-block;
    width: 80px;
    border-bottom: 1px solid #111827;
    margin-left: 4px;
  }
`;

/**
 * 1. 학생 정보 카드 HTML 생성
 */
export const generateStudentProfileHtml = (student) => {
  const today = getFormattedToday();
  const name = escapeHtml(student?.name || '무명');
  const schoolGrade = escapeHtml(student?.school_grade || '-');
  const residentNumber = escapeHtml(student?.resident_number || '-');
  const studyMethod = escapeHtml(student?.study_method || '미지정');
  const mobilePhone = escapeHtml(student?.mobile_phone || '-');
  const phoneNumber = escapeHtml(student?.phone_number || '-');
  const email = escapeHtml(student?.email || '-');
  const address = escapeHtml(student?.address || '-');
  const parentName = escapeHtml(student?.parent_name || '-');
  const parentMobilePhone = escapeHtml(student?.parent_mobile_phone || '-');
  const notes = student?.notes
    ? escapeHtml(student.notes).replace(/\n/g, '<br/>')
    : '(등록된 특이사항이나 메모가 없습니다.)';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${name} 학생 관리 카드</title>
  <style>
    ${getCommonStyle()}
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-title-box">
      <h1>학생 관리 기록 카드</h1>
      <p>STUDENT PROFILE & INFORMATION</p>
    </div>
    <div class="doc-meta">
      <div><strong>출력일자:</strong> ${today}</div>
      <div><strong>학생명:</strong> ${name}</div>
    </div>
  </div>

  <div class="section-title">■ 기본 인적사항</div>
  <table class="form-table">
    <tr>
      <th>성 명</th>
      <td style="font-weight: 700; font-size: 13px;">${name}</td>
      <th>학교 및 학년</th>
      <td>${schoolGrade}</td>
    </tr>
    <tr>
      <th>주민등록번호</th>
      <td>${residentNumber}</td>
      <th>학습 방법</th>
      <td><span class="badge-chip">${studyMethod}</span></td>
    </tr>
    <tr>
      <th>휴대전화</th>
      <td style="font-weight: 600;">${mobilePhone}</td>
      <th>전화번호</th>
      <td>${phoneNumber}</td>
    </tr>
    <tr>
      <th>이메일</th>
      <td colspan="3">${email}</td>
    </tr>
    <tr>
      <th>거주지 주소</th>
      <td colspan="3">${address}</td>
    </tr>
  </table>

  <div class="section-title">■ 학부모 (보호자) 정보</div>
  <table class="form-table">
    <tr>
      <th>학부모 성함</th>
      <td>${parentName}</td>
      <th>비상 연락처</th>
      <td style="font-weight: 600; color: #1D4ED8;">${parentMobilePhone}</td>
    </tr>
  </table>

  <div class="section-title">■ 특이사항 및 지도 참고내용</div>
  <div class="memo-box">${notes}</div>

  <div class="doc-footer">
    <div>MyDiary 학습관리 시스템</div>
    <div class="sign-area">
      <span>담당 교사: <strong>${TEACHER_NAME}</strong></span>
      <span class="sign-line"></span> (인)
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 2. 수업일지 보고서 HTML 생성
 */
export const generateClassRecordsHtml = (student, records = [], periodTitle = '전체 기간') => {
  const name = escapeHtml(student?.name || '학생');
  const schoolGrade = student?.school_grade ? `(${escapeHtml(student.school_grade)})` : '';
  const safePeriodTitle = escapeHtml(periodTitle);
  const totalCount = records.length;

  // 날짜 최신순 정렬
  const sortedRecords = [...records].sort((a, b) => b.class_date.localeCompare(a.class_date));

  const tableRows = sortedRecords.length > 0 ? sortedRecords.map((r, index) => {
    const roundNumber = totalCount - index; // 최신순일 때 역순 번호 (1부터 시작하도록)
    const date = escapeHtml(r.class_date || '-');
    const time = escapeHtml(r.class_time || '-');
    const course = escapeHtml(r.course || '-');
    const content = escapeHtml(r.content || '-').replace(/\n/g, '<br/>');

    return `
      <tr>
        <td class="text-center" style="font-weight: 600;">${roundNumber}</td>
        <td class="text-center">${date}</td>
        <td class="text-center">${time}</td>
        <td style="font-weight: 600; color: #1D4ED8;">${course}</td>
        <td>${content}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="5" class="text-center" style="padding: 24px; color: #6B7280;">
        등록된 수업 일지가 없습니다.
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${name} 학생 수업 일지</title>
  <style>
    ${getCommonStyle()}
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-title-box">
      <h1>수업 일지 및 학습 보고서</h1>
      <p>STUDENT CLASS RECORDS & REPORT</p>
    </div>
    <div class="doc-meta">
      <div><strong>학생명:</strong> <span style="font-size: 13px; font-weight: bold; color: #111827;">${name}</span> ${schoolGrade}</div>
      <div><strong>조회 기간:</strong> ${safePeriodTitle}</div>
      <div><strong>총 수업 횟수:</strong> <strong>${totalCount}회차</strong></div>
    </div>
  </div>

  <table class="record-table">
    <thead>
      <tr>
        <th style="width: 7%;">회차</th>
        <th style="width: 14%;">수업일자</th>
        <th style="width: 15%;">수업시간</th>
        <th style="width: 18%;">과정 / 진도</th>
        <th style="width: 46%;">수업 내용 및 지도 사항</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="doc-footer" style="margin-top: 32px;">
    <div>MyDiary 학습관리 시스템 | 성장의 기록</div>
    <div class="sign-area">
      <span>지도 교사: <strong>${TEACHER_NAME}</strong></span>
      <span class="sign-line"></span> (인)
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 학생 정보 인쇄 실행
 */
export const printStudentProfile = async (student) => {
  try {
    const html = generateStudentProfileHtml(student);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Failed to print student profile:', error);
    Alert.alert('인쇄 오류', '학생 정보를 인쇄하는 도중 오류가 발생했습니다.');
  }
};

/**
 * 학생 정보 PDF 공유 (카톡/메시지 등)
 */
export const shareStudentProfile = async (student) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('공유 불가', '현재 기기에서 파일 공유 기능을 지원하지 않습니다.');
      return;
    }

    const html = generateStudentProfileHtml(student);
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `${student?.name || '학생'} 학생 정보 카드 공유`,
    });
  } catch (error) {
    console.error('Failed to share student profile PDF:', error);
    Alert.alert('공유 오류', '학생 정보 PDF를 공유하는 도중 오류가 발생했습니다.');
  }
};

/**
 * 수업 일지 보고서 인쇄 실행
 */
export const printClassRecords = async (student, records, periodTitle = '전체 기간') => {
  try {
    const html = generateClassRecordsHtml(student, records, periodTitle);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Failed to print class records:', error);
    Alert.alert('인쇄 오류', '수업 일지를 인쇄하는 도중 오류가 발생했습니다.');
  }
};

/**
 * 수업 일지 보고서 PDF 공유 (카톡/메시지 등)
 */
export const shareClassRecords = async (student, records, periodTitle = '전체 기간') => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('공유 불가', '현재 기기에서 파일 공유 기능을 지원하지 않습니다.');
      return;
    }

    const html = generateClassRecordsHtml(student, records, periodTitle);
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `${student?.name || '학생'} 학생 수업일지 공유`,
    });
  } catch (error) {
    console.error('Failed to share class records PDF:', error);
    Alert.alert('공유 오류', '수업 일지 PDF를 공유하는 도중 오류가 발생했습니다.');
  }
};
