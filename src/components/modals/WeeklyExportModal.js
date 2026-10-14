import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme as defaultTheme } from '../../theme';

/**
 * 주간 업무 보고서 출력 및 내보내기(인쇄, PDF, Word, HWPX) 선택 모달
 */
export default function WeeklyExportModal({
  visible,
  onClose,
  weekTitleInfo = { title: '', range: '' },
  onPrint,
  onSharePdf,
  onShareDocx,
  onShareHwpx,
}) {
  const { theme: activeTheme } = useTheme();
  const theme = activeTheme || defaultTheme;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.pdfModalContent, { backgroundColor: theme.colors.surface || theme.colors.white }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>주간 업무 보고서 출력 및 내보내기</Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                {weekTitleInfo.title} ({weekTitleInfo.range})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 인쇄 */}
          <TouchableOpacity
            style={[styles.actionMenuItem, { borderBottomColor: theme.colors.surfaceVariant + '60' }]}
            onPress={() => {
              onClose();
              onPrint();
            }}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
              <Feather name="printer" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.actionMenuTextContainer}>
              <Text style={[styles.actionMenuTitle, { color: theme.colors.textPrimary }]}>프린터로 인쇄 (A4 세로 양식)</Text>
              <Text style={[styles.actionMenuSub, { color: theme.colors.textSecondary }]}>Wi-Fi 프린터 또는 시스템 인쇄 화면을 엽니다</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.outline} />
          </TouchableOpacity>

          {/* PDF 공유 */}
          <TouchableOpacity
            style={[styles.actionMenuItem, { borderBottomColor: theme.colors.surfaceVariant + '60' }]}
            onPress={() => {
              onClose();
              onSharePdf();
            }}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.infoLight }]}>
              <Feather name="share-2" size={22} color={theme.colors.info} />
            </View>
            <View style={styles.actionMenuTextContainer}>
              <Text style={[styles.actionMenuTitle, { color: theme.colors.textPrimary }]}>PDF 파일 공유 (카톡 / 이메일)</Text>
              <Text style={[styles.actionMenuSub, { color: theme.colors.textSecondary }]}>카카오톡, 메신저 등으로 보고서 PDF를 전송합니다</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.outline} />
          </TouchableOpacity>

          {/* Word (.docx) 공유 */}
          <TouchableOpacity
            style={[styles.actionMenuItem, { borderBottomColor: theme.colors.surfaceVariant + '60' }]}
            onPress={() => {
              onClose();
              onShareDocx();
            }}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.primaryLight }]}>
              <MaterialCommunityIcons name="file-word-box-outline" size={22} color={theme.colors.primaryDark || theme.colors.primary} />
            </View>
            <View style={styles.actionMenuTextContainer}>
              <Text style={[styles.actionMenuTitle, { color: theme.colors.textPrimary }]}>구글 문서 / 워드 (.docx) 파일 공유</Text>
              <Text style={[styles.actionMenuSub, { color: theme.colors.textSecondary }]}>구글 드라이브, 카톡 등으로 전송하여 수정/편집</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.outline} />
          </TouchableOpacity>

          {/* 한글 (.hwpx) 공유 */}
          <TouchableOpacity
            style={styles.actionMenuItem}
            onPress={() => {
              onClose();
              onShareHwpx();
            }}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: theme.colors.warningLight || theme.colors.amberLight }]}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={theme.colors.warning || theme.colors.amber} />
            </View>
            <View style={styles.actionMenuTextContainer}>
              <Text style={[styles.actionMenuTitle, { color: theme.colors.textPrimary }]}>한글 문서 (.hwpx) 파일 공유</Text>
              <Text style={[styles.actionMenuSub, { color: theme.colors.textSecondary }]}>한컴오피스 한글, 한컴독스 등으로 전송하여 수정/편집</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.outline} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  pdfModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 48 : 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionMenuTextContainer: {
    flex: 1,
  },
  actionMenuTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  actionMenuSub: {
    fontSize: 12,
  },
});
