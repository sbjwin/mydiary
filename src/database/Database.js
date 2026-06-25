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
      
      return filteredRecords.map((record) => {
        const student = students.find((s) => s.id === record.student_id);
        return {
          ...record,
          studentName: student ? student.name : '알 수 없는 학생',
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
};
