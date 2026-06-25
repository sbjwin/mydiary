import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Database } from '../database/Database';

export default function StudentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { studentId } = route.params || {};

  const isEditMode = !!studentId;

  // 학생 데이터 상태 (이름 제외하고 기본값은 빈 문자열)
  const [name, setName] = useState('');
  const [schoolGrade, setSchoolGrade] = useState('');
  const [residentNumber, setResidentNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [studyMethod, setStudyMethod] = useState('');

  // 학부모 데이터 상태
  const [parentName, setParentName] = useState('');
  const [parentMobilePhone, setParentMobilePhone] = useState('');

  // CMS 데이터 상태
  const [cmsBankOwner, setCmsBankOwner] = useState('');
  const [cmsAccountNumber, setCmsAccountNumber] = useState('');
  const [cmsResidentNumber, setCmsResidentNumber] = useState('');

  // 기타 데이터 상태
  const [notes, setNotes] = useState('');

  // 기존 데이터 불러오기
  useEffect(() => {
    if (isEditMode) {
      const fetchStudent = async () => {
        try {
          const student = await Database.getStudentById(studentId);
          if (student) {
            setName(student.name || '');
            setSchoolGrade(student.school_grade || '');
            setResidentNumber(student.resident_number || '');
            setAddress(student.address || '');
            setPhoneNumber(student.phone_number || '');
            setEmail(student.email || '');
            setMobilePhone(student.mobile_phone || '');
            setStudyMethod(student.study_method || '');
            
            setParentName(student.parent_name || '');
            setParentMobilePhone(student.parent_mobile_phone || '');
            
            setCmsBankOwner(student.cms_bank_owner || '');
            setCmsAccountNumber(student.cms_account_number || '');
            setCmsResidentNumber(student.cms_resident_number || '');
            
            setNotes(student.notes || '');
          }
        } catch (e) {
          console.error('Failed to load student details:', e);
          Alert.alert('오류', '학생 정보를 불러오지 못했습니다.');
        }
      };
      fetchStudent();
    }
  }, [studentId, isEditMode]);

  // 저장 처리
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름은 필수 항목입니다.');
      return;
    }

    const studentData = {
      name: name.trim(),
      school_grade: schoolGrade.trim() || null,
      resident_number: residentNumber.trim() || null,
      address: address.trim() || null,
      phone_number: phoneNumber.trim() || null,
      email: email.trim() || null,
      mobile_phone: mobilePhone.trim() || null,
      study_method: studyMethod.trim() || null,
      parent_name: parentName.trim() || null,
      parent_mobile_phone: parentMobilePhone.trim() || null,
      cms_bank_owner: cmsBankOwner.trim() || null,
      cms_account_number: cmsAccountNumber.trim() || null,
      cms_resident_number: cmsResidentNumber.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (isEditMode) {
        await Database.updateStudent(studentId, studentData);
        Alert.alert('완료', '학생 정보가 수정되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      } else {
        await Database.addStudent(studentData);
        Alert.alert('완료', '새로운 학생이 등록되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      console.error('Failed to save student:', e);
      Alert.alert('오류', '학생 정보를 저장하는 도중 오류가 발생했습니다.');
    }
  };

  // 삭제 처리
  const handleDelete = () => {
    Alert.alert(
      '학생 삭제',
      `정말로 ${name} 학생을 삭제하시겠습니까?\n(해당 학생의 수업 기록도 모두 삭제됩니다.)`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              await Database.deleteStudent(studentId);
              Alert.alert('완료', '학생 주소록이 삭제되었습니다.', [
                { text: '확인', onPress: () => navigation.popToTop() }
              ]);
            } catch (e) {
              console.error('Failed to delete student:', e);
              Alert.alert('오류', '삭제하는 동안 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* 수업 일지 이동 단축 버튼 (수정 모드일 때만 표시) */}
          {isEditMode && (
            <TouchableOpacity 
              style={styles.recordLinkButton}
              onPress={() => navigation.navigate('ClassRecord', { studentId })}
            >
              <Text style={styles.recordLinkButtonText}>📚 이 학생의 수업 일지 기록 보기/작성</Text>
            </TouchableOpacity>
          )}

          {/* 학생 영역 (그림 1 재구성) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>학 생</Text>
              <Text style={styles.sectionSubtitle}>*이름 외의 모든 칸은 빈칸이어도 저장 가능합니다.</Text>
            </View>

            <View style={styles.gridTable}>
              {/* Row 1 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>이 름 *</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="이름 입력 (필수)"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>학교, 학년</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={schoolGrade}
                    onChangeText={setSchoolGrade}
                    placeholder="초등 3학년 등"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Row 2 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>주민번호</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={residentNumber}
                    onChangeText={setResidentNumber}
                    placeholder="생년월일 등"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>주 소</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="도로명/지번 주소"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Row 3 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>전화번호</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="유선 전화번호"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>이 메 일</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@mail.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Row 4 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>휴대전화</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={mobilePhone}
                    onChangeText={setMobilePhone}
                    placeholder="010-0000-0000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>학습방법</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={studyMethod}
                    onChangeText={setStudyMethod}
                    placeholder="방문, 센터, 온라인 등"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 학부모 영역 (그림 1 재구성) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>학부모</Text>
            </View>

            <View style={styles.gridTable}>
              {/* Row 1 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>성 함</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={parentName}
                    onChangeText={setParentName}
                    placeholder="보호자 성함"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>휴대전화</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={parentMobilePhone}
                    onChangeText={setParentMobilePhone}
                    placeholder="010-0000-0000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* CMS 영역 (그림 1 재구성) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CMS 정보</Text>
            </View>

            <View style={styles.gridTable}>
              {/* Row 1 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>은행, 예금주</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={cmsBankOwner}
                    onChangeText={setCmsBankOwner}
                    placeholder="OO은행 홍길동"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              {/* Row 2 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>계좌번호</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={cmsAccountNumber}
                    onChangeText={setCmsAccountNumber}
                    placeholder="하이픈(-) 없이 입력"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {/* Row 3 */}
              <View style={styles.tableRow}>
                <View style={[styles.cell, styles.labelCell]}>
                  <Text style={styles.labelText}>주민번호</Text>
                </View>
                <View style={[styles.cell, styles.inputCell]}>
                  <TextInput
                    style={styles.input}
                    value={cmsResidentNumber}
                    onChangeText={setCmsResidentNumber}
                    placeholder="예금주 주민번호/생년월일"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 기타 영역 (그림 1 재구성) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>기 타</Text>
            </View>
            <View style={styles.notesContainer}>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="특이사항, 수업 요일 협의 등 기타 내용을 적어주세요."
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 데코레이션 로고 */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>한컴CQ교실 광명지사</Text>
          </View>

          {/* 버튼 영역 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>저 장</Text>
            </TouchableOpacity>

            {isEditMode && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>학 생 삭 제</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  recordLinkButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  recordLinkButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1F2937',
    paddingBottom: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 8,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  gridTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  labelCell: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  inputCell: {
    flex: 2.2,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  input: {
    fontSize: 13,
    color: '#111827',
    padding: 0,
    height: 24,
  },
  notesContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    padding: 8,
  },
  notesInput: {
    fontSize: 13,
    color: '#111827',
    minHeight: 100,
  },
  logoContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  logoText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  actionButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  keyboardAvoid: {
    flex: 1,
  },
});
