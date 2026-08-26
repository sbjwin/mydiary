import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import * as FileSystemNext from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const TEACHER_NAME = '성백진';

// XML 특수문자 이스케이프
const escapeXml = (unsafe) => {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * 텍스트 런(Run) 생성 헬퍼
 */
const createRun = ({ text, bold = false, size = 16, color = '000000', italic = false }) => {
  if (!text) return '';
  return `
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Malgun Gothic" w:eastAsia="Malgun Gothic" w:hAnsi="Malgun Gothic" w:cs="Malgun Gothic"/>
        ${bold ? '<w:b/>' : ''}
        ${italic ? '<w:i/>' : ''}
        <w:sz w:val="${size}"/>
        <w:szCs w:val="${size}"/>
        <w:color w:val="${color}"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  `;
};

/**
 * 문단(Paragraph) 생성 헬퍼
 */
const createParagraph = (runs = [], { align = 'left', spacingAfter = 0, spacingBefore = 0, line = 180 } = {}) => {
  const runContent = Array.isArray(runs) ? runs.join('') : runs;
  return `
    <w:p>
      <w:pPr>
        <w:jc w:val="${align}"/>
        <w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}" w:line="${line}" w:lineRule="auto"/>
      </w:pPr>
      ${runContent}
    </w:p>
  `;
};

/**
 * 테이블 셀(Cell) 생성 헬퍼
 */
const createCell = ({
  paragraphs = [],
  width = 1600,
  fill = null,
  gridSpan = 1,
  vAlign = 'top',
  borderBottom = null,
  borderRight = null,
}) => {
  const content = Array.isArray(paragraphs) ? paragraphs.join('') : paragraphs;
  return `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${width}" w:type="dxa"/>
        ${gridSpan > 1 ? `<w:gridSpan w:val="${gridSpan}"/>` : ''}
        ${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}
        <w:vAlign w:val="${vAlign}"/>
        <w:tcMar>
          <w:top w:w="30" w:type="dxa"/>
          <w:bottom w:w="30" w:type="dxa"/>
          <w:left w:w="50" w:type="dxa"/>
          <w:right w:w="50" w:type="dxa"/>
        </w:tcMar>
        ${
          borderBottom || borderRight
            ? `
          <w:tcBorders>
            ${borderBottom ? `<w:bottom w:val="${borderBottom.val || 'single'}" w:sz="${borderBottom.sz || 4}" w:space="0" w:color="${borderBottom.color || 'CBD5E1'}"/>` : ''}
            ${borderRight ? `<w:right w:val="${borderRight.val || 'single'}" w:sz="${borderRight.sz || 4}" w:space="0" w:color="${borderRight.color || 'CBD5E1'}"/>` : ''}
          </w:tcBorders>
        `
            : ''
        }
      </w:tcPr>
      ${content || createParagraph()}
    </w:tc>
  `;
};

/**
 * 테이블 행(Row) 생성 헬퍼
 */
const createRow = (cells = [], { isHeader = false, height = null } = {}) => {
  return `
    <w:tr>
      <w:trPr>
        ${isHeader ? '<w:tblHeader/>' : ''}
        ${height ? `<w:trHeight w:val="${height}" w:hRule="atLeast"/>` : ''}
      </w:trPr>
      ${cells.join('')}
    </w:tr>
  `;
};

/**
 * 주간 계획 데이터로부터 Word document.xml 본문 생성
 */
export const buildWeeklyPlanDocxXml = (weeklyPlan) => {
  const startDate = weeklyPlan?.startDate || '2026-08-17';
  const [year, month, day] = startDate.split('-').map(Number);
  const docTitle = `${year}년 ${month}월 ${day}일 주간의 ${TEACHER_NAME} 업무 보고서`;
  const docSubTitle = '방문 수업 (팀별, 개별 마케팅 일정 포함)';

  // 요일 헤더 계산
  const getDayHeader = (offset, label) => {
    const d = new Date(year, month - 1, day + offset);
    return `${label}(${d.getMonth() + 1}/${d.getDate()})`;
  };

  const dayHeaders = [
    getDayHeader(0, '월'),
    getDayHeader(1, '화'),
    getDayHeader(2, '수'),
    getDayHeader(3, '목'),
    getDayHeader(4, '금'),
    getDayHeader(5, '토'),
  ];
  const sundayHeader = getDayHeader(6, '일요일 시간표');

  const scheduleItems = weeklyPlan?.scheduleItems || [];
  const callItems = weeklyPlan?.callItems || [];

  const timeSlots = [
    { label: '오전', hour: 9 },
    { label: '10시', hour: 10 },
    { label: '11시', hour: 11 },
    { label: '12시', hour: 12, isLunch: true },
    { label: '1시', hour: 13 },
    { label: '2시', hour: 14 },
    { label: '3시', hour: 15 },
    { label: '4시', hour: 16 },
    { label: '5시', hour: 17 },
    { label: '6시', hour: 18 },
    { label: '7시', hour: 19 },
    { label: '8시', hour: 20 },
  ];

  const getItemsForSlot = (dayOfWeek, hour) => {
    return scheduleItems.filter((item) => {
      if (Number(item.dayOfWeek) !== dayOfWeek) return false;
      const rawHour = (item.startTime || '').match(/\d{1,2}/);
      if (!rawHour) return false;
      const startH = parseInt(rawHour[0], 10);
      if (hour === 9) return startH <= 9;
      if (hour === 20) return startH >= 20;
      return startH === hour;
    });
  };

  const sundayItems = scheduleItems.filter((item) => Number(item.dayOfWeek) === 7);

  // 셀 내 수업 카드 문단 생성
  const renderItemParagraphs = (item) => {
    const pars = [];
    // 1) 시간 + 이름
    const titleRuns = [
      createRun({ text: `${item.startTime || ''} ${item.studentName || ''}`.trim(), bold: true, size: 13, color: '111827' }),
    ];
    pars.push(createParagraph(titleRuns, { spacingAfter: 0, line: 180 }));

    // 2) 과목
    if (item.subject) {
      pars.push(createParagraph([createRun({ text: item.subject, bold: true, size: 12, color: '1D4ED8' })], { spacingAfter: 0, line: 180 }));
    }

    // 3) 주소
    if (item.address) {
      pars.push(createParagraph([createRun({ text: item.address, size: 11, color: '374151' })], { spacingAfter: 0, line: 180 }));
    }

    // 4) 전화번호
    if (item.phoneInfo) {
      const phones = item.phoneInfo.split('\n');
      phones.forEach((p) => {
        if (p.trim()) {
          pars.push(createParagraph([createRun({ text: p.trim(), size: 11, color: '1F2937' })], { spacingAfter: 0, line: 180 }));
        }
      });
    }

    // 5) 특이사항 / 메모
    if (item.statusNote) {
      const noteText = item.statusNote.startsWith('=>') ? item.statusNote : `=> ${item.statusNote}`;
      pars.push(createParagraph([createRun({ text: noteText, bold: true, size: 11, color: 'DC2626' })], { spacingAfter: 0, line: 180 }));
    }

    return pars;
  };

  // 1. 헤더 행 생성 (시간, 월~토)
  const headerCells = [
    createCell({
      paragraphs: [createParagraph([createRun({ text: '시간', bold: true, size: 14, color: '1E293B' })], { align: 'center', spacingAfter: 0 })],
      width: 700,
      fill: 'CBD5E1',
      vAlign: 'center',
    }),
    ...dayHeaders.map((dh) =>
      createCell({
        paragraphs: [createParagraph([createRun({ text: dh, bold: true, size: 14, color: '1E293B' })], { align: 'center', spacingAfter: 0 })],
        width: 1630,
        fill: 'E2E8F0',
        vAlign: 'center',
      })
    ),
  ];
  const tableRows = [createRow(headerCells, { isHeader: true, height: 300 })];

  // 2. 시간대별 데이터 행 생성
  timeSlots.forEach((slot) => {
    if (slot.isLunch) {
      const lunchCells = [
        createCell({
          paragraphs: [createParagraph([createRun({ text: slot.label, bold: true, size: 13, color: '475569' })], { align: 'center', spacingAfter: 0 })],
          width: 700,
          fill: 'F1F5F9',
          vAlign: 'center',
        }),
        createCell({
          paragraphs: [createParagraph([createRun({ text: '즐거운 점심 시간 ☕', bold: true, size: 14, color: '92400E' })], { align: 'center', spacingAfter: 0 })],
          width: 9780,
          gridSpan: 6,
          fill: 'FEF3C7',
          vAlign: 'center',
        }),
      ];
      tableRows.push(createRow(lunchCells, { height: 240 }));
      return;
    }

    const rowCells = [
      createCell({
        paragraphs: [createParagraph([createRun({ text: slot.label, bold: true, size: 13, color: '475569' })], { align: 'center', spacingAfter: 0 })],
        width: 700,
        fill: 'F8FAFC',
        vAlign: 'center',
      }),
    ];

    [1, 2, 3, 4, 5, 6].forEach((dayVal) => {
      const items = getItemsForSlot(dayVal, slot.hour);
      if (items.length === 0) {
        rowCells.push(createCell({ width: 1630 }));
      } else {
        const cellPars = [];
        items.forEach((it, idx) => {
          if (idx > 0) {
            cellPars.push(createParagraph([createRun({ text: '----------------', size: 9, color: 'CBD5E1' })], { align: 'center', spacingAfter: 0, line: 160 }));
          }
          cellPars.push(...renderItemParagraphs(it));
        });
        rowCells.push(createCell({ paragraphs: cellPars, width: 1630 }));
      }
    });

    tableRows.push(createRow(rowCells, { height: 520 }));
  });

  // 3. 하단 3단 정보 테이블 (기타 업무, 전화 관리, 일요일 시간표)
  // 1) 기타 업무 내용
  const colLeftPars = [
    createParagraph([createRun({ text: '기타 업무 (전달물 / 특이사항)', bold: true, size: 13, color: '1E3A8A' })], { align: 'center', spacingAfter: 20 }),
    createParagraph([createRun({ text: '<금주 주요사항>', bold: true, size: 12, color: '1F2937' })], { spacingAfter: 4 }),
    createParagraph([createRun({ text: weeklyPlan?.mainNotes || '#개학후 시간변동 체크\n#마감보고서 제출', size: 11, color: '374151' })], { spacingAfter: 20, line: 180 }),
    createParagraph([createRun({ text: '<전주 결석>', bold: true, size: 12, color: '1F2937' })], { spacingAfter: 4 }),
    createParagraph([createRun({ text: weeklyPlan?.prevAbsentNotes || '#개인사정 결석', size: 11, color: '374151' })], { spacingAfter: 20, line: 180 }),
    createParagraph([createRun({ text: '<특이사항>', bold: true, size: 12, color: '1F2937' })], { spacingAfter: 4 }),
    createParagraph([createRun({ text: weeklyPlan?.specialNotes || '공지사항 확인', size: 11, color: '374151' })], { spacingAfter: 10, line: 180 }),
  ];

  // 2) 전화 관리 내용
  const colCenterPars = [
    createParagraph([createRun({ text: '전화 관리 (3개월 미만 2회)', bold: true, size: 13, color: '1E3A8A' })], { align: 'center', spacingAfter: 20 }),
  ];
  if (callItems.length === 0) {
    colCenterPars.push(createParagraph([createRun({ text: '등록된 전화 상담 내역이 없습니다.', size: 11, color: '9CA3AF' })], { align: 'center', spacingAfter: 10 }));
  } else {
    callItems.forEach((c) => {
      colCenterPars.push(
        createParagraph(
          [
            createRun({ text: `• ${c.name || '회원'} : `, bold: true, size: 12, color: '111827' }),
            createRun({ text: c.content || '', size: 11, color: '374151' }),
          ],
          { spacingAfter: 10, line: 180 }
        )
      );
    });
  }

  // 3) 일요일 시간표 내용
  const colRightPars = [
    createParagraph([createRun({ text: sundayHeader, bold: true, size: 13, color: '991B1B' })], { align: 'center', spacingAfter: 20 }),
  ];
  if (sundayItems.length === 0) {
    colRightPars.push(createParagraph([createRun({ text: '일요일 예정된 수업이 없습니다.', size: 11, color: '9CA3AF' })], { align: 'center', spacingAfter: 10 }));
  } else {
    sundayItems.forEach((it, idx) => {
      if (idx > 0) {
        colRightPars.push(createParagraph([createRun({ text: '----------------', size: 9, color: 'FECDD3' })], { align: 'center', spacingAfter: 0, line: 160 }));
      }
      colRightPars.push(...renderItemParagraphs(it));
    });
  }

  const bottomRow = createRow([
    createCell({ paragraphs: colLeftPars, width: 3500, fill: 'F8FAFC' }),
    createCell({ paragraphs: colCenterPars, width: 3500, fill: 'F8FAFC' }),
    createCell({ paragraphs: colRightPars, width: 3480, fill: 'FFF1F2' }),
  ]);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <!-- 문서 제목 -->
    ${createParagraph([createRun({ text: docTitle, bold: true, size: 32, color: '0F172A' })], { align: 'center', spacingAfter: 40, spacingBefore: 0 })}
    ${createParagraph([createRun({ text: docSubTitle, bold: false, size: 18, color: '64748B' })], { align: 'center', spacingAfter: 140, spacingBefore: 0 })}

    <!-- 1. 주간 시간표 메인 테이블 -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10480" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="700"/>
        <w:gridCol w:w="1630"/>
        <w:gridCol w:w="1630"/>
        <w:gridCol w:w="1630"/>
        <w:gridCol w:w="1630"/>
        <w:gridCol w:w="1630"/>
        <w:gridCol w:w="1630"/>
      </w:tblGrid>
      ${tableRows.join('')}
    </w:tbl>

    <!-- 테이블 간격 -->
    ${createParagraph([], { spacingAfter: 80 })}

    <!-- 2. 하단 3단 정보 테이블 -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10480" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="475569"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="3500"/>
        <w:gridCol w:w="3500"/>
        <w:gridCol w:w="3480"/>
      </w:tblGrid>
      ${bottomRow}
    </w:tbl>

    <!-- A4 세로 페이지 설정 -->
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
};

/**
 * 주간 보고서 .docx 파일 생성 및 공유 실행
 */
export const shareWeeklyReportDocx = async (weeklyPlan) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('공유 불가', '현재 기기에서 파일 공유 기능을 지원하지 않습니다.');
      return;
    }

    const startDate = weeklyPlan?.startDate || '2026-08-17';
    const [year, month, day] = startDate.split('-').map(Number);
    const fileName = `주간업무보고서_${year}년_${month}월_${day}일.docx`;

    const zip = new JSZip();

    // 1. [Content_Types].xml
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
    );

    // 2. _rels/.rels
    zip.folder('_rels').file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    // 3. word/_rels/document.xml.rels
    zip.folder('word').folder('_rels').file(
      'document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    );

    // 4. word/styles.xml
    zip.folder('word').file(
      'styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Malgun Gothic" w:eastAsia="Malgun Gothic" w:hAnsi="Malgun Gothic" w:cs="Malgun Gothic"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
        <w:color w:val="1F2937"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`
    );

    // 5. word/document.xml
    const documentXml = buildWeeklyPlanDocxXml(weeklyPlan);
    zip.folder('word').file('document.xml', documentXml);

    // ZIP 생성 (base64)
    const base64Data = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    let fileUri = '';
    if (FileSystem && FileSystem.cacheDirectory && FileSystem.writeAsStringAsync) {
      fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType?.Base64 || 'base64',
      });
    } else if (FileSystemNext && FileSystemNext.Paths && FileSystemNext.File) {
      const file = new FileSystemNext.File(FileSystemNext.Paths.cache, fileName);
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(base64Data);
      fileUri = file.uri;
    } else {
      throw new Error('파일 시스템 모듈을 초기화할 수 없습니다. 앱을 다시 빌드해 주세요.');
    }

    await Sharing.shareAsync(fileUri, {
      UTI: 'com.microsoft.word.doc',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      dialogTitle: `${startDate} 주간 업무 보고서 워드/구글문서 공유`,
    });
  } catch (error) {
    console.error('Failed to export DOCX:', error);
    Alert.alert('문서 생성 오류', `구글 문서(.docx) 생성 중 오류가 발생했습니다.\n(${error?.message || error})`);
  }
};
