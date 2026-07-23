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
LocaleConfig.locales.ko = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const CustomDay = React.memo(({ date, state, marking, onPress }) => {
  const isSelected = marking?.selected;
  const classCount = marking?.classCount || 0;
  const isToday = state === 'today';

  return (
    <TouchableOpacity
      onPress={() => onPress(date)}
      style={[
        styles.dayContainer,
        isSelected && styles.selectedDay
      ]}
    >
      <Text
        style={[
          styles.dayText,
          state === 'disabled' && styles.disabledDayText,
          isToday && styles.todayText,
          isSelected && styles.selectedDayText
        ]}
      >
        {date.day}
      </Text>
      {classCount > 0 && (
        <View style={styles.classBadge}>
          <Text style={styles.classBadgeText}>{classCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

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

      Object.keys(dateGroups).forEach(date => {
        const recordsForDate = dateGroups[date];
        newMarkedDates[date] = { 
          classCount: recordsForDate.length 
        };
      });

      newMarkedDates[selectedDate] = {
        ...newMarkedDates[selectedDate],
        selected: true,
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

  const renderRecordItem = ({ item, index }) => {
    // 달력의 점 색상과 동일한 규칙으로 카드 왼쪽 띠(Border) 색상 결정
    const dotColors = [theme.colors.primary, '#8D6E63', '#78909C', '#5C6BC0', '#4DB6AC'];
    const cardColor = dotColors[index % dotColors.length];

    // 시간 포맷팅 (예: 14:30 -> 02:30 PM)
    let displayTime = item.class_time || '--:--';
    let ampm = '';
    if (item.class_time && item.class_time.includes(':')) {
      const [h, m] = item.class_time.split(':');
      const hour = parseInt(h, 10);
      ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
      displayTime = `${formattedHour < 10 ? '0' : ''}${formattedHour}:${m}`;
    }

    // 임시 태그 라벨 (향후 DB 필드로 교체 가능)
    const tagLabels = ['스튜디오 A', '온라인', '방문 수업'];
    const tagLabel = tagLabels[index % tagLabels.length];

    return (
      <TouchableOpacity
        style={[styles.agendaCard, { borderLeftColor: cardColor }]}
        onPress={() => navigation.navigate('ClassRecord', {
          studentId: item.student_id,
          recordId: item.id
        })}
      >
        <View style={styles.cardMainRow}>
          {/* 시간 영역 */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeTextLarge}>{displayTime}</Text>
            {!!ampm && <Text style={styles.timeAmPm}>{ampm}</Text>}
          </View>

          {/* 정보 영역 */}
          <View style={styles.infoColumn}>
            <Text style={styles.studentNameText}>{item.studentName}</Text>
            <View style={styles.subjectRow}>
              <Feather name="music" size={12} color={theme.colors.textSecondary} style={styles.musicIcon} />
              <Text style={styles.subjectText}>{item.book_issue_date || '과정 미입력'}</Text>
            </View>
          </View>

          {/* 태그 및 메뉴 영역 */}
          <View style={styles.actionColumn}>
            <View style={[styles.badgeContainer, { backgroundColor: cardColor + '1A' }]}>
              <Text style={[styles.badgeText, { color: cardColor }]}>{tagLabel}</Text>
            </View>
            <Feather name="more-vertical" size={20} color={theme.colors.textSecondary} style={styles.moreIcon} />
          </View>
        </View>

        {/* 기존 앱 장점: 하단 내용 미리보기 */}
        <View style={styles.previewContainer}>
          <Text style={styles.recordContentText} numberOfLines={1}>
            {item.content || '기록된 수업 내용이 없습니다.'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 캘린더 컴포넌트 */}
      <View style={styles.calendarContainer}>
        <Calendar
          current={selectedDate}
          monthFormat={'yyyy년 MM월'} // 년도와 월을 한글화
          onDayPress={handleDayPress}
          markedDates={markedDates}
          dayComponent={CustomDay}
          theme={{
            backgroundColor: theme.colors.surface,
            calendarBackground: theme.colors.surface,
            arrowColor: theme.colors.primary,
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
    backgroundColor: theme.colors.white,
    borderRadius: theme.roundness,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden', // 왼쪽 보더 반경 유지를 위해
    borderLeftWidth: 4,
  },
  cardMainRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingBottom: 8, // 미리보기가 아래에 있으므로 간격 축소
  },
  timeColumn: {
    width: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  timeTextLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  timeAmPm: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicIcon: {
    marginRight: 4,
  },
  subjectText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actionColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreIcon: {
    padding: 2,
  },
  previewContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingLeft: 16 + 65 + 8, // timeColumn 너비만큼 들여쓰기
  },
  recordContentText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic', // 기존 앱과의 차별화를 위해 기울임꼴 적용
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
  dayContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  disabledDayText: {
    color: theme.colors.outline,
  },
  todayText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  classBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  classBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.onSecondaryContainer,
  },
});
