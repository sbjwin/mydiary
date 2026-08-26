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

// 시간 정규화 (24시간 디지털 형식)
const formatDisplayTime = (timeStr) => {
  if (!timeStr || !timeStr.trim()) return '-';
  const str = timeStr.trim();
  const digitalMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (digitalMatch) {
    const h = String(parseInt(digitalMatch[1], 10)).padStart(2, '0');
    return `${h}:${digitalMatch[2]}`;
  }
  const isPM = str.includes('오후') || str.includes('PM') || str.includes('pm');
  const isAM = str.includes('오전') || str.includes('AM') || str.includes('am');
  const hourMatch = str.match(/(\d{1,2})\s*시/) || str.match(/(\d{1,2}):/) || str.match(/\b(\d{1,2})\b/);
  const minMatch = str.match(/(\d{1,2})\s*분/) || str.match(/:(\d{2})/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1], 10);
    const minute = minMatch ? String(parseInt(minMatch[1], 10)).padStart(2, '0') : '00';
    if (isPM && hour < 12) hour += 12;
    else if (isAM && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }
  return str;
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
    const time = escapeHtml(formatDisplayTime(r.class_time));
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

/**
 * 3. 주간 업무 보고서 (시간표 & 기타 업무) HTML 생성
 */
export const generateWeeklyReportHtml = (weeklyPlan) => {
  const startDate = weeklyPlan?.startDate || '2026-08-17';
  const [year, month, day] = startDate.split('-').map(Number);
  const title = `${year}년 ${month}월 ${day}일 주간의 ${TEACHER_NAME} 업무 보고서`;

  // 날짜 계산 (월:0 ~ 일:6)
  const getDayHeader = (offset, label) => {
    const d = new Date(year, month - 1, day + offset);
    return `${label}(${d.getMonth() + 1}/${d.getDate()})`;
  };

  const dayHeaders = [
    getDayHeader(0, '월'),
    getDayHeader(1, '화'),
    getDayHeader(2, '수'),
    getDayHeader(3, '목'),
    getDayHeader(4, '금'),
    getDayHeader(5, '토'),
  ];

  const sundayHeader = getDayHeader(6, '일요일 시간표');

  const scheduleItems = weeklyPlan?.scheduleItems || [];
  const callItems = weeklyPlan?.callItems || [];

  // 시간대 목록 (10시, 11시, 12시[점심], 13시, 14시, 15시, 16시, 17시, 18시, 19시, 20시)
  const timeSlots = [
    { label: '오전', hour: 9 },
    { label: '10시', hour: 10 },
    { label: '11시', hour: 11 },
    { label: '12시', hour: 12, isLunch: true },
    { label: '1시', hour: 13 },
    { label: '2시', hour: 14 },
    { label: '3시', hour: 15 },
    { label: '4시', hour: 16 },
    { label: '5시', hour: 17 },
    { label: '6시', hour: 18 },
    { label: '7시', hour: 19 },
    { label: '8시', hour: 20 },
  ];

  // 특정 요일(1~6)과 특정 시간에 해당하는 수업 찾기
  const getItemsForSlot = (dayOfWeek, hour) => {
    return scheduleItems.filter((item) => {
      if (Number(item.dayOfWeek) !== dayOfWeek) return false;
      const rawHour = (item.startTime || '').match(/\d{1,2}/);
      if (!rawHour) return false;
      const startH = parseInt(rawHour[0], 10);
      if (hour === 9) return startH <= 9;
      if (hour === 20) return startH >= 20;
      return startH === hour;
    });
  };

  // 일요일(7) 수업들
  const sundayItems = scheduleItems.filter((item) => Number(item.dayOfWeek) === 7);

  // 셀 내부 수업 카드 HTML 렌더링
  const renderCellCard = (item) => {
    const studentName = escapeHtml(item.studentName || '');
    const payment = item.paymentType ? `(${escapeHtml(item.paymentType)})` : '';
    const subject = escapeHtml(item.subject || '');
    const address = escapeHtml(item.address || '');
    const phoneInfo = escapeHtml(item.phoneInfo || '').replace(/\n/g, '<br/>');
    const note = escapeHtml(item.statusNote || '');

    return `
      <div class="class-card">
        <div class="card-title"><strong>${item.startTime || ''} ${studentName}</strong><span class="payment-tag">${payment}</span></div>
        ${subject ? `<div class="card-subject">${subject}</div>` : ''}
        ${address ? `<div class="card-addr">${address}</div>` : ''}
        ${phoneInfo ? `<div class="card-phone">${phoneInfo}</div>` : ''}
        ${note ? `<div class="card-note">${note.startsWith('=>') ? note : `=> ${note}`}</div>` : ''}
      </div>
    `;
  };

  // 월~토 시간표 행 생성
  const tableRowsHtml = timeSlots
    .map((slot) => {
      if (slot.isLunch) {
        return `
          <tr class="lunch-row">
            <td class="time-header-cell">${slot.label}</td>
            <td colspan="6" class="lunch-cell">즐거운 점심 시간</td>
          </tr>
        `;
      }

      const colsHtml = [1, 2, 3, 4, 5, 6]
        .map((dayOfWeek) => {
          const items = getItemsForSlot(dayOfWeek, slot.hour);
          const cellContent = items.map(renderCellCard).join('');
          return `<td class="schedule-cell">${cellContent}</td>`;
        })
        .join('');

      return `
        <tr>
          <td class="time-header-cell">${slot.label}</td>
          ${colsHtml}
        </tr>
      `;
    })
    .join('');

  // 전화관리 테이블 행 생성
  let callRowsHtml = '';
  if (callItems.length === 0) {
    callRowsHtml = `
      <tr>
        <td style="width:25%; height:22px;"></td>
        <td style="width:75%;"></td>
      </tr>
      <tr>
        <td style="height:22px;"></td>
        <td></td>
      </tr>
    `;
  } else {
    callRowsHtml = callItems
      .slice(0, 5)
      .map(
        (c) => `
        <tr>
          <td class="text-center font-bold" style="width:28%;">${escapeHtml(c.name || '')}</td>
          <td style="font-size:8.5px;">${escapeHtml(c.content || '')}</td>
        </tr>
      `
      )
      .join('');
  }

  // 일요일 시간표 블록 생성 (2열 구조 또는 시간대 순서 리스트)
  const sundaySlots = [
    { label: '10시', hour: 10 },
    { label: '11시', hour: 11 },
    { label: '1시', hour: 13 },
    { label: '2시', hour: 14 },
    { label: '3시', hour: 15 },
    { label: '5시', hour: 17 },
    { label: '8시', hour: 20 },
  ];

  const sundayItemsHtml = sundaySlots
    .map((s) => {
      const items = sundayItems.filter((it) => {
        const h = parseInt((it.startTime || '00:00').split(':')[0], 10);
        return h === s.hour || (s.hour === 14 && h === 14) || (s.hour === 15 && h === 15) || (s.hour === 17 && (h === 16 || h === 17)) || (s.hour === 20 && (h === 18 || h === 19 || h === 20));
      });
      if (items.length === 0) return '';
      return `
        <div class="sun-row">
          <div class="sun-time-label">${s.label}</div>
          <div class="sun-content">${items.map(renderCellCard).join('')}</div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 7mm 8mm 7mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif;
    }
    body {
      background: #FFFFFF;
      color: #000000;
      font-size: 9px;
      line-height: 1.25;
    }
    .report-header {
      text-align: center;
      margin-bottom: 6px;
    }
    .report-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #111827;
      margin-bottom: 2px;
    }
    .report-subtitle {
      font-size: 10px;
      font-weight: 600;
      color: #4B5563;
    }
    .main-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .main-table th, .main-table td {
      border: 1px solid #4B5563;
      padding: 2px 3px;
      vertical-align: top;
    }
    .main-table th {
      background-color: #E5E7EB;
      font-size: 9.5px;
      font-weight: 700;
      text-align: center;
      height: 20px;
    }
    .time-header-cell {
      width: 32px;
      text-align: center;
      background-color: #F3F4F6;
      font-weight: 700;
      font-size: 9px;
      vertical-align: middle !important;
    }
    .schedule-cell {
      height: 38px;
      width: 16.1%;
      background-color: #FFFFFF;
    }
    .lunch-row td {
      height: 18px !important;
      padding: 0;
    }
    .lunch-cell {
      text-align: center;
      font-weight: 700;
      font-size: 9.5px;
      background-color: #F9FAFB;
      color: #374151;
      vertical-align: middle !important;
    }
    .class-card {
      margin-bottom: 3px;
      font-size: 8px;
      line-height: 1.2;
    }
    .card-title {
      font-size: 8.5px;
      color: #000000;
    }
    .card-title strong {
      font-weight: 700;
    }
    .payment-tag {
      font-size: 7.5px;
      color: #1F2937;
      margin-left: 2px;
    }
    .card-subject {
      color: #1E40AF;
      font-weight: 600;
    }
    .card-addr {
      color: #374151;
      font-size: 7.5px;
      word-break: break-all;
    }
    .card-phone {
      color: #1F2937;
      font-size: 7.5px;
    }
    .card-note {
      color: #DC2626;
      font-weight: 600;
      font-size: 7.5px;
      margin-top: 1px;
    }
    
    /* 하단 3단 영역 */
    .bottom-container {
      display: flex;
      border: 1px solid #4B5563;
      border-top: none;
      min-height: 175px;
    }
    .bottom-col-left {
      width: 33%;
      border-right: 1px solid #4B5563;
      padding: 5px;
    }
    .bottom-col-center {
      width: 33%;
      border-right: 1px solid #4B5563;
      padding: 5px;
    }
    .bottom-col-right {
      width: 34%;
      padding: 5px;
      background-color: #FAFAFA;
    }
    .section-title {
      font-weight: 700;
      font-size: 9.5px;
      margin-bottom: 4px;
      text-align: center;
      background-color: #E5E7EB;
      padding: 2px 0;
      border: 1px solid #9CA3AF;
    }
    .note-subtitle {
      font-weight: 700;
      font-size: 8.5px;
      color: #1F2937;
      margin-top: 4px;
      margin-bottom: 1px;
    }
    .note-content {
      font-size: 8px;
      color: #374151;
      white-space: pre-wrap;
      line-height: 1.3;
      min-height: 20px;
    }
    .call-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
    }
    .call-table th, .call-table td {
      border: 1px solid #9CA3AF;
      padding: 2px 3px;
      font-size: 8px;
    }
    .call-table th {
      background-color: #F3F4F6;
      font-weight: 700;
      text-align: center;
    }
    .sun-row {
      display: flex;
      border-bottom: 1px dashed #D1D5DB;
      padding: 3px 0;
    }
    .sun-row:last-child {
      border-bottom: none;
    }
    .sun-time-label {
      width: 28px;
      font-weight: 700;
      font-size: 8.5px;
      color: #111827;
      flex-shrink: 0;
    }
    .sun-content {
      flex: 1;
    }
    .font-bold { font-weight: 700; }
    .text-center { text-align: center; }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-title">${escapeHtml(title)}</div>
    <div class="report-subtitle">방문 수업 (팀별, 개별 마케팅 일정 포함)</div>
  </div>

  <table class="main-table">
    <thead>
      <tr>
        <th style="width:32px;"></th>
        ${dayHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="bottom-container">
    <!-- 1. 기타 업무 영역 -->
    <div class="bottom-col-left">
      <div class="section-title">기타 업무 (시험 관련 및 전달물)</div>
      
      <div class="note-subtitle">&lt;금주주요사항&gt;</div>
      <div class="note-content">${escapeHtml(weeklyPlan?.mainNotes || '#개학후 시간변동 체크\n#마감보고서 제출')}</div>

      <div class="note-subtitle">&lt;전주 결석&gt;</div>
      <div class="note-content">${escapeHtml(weeklyPlan?.prevAbsentNotes || '#유귀일: 개인사정')}</div>

      <div class="note-subtitle">&lt;특이사항&gt;</div>
      <div class="note-content">${escapeHtml(weeklyPlan?.specialNotes || '공지사항')}</div>
    </div>

    <!-- 2. 전화 관리 영역 -->
    <div class="bottom-col-center">
      <div class="section-title">전화 관리 (3개월 미만 회원 2회)</div>
      <table class="call-table">
        <thead>
          <tr>
            <th style="width:28%;">이름</th>
            <th>통화요일 및 내용</th>
          </tr>
        </thead>
        <tbody>
          ${callRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- 3. 일요일 시간표 영역 -->
    <div class="bottom-col-right">
      <div class="section-title">${escapeHtml(sundayHeader)}</div>
      <div style="padding-top: 2px;">
        ${sundayItemsHtml || '<div style="color:#9CA3AF; text-align:center; padding:10px;">일요일 예정된 수업이 없습니다.</div>'}
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 주간 업무 보고서 인쇄 실행
 */
export const printWeeklyReport = async (weeklyPlan) => {
  try {
    const html = generateWeeklyReportHtml(weeklyPlan);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Failed to print weekly report:', error);
    Alert.alert('인쇄 오류', '주간 업무 보고서를 인쇄하는 도중 오류가 발생했습니다.');
  }
};

/**
 * 주간 업무 보고서 PDF 파일 공유 (카톡/메일 등)
 */
export const shareWeeklyReport = async (weeklyPlan) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('공유 불가', '현재 기기에서 파일 공유 기능을 지원하지 않습니다.');
      return;
    }

    const html = generateWeeklyReportHtml(weeklyPlan);
    const { uri } = await Print.printToFileAsync({ html });
    const startDate = weeklyPlan?.startDate || '2026-08-17';
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `${startDate} 주간 업무 보고서 공유`,
    });
  } catch (error) {
    console.error('Failed to share weekly report PDF:', error);
    Alert.alert('공유 오류', '주간 업무 보고서 PDF를 공유하는 도중 오류가 발생했습니다.');
  }
};

export { shareWeeklyReportDocx } from './DocxExportService';


