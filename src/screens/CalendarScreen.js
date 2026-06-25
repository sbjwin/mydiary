import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Database } from '../database/Database';

const Separator = () => <View style={styles.separator} />;

export default function CalendarScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentSelectVisible, setStudentSelectVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allRecs = await Database.getAllRecords();
      const allStuds = await Database.getAllStudents();
      setStudents(allStuds);

      // 캘린더 마킹 데이터 생성
      const newMarkedDates = {};
      
      // 수업 기록이 있는 날짜에 점 표시
      allRecs.forEach((rec) => {
        newMarkedDates[rec.class_date] = {
          marked: true,
          dotColor: '#4F46E5', // 인디고 블루 색상
        };
      });

      // 선택된 날짜 하이라이트
      newMarkedDates[selectedDate] = {
        ...newMarkedDates[selectedDate],
        selected: true,
        selectedColor: '#6366F1', // 테마 퍼플/인디고
      };

      setMarkedDates(newMarkedDates);

      // 선택된 날짜의 수업 기록 가져오기
      const dateRecords = await Database.getRecordsByDate(selectedDate);
      setRecords(dateRecords);
    } catch (e) {
      console.error('Failed to load calendar data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // 화면이 활성화되거나 선택 날짜 변경 시 로드
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  // 새로운 수업 기록 추가를 위해 학생 선택 시 호출
  const handleSelectStudentForRecord = (studentId) => {
    setStudentSelectVisible(false);
    navigation.navigate('ClassRecord', { 
      studentId, 
      selectedDate 
    });
  };

  const renderRecordItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.recordCard}
      onPress={() => navigation.navigate('ClassRecord', { 
        studentId: item.student_id, 
        recordId: item.id 
      })}
    >
      <View style={styles.recordHeader}>
        <Text style={styles.studentNameText}>{item.studentName}</Text>
        <Text style={styles.processText}>{item.book_issue_date || '과정 미입력'}</Text>
      </View>

      <Text style={styles.recordContentText} numberOfLines={2}>
        {item.content || '기록된 수업 내용이 없습니다.'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 네비게이션 헤더 역할의 바 */}
      <View style={styles.topMenuBar}>
        <Text style={styles.titleText}>수업 관리</Text>
        <TouchableOpacity 
          style={styles.addressBookButton}
          onPress={() => navigation.navigate('StudentList')}
        >
          <Text style={styles.addressBookButtonText}>👤 주소록</Text>
        </TouchableOpacity>
      </View>

      {/* 달력 컴포넌트 */}
      <View style={styles.calendarContainer}>
        <Calendar
          current={selectedDate}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: '#6366F1',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#4F46E5',
            arrowColor: '#4F46E5',
            dotColor: '#4F46E5',
            selectedDotColor: '#ffffff',
            monthTextColor: '#1F2937',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
          }}
        />
      </View>

      {/* 선택한 날짜의 일정 목록 */}
      <View style={styles.recordsListContainer}>
        <View style={styles.recordsListHeader}>
          <Text style={styles.selectedDateTitle}>
            {selectedDate.split('-')[1]}월 {selectedDate.split('-')[2]}일 수업
          </Text>
          <Text style={styles.recordsCountText}>
            총 {records.length}건
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>이 날짜에 기록된 수업이 없습니다.</Text>
            <TouchableOpacity 
              style={styles.addRecordButtonInline}
              onPress={() => setStudentSelectVisible(true)}
            >
              <Text style={styles.addRecordButtonInlineText}>+ 수업 일지 작성하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={renderRecordItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* 플로팅 추가 버튼 */}
      {records.length > 0 && (
        <TouchableOpacity 
          style={styles.fabButton}
          onPress={() => setStudentSelectVisible(true)}
        >
          <Text style={styles.fabButtonText}>+ 수업 추가</Text>
        </TouchableOpacity>
      )}

      {/* 학생 선택 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={studentSelectVisible}
        onRequestClose={() => setStudentSelectVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>수업을 등록할 학생 선택</Text>
              <TouchableOpacity onPress={() => setStudentSelectVisible(false)}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
            
            {students.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>등록된 학생이 없습니다.</Text>
                <TouchableOpacity 
                  style={styles.modalAddStudentBtn}
                  onPress={() => {
                    setStudentSelectVisible(false);
                    navigation.navigate('StudentList');
                  }}
                >
                  <Text style={styles.modalAddStudentBtnText}>주소록에서 학생 등록하기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={students}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.studentSelectItem}
                    onPress={() => handleSelectStudentForRecord(item.id)}
                  >
                    <Text style={styles.studentSelectName}>{item.name}</Text>
                    <Text style={styles.studentSelectSchool}>
                      {item.school_grade || '학교/학년 미지정'}
                    </Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={Separator}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topMenuBar: {
    height: 56,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  addressBookButton: {
    backgroundColor: '#EEF2F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addressBookButtonText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  recordsListContainer: {
    flex: 1,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recordsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  recordsCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  addRecordButtonInline: {
    backgroundColor: '#ECF0FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addRecordButtonInlineText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 80,
  },
  recordCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  processText: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  recordContentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButtonText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  modalAddStudentBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalAddStudentBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  studentSelectItem: {
    paddingVertical: 14,
  },
  studentSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  studentSelectSchool: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
});
