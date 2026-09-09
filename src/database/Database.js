import AsyncStorage from '@react-native-async-storage/async-storage';

const STUDENTS_KEY = '@mydiary:students';
const RECORDS_KEY = '@mydiary:records';
const WEEKLY_PLANS_KEY = '@mydiary:weekly_plans';

// 간단한 UUID 생성 헬퍼
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
};

// 특정 날짜가 속한 주의 월요일 날짜 구하기 (YYYY-MM-DD)
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

// 월요일 기준 N일 후 날짜 구하기 (0: 월, 1: 화, ... 6: 일)
export const getDateFromMondayOffset = (mondayString, offsetDays) => {
  const [y, m, d] = mondayString.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d + offsetDays);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const date = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

// 연락처 정보 정규화 헬퍼: 학부모는 (모)010-..., 학생 본인은 (본)010-... 형태로 통일
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

// 오늘 날짜 YYYY-MM-DD 문자열 헬퍼
export const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

/**
 * 기존 학생 데이터 하위 호환 및 수강 차수(terms) 정규화 헬퍼
 * - terms가 없는 구버전 데이터는 1차 수강으로 자동 정규화:
 *   1순위: 해당 학생의 첫 수업 일지 날짜 (class_date)
 *   2순위: 학생 등록일시 (created_at)
 *   3순위: 오늘 날짜
 */
export const normalizeStudent = (student, allRecords = []) => {
  if (!student || typeof student !== 'object') return student;

  const hasValidTerms = Array.isArray(student.terms) && student.terms.length > 0;
  if (hasValidTerms) {
    const currentTerm = student.terms[student.terms.length - 1];
    return {
      ...student,
      status: student.status || currentTerm.status || 'active',
      first_enrolled_date: student.first_enrolled_date || student.terms[0].start_date,
      current_term_number: student.current_term_number || currentTerm.term_number || student.terms.length,
    };
  }

  // terms가 없는 기존 학생 데이터 정규화
  let inferredStartDate = null;
  if (Array.isArray(allRecords) && allRecords.length > 0) {
    const studentRecords = allRecords.filter((r) => r.student_id === student.id && r.class_date);
    if (studentRecords.length > 0) {
      studentRecords.sort((a, b) => a.class_date.localeCompare(b.class_date));
      inferredStartDate = studentRecords[0].class_date;
    }
  }

  if (!inferredStartDate && student.start_date) {
    inferredStartDate = student.start_date;
  }
  if (!inferredStartDate && student.created_at) {
    inferredStartDate = student.created_at.split('T')[0];
  }
  if (!inferredStartDate) {
    inferredStartDate = getTodayDateString();
  }

  const initialStatus = student.status || 'active';
  const initialTerms = [
    {
      term_number: 1,
      start_date: inferredStartDate,
      end_date: null,
      status: initialStatus,
      reason: '최초 등록',
    },
  ];

  return {
    ...student,
    status: initialStatus,
    first_enrolled_date: student.first_enrolled_date || inferredStartDate,
    current_term_number: 1,
    terms: initialTerms,
  };
};

export const Database = {
  // --- 학생 (주소록) CRUD ---

  // 학생 전체 목록 조회 (정규화 및 Lazy 마이그레이션 적용)
  getAllStudents: async () => {
    try {
      const data = await AsyncStorage.getItem(STUDENTS_KEY);
      const rawStudents = data ? JSON.parse(data) : [];
      if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
        return [];
      }

      // 정규화 대상 여부 검사
      const needsMigration = rawStudents.some(
        (s) => !Array.isArray(s.terms) || s.terms.length === 0
      );

      let records = [];
      if (needsMigration) {
        try {
          const recData = await AsyncStorage.getItem(RECORDS_KEY);
          records = recData ? JSON.parse(recData) : [];
        } catch (err) {
          console.warn('Failed to load records for student migration:', err);
        }
      }

      const normalizedStudents = rawStudents.map((s) => normalizeStudent(s, records));

      // 마이그레이션이 필요한 학생이 있었을 경우 안전하게 1회 영구 동기화
      if (needsMigration) {
        AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(normalizedStudents)).catch((err) =>
          console.warn('Failed to persist migrated students:', err)
        );
      }

      return normalizedStudents;
    } catch (e) {
      console.error('Failed to get students:', e);
      return [];
    }
  },

  // 특정 학생 조회
  getStudentById: async (id) => {
    try {
      const students = await Database.getAllStudents();
      const student = students.find((s) => s.id === id);
      return student || null;
    } catch (e) {
      console.error(`Failed to get student by id ${id}:`, e);
      return null;
    }
  },

  // 학생 추가 (1차 수강 자동 초기화)
  addStudent: async (studentData) => {
    const today = getTodayDateString();
    const startDate = studentData.start_date || studentData.first_enrolled_date || today;
    const initialStatus = studentData.status || 'active';

    const newStudent = {
      ...studentData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      status: initialStatus,
      first_enrolled_date: startDate,
      current_term_number: 1,
      terms: Array.isArray(studentData.terms) && studentData.terms.length > 0
        ? studentData.terms
        : [
            {
              term_number: 1,
              start_date: startDate,
              end_date: null,
              status: initialStatus,
              reason: studentData.status_reason || '최초 등록',
            },
          ],
    };

    try {
      const students = await Database.getAllStudents();
      students.push(newStudent);
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      return newStudent;
    } catch (e) {
      console.error('Failed to add student:', e);
      throw e;
    }
  },

  // 학생 정보 수정
  updateStudent: async (id, updatedData) => {
    try {
      const students = await Database.getAllStudents();
      const index = students.findIndex((s) => s.id === id);
      if (index === -1) {
        throw new Error(`Student with id ${id} not found`);
      }

      const updatedStudent = {
        ...students[index],
        ...updatedData,
      };

      // 1차 수강 시작일을 수정한 경우 terms[0]의 start_date도 동기화
      if (
        updatedData.first_enrolled_date &&
        Array.isArray(updatedStudent.terms) &&
        updatedStudent.terms.length > 0
      ) {
        updatedStudent.terms[0] = {
          ...updatedStudent.terms[0],
          start_date: updatedData.first_enrolled_date,
        };
      }

      students[index] = updatedStudent;
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      return updatedStudent;
    } catch (e) {
      console.error(`Failed to update student ${id}:`, e);
      throw e;
    }
  },

  // 학생 수강 차수 휴회 처리
  pauseStudentTerm: async (studentId, { endDate, reason } = {}) => {
    try {
      const students = await Database.getAllStudents();
      const index = students.findIndex((s) => s.id === studentId);
      if (index === -1) {
        throw new Error(`Student with id ${studentId} not found`);
      }

      const student = { ...students[index] };
      const terms = Array.isArray(student.terms) ? [...student.terms] : [];
      const pauseDate = endDate || getTodayDateString();

      if (terms.length > 0) {
        const lastIdx = terms.length - 1;
        terms[lastIdx] = {
          ...terms[lastIdx],
          end_date: pauseDate,
          status: 'paused',
          reason: reason || terms[lastIdx].reason || '휴회',
        };
      } else {
        terms.push({
          term_number: 1,
          start_date: student.first_enrolled_date || pauseDate,
          end_date: pauseDate,
          status: 'paused',
          reason: reason || '휴회',
        });
      }

      student.status = 'paused';
      student.terms = terms;
      student.current_term_number = terms.length;

      students[index] = student;
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      return student;
    } catch (e) {
      console.error(`Failed to pause student term for ${studentId}:`, e);
      throw e;
    }
  },

  // 학생 재수강(복귀) 시작 처리 (새로운 차수 추가)
  resumeStudentTerm: async (studentId, { startDate, reason, defaultSchedules } = {}) => {
    try {
      const students = await Database.getAllStudents();
      const index = students.findIndex((s) => s.id === studentId);
      if (index === -1) {
        throw new Error(`Student with id ${studentId} not found`);
      }

      const student = { ...students[index] };
      const terms = Array.isArray(student.terms) ? [...student.terms] : [];
      const resumeDate = startDate || getTodayDateString();
      const nextTermNumber =
        (terms.length > 0 ? terms[terms.length - 1].term_number || terms.length : 0) + 1;

      terms.push({
        term_number: nextTermNumber,
        start_date: resumeDate,
        end_date: null,
        status: 'active',
        reason: reason || `${nextTermNumber}차 재수강`,
      });

      student.status = 'active';
      student.terms = terms;
      student.current_term_number = nextTermNumber;

      if (Array.isArray(defaultSchedules)) {
        student.default_schedules = defaultSchedules;
      }

      students[index] = student;
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      return student;
    } catch (e) {
      console.error(`Failed to resume student term for ${studentId}:`, e);
      throw e;
    }
  },

  // 학생 삭제 (해당 학생의 수업 기록도 함께 삭제 - CASCADE)
  deleteStudent: async (id) => {
    try {
      // 1. 학생 삭제
      const students = await Database.getAllStudents();
      const filteredStudents = students.filter((s) => s.id !== id);
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(filteredStudents));

      // 2. 해당 학생의 수업 기록 삭제
      const records = await Database.getAllRecords();
      const filteredRecords = records.filter((r) => r.student_id !== id);
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(filteredRecords));
    } catch (e) {
      console.error(`Failed to delete student ${id}:`, e);
      throw e;
    }
  },

  // --- 수업 기록 CRUD ---

  // 수업 기록 전체 조회
  getAllRecords: async () => {
    try {
      const data = await AsyncStorage.getItem(RECORDS_KEY);
      if (!data) return [];
      let records = JSON.parse(data);
      const needsMigration = records.some((r) => r.book_issue_date !== undefined);
      if (needsMigration) {
        records = records.map((record) => {
          if (record.book_issue_date !== undefined) {
            record.course = record.book_issue_date;
            delete record.book_issue_date;
          }
          return record;
        });
        await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      }
      return records;
    } catch (e) {
      console.error('Failed to get class records:', e);
      return [];
    }
  },

  // 특정 학생의 전체 수업 기록 조회
  getRecordsByStudent: async (studentId) => {
    try {
      const records = await Database.getAllRecords();
      return records.filter((r) => r.student_id === studentId);
    } catch (e) {
      console.error(`Failed to get records for student ${studentId}:`, e);
      return [];
    }
  },

  // 특정 날짜의 전체 수업 기록 조회
  getRecordsByDate: async (dateString) => {
    try {
      const records = await Database.getAllRecords();
      const students = await Database.getAllStudents();

      const filteredRecords = records.filter((r) => r.class_date === dateString);

      // 수업 시간(class_time) 기준 오름차순 정렬 (HH:mm)
      filteredRecords.sort((a, b) => {
        const timeA = a.class_time || '00:00';
        const timeB = b.class_time || '00:00';
        return timeA.localeCompare(timeB);
      });

      return filteredRecords.map((record) => {
        const student = students.find((s) => s.id === record.student_id);
        return {
          ...record,
          studentName: student ? student.name : '알 수 없는 학생',
          studyMethod: student ? student.study_method : null,
        };
      });
    } catch (e) {
      console.error(`Failed to get records for date ${dateString}:`, e);
      return [];
    }
  },

  // 특정 날짜의 시간표 계획 + 실제 수업 기록 통합 조회 (달력 및 홈 연동용)
  getDailyScheduleAndRecords: async (dateString) => {
    try {
      const monday = getMondayOfWeek(dateString);
      const weeklyPlan = await Database.getWeeklyPlan(monday);
      const dateRecords = await Database.getRecordsByDate(dateString);

      const scheduledForDay = (weeklyPlan?.scheduleItems || []).filter(
        (item) => item.date === dateString
      );

      const mappedList = [];
      const matchedRecordIds = new Set();

      // 1. 계획된 수업들을 기준으로 일지 작성 여부 매핑
      scheduledForDay.forEach((planItem) => {
        // 학생 ID 또는 이름 일치 확인
        const matchedRecord = dateRecords.find(
          (r) =>
            (planItem.studentId && r.student_id === planItem.studentId) ||
            r.studentName === planItem.studentName
        );

        if (matchedRecord) {
          matchedRecordIds.add(matchedRecord.id);
          mappedList.push({
            id: planItem.id,
            planItem: planItem,
            record: matchedRecord,
            studentId: planItem.studentId || matchedRecord.student_id,
            studentName: planItem.studentName,
            classTime: planItem.startTime || matchedRecord.class_time,
            course: planItem.subject || matchedRecord.course,
            status: 'completed', // 일지 작성 완료
            statusNote: planItem.statusNote,
            paymentType: planItem.paymentType,
            address: planItem.address,
            phoneInfo: planItem.phoneInfo,
            isRecurring: planItem.isRecurring !== false,
          });
        } else {
          mappedList.push({
            id: planItem.id,
            planItem: planItem,
            record: null,
            studentId: planItem.studentId,
            studentName: planItem.studentName,
            classTime: planItem.startTime,
            course: planItem.subject,
            status: 'planned', // 예정 (일지 미작성)
            statusNote: planItem.statusNote,
            paymentType: planItem.paymentType,
            address: planItem.address,
            phoneInfo: planItem.phoneInfo,
            isRecurring: planItem.isRecurring !== false,
          });
        }
      });

      // 2. 계획에는 없지만 직접 추가 작성된 일지 레코드 매핑
      dateRecords.forEach((rec) => {
        if (!matchedRecordIds.has(rec.id)) {
          mappedList.push({
            id: rec.id,
            planItem: null,
            record: rec,
            studentId: rec.student_id,
            studentName: rec.studentName,
            classTime: rec.class_time,
            course: rec.course,
            status: 'completed_extra', // 계획 외 추가 수업 일지
            statusNote: '',
            paymentType: rec.studyMethod || '지사입금',
            address: '',
            phoneInfo: '',
            isRecurring: false,
          });
        }
      });

      // 시간 순서대로 정렬
      mappedList.sort((a, b) => {
        const timeA = a.classTime || '00:00';
        const timeB = b.classTime || '00:00';
        return timeA.localeCompare(timeB);
      });

      return mappedList;
    } catch (e) {
      console.error(`Failed to get daily schedule and records for ${dateString}:`, e);
      return [];
    }
  },

  // 수업 기록 추가
  addClassRecord: async (recordData) => {
    const newRecord = {
      ...recordData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    try {
      const records = await Database.getAllRecords();
      records.push(newRecord);
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      return newRecord;
    } catch (e) {
      console.error('Failed to add class record:', e);
      throw e;
    }
  },

  // 수업 기록 수정
  updateClassRecord: async (id, updatedData) => {
    try {
      const records = await Database.getAllRecords();
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) {
        throw new Error(`Class record with id ${id} not found`);
      }

      const updatedRecord = {
        ...records[index],
        ...updatedData,
      };

      records[index] = updatedRecord;
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      return updatedRecord;
    } catch (e) {
      console.error(`Failed to update class record ${id}:`, e);
      throw e;
    }
  },

  // 수업 기록 삭제
  deleteClassRecord: async (id) => {
    try {
      const records = await Database.getAllRecords();
      const filteredRecords = records.filter((r) => r.id !== id);
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(filteredRecords));
    } catch (e) {
      console.error(`Failed to delete class record ${id}:`, e);
      throw e;
    }
  },

  // --- 주간 계획 (Weekly Plans) CRUD ---
  
  // 모든 주간 계획 맵 조회
  getAllWeeklyPlansMap: async () => {
    try {
      const data = await AsyncStorage.getItem(WEEKLY_PLANS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to get all weekly plans:', e);
      return {};
    }
  },

  // 특정 주차(weekKey: 월요일 YYYY-MM-DD) 계획 조회 (없으면 학생 기본 시간표로 자동 생성)
  getWeeklyPlan: async (weekKey) => {
    try {
      const plansMap = await Database.getAllWeeklyPlansMap();
      if (plansMap[weekKey]) {
        const plan = plansMap[weekKey];
        if (Array.isArray(plan.scheduleItems)) {
          plan.scheduleItems = plan.scheduleItems.map((item) => ({
            ...item,
            phoneInfo: formatPhoneInfo(item.phoneInfo),
          }));
        }
        return plan;
      }

      // 저장된 주간 계획이 없다면 학생들의 기본 일정(default_schedules)을 바탕으로 초기 데이터 생성
      const students = await Database.getAllStudents();
      const defaultScheduleItems = [];

      students.forEach((student) => {
        // 휴회 상태(paused)인 학생은 주간 시간표 자동 생성에서 제외
        if (student.status === 'paused') {
          return;
        }

        if (Array.isArray(student.default_schedules)) {
          student.default_schedules.forEach((sched) => {
            const dayOfWeek = sched.dayOfWeek || 1; // 1:월 ~ 7:일
            const offset = dayOfWeek - 1;
            const dateStr = getDateFromMondayOffset(weekKey, offset);

            const parentPhone = student.parent_mobile_phone || student.parentMobilePhone;
            const studentPhone = student.mobile_phone || student.mobilePhone;
            const homePhone = student.phone_number || student.phoneNumber;

            const phoneList = [];
            if (studentPhone) {
              phoneList.push(`(본)${studentPhone}`);
            }
            if (parentPhone) {
              phoneList.push(`(모)${parentPhone}`);
            }
            if (homePhone) {
              phoneList.push(`(전화)${homePhone}`);
            }

            defaultScheduleItems.push({
              id: generateUUID(),
              studentId: student.id,
              studentName: student.name || '무명',
              paymentType: student.payment_type || '지사입금',
              subject: sched.subject || '',
              address: student.address || '',
              phoneInfo: formatPhoneInfo(phoneList.join('\n')),
              dayOfWeek: dayOfWeek,
              date: dateStr,
              startTime: sched.startTime || '10:00',
              duration: sched.duration || 60,
              statusTag: '정규',
              statusNote: '',
              isDefault: true,
              isRecurring: true,
            });
          });
        }
      });

      // 시간 순서대로 정렬
      defaultScheduleItems.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
      });

      const initialPlan = {
        weekKey: weekKey,
        startDate: weekKey,
        endDate: getDateFromMondayOffset(weekKey, 6),
        mainNotes: '',
        prevAbsentNotes: '',
        specialNotes: '',
        scheduleItems: defaultScheduleItems,
        callItems: [],
        updatedAt: new Date().toISOString(),
      };

      return initialPlan;
    } catch (e) {
      console.error(`Failed to get weekly plan for ${weekKey}:`, e);
      return {
        weekKey: weekKey,
        startDate: weekKey,
        endDate: getDateFromMondayOffset(weekKey, 6),
        mainNotes: '',
        prevAbsentNotes: '',
        specialNotes: '',
        scheduleItems: [],
        callItems: [],
      };
    }
  },

  // 특정 주차 계획 전체 저장
  saveWeeklyPlan: async (weekKey, planData) => {
    try {
      const plansMap = await Database.getAllWeeklyPlansMap();
      const normalizedScheduleItems = Array.isArray(planData.scheduleItems)
        ? planData.scheduleItems.map((item) => ({
            ...item,
            phoneInfo: formatPhoneInfo(item.phoneInfo),
          }))
        : [];

      plansMap[weekKey] = {
        ...planData,
        scheduleItems: normalizedScheduleItems,
        weekKey,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(WEEKLY_PLANS_KEY, JSON.stringify(plansMap));
      return plansMap[weekKey];
    } catch (e) {
      console.error(`Failed to save weekly plan for ${weekKey}:`, e);
      throw e;
    }
  },

  // --- 백업 / 복원 (Export / Import) ---

  // 모든 데이터를 하나의 JSON 문자열로 내보내기
  exportAllData: async () => {
    try {
      const students = await Database.getAllStudents();
      const records = await Database.getAllRecords();
      const weeklyPlans = await Database.getAllWeeklyPlansMap();

      const backupData = {
        students,
        records,
        weeklyPlans,
        timestamp: new Date().toISOString(),
      };

      return JSON.stringify(backupData);
    } catch (e) {
      console.error('Failed to export all data:', e);
      throw e;
    }
  },

  // JSON 파싱된 데이터를 기존 AsyncStorage에 덮어쓰기
  importAllData: async (parsedData) => {
    try {
      if (!parsedData) {
        throw new Error('No data provided for import');
      }

      const students = Array.isArray(parsedData.students) ? parsedData.students : [];
      const records = Array.isArray(parsedData.records) ? parsedData.records : [];
      const weeklyPlans = parsedData.weeklyPlans && typeof parsedData.weeklyPlans === 'object' ? parsedData.weeklyPlans : {};

      // 로컬 스토리지에 덮어쓰기
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      await AsyncStorage.setItem(WEEKLY_PLANS_KEY, JSON.stringify(weeklyPlans));

      console.log('Successfully imported data (students, records, weeklyPlans)');
    } catch (e) {
      console.error('Failed to import all data:', e);
      throw e;
    }
  },
};
