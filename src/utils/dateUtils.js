/**
 * MyDiary 공통 날짜 유틸리티 모듈
 */

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 오늘 또는 지정 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
export const getTodayFormatted = (dateInput = new Date()) => {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 하위 호환성을 위한 getTodayDateString (getTodayFormatted와 동일)
 */
export const getTodayDateString = getTodayFormatted;

/**
 * 특정 날짜가 속한 주의 월요일 날짜 구하기 (YYYY-MM-DD)
 * @param {Date|string} [dateInput=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
export const getMondayOfWeek = (dateInput = new Date()) => {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const day = d.getDay(); // 0(일), 1(월), ... 6(토)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준 계산
  const monday = new Date(d.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

/**
 * 월요일 기준 N일 후 날짜 구하기 (0: 월, 1: 화, ... 6: 일)
 * @param {string} mondayString 'YYYY-MM-DD'
 * @param {number} offsetDays
 * @returns {string} 'YYYY-MM-DD'
 */
export const getDateFromMondayOffset = (mondayString, offsetDays) => {
  const [y, m, d] = mondayString.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d + offsetDays);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const date = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

/**
 * 기준일로부터 N개월 전/후의 YYYY-MM-DD 반환
 * @param {number} monthsOffset -1: 1달 전, -3: 3달 전
 * @param {Date} [baseDate=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
export const getOffsetMonthDate = (monthsOffset, baseDate = new Date()) => {
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + monthsOffset);
  return getTodayFormatted(d);
};
