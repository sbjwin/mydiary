import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Database } from '../database/Database';
import {
  printStudentProfile,
  shareStudentProfile,
  printClassRecords,
  shareClassRecords
} from '../services/PrintService';
import { theme } from '../theme';

const Separator = () => <View style={styles.separator} />;

export default function StudentListScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 모달 제어용 상태
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [printOptionModalVisible, setPrintOptionModalVisible] = useState(false);
  const [printType, setPrintType] = useState('student'); // 'student' 또는 'records'

  // 학생 클릭 처리: 선택 모달 노출
  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setActionModalVisible(true);
  };

  // 수업일지 화면으로 이동
  const handleNavigateToRecord = () => {
    if (!selectedStudent) return;
    setActionModalVisible(false);
    navigation.navigate('ClassRecord', { studentId: selectedStudent.id });
  };

  // 학생 정보 수정 화면으로 이동
  const handleNavigateToDetail = () => {
    if (!selectedStudent) return;
    setActionModalVisible(false);
    navigation.navigate('StudentDetail', { studentId: selectedStudent.id });
  };

  // 학생 카드 출력 모달 열기
  const handleOpenStudentPrint = () => {
    setActionModalVisible(false);
    setPrintType('student');
    setPrintOptionModalVisible(true);
  };

  // 수업일지 출력 모달 열기
  const handleOpenRecordsPrint = () => {
    setActionModalVisible(false);
    setPrintType('records');
    setPrintOptionModalVisible(true);
  };

  // 인쇄 실행
  const handleExecutePrint = async () => {
    if (!selectedStudent) return;
    setPrintOptionModalVisible(false);

    if (printType === 'student') {
      await printStudentProfile(selectedStudent);
    } else {
      const records = await Database.getRecordsByStudent(selectedStudent.id);
      if (records.length === 0) {
        Alert.alert('알림', `${selectedStudent.name} 학생의 등록된 수업 일지가 없습니다.`);
        return;
      }
      await printClassRecords(selectedStudent, records, '전체 기간');
    }
  };

  // PDF 공유 실행
  const handleExecuteShare = async () => {
    if (!selectedStudent) return;
    setPrintOptionModalVisible(false);

    if (printType === 'student') {
      await shareStudentProfile(selectedStudent);
    } else {
      const records = await Database.getRecordsByStudent(selectedStudent.id);
      if (records.length === 0) {
        Alert.alert('알림', `${selectedStudent.name} 학생의 등록된 수업 일지가 없습니다.`);
        return;
      }
      await shareClassRecords(selectedStudent, records, '전체 기간');
    }
  };

  // 학생 목록 가져오기
  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await Database.getAllStudents();
      // 가나다순 정렬
      const sortedData = data.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      setStudents(sortedData);
      setFilteredStudents(sortedData);
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  };

  // 포커스되거나 처음 들어올 때 로드
  useEffect(() => {
    if (isFocused) {
      loadStudents();
    }
  }, [isFocused]);

  // 검색 쿼리가 변경될 때 필터링
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const q = searchQuery.trim().toLowerCase();
      const qDigits = q.replace(/-/g, '');
      const filtered = students.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const schoolMatch = s.school_grade && s.school_grade.toLowerCase().includes(q);
        const mobileMatch = s.mobile_phone && s.mobile_phone.replace(/-/g, '').includes(qDigits);
        const phoneMatch = s.phone_number && s.phone_number.replace(/-/g, '').includes(qDigits);
        return nameMatch || schoolMatch || mobileMatch || phoneMatch;
      });
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => handleStudentPress(item)}
    >
      <View style={styles.studentInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.studentName}>{item.name}</Text>
          {item.school_grade ? (
            <Text style={styles.schoolGrade}>{item.school_grade}</Text>
          ) : null}
        </View>
        <Text style={styles.mobilePhone}>
          {item.mobile_phone ? `📱 ${item.mobile_phone}` : item.phone_number ? `📞 ${item.phone_number}` : '전화번호 없음'}
        </Text>
      </View>
      <View style={styles.arrowIcon}>
        <Feather name="chevron-right" size={18} color={theme.colors.outline} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 바 */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 학교, 전화번호 검색..."
          placeholderTextColor={theme.colors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Feather name="x" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 목록 본문 */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? '검색 결과에 맞는 학생이 없습니다.' : '등록된 학생 주소록이 없습니다.'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.addButtonInline}
              onPress={() => navigation.navigate('StudentDetail')}
            >
              <Feather name="plus" size={16} color={theme.colors.onPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.addButtonInlineText}>새 학생 등록하기</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
        />
      )}

      {/* 새 학생 등록 FAB */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('StudentDetail')}
      >
        <Feather name="user-plus" size={18} color={theme.colors.onPrimary} style={{ marginRight: 6 }} />
        <Text style={styles.fabButtonText}>학생 추가</Text>
      </TouchableOpacity>

      {/* 학생 메뉴 선택 모달 (수업일지 보기 vs 정보 수정) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedStudent && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalStudentName}>{selectedStudent.name}</Text>
                    {selectedStudent.school_grade ? (
                      <Text style={styles.modalStudentSub}>{selectedStudent.school_grade}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => setActionModalVisible(false)} style={styles.modalCloseBtn}>
                    <Feather name="x" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* 메뉴 1: 수업일지 보기 / 작성 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleNavigateToRecord}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
                    <Feather name="book-open" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>수업일지 보기 / 작성</Text>
                    <Text style={styles.actionMenuSub}>학생의 수업 기록과 일지를 관리합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 2: 학생 정보 수정 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleNavigateToDetail}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: '#E0F2FE' }]}>
                    <Feather name="edit-3" size={20} color="#0284C7" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>학생 정보 수정</Text>
                    <Text style={styles.actionMenuSub}>연락처, 주소, 학부모 정보를 수정합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 3: 학생 카드 출력 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleOpenStudentPrint}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: '#ECFDF5' }]}>
                    <Feather name="user-check" size={20} color="#059669" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>학생 카드 출력</Text>
                    <Text style={styles.actionMenuSub}>인적사항 및 학부모 정보 카드를 인쇄/공유합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 메뉴 4: 수업일지 보고서 출력 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleOpenRecordsPrint}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: '#FDF2F8' }]}>
                    <Feather name="printer" size={20} color="#DB2777" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>수업일지 보고서 출력</Text>
                    <Text style={styles.actionMenuSub}>전체 수업 기록 일지를 인쇄하거나 PDF로 공유합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 인쇄 및 PDF 공유 방식 선택 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={printOptionModalVisible}
        onRequestClose={() => setPrintOptionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPrintOptionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedStudent && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalStudentName}>
                      {printType === 'student' ? '학생 정보 카드 출력' : '수업 일지 보고서 출력'}
                    </Text>
                    <Text style={styles.modalStudentSub}>
                      {selectedStudent.name} 학생 대상
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setPrintOptionModalVisible(false)} style={styles.modalCloseBtn}>
                    <Feather name="x" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* 옵션 1: 무선/유선 프린터로 인쇄 */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleExecutePrint}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
                    <Feather name="printer" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>프린터로 인쇄 (A4)</Text>
                    <Text style={styles.actionMenuSub}>Wi-Fi 프린터 연결 또는 시스템 인쇄 창을 엽니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>

                {/* 옵션 2: PDF 파일 공유 (카톡/메시지) */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={handleExecuteShare}
                >
                  <View style={[styles.actionIconBadge, { backgroundColor: '#E0F2FE' }]}>
                    <Feather name="share-2" size={22} color="#0284C7" />
                  </View>
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuTitle}>PDF 파일 공유 (카톡/메시지)</Text>
                    <Text style={styles.actionMenuSub}>카카오톡, 문자, 이메일로 PDF 문서를 전송합니다</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.outline} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    padding: 6,
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
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  addButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.roundness,
  },
  addButtonInlineText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    backgroundColor: theme.colors.white,
    paddingBottom: 80,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.white,
  },
  studentInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  schoolGrade: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mobilePhone: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  arrowIcon: {
    paddingLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
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
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  modalStudentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  modalStudentSub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: 4,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surfaceVariant + '80',
    marginBottom: 12,
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionMenuTextContainer: {
    flex: 1,
  },
  actionMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  actionMenuSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
