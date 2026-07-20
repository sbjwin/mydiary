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
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Database } from '../database/Database';
import { theme } from '../theme';

// 달력 한글 설정
LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allRecs = await Database.getAllRecords();
      const allStuds = await Database.getAllStudents();
      setStudents(allStuds);

      const dateGroups = {};
      allRecs.forEach((rec) => {
        if (!dateGroups[rec.class_date]) {
          dateGroups[rec.class_date] = [];
        }
        dateGroups[rec.class_date].push(rec);
      });

      const newMarkedDates = {};
      // 수업 갯수에 따라 다른 색상의 점 표시 (디자인 참고)
      const dotColors = [theme.colors.primary, '#8D6E63', '#78909C', '#5C6BC0', '#4DB6AC'];

      Object.keys(dateGroups).forEach(date => {
        const recordsForDate = dateGroups[date];
        const dots = recordsForDate.map((rec, i) => ({
          key: rec.id || `dot-${i}`,
          color: dotColors[i % dotColors.length]
        }));
        
        newMarkedDates[date] = { dots: dots };
      });

      newMarkedDates[selectedDate] = {
        ...newMarkedDates[selectedDate],
        selected: true,
        selectedColor: theme.colors.primary,
      };

      setMarkedDates(newMarkedDates);

      const dateRecords = await Database.getRecordsByDate(selectedDate);
      setRecords(dateRecords);
    } catch (e) {
      console.error('Failed to load calendar data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleSelectStudentForRecord = (studentId) => {
    setStudentSelectVisible(false);
    navigation.navigate('ClassRecord', {
      studentId,
      selectedDate
    });
  };

  const renderRecordItem = ({ item }) => (
    <TouchableOpacity
      style={styles.agendaCard}
      onPress={() => navigation.navigate('ClassRecord', {
        studentId: item.student_id,
        recordId: item.id
      })}
    >
      <View style={styles.timeColumn}>
        <Feather name="clock" size={20} color={theme.colors.primary} style={{ marginBottom: 4 }} />
        <Text style={styles.timeText}>{item.class_time || '--:--'}</Text>
      </View>
      <View style={styles.infoColumn}>
        <Text style={styles.studentNameText}>{item.studentName}</Text>
        <Text style={styles.subjectText}>{item.book_issue_date || '과정 미입력'}</Text>
        <Text style={styles.recordContentText} numberOfLines={2}>
          {item.content || '기록된 수업 내용이 없습니다.'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 캘린더 컴포넌트 */}
      <View style={styles.calendarContainer}>
        <Calendar
          current={selectedDate}
          monthFormat={'yyyy년 MM월'} // 년도와 월을 한글화
          onDayPress={handleDayPress}
          markingType={'multi-dot'}
          markedDates={markedDates}
          theme={{
            backgroundColor: theme.colors.surface,
            calendarBackground: theme.colors.surface,
            selectedDayBackgroundColor: theme.colors.primary,
            selectedDayTextColor: theme.colors.white,
            todayTextColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
            dotColor: theme.colors.primary,
            selectedDotColor: theme.colors.white,
            monthTextColor: theme.colors.textPrimary,
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
          }}
        />
      </View>

      {/* 일정 목록 */}
      <View style={styles.agendaListContainer}>
        <Text style={styles.agendaTitle}>
          {selectedDate.split('-')[1]}월 {selectedDate.split('-')[2]}일 수업
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="calendar" size={32} color={theme.colors.outline} />
            <Text style={styles.emptyText}>예정된 수업이 없습니다.</Text>
            <TouchableOpacity
              style={styles.addRecordButtonInline}
              onPress={() => setStudentSelectVisible(true)}
            >
              <Text style={styles.addRecordButtonInlineText}>+ 새 수업 추가</Text>
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

      {/* 플로팅 버튼 */}
      {records.length > 0 && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setStudentSelectVisible(true)}
        >
          <Feather name="plus" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      )}

      {/* 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={studentSelectVisible}
        onRequestClose={() => setStudentSelectVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>학생 선택</Text>
              <TouchableOpacity onPress={() => setStudentSelectVisible(false)}>
                <Feather name="x" size={24} color={theme.colors.textSecondary} />
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
                  <Text style={styles.modalAddStudentBtnText}>주소록에서 추가하기</Text>
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
    backgroundColor: theme.colors.surfaceVariant,
  },
  calendarContainer: {
    backgroundColor: theme.colors.surface,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  agendaListContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  agendaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  agendaCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timeColumn: {
    width: 60,
    borderRightWidth: 1,
    borderRightColor: theme.colors.outline,
    marginRight: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subjectText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginVertical: 4,
  },
  recordContentText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
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
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  addRecordButtonInline: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.roundness,
  },
  addRecordButtonInlineText: {
    color: theme.colors.onSecondaryContainer,
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 80,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: theme.colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
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
    borderBottomColor: theme.colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  modalAddStudentBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.roundness,
  },
  modalAddStudentBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  studentSelectItem: {
    paddingVertical: 14,
  },
  studentSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  studentSelectSchool: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
});
