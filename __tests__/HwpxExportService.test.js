import {
  escapeXml,
  buildHeaderXml,
  buildWeeklyPlanHwpxSectionXml,
} from '../src/services/HwpxExportService';

describe('HwpxExportService OWPML 한글 문서 생성 단위 테스트', () => {
  test('1. XML 특수문자(&, <, >, ", \')가 올바르게 이스케이프되어야 한다.', () => {
    const raw = `수학 & 과학 <1등급> "성공적" '특이사항'`;
    const escaped = escapeXml(raw);
    expect(escaped).toBe('수학 &amp; 과학 &lt;1등급&gt; &quot;성공적&quot; &apos;특이사항&apos;');
  });

  test('2. null 또는 undefined 입력 시 빈 문자열을 반환해야 한다.', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });

  test('3. buildHeaderXml은 한글 2020 호환 필수 OWPML 헤더 구조를 포함해야 한다.', () => {
    const headerXml = buildHeaderXml();

    expect(headerXml).toContain('<hh:head');
    expect(headerXml).toContain('version="1.5"');
    expect(headerXml).toContain('<hh:fontfaces');
    expect(headerXml).toContain('lang="HANGUL"');
    expect(headerXml).toContain('face="맑은 고딕"');
    expect(headerXml).toContain('<hh:borderFills');
    expect(headerXml).toContain('<hh:charProperties');
    expect(headerXml).toContain('<hh:paraProperties');
    expect(headerXml).toContain('<hh:compatibleDocument targetProgram="HWP201X">');
    expect(headerXml).toContain('</hh:head>');
  });

  test('4. buildWeeklyPlanHwpxSectionXml은 한글 2020 표준 구역 속성(secPr) 및 하위 리스트(subList)를 준수해야 한다.', () => {
    const mockWeeklyPlan = {
      startDate: '2026-08-17',
      mainNotes: '#개학준비 체크\n#교재 배부',
      prevAbsentNotes: '#김철수 결석 보강',
      specialNotes: '#상담 예정',
      scheduleItems: [
        {
          dayOfWeek: 1, // 월요일
          startTime: '10:00',
          studentName: '김철수',
          subject: '수학',
          address: '서울시 강남구',
          phoneInfo: '010-1234-5678 (모)',
          statusNote: '교재 3단원 완료',
        },
        {
          dayOfWeek: 7, // 일요일
          startTime: '14:00',
          studentName: '이영희',
          subject: '영어',
          address: '서울시 서초구',
          phoneInfo: '010-9876-5432',
          statusNote: '단어 테스트',
        },
      ],
    };

    const sectionXml = buildWeeklyPlanHwpxSectionXml(mockWeeklyPlan);

    // 기본 태그 및 제목 검증
    expect(sectionXml).toContain('<hs:sec');
    expect(sectionXml).toContain('2026년 8월 17일 주간의 성백진 업무 보고서');
    expect(sectionXml).toContain('방문 수업 (팀별, 개별 마케팅 일정 포함)');

    // 한글 2020 필수: 첫 번째 문단 내 용지 설정 secPr 및 다단 colPr 확인
    expect(sectionXml).toContain('<hp:secPr');
    expect(sectionXml).toContain('landscape="WIDELY"');
    expect(sectionXml).toContain('<hp:colPr');

    // 한글 2020 필수: 표가 문단(<hp:p><hp:run><hp:tbl>) 내에 올바르게 캡슐화되어야 함
    expect(sectionXml).toContain('<hp:tbl id="1"');
    expect(sectionXml).toContain('<hp:tbl id="2"');

    // 표 크기 및 위치 속성 확인
    expect(sectionXml).toContain('<hp:sz width="51500"');
    expect(sectionXml).toContain('<hp:pos treatAsChar="1"');

    // 한글 2020 필수: 모든 셀(<hp:tc>) 내부 문단은 <hp:subList>로 감싸져 있어야 함
    expect(sectionXml).toContain('<hp:subList');
    const cellMatches = sectionXml.match(/<hp:tc[^>]*>[\s\S]*?<\/hp:tc>/g) || [];
    expect(cellMatches.length).toBeGreaterThan(0);
    cellMatches.forEach((cell) => {
      expect(cell).toContain('<hp:subList');
      expect(cell).toMatch(/<hp:p[^>]*>/);
    });

    // 점심시간 행 포함 확인
    expect(sectionXml).toContain('즐거운 점심 시간 ☕');
    expect(sectionXml).toContain('colSpan="6"');

    // 월요일 학생 정보 렌더링 확인
    expect(sectionXml).toContain('10:00 김철수');
    expect(sectionXml).toContain('수학');
    expect(sectionXml).toContain('서울시 강남구');
    expect(sectionXml).toContain('010-1234-5678 (모)');
    expect(sectionXml).toContain('=&gt; 교재 3단원 완료');

    // 일요일 학생 정보 렌더링 확인
    expect(sectionXml).toContain('14:00 이영희');
    expect(sectionXml).toContain('영어');

    // 하단 메모 확인
    expect(sectionXml).toContain('#개학준비 체크');
    expect(sectionXml).toContain('#김철수 결석 보강');
    expect(sectionXml).toContain('#상담 예정');
  });

  test('5. 수업 일정이 없는 빈 시간대라도 오류 없이 빈 문단 셀을 안전하게 생성해야 한다.', () => {
    const emptyWeeklyPlan = {
      startDate: '2026-09-01',
      scheduleItems: [],
    };

    const sectionXml = buildWeeklyPlanHwpxSectionXml(emptyWeeklyPlan);
    expect(sectionXml).toContain('일요일 예정된 수업이 없습니다.');
    expect(sectionXml).toContain('2026년 9월 1일 주간의 성백진 업무 보고서');
  });
});
