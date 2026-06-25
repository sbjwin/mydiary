import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Database } from '../database/Database';

const Separator = () => <View style={styles.separator} />;

export default function StudentListScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
      const query = searchQuery.toLowerCase();
      const filtered = students.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(query);
        const schoolMatch = s.school_grade && s.school_grade.toLowerCase().includes(query);
        const phoneMatch = s.mobile_phone && s.mobile_phone.replace(/-/g, '').includes(query.replace(/-/g, ''));
        return nameMatch || schoolMatch || phoneMatch;
      });
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.studentCard}
      onPress={() => navigation.navigate('StudentDetail', { studentId: item.id })}
    >
      <View style={styles.studentInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.studentName}>{item.name}</Text>
          {item.school_grade ? (
            <Text style={styles.schoolGrade}>{item.school_grade}</Text>
          ) : null}
        </View>
        <Text style={styles.mobilePhone}>
          {item.mobile_phone ? `📱 ${item.mobile_phone}` : '휴대전화 없음'}
        </Text>
      </View>
      <View style={styles.arrowIcon}>
        <Text style={styles.arrowIconText}>▶</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 바 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 학교, 휴대전화 번호 검색..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 목록 본문 */}
      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
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
              <Text style={styles.addButtonInlineText}>+ 새 학생 등록하기</Text>
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
        <Text style={styles.fabButtonText}>+ 학생 추가</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
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
    color: '#9CA3AF',
    marginBottom: 16,
  },
  addButtonInline: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonInlineText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    backgroundColor: '#ffffff',
    paddingBottom: 80,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
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
    color: '#111827',
    marginRight: 8,
  },
  schoolGrade: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mobilePhone: {
    fontSize: 14,
    color: '#4B5563',
  },
  arrowIcon: {
    paddingLeft: 8,
  },
  arrowIconText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#6366F1',
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
});
