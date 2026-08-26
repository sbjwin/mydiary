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

export const Database = {
  // --- 학생 (주소록) CRUD ---

  // 학생 전체 목록 조회
  getAllStudents: async () => {
    try {
      const data = await AsyncStorage.getItem(STUDENTS_KEY);
      return data ? JSON.parse(data) : [];
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

  // 학생 추가
  addStudent: async (studentData) => {
    const newStudent = {
      ...studentData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
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

      students[index] = updatedStudent;
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      return updatedStudent;
    } catch (e) {
      console.error(`Failed to update student ${id}:`, e);
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
        return plansMap[weekKey];
      }

      // 저장된 주간 계획이 없다면 학생들의 기본 일정(default_schedules)을 바탕으로 초기 데이터 생성
      const students = await Database.getAllStudents();
      const defaultScheduleItems = [];

      students.forEach((student) => {
        if (Array.isArray(student.default_schedules)) {
          student.default_schedules.forEach((sched) => {
            const dayOfWeek = sched.dayOfWeek || 1; // 1:월 ~ 7:일
            const offset = dayOfWeek - 1;
            const dateStr = getDateFromMondayOffset(weekKey, offset);

            const phoneList = [];
            if (student.parent_mobile_phone) phoneList.push(`(모)${student.parent_mobile_phone}`);
            if (student.mobile_phone) phoneList.push(`(본)${student.mobile_phone}`);
            if (student.phone_number) phoneList.push(`(부)${student.phone_number}`);

            defaultScheduleItems.push({
              id: generateUUID(),
              studentId: student.id,
              studentName: student.name || '무명',
              paymentType: student.payment_type || '지사입금',
              subject: sched.subject || student.school_grade || '',
              address: student.address || '',
              phoneInfo: phoneList.join('\n'),
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
      plansMap[weekKey] = {
        ...planData,
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
