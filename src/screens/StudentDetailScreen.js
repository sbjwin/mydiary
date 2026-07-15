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
  Platform,
  ImageBackground
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Database } from '../database/Database';
import Icon from 'react-native-vector-icons/FontAwesome5';

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

          {/* 학생 기본 정보 */}
          <View style={styles.sectionHeader}>
            <Icon name="user-alt" size={16} color="#2f6378" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>학생 기본 정보</Text>
          </View>

          <View style={styles.cardContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이름 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="이름을 입력하세요"
                placeholderTextColor="#c0c7cc"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
                <Text style={styles.label}>학교 및 학년</Text>
                <TextInput
                  style={styles.input}
                  value={schoolGrade}
                  onChangeText={setSchoolGrade}
                  placeholder="예: 서초초 3학년"
                  placeholderTextColor="#c0c7cc"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>주민등록번호</Text>
                <TextInput
                  style={styles.input}
                  value={residentNumber}
                  onChangeText={setResidentNumber}
                  placeholder="###### - #######"
                  placeholderTextColor="#c0c7cc"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>주소</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="거주지 주소를 상세히 입력하세요"
                placeholderTextColor="#c0c7cc"
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
                <Text style={styles.label}>전화번호</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="02-000-0000"
                  placeholderTextColor="#c0c7cc"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>휴대전화</Text>
                <TextInput
                  style={styles.input}
                  value={mobilePhone}
                  onChangeText={setMobilePhone}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#c0c7cc"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@studio.com"
                placeholderTextColor="#c0c7cc"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>학습 방법</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleBtn, studyMethod === '방문' && styles.toggleBtnActive]}
                  onPress={() => setStudyMethod('방문')}
                >
                  <Text style={[styles.toggleBtnText, studyMethod === '방문' && styles.toggleBtnTextActive]}>방문</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, studyMethod === '센터' && styles.toggleBtnActive]}
                  onPress={() => setStudyMethod('센터')}
                >
                  <Text style={[styles.toggleBtnText, studyMethod === '센터' && styles.toggleBtnTextActive]}>센터</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 학부모 정보 */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Icon name="user-friends" size={14} color="#2f6378" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>학부모 정보</Text>
          </View>

          <View style={styles.cardContainer}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 16, marginBottom: 0 }]}>
                <Text style={styles.label}>성함</Text>
                <TextInput
                  style={styles.input}
                  value={parentName}
                  onChangeText={setParentName}
                  placeholder="학부모 성함"
                  placeholderTextColor="#c0c7cc"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.label}>휴대전화</Text>
                <TextInput
                  style={styles.input}
                  value={parentMobilePhone}
                  onChangeText={setParentMobilePhone}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#c0c7cc"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* 기타 사항 */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Icon name="sticky-note" size={16} color="#2f6378" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>기타 사항</Text>
          </View>

          <View style={styles.notesContainer}>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="학생에 대한 특이사항이나 수업 참고 내용을 입력하세요"
              placeholderTextColor="#c0c7cc"
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Image Banner */}
          <View style={styles.bannerContainer}>
            <ImageBackground
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr63oG3o8oYQu2EEaS-Thd2tVZ52GxTs5FrMlz_tebRgA4Yhd83V_uHhl2nfKZP18Kki-n0Ot9zb-B5Eojx2iQAAe4wZ98zoe90e9f1IjEAzBkVYZhobCHjY_H-Ux5hvw6d4uS98V-0XcP3GOKpsI-PHfEgLmKZ92SKMpydjFVSU0mt-XzlAqmbXvSrtUGoD6KWSBOSu_tT-mutd-gbuf9HAy1zCGPwHhzrrfwRf4K6UNLnrcQrKwIxkq4hmbthDDk8u-M2Co7UVA' }}
              style={styles.bannerImage}
              imageStyle={{ borderRadius: 20 }}
            >
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerText}>기록은 성장의 밑거름입니다.</Text>
              </View>
            </ImageBackground>
          </View>

        </ScrollView>

        {/* Fixed Bottom Actions */}
        <View style={styles.bottomFixedBar}>
          <View style={styles.bottomActionsContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Icon name="save" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>저장하기</Text>
            </TouchableOpacity>

            {isEditMode && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Icon name="trash" size={16} color="#ba1a1a" style={{ marginRight: 6 }} />
                <Text style={styles.deleteButtonText}>학생 정보 삭제</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafd',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 160,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#181c1f',
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#41484c',
    marginBottom: 8,
  },
  required: {
    color: '#ba1a1a',
  },
  input: {
    backgroundColor: '#f1f4f7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c0c7cc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#181c1f',
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e8ec',
    borderRadius: 9999,
    padding: 4,
    maxWidth: 240,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#41484c',
  },
  toggleBtnTextActive: {
    color: '#2f6378',
  },
  notesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2f6378',
    minHeight: 120,
  },
  notesInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#181c1f',
  },
  bannerContainer: {
    marginTop: 24,
    marginBottom: 16,
    height: 128,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 20,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomFixedBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(247, 250, 253, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(192, 199, 204, 0.2)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    zIndex: 40,
  },
  bottomActionsContainer: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#2f6378',
    height: 48,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
  },
  deleteButton: {
    width: '100%',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ba1a1a',
    fontWeight: '600',
    fontSize: 15,
  },
});
