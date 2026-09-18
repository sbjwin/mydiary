import { Database } from '../src/database/Database';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('주간시간표(WeeklyPlan) 주차별 독립성 및 복사/불러오기 단위 테스트', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('1. 저장된 계획이 없는 신규 주차는 빈 scheduleItems([])를 반환해야 한다 (오염된 자동 생성 방지)', async () => {
    const weekKey = '2026-09-21';
    const plan = await Database.getWeeklyPlan(weekKey);

    expect(plan.weekKey).toBe(weekKey);
    expect(plan.scheduleItems).toEqual([]);
    expect(plan.mainNotes).toBe('');
  });

  test('2. copyWeeklyPlan은 이전 주차의 수업 항목들을 새로운 날짜와 ID로 정확히 복제해야 한다', async () => {
    const sourceWeekKey = '2026-09-14'; // 월요일
    const targetWeekKey = '2026-09-21'; // 다음 주 월요일

    const sourcePlan = {
      weekKey: sourceWeekKey,
      scheduleItems: [
        {
          id: 'item-1',
          studentId: 'stud-1',
          studentName: '이몽룡',
          dayOfWeek: 1, // 월요일
          date: '2026-09-14',
          startTime: '14:00',
          subject: '수학',
        },
        {
          id: 'item-2',
          studentId: 'stud-2',
          studentName: '성춘향',
          dayOfWeek: 3, // 수요일
          date: '2026-09-16',
          startTime: '16:00',
          subject: '국어',
        },
      ],
    };

    await Database.saveWeeklyPlan(sourceWeekKey, sourcePlan);

    // 지난주 시간표 복사 실행
    const copiedPlan = await Database.copyWeeklyPlan(sourceWeekKey, targetWeekKey);

    expect(copiedPlan).not.toBeNull();
    expect(copiedPlan.weekKey).toBe(targetWeekKey);
    expect(copiedPlan.scheduleItems).toHaveLength(2);

    // 날짜가 대상 주차의 해당 요일 날짜로 변환되었는지 검증
    const item1 = copiedPlan.scheduleItems.find((it) => it.studentName === '이몽룡');
    expect(item1.date).toBe('2026-09-21'); // 월요일
    expect(item1.startTime).toBe('14:00');
    expect(item1.id).not.toBe('item-1'); // 새 UUID

    const item2 = copiedPlan.scheduleItems.find((it) => it.studentName === '성춘향');
    expect(item2.date).toBe('2026-09-23'); // 수요일
    expect(item2.startTime).toBe('16:00');
    expect(item2.id).not.toBe('item-2');
  });

  test('3. loadWeeklyPlanFromStudentDefaults는 학생의 중복된 default_schedules를 1건으로 정제하여 로드해야 한다', async () => {
    const weekKey = '2026-09-21';

    // 학생에 중복된 default_schedules가 누적되어 있는 상황 가정
    const studentWithDupes = {
      id: 'stud-dupe-1',
      name: '홍길동',
      status: 'active',
      default_schedules: [
        { dayOfWeek: 1, startTime: '10:00', subject: '수학' },
        { dayOfWeek: 1, startTime: '10:00', subject: '수학' }, // 중복
        { dayOfWeek: 2, startTime: '14:00', subject: '영어' },
      ],
    };

    await Database.addStudent(studentWithDupes);

    // 기본 시간표 불러오기 실행
    const loadedPlan = await Database.loadWeeklyPlanFromStudentDefaults(weekKey);

    expect(loadedPlan.scheduleItems).toHaveLength(2); // 중복 1건 제외되어 총 2건
    const mondayClass = loadedPlan.scheduleItems.filter((it) => it.dayOfWeek === 1);
    expect(mondayClass).toHaveLength(1);
    expect(mondayClass[0].startTime).toBe('10:00');
  });

  test('4. 한 주차의 시간표를 수정하거나 삭제해도 다른 주차의 시간표는 영향을 받지 않아야 한다 (완전 독립성)', async () => {
    const week1 = '2026-09-07';
    const week2 = '2026-09-14';

    await Database.saveWeeklyPlan(week1, {
      weekKey: week1,
      scheduleItems: [
        { id: 'w1-1', studentName: '학생A', startTime: '10:00', dayOfWeek: 1, date: '2026-09-07' },
      ],
    });

    await Database.saveWeeklyPlan(week2, {
      weekKey: week2,
      scheduleItems: [
        { id: 'w2-1', studentName: '학생B', startTime: '15:00', dayOfWeek: 1, date: '2026-09-14' },
      ],
    });

    // week1의 시간표를 수정
    await Database.saveWeeklyPlan(week1, {
      weekKey: week1,
      scheduleItems: [
        { id: 'w1-1', studentName: '학생A', startTime: '11:00', dayOfWeek: 1, date: '2026-09-07' },
        { id: 'w1-2', studentName: '학생C', startTime: '14:00', dayOfWeek: 2, date: '2026-09-08' },
      ],
    });

    // week2 검증: 여전히 학생B만 그대로 존재해야 함
    const plan2 = await Database.getWeeklyPlan(week2);
    expect(plan2.scheduleItems).toHaveLength(1);
    expect(plan2.scheduleItems[0].studentName).toBe('학생B');
    expect(plan2.scheduleItems[0].startTime).toBe('15:00');
  });
});
