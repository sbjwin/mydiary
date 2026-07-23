import AsyncStorage from '@react-native-async-storage/async-storage';

const STUDENTS_KEY = '@mydiary:students';
const RECORDS_KEY = '@mydiary:records';

// 간단한 UUID 생성 헬퍼
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
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
      return data ? JSON.parse(data) : [];
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

  // --- 백업 / 복원 (Export / Import) ---

  // 모든 데이터를 하나의 JSON 문자열로 내보내기
  exportAllData: async () => {
    try {
      const students = await Database.getAllStudents();
      const records = await Database.getAllRecords();

      const backupData = {
        students,
        records,
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

      // students와 records 필드가 배열인지 확인
      const students = Array.isArray(parsedData.students) ? parsedData.students : [];
      const records = Array.isArray(parsedData.records) ? parsedData.records : [];

      // 로컬 스토리지에 덮어쓰기
      await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));

      console.log('Successfully imported data');
    } catch (e) {
      console.error('Failed to import all data:', e);
      throw e;
    }
  },
};
