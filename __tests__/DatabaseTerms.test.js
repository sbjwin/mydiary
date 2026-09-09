import { normalizeStudent } from '../src/database/Database';

describe('수강생/휴회자 차수(Terms) 관리 및 정규화(Migration) 단위 테스트', () => {
  test('1. 일지 기록이 있는 구버전 학생 데이터는 가장 첫 수업 일지 날짜로 1차 수강 시작일을 자동 복원해야 한다.', () => {
    const oldStudent = {
      id: 'student-101',
      name: '홍길동',
      created_at: '2025-05-01T00:00:00.000Z',
    };

    const mockRecords = [
      { student_id: 'student-101', class_date: '2025-03-20', content: '두 번째 수업' },
      { student_id: 'student-101', class_date: '2025-03-05', content: '첫 번째 수업' }, // 가장 빠름
      { student_id: 'student-101', class_date: '2025-04-10', content: '세 번째 수업' },
      { student_id: 'student-999', class_date: '2024-01-01', content: '다른 학생 수업' },
    ];

    const normalized = normalizeStudent(oldStudent, mockRecords);

    expect(normalized.status).toBe('active');
    expect(normalized.first_enrolled_date).toBe('2025-03-05');
    expect(normalized.current_term_number).toBe(1);
    expect(normalized.terms).toHaveLength(1);
    expect(normalized.terms[0]).toEqual({
      term_number: 1,
      start_date: '2025-03-05',
      end_date: null,
      status: 'active',
      reason: '최초 등록',
    });
  });

  test('2. 일지 기록이 없는 학생은 등록일(created_at)을 1차 수강 시작일로 삼아야 한다.', () => {
    const newStudentWithoutRecords = {
      id: 'student-102',
      name: '이순신',
      created_at: '2025-06-15T10:30:00.000Z',
    };

    const mockRecords = [];
    const normalized = normalizeStudent(newStudentWithoutRecords, mockRecords);

    expect(normalized.status).toBe('active');
    expect(normalized.first_enrolled_date).toBe('2025-06-15');
    expect(normalized.current_term_number).toBe(1);
    expect(normalized.terms[0].start_date).toBe('2025-06-15');
  });

  test('3. 이미 terms(수강 차수)가 존재하는 데이터는 값을 왜곡하지 않고 그대로 유지해야 한다.', () => {
    const modernStudent = {
      id: 'student-103',
      name: '강감찬',
      status: 'paused',
      first_enrolled_date: '2024-03-01',
      current_term_number: 2,
      terms: [
        {
          term_number: 1,
          start_date: '2024-03-01',
          end_date: '2024-06-30',
          status: 'paused',
          reason: '여름방학 휴회',
        },
        {
          term_number: 2,
          start_date: '2024-09-01',
          end_date: '2024-12-31',
          status: 'paused',
          reason: '겨울방학 휴회',
        },
      ],
    };

    const normalized = normalizeStudent(modernStudent, []);

    expect(normalized.status).toBe('paused');
    expect(normalized.first_enrolled_date).toBe('2024-03-01');
    expect(normalized.current_term_number).toBe(2);
    expect(normalized.terms).toHaveLength(2);
  });
});
