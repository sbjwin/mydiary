import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import * as FileSystemNext from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { formatPhoneInfo } from '../database/Database';

// 개발자 정보 지침 준수: Sung Baekjin (성백진)
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
const createRun = ({ text, bold = false, size = 14, color = '0F172A', italic = false, strike = false, spacing = null }) => {
  if (!text) return '';
  return `
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕"/>
        ${bold ? '<w:b/>' : ''}
        ${italic ? '<w:i/>' : ''}
        ${strike ? '<w:strike/>' : '<w:strike w:val="0"/>'}
        ${spacing != null ? `<w:spacing w:val="${spacing}"/>` : ''}
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
const createParagraph = (runs = [], { align = 'left', spacingAfter = 0, spacingBefore = 0, line = 140, lineRule = 'exact', firstLine = null } = {}) => {
  const runContent = Array.isArray(runs) ? runs.join('') : runs;
  return `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="a3"/>
        ${align !== 'left' ? `<w:jc w:val="${align}"/>` : ''}
        ${firstLine ? `<w:ind w:firstLine="${firstLine}"/>` : ''}
        <w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}" w:line="${line}" w:lineRule="${lineRule}"/>
        <w:rPr><w:strike w:val="0"/></w:rPr>
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
  width = 1593,
  fill = null,
  gridSpan = 1,
  vAlign = 'top',
  vMerge = null,
  borderTop = { val: 'single', sz: 3, color: '000000' },
  borderBottom = { val: 'single', sz: 3, color: '000000' },
  borderLeft = { val: 'single', sz: 3, color: '000000' },
  borderRight = { val: 'single', sz: 3, color: '000000' },
  margins = { top: 56, left: 56, bottom: 56, right: 56 },
}) => {
  const content = Array.isArray(paragraphs) ? paragraphs.join('') : paragraphs;
  return `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${width}" w:type="dxa"/>
        ${gridSpan > 1 ? `<w:gridSpan w:val="${gridSpan}"/>` : ''}
        ${vMerge === 'restart' ? '<w:vMerge w:val="restart"/>' : vMerge ? '<w:vMerge/>' : ''}
        <w:tcBorders>
          <w:top w:val="${borderTop.val || 'single'}" w:sz="${borderTop.sz || 3}" w:space="0" w:color="${borderTop.color || '000000'}"/>
          <w:left w:val="${borderLeft.val || 'single'}" w:sz="${borderLeft.sz || 3}" w:space="0" w:color="${borderLeft.color || '000000'}"/>
          <w:bottom w:val="${borderBottom.val || 'single'}" w:sz="${borderBottom.sz || 3}" w:space="0" w:color="${borderBottom.color || '000000'}"/>
          <w:right w:val="${borderRight.val || 'single'}" w:sz="${borderRight.sz || 3}" w:space="0" w:color="${borderRight.color || '000000'}"/>
        </w:tcBorders>
        ${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}
        <w:tcMar>
          <w:top w:w="${margins.top}" w:type="dxa"/>
          <w:left w:w="${margins.left}" w:type="dxa"/>
          <w:bottom w:w="${margins.bottom}" w:type="dxa"/>
          <w:right w:w="${margins.right}" w:type="dxa"/>
        </w:tcMar>
        <w:vAlign w:val="${vAlign}"/>
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
        ${height ? `<w:trHeight w:val="${height}"/>` : ''}
      </w:trPr>
      ${cells.join('')}
    </w:tr>
  `;
};

/**
 * docs-template.docx 양식과 100% 동일한 XML 구조 생성
 * (A4 1장 최적화, 19개 행 통합 일체형 테이블, 9개 가상 컬럼 그리드)
 */
export const buildWeeklyPlanDocxXml = (weeklyPlan) => {
  const startDate = weeklyPlan?.startDate || '2026-09-14';
  const [year, month, day] = startDate.split('-').map(Number);

  // 요일 날짜 계산
  const getDayLabel = (offset, label) => {
    const d = new Date(year, month - 1, day + offset);
    return `${label} (${d.getMonth() + 1}/${d.getDate()})`;
  };

  const scheduleItems = weeklyPlan?.scheduleItems || [];

  // 평일/토요일 슬롯 필터
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

  // 일요일 슬롯 필터 (오전 10~11시, 오후 1~2시, 오후 3~6시)
  const sundayItems = scheduleItems.filter((item) => Number(item.dayOfWeek) === 7);
  const getSundayItemsForSlot = (hour) => {
    return sundayItems.filter((item) => {
      const rawHour = (item.startTime || '').match(/\d{1,2}/);
      if (!rawHour) return false;
      const startH = parseInt(rawHour[0], 10);
      if (hour === 10) return startH <= 10;
      if (hour === 13) return startH === 12 || startH === 13;
      if (hour === 18) return startH >= 18;
      return startH === hour;
    });
  };

  // 수업 카드 문단 생성 (docs-template.docx 정밀 폰트 및 컬러 일치)
  const renderItemParagraphs = (item) => {
    const pars = [];
    // 1) 시간 + 학생명
    pars.push(
      createParagraph(
        [
          createRun({ text: `${item.startTime || ''} ${item.studentName || ''}`.trim(), bold: true, size: 14, color: '0F172A', spacing: -1 }),
        ],
        { line: 140 }
      )
    );

    // 2) 과목
    if (item.subject) {
      pars.push(
        createParagraph(
          [createRun({ text: `[${item.subject}]`, bold: true, size: 14, color: '1D4ED8' })],
          { line: 140 }
        )
      );
    }

    // 3) 주소
    if (item.address) {
      pars.push(
        createParagraph(
          [createRun({ text: item.address, size: 12, color: '475569' })],
          { line: 140 }
        )
      );
    }

    // 4) 전화번호
    if (item.phoneInfo) {
      const phones = formatPhoneInfo(item.phoneInfo).split('\n');
      phones.forEach((p) => {
        if (p.trim()) {
          pars.push(
            createParagraph(
              [createRun({ text: p.trim(), size: 14, color: '475569' })],
              { line: 140 }
            )
          );
        }
      });
    }

    // 5) 특이사항 / 메모
    if (item.statusNote) {
      const noteClean = item.statusNote.replace(/^※\s*=>\s*|^=>\s*/, '').trim();
      pars.push(
        createParagraph(
          [createRun({ text: `※ => ${noteClean}`, bold: true, size: 14, color: 'DC2626' })],
          { line: 140 }
        )
      );
    }

    return pars;
  };

  const renderCellItems = (items) => {
    if (!items || items.length === 0) return [];
    const res = [];
    items.forEach((it, idx) => {
      if (idx > 0) {
        res.push(
          createParagraph(
            [createRun({ text: '----------------', size: 10, color: 'CBD5E1' })],
            { align: 'center', line: 120 }
          )
        );
      }
      res.push(...renderItemParagraphs(it));
    });
    return res;
  };

  // 테이블 행 배열 생성 (총 19개 행)
  const tableRows = [];

  // Row 1: 최상단 타이틀 행 (학원수업 / 방문수업)
  tableRows.push(
    createRow(
      [
        createCell({
          paragraphs: [createParagraph([createRun({ text: '학원수업 / 방문수업', bold: true, size: 18, color: '000000' })], { align: 'center' })],
          width: 10428,
          gridSpan: 9,
          fill: 'F1F5F9',
          vAlign: 'center',
          borderTop: { sz: 7 },
          borderLeft: { sz: 7 },
          borderRight: { sz: 7 },
          borderBottom: { sz: 3 },
        }),
      ],
      { height: 240 }
    )
  );

  // Row 2: 요일 헤더 행
  const dayHeaders = [
    { label: getDayLabel(0, '월'), span: 1, w: 1593, fill: 'F1F5F9' },
    { label: getDayLabel(1, '화'), span: 1, w: 1593, fill: 'F1F5F9' },
    { label: getDayLabel(2, '수'), span: 2, w: 1706, fill: 'F1F5F9' },
    { label: getDayLabel(3, '목'), span: 1, w: 1593, fill: 'F1F5F9' },
    { label: getDayLabel(4, '금'), span: 2, w: 1706, fill: 'F1F5F9' },
    { label: getDayLabel(5, '토'), span: 1, w: 1593, fill: 'EBDEF1' }, // 토요일 연보라 배경
  ];

  const r2Cells = [
    createCell({
      paragraphs: [],
      width: 644,
      gridSpan: 1,
      fill: 'F1F5F9',
      vAlign: 'center',
      borderLeft: { sz: 7 },
    }),
    ...dayHeaders.map((dh, idx) =>
      createCell({
        paragraphs: [createParagraph([createRun({ text: dh.label, bold: true, size: 18, color: '000000' })], { align: 'center' })],
        width: dh.w,
        gridSpan: dh.span,
        fill: dh.fill,
        vAlign: 'center',
        borderRight: idx === dayHeaders.length - 1 ? { sz: 7 } : { sz: 3 },
      })
    ),
  ];
  tableRows.push(createRow(r2Cells, { height: 213 }));

  // 시간대 행 구성 헬퍼
  const makeTimeRow = (label, hour, height = 851) => {
    const cells = [
      createCell({
        paragraphs: [createParagraph([createRun({ text: label, bold: true, size: 18, color: '000000' })], { align: 'center' })],
        width: 644,
        gridSpan: 1,
        fill: 'F8FAFC',
        vAlign: 'center',
        borderLeft: { sz: 7 },
      }),
    ];

    const dayConfigs = [
      { day: 1, span: 1, w: 1593 },
      { day: 2, span: 1, w: 1593 },
      { day: 3, span: 2, w: 1706 },
      { day: 4, span: 1, w: 1593 },
      { day: 5, span: 2, w: 1706 },
      { day: 6, span: 1, w: 1593 },
    ];

    dayConfigs.forEach((dc, idx) => {
      const items = getItemsForSlot(dc.day, hour);
      cells.push(
        createCell({
          paragraphs: renderCellItems(items),
          width: dc.w,
          gridSpan: dc.span,
          fill: 'FFFFFF',
          vAlign: 'top',
          borderRight: idx === dayConfigs.length - 1 ? { sz: 7 } : { sz: 3 },
        })
      );
    });

    return createRow(cells, { height });
  };

  // Row 3: 9시
  tableRows.push(makeTimeRow('9시', 9, 310));
  // Row 4: 10시
  tableRows.push(makeTimeRow('10시', 10, 851));
  // Row 5: 11시
  tableRows.push(makeTimeRow('11시', 11, 851));

  // Row 6: 점심시간 (12:00)
  tableRows.push(
    createRow(
      [
        createCell({
          paragraphs: [createParagraph([createRun({ text: '12:00', bold: true, size: 18, color: '000000' })], { align: 'center' })],
          width: 644,
          gridSpan: 1,
          fill: 'F8FAFC',
          vAlign: 'center',
          borderLeft: { sz: 7 },
        }),
        createCell({
          paragraphs: [createParagraph([createRun({ text: '☕ 12:00 ~ 13:00 점심 및 이동 시간', bold: true, size: 18, color: '000000' })], { align: 'center' })],
          width: 9784,
          gridSpan: 8,
          fill: 'FEF9C3',
          vAlign: 'center',
          borderRight: { sz: 7 },
        }),
      ],
      { height: 283 }
    )
  );

  // Row 7~14: 오후 1시 ~ 8시
  const pmSlots = [
    { label: '1시', hour: 13 },
    { label: '2시', hour: 14 },
    { label: '3시', hour: 15 },
    { label: '4시', hour: 16 },
    { label: '5시', hour: 17 },
    { label: '6시', hour: 18 },
    { label: '7시', hour: 19 },
    { label: '8시', hour: 20 },
  ];
  pmSlots.forEach((slot) => {
    tableRows.push(makeTimeRow(slot.label, slot.hour, 851));
  });

  // Row 15: 하단 섹션 헤더 (기타 업무 + 일요일 시간표)
  const sundayHeaderLabel = `■ 일요일 (${new Date(year, month - 1, day + 6).getMonth() + 1}/${new Date(year, month - 1, day + 6).getDate()}) 시간표`;
  tableRows.push(
    createRow(
      [
        createCell({
          paragraphs: [createParagraph([createRun({ text: '■ 기타 업무 (전달물 / 특이사항)', bold: true, size: 18, color: '000000' })], { align: 'center' })],
          width: 3830,
          gridSpan: 3,
          fill: 'DFE6F7',
          vAlign: 'center',
          borderLeft: { sz: 7 },
          borderRight: { sz: 7 },
        }),
        createCell({
          paragraphs: [createParagraph([createRun({ text: sundayHeaderLabel, bold: true, size: 18, color: '000000' })], { align: 'center' })],
          width: 6598,
          gridSpan: 6,
          fill: 'EBDEF1',
          vAlign: 'center',
          borderRight: { sz: 7 },
        }),
      ],
      { height: 345 }
    )
  );

  // Row 16~19: 하단 본문 4행
  const parseNotesToParagraphs = (notesStr, defaultStr) => {
    const text = (notesStr || defaultStr || '').trim();
    if (!text) return [];
    const lines = text.split('\n').map((l) => l.replace(/^[#•\-\*]\s*/, '').trim()).filter(Boolean);
    return lines.map((l) =>
      createParagraph([createRun({ text: `• ${l}`, size: 14, color: '000000' })], { line: 160, firstLine: 140 })
    );
  };

  const leftPars = [
    createParagraph([createRun({ text: '▶ 금주 주요사항', bold: true, size: 16, color: '000000' })], { line: 160 }),
    ...parseNotesToParagraphs(weeklyPlan?.mainNotes, '개학 후 시간변동 체크\n마감보고서 제출'),
    createParagraph([], { line: 160 }),
    createParagraph([createRun({ text: '▶ 전주 결석', bold: true, size: 16, color: '000000' })], { line: 160 }),
    ...parseNotesToParagraphs(weeklyPlan?.prevAbsentNotes, '개인사정 결석'),
    createParagraph([], { line: 160 }),
    createParagraph([createRun({ text: '▶ 특이사항', bold: true, size: 16, color: '000000' })], { line: 160 }),
    ...parseNotesToParagraphs(weeklyPlan?.specialNotes, '공지사항 확인'),
  ];

  // 일요일 4행 2열 슬롯 배치 (10/11/1/2시, 3/4/5/6시)
  const sundayRowSlots = [
    { leftLabel: '10시', leftHour: 10, rightLabel: '3시', rightHour: 15 },
    { leftLabel: '11시', leftHour: 11, rightLabel: '4시', rightHour: 16 },
    { leftLabel: '1시', leftHour: 13, rightLabel: '5시', rightHour: 17 },
    { leftLabel: '2시', leftHour: 14, rightLabel: '6시', rightHour: 18 },
  ];

  sundayRowSlots.forEach((sSlot, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === sundayRowSlots.length - 1;

    const rowCells = [];

    // 좌측 셀: Row 16은 restart, 이후는 continue (수직 병합)
    rowCells.push(
      createCell({
        paragraphs: isFirst ? leftPars : [],
        width: 3830,
        gridSpan: 3,
        vMerge: isFirst ? 'restart' : 'continue',
        fill: isFirst ? 'F1F5F9' : null,
        vAlign: 'top',
        borderLeft: { sz: 7 },
        borderRight: { sz: 7 },
        borderBottom: isLast ? { sz: 7 } : { sz: 3 },
        margins: { top: 85, left: 56, bottom: 56, right: 56 },
      })
    );

    // 우측 일요일 슬롯 1 (오전)
    const leftItems = getSundayItemsForSlot(sSlot.leftHour);
    rowCells.push(
      createCell({
        paragraphs: [createParagraph([createRun({ text: sSlot.leftLabel, bold: true, size: 18, color: '000000' })], { align: 'center' })],
        width: 757,
        gridSpan: 1,
        fill: 'FFFFFF',
        vAlign: 'center',
        borderBottom: isLast ? { sz: 7 } : { sz: 3 },
      })
    );
    rowCells.push(
      createCell({
        paragraphs: renderCellItems(leftItems),
        width: 2542,
        gridSpan: 2,
        fill: 'FFFFFF',
        vAlign: 'top',
        borderBottom: isLast ? { sz: 7 } : { sz: 3 },
      })
    );

    // 우측 일요일 슬롯 2 (오후)
    const rightItems = getSundayItemsForSlot(sSlot.rightHour);
    rowCells.push(
      createCell({
        paragraphs: [createParagraph([createRun({ text: sSlot.rightLabel, bold: true, size: 18, color: '000000' })], { align: 'center' })],
        width: 757,
        gridSpan: 1,
        fill: 'FFFFFF',
        vAlign: 'center',
        borderBottom: isLast ? { sz: 7 } : { sz: 3 },
      })
    );
    rowCells.push(
      createCell({
        paragraphs: renderCellItems(rightItems),
        width: 2542,
        gridSpan: 2,
        fill: 'FFFFFF',
        vAlign: 'top',
        borderRight: { sz: 7 },
        borderBottom: isLast ? { sz: 7 } : { sz: 3 },
      })
    );

    tableRows.push(createRow(rowCells, { height: 575 }));
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
            xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
            xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex"
            xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
            xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
            xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
            xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
            mc:Ignorable="w14 w15 w16se wp14">
  <w:body>
    <!-- 문서 제목 단락 -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="a3"/>
        <w:spacing w:line="288" w:lineRule="auto"/>
        <w:jc w:val="center"/>
        <w:rPr><w:strike w:val="0"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:strike w:val="0"/>
          <w:color w:val="0F172A"/>
          <w:spacing w:val="-2"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>${year}년 ${month}월 ${day}일 주간의 </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:strike w:val="0"/>
          <w:color w:val="0F172A"/>
          <w:spacing w:val="-3"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>${TEACHER_NAME}</w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:strike w:val="0"/>
          <w:color w:val="0F172A"/>
          <w:spacing w:val="-2"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t> 업무 보고서</w:t>
      </w:r>
    </w:p>

    <!-- 19개 행 통합 일체형 테이블 -->
    <w:tbl>
      <w:tblPr>
        <w:tblOverlap w:val="never"/>
        <w:tblW w:w="10428" w:type="dxa"/>
        <w:tblInd w:w="198" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="7" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="7" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="3" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="7" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:shd w:val="clear" w:color="FFFFFF" w:fill="F1F5F9"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblCellMar>
          <w:left w:w="0" w:type="dxa"/>
          <w:right w:w="0" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="644"/>
        <w:gridCol w:w="1593"/>
        <w:gridCol w:w="1593"/>
        <w:gridCol w:w="757"/>
        <w:gridCol w:w="949"/>
        <w:gridCol w:w="1593"/>
        <w:gridCol w:w="757"/>
        <w:gridCol w:w="949"/>
        <w:gridCol w:w="1593"/>
      </w:tblGrid>
      ${tableRows.join('')}
    </w:tbl>

    <!-- A4 세로 정밀 페이지 마진 설정 -->
    <w:sectPr>
      <w:endnotePr><w:numFmt w:val="decimal"/></w:endnotePr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="510" w:right="567" w:bottom="0" w:left="567" w:header="567" w:footer="0" w:gutter="0"/>
      <w:cols w:space="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
};

/**
 * 모바일 주간 보고서 .docx 파일 생성 및 공유 실행 (Expo FileSystem & Sharing)
 */
export const shareWeeklyReportDocx = async (weeklyPlan) => {
  try {
    const startDate = weeklyPlan?.startDate || '2026-09-14';
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

    // 4. word/styles.xml (a3 바탕글 스타일 완벽 탑재)
    zip.folder('word').file(
      'styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
        <w:color w:val="000000"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:customStyle="1" w:styleId="a3">
    <w:name w:val="바탕글"/>
    <w:pPr>
      <w:spacing w:after="0" w:line="312" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕"/>
      <w:sz w:val="18"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>
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
