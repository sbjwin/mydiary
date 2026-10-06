import {
  getTodayFormatted,
  getTodayDateString,
  getMondayOfWeek,
  getDateFromMondayOffset,
  getOffsetMonthDate,
  DAY_NAMES,
} from '../src/utils/dateUtils';
import {
  escapeHtml,
  escapeXml,
  formatDisplayTime,
  formatPhoneInfo,
  generateUUID,
} from '../src/utils/stringUtils';

describe('dateUtils 검증', () => {
  test('getTodayFormatted 및 getTodayDateString은 YYYY-MM-DD 형식을 반환해야 함', () => {
    const today = getTodayFormatted();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getTodayDateString()).toBe(today);
  });

  test('지정된 날짜의 월요일을 정확히 계산해야 함', () => {
    // 2026-10-06 은 화요일 -> 그 주의 월요일은 2026-10-05
    const monday = getMondayOfWeek('2026-10-06');
    expect(monday).toBe('2026-10-05');
  });

  test('월요일 기준 오프셋 일자를 정확히 계산해야 함', () => {
    // 2026-10-05(월) 기준 2일 후는 2026-10-07(수)
    const wednesday = getDateFromMondayOffset('2026-10-05', 2);
    expect(wednesday).toBe('2026-10-07');
  });

  test('DAY_NAMES 상수가 올바르게 정의되어 있어야 함', () => {
    expect(DAY_NAMES).toEqual(['일', '월', '화', '수', '목', '금', '토']);
  });

  test('getOffsetMonthDate가 정확한 날짜를 반환해야 함', () => {
    const baseDate = new Date(2026, 9, 15); // 2026-10-15
    const oneMonthAgo = getOffsetMonthDate(-1, baseDate);
    expect(oneMonthAgo).toBe('2026-09-15');
  });
});

describe('stringUtils 검증', () => {
  test('escapeHtml 특수문자 변환이 정확해야 함', () => {
    const input = '<b>"Hello" & \'World\'</b>';
    expect(escapeHtml(input)).toBe('&lt;b&gt;&quot;Hello&quot; &amp; &#39;World&#39;&lt;/b&gt;');
  });

  test('escapeXml 특수문자 변환이 정확해야 함', () => {
    const input = '<foo attr="bar" & test=\'1\'>';
    expect(escapeXml(input)).toBe('&lt;foo attr=&quot;bar&quot; &amp; test=&apos;1&apos;&gt;');
  });

  test('formatDisplayTime 다양한 시간 문자열을 HH:mm 형식으로 정규화해야 함', () => {
    expect(formatDisplayTime('11:00')).toBe('11:00');
    expect(formatDisplayTime('오전 9시 30분')).toBe('09:30');
    expect(formatDisplayTime('오후 2시')).toBe('14:00');
    expect(formatDisplayTime('오후 2:15')).toBe('14:15');
    expect(formatDisplayTime('')).toBe('(미지정)');
    expect(formatDisplayTime(null)).toBe('(미지정)');
  });

  test('formatPhoneInfo 연락처 표기를 규격화해야 함', () => {
    const raw = '학부모: 010-1234-5678\n학생: 010-9876-5432\n(부) 010-1111-2222';
    const formatted = formatPhoneInfo(raw);
    expect(formatted).toContain('(모)010-1234-5678');
    expect(formatted).toContain('(본)010-9876-5432');
    expect(formatted).toContain('(부)010-1111-2222');
  });

  test('generateUUID가 유효한 UUID v4 패턴을 생성해야 함', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
