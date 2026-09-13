import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import * as FileSystemNext from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { formatPhoneInfo } from '../database/Database';

const TEACHER_NAME = '성백진';

// XML 특수문자 이스케이프 헬퍼
export const escapeXml = (unsafe) => {
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
const createRun = (text, charPrIDRef = 0) => {
  if (!text) {
    return `<hp:run charPrIDRef="${charPrIDRef}"><hp:t/></hp:run>`;
  }
  return `<hp:run charPrIDRef="${charPrIDRef}"><hp:t xml:space="preserve">${escapeXml(text)}</hp:t></hp:run>`;
};

/**
 * 문단(Paragraph) 생성 헬퍼
 */
const createParagraph = (runs = [], paraPrIDRef = 0) => {
  const runContent = Array.isArray(runs) ? runs.join('') : runs;
  return `<hp:p paraPrIDRef="${paraPrIDRef}">${runContent || createRun('', 0)}</hp:p>`;
};

/**
 * 표 셀(Cell) 생성 헬퍼
 * OWPML 표준: hp:tc 아래에 hp:cellAddr, hp:cellSpan, hp:cellSz, hp:cellMargin, 그리고 hp:subList 내부에 문단이 위치해야 함
 */
const createCell = ({
  paragraphs = [],
  width = 8000,
  height = 500,
  colAddr = 0,
  rowAddr = 0,
  colSpan = 1,
  rowSpan = 1,
  borderFillIDRef = 1,
}) => {
  const content = Array.isArray(paragraphs) ? paragraphs.join('') : paragraphs;
  const textWidth = Math.max(1000, width - 280);
  return `
    <hp:tc borderFillIDRef="${borderFillIDRef}">
      <hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/>
      <hp:cellSpan colSpan="${colSpan}" rowSpan="${rowSpan}"/>
      <hp:cellSz width="${width}" height="${height}"/>
      <hp:cellMargin left="140" right="140" top="100" bottom="100"/>
      <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="${textWidth}" fieldName="">
        ${content || createParagraph([], 3)}
      </hp:subList>
    </hp:tc>
  `;
};

/**
 * 표 행(Row) 생성 헬퍼
 */
const createRow = (cells = []) => {
  return `<hp:tr>${cells.join('')}</hp:tr>`;
};

/**
 * 표(Table) 문단 래퍼 헬퍼
 * OWPML 표준: 표는 <hs:sec>의 직계 자식이 아니며, 반드시 <hp:p><hp:run><hp:tbl> 계층으로 배치되어야 함
 */
const createTableParagraph = ({
  id = 1,
  rows = [],
  rowCnt = 1,
  colCnt = 1,
  width = 51500,
  height = 5000,
  borderFillIDRef = 1,
}) => {
  return `
  <hp:p paraPrIDRef="1">
    <hp:run>
      <hp:tbl id="${id}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="${rowCnt}" colCnt="${colCnt}" cellSpacing="0" borderFillIDRef="${borderFillIDRef}" noAdjust="0">
        <hp:sz width="${width}" widthRelTo="ABSOLUTE" height="${height}" heightRelTo="ABSOLUTE" protect="0"/>
        <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>
        <hp:outMargin left="0" right="0" top="0" bottom="0"/>
        <hp:inMargin left="0" right="0" top="0" bottom="0"/>
        ${rows.join('')}
      </hp:tbl>
    </hp:run>
  </hp:p>
  `;
};

/**
 * OWPML header.xml 생성
 * 글꼴, 글자 모양, 문단 모양, 테두리/배경 스타일 정의 (한글 2020+ 표준 스키마 준수)
 */
export const buildHeaderXml = () => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
         xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"
         xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph"
         xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
         xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"
         xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"
         xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history"
         xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page"
         xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:opf="http://www.idpf.org/2007/opf/"
         xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart"
         xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar"
         xmlns:epub="http://www.idpf.org/2007/ops"
         xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"
         version="1.5" secCnt="1">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  <hh:refList>
    <!-- 글꼴 목록 -->
    <hh:fontfaces itemCnt="7">
      <hh:fontface lang="HANGUL" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
      <hh:fontface lang="LATIN" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
      <hh:fontface lang="HANJA" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
      <hh:fontface lang="JAPANESE" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
      <hh:fontface lang="OTHER" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
      <hh:fontface lang="SYMBOL" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
      <hh:fontface lang="USER" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
    </hh:fontfaces>

    <!-- 테두리 / 배경 스타일 목록 -->
    <hh:borderFills itemCnt="7">
      <!-- 1: 기본 셀 (단선 테두리 #CBD5E1, 흰색 배경) -->
      <hh:borderFill id="1" backSlash="none" slash="none">
        <hh:leftBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:rightBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:topBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:bottomBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:fillBrush>
          <hc:winBrush faceColor="#FFFFFF" hatchColor="#FFFFFF" alpha="0"/>
        </hh:fillBrush>
      </hh:borderFill>
      <!-- 2: 헤더 셀 (단선 테두리, 연회색 배경 #E2E8F0) -->
      <hh:borderFill id="2" backSlash="none" slash="none">
        <hh:leftBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:rightBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:topBorder type="solid" width="0.12 mm" color="#475569"/>
        <hh:bottomBorder type="solid" width="0.12 mm" color="#475569"/>
        <hh:fillBrush>
          <hc:winBrush faceColor="#E2E8F0" hatchColor="#E2E8F0" alpha="0"/>
        </hh:fillBrush>
      </hh:borderFill>
      <!-- 3: 시간 열 셀 (단선 테두리, 연회색 배경 #F8FAFC) -->
      <hh:borderFill id="3" backSlash="none" slash="none">
        <hh:leftBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:rightBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:topBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:bottomBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:fillBrush>
          <hc:winBrush faceColor="#F8FAFC" hatchColor="#F8FAFC" alpha="0"/>
        </hh:fillBrush>
      </hh:borderFill>
      <!-- 4: 점심시간 셀 (단선 테두리, 노란색 배경 #FEF3C7) -->
      <hh:borderFill id="4" backSlash="none" slash="none">
        <hh:leftBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:rightBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:topBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:bottomBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:fillBrush>
          <hc:winBrush faceColor="#FEF3C7" hatchColor="#FEF3C7" alpha="0"/>
        </hh:fillBrush>
      </hh:borderFill>
      <!-- 5: 기타 업무 셀 (단선 테두리, 배경 #F8FAFC) -->
      <hh:borderFill id="5" backSlash="none" slash="none">
        <hh:leftBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:rightBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:topBorder type="solid" width="0.12 mm" color="#475569"/>
        <hh:bottomBorder type="solid" width="0.12 mm" color="#475569"/>
        <hh:fillBrush>
          <hc:winBrush faceColor="#F8FAFC" hatchColor="#F8FAFC" alpha="0"/>
        </hh:fillBrush>
      </hh:borderFill>
      <!-- 6: 일요일 시간표 셀 (단선 테두리, 연붉은색 배경 #FFF1F2) -->
      <hh:borderFill id="6" backSlash="none" slash="none">
        <hh:leftBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:rightBorder type="solid" width="0.12 mm" color="#CBD5E1"/>
        <hh:topBorder type="solid" width="0.12 mm" color="#475569"/>
        <hh:bottomBorder type="solid" width="0.12 mm" color="#475569"/>
        <hh:fillBrush>
          <hc:winBrush faceColor="#FFF1F2" hatchColor="#FFF1F2" alpha="0"/>
        </hh:fillBrush>
      </hh:borderFill>
    </hh:borderFills>

    <!-- 글자 모양 목록 -->
    <hh:charProperties itemCnt="13">
      <!-- 0: 기본 본문 (10pt = 1000 HWPUnit) -->
      <hh:charPr id="0" height="1000" textColor="#000000">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 1: 문서 대제목 (16pt = 1600 HWPUnit, Bold) -->
      <hh:charPr id="1" height="1600" textColor="#0F172A" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 2: 문서 부제목 (9.5pt = 950 HWPUnit) -->
      <hh:charPr id="2" height="950" textColor="#64748B">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 3: 표 헤더 (9pt = 900 HWPUnit, Bold) -->
      <hh:charPr id="3" height="900" textColor="#1E293B" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 4: 수업 시간 + 학생 이름 (8.5pt = 850 HWPUnit, Bold) -->
      <hh:charPr id="4" height="850" textColor="#111827" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 5: 과목명 (8pt = 800 HWPUnit, Bold, 파란색) -->
      <hh:charPr id="5" height="800" textColor="#1D4ED8" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 6: 주소 및 연락처 (7.5pt = 750 HWPUnit, 회색조) -->
      <hh:charPr id="6" height="750" textColor="#374151">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 7: 특이사항 메모 (7.5pt = 750 HWPUnit, Bold, 빨간색) -->
      <hh:charPr id="7" height="750" textColor="#DC2626" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 8: 점심시간 텍스트 (9pt = 900 HWPUnit, Bold, 갈색) -->
      <hh:charPr id="8" height="900" textColor="#92400E" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 9: 기타업무 타이틀 (9pt = 900 HWPUnit, Bold, 네이비) -->
      <hh:charPr id="9" height="900" textColor="#1E3A8A" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 10: 일요일 헤더 (9pt = 900 HWPUnit, Bold, 적색) -->
      <hh:charPr id="10" height="900" textColor="#991B1B" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 11: 소항목 라벨 (8pt = 800 HWPUnit, Bold, 어두운 회색) -->
      <hh:charPr id="11" height="800" textColor="#1F2937" bold="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
      <!-- 12: 수업 구분선 (7pt = 700 HWPUnit, 밝은 회색) -->
      <hh:charPr id="12" height="700" textColor="#CBD5E1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
      </hh:charPr>
    </hh:charProperties>

    <!-- 문단 모양 목록 -->
    <hh:paraProperties itemCnt="6">
      <!-- 0: 일반 본문 좌측 정렬 (줄간격 160%) -->
      <hh:paraPr id="0" align="left">
        <hh:lineSpacing type="percent" value="160"/>
      </hh:paraPr>
      <!-- 1: 일반 본문 중앙 정렬 (줄간격 160%) -->
      <hh:paraPr id="1" align="center">
        <hh:lineSpacing type="percent" value="160"/>
      </hh:paraPr>
      <!-- 2: 문서 대제목/부제목 중앙 정렬 (줄간격 130%) -->
      <hh:paraPr id="2" align="center">
        <hh:lineSpacing type="percent" value="130"/>
      </hh:paraPr>
      <!-- 3: 표 내부 컴팩트 좌측 정렬 (줄간격 130%) -->
      <hh:paraPr id="3" align="left">
        <hh:lineSpacing type="percent" value="130"/>
      </hh:paraPr>
      <!-- 4: 표 내부 컴팩트 중앙 정렬 (줄간격 130%) -->
      <hh:paraPr id="4" align="center">
        <hh:lineSpacing type="percent" value="130"/>
      </hh:paraPr>
      <!-- 5: 하단 섹션 소제목 좌측 정렬 (상하 미세 여백) -->
      <hh:paraPr id="5" align="left">
        <hh:lineSpacing type="percent" value="130"/>
      </hh:paraPr>
    </hh:paraProperties>

    <!-- 스타일 목록 -->
    <hh:styles itemCnt="1">
      <hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0"/>
    </hh:styles>
  </hh:refList>
  <hh:compatibleDocument targetProgram="HWP201X">
    <hh:layoutCompatibility/>
  </hh:compatibleDocument>
  <hh:docOption>
    <hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/>
  </hh:docOption>
</hh:head>`;
};

/**
 * 주간 계획 데이터로부터 OWPML section0.xml 본문 생성
 */
export const buildWeeklyPlanHwpxSectionXml = (weeklyPlan) => {
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
    const timeAndName = `${item.startTime || ''} ${item.studentName || ''}`.trim();
    pars.push(createParagraph([createRun(timeAndName, 4)], 3));

    // 2) 과목
    if (item.subject) {
      pars.push(createParagraph([createRun(item.subject, 5)], 3));
    }

    // 3) 주소
    if (item.address) {
      pars.push(createParagraph([createRun(item.address, 6)], 3));
    }

    // 4) 전화번호
    if (item.phoneInfo) {
      const phones = formatPhoneInfo(item.phoneInfo).split('\n');
      phones.forEach((p) => {
        if (p.trim()) {
          pars.push(createParagraph([createRun(p.trim(), 6)], 3));
        }
      });
    }

    // 5) 특이사항 / 메모
    if (item.statusNote) {
      const noteText = item.statusNote.startsWith('=>') ? item.statusNote : `=> ${item.statusNote}`;
      pars.push(createParagraph([createRun(noteText, 7)], 3));
    }

    return pars;
  };

  // 1. 메인 시간표 헤더 행 (시간, 월~토)
  const headerCells = [
    createCell({
      paragraphs: [createParagraph([createRun('시간', 3)], 4)],
      width: 3500,
      height: 450,
      colAddr: 0,
      rowAddr: 0,
      borderFillIDRef: 2,
    }),
    ...dayHeaders.map((dh, idx) =>
      createCell({
        paragraphs: [createParagraph([createRun(dh, 3)], 4)],
        width: 8000,
        height: 450,
        colAddr: idx + 1,
        rowAddr: 0,
        borderFillIDRef: 2,
      })
    ),
  ];
  const tableRows = [createRow(headerCells)];

  // 2. 시간대별 데이터 행 생성
  timeSlots.forEach((slot, rowIdx) => {
    const currentRow = rowIdx + 1;

    if (slot.isLunch) {
      const lunchCells = [
        createCell({
          paragraphs: [createParagraph([createRun(slot.label, 3)], 4)],
          width: 3500,
          height: 380,
          colAddr: 0,
          rowAddr: currentRow,
          borderFillIDRef: 3,
        }),
        createCell({
          paragraphs: [createParagraph([createRun('즐거운 점심 시간 ☕', 8)], 4)],
          width: 48000,
          height: 380,
          colAddr: 1,
          rowAddr: currentRow,
          colSpan: 6,
          borderFillIDRef: 4,
        }),
      ];
      tableRows.push(createRow(lunchCells));
      return;
    }

    const rowCells = [
      createCell({
        paragraphs: [createParagraph([createRun(slot.label, 3)], 4)],
        width: 3500,
        height: 700,
        colAddr: 0,
        rowAddr: currentRow,
        borderFillIDRef: 3,
      }),
    ];

    [1, 2, 3, 4, 5, 6].forEach((dayVal, colIdx) => {
      const items = getItemsForSlot(dayVal, slot.hour);
      if (items.length === 0) {
        rowCells.push(
          createCell({
            paragraphs: [createParagraph([], 3)],
            width: 8000,
            height: 700,
            colAddr: colIdx + 1,
            rowAddr: currentRow,
            borderFillIDRef: 1,
          })
        );
      } else {
        const cellPars = [];
        items.forEach((it, idx) => {
          if (idx > 0) {
            cellPars.push(createParagraph([createRun('----------------', 12)], 4));
          }
          cellPars.push(...renderItemParagraphs(it));
        });
        rowCells.push(
          createCell({
            paragraphs: cellPars,
            width: 8000,
            height: 700,
            colAddr: colIdx + 1,
            rowAddr: currentRow,
            borderFillIDRef: 1,
          })
        );
      }
    });

    tableRows.push(createRow(rowCells));
  });

  // 3. 하단 2단 정보 테이블 (기타 업무, 일요일 시간표)
  const colLeftPars = [
    createParagraph([createRun('기타 업무 (전달물 / 특이사항)', 9)], 4),
    createParagraph([createRun('<금주 주요사항>', 11)], 5),
    createParagraph([createRun(weeklyPlan?.mainNotes || '#개학후 시간변동 체크\n#마감보고서 제출', 6)], 3),
    createParagraph([createRun('<전주 결석>', 11)], 5),
    createParagraph([createRun(weeklyPlan?.prevAbsentNotes || '#개인사정 결석', 6)], 3),
    createParagraph([createRun('<특이사항>', 11)], 5),
    createParagraph([createRun(weeklyPlan?.specialNotes || '공지사항 확인', 6)], 3),
  ];

  const colRightPars = [
    createParagraph([createRun(sundayHeader, 10)], 4),
  ];
  if (sundayItems.length === 0) {
    colRightPars.push(createParagraph([createRun('일요일 예정된 수업이 없습니다.', 6)], 4));
  } else {
    sundayItems.forEach((it, idx) => {
      if (idx > 0) {
        colRightPars.push(createParagraph([createRun('----------------', 12)], 4));
      }
      colRightPars.push(...renderItemParagraphs(it));
    });
  }

  const bottomRow = createRow([
    createCell({
      paragraphs: colLeftPars,
      width: 17500,
      height: 1200,
      colAddr: 0,
      rowAddr: 0,
      borderFillIDRef: 5,
    }),
    createCell({
      paragraphs: colRightPars,
      width: 34000,
      height: 1200,
      colAddr: 1,
      rowAddr: 0,
      borderFillIDRef: 6,
    }),
  ]);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"
        xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph"
        xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
        xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"
        xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"
        xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history"
        xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page"
        xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:opf="http://www.idpf.org/2007/opf/"
        xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart"
        xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar"
        xmlns:epub="http://www.idpf.org/2007/ops"
        xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
  <!-- 첫 번째 문단: 구역(섹션) 속성 정의 (A4 가로형 표준) -->
  <hp:p id="1000000001" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:secPr id="0" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">
        <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
        <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
        <hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
        <hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>
        <hp:pagePr landscape="WIDELY" width="84188" height="59528" gutterType="LEFT_ONLY">
          <hp:margin header="2835" footer="2835" gutter="0" left="5668" right="5668" top="5668" bottom="4252"/>
        </hp:pagePr>
        <hp:footNotePr>
          <hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/>
          <hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/>
          <hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/>
          <hp:numbering type="CONTINUOUS" newNum="1"/>
          <hp:placement place="EACH_COLUMN" beneathText="0"/>
        </hp:footNotePr>
        <hp:endNotePr>
          <hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/>
          <hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/>
          <hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/>
          <hp:numbering type="CONTINUOUS" newNum="1"/>
          <hp:placement place="END_OF_DOCUMENT" beneathText="0"/>
        </hp:endNotePr>
        <hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER">
          <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
        </hp:pageBorderFill>
      </hp:secPr>
      <hp:ctrl>
        <hp:colPr id="0" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
  </hp:p>

  <!-- 문서 제목 -->
  ${createParagraph([createRun(docTitle, 1)], 2)}
  ${createParagraph([createRun(docSubTitle, 2)], 2)}
  ${createParagraph([], 0)}

  <!-- 1. 주간 시간표 메인 테이블 (총 너비: 51500 HWPUnit) -->
  ${createTableParagraph({
    id: 1,
    rows: tableRows,
    rowCnt: timeSlots.length + 1,
    colCnt: 7,
    width: 51500,
    height: (timeSlots.length + 1) * 700,
    borderFillIDRef: 1,
  })}

  <!-- 테이블 간 간격 문단 -->
  ${createParagraph([], 0)}

  <!-- 2. 하단 2단 정보 테이블 (기타 업무, 일요일 시간표) -->
  ${createTableParagraph({
    id: 2,
    rows: [bottomRow],
    rowCnt: 1,
    colCnt: 2,
    width: 51500,
    height: 1200,
    borderFillIDRef: 1,
  })}
</hs:sec>`;
};

/**
 * 주간 보고서 .hwpx 한글 파일 생성 및 공유 실행
 */
export const shareWeeklyReportHwpx = async (weeklyPlan) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('공유 불가', '현재 기기에서 파일 공유 기능을 지원하지 않습니다.');
      return;
    }

    const startDate = weeklyPlan?.startDate || '2026-08-17';
    const [year, month, day] = startDate.split('-').map(Number);
    const fileName = `주간업무보고서_${year}년_${month}월_${day}일.hwpx`;

    const zip = new JSZip();

    // 1. mimetype (KS X 6101 표준: 아카이브 맨 첫 파일, 무압축 STORE 방식 필수)
    zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });

    // 2. version.xml (한컴오피스 한글 2020+ HCFVersion 스키마 필수)
    zip.file(
      'version.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 1408 WIN32LEWindows_10"/>`
    );

    // 3. settings.xml (캐럿 위치 및 뷰어 설정)
    zip.file(
      'settings.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">\n  <ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>\n</ha:HWPApplicationSetting>`
    );

    // 4. META-INF/container.xml (hwpml-package+xml 매니페스트 경로 선언)
    zip.folder('META-INF').file(
      'container.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">
  <ocf:rootfiles>
    <ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>
  </ocf:rootfiles>
</ocf:container>`
    );

    // 5. Contents/content.hpf (OPF 매니페스트 및 스파인 정의)
    const contentsFolder = zip.folder('Contents');
    contentsFolder.file(
      'content.hpf',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0" unique-identifier="BookId">
  <opf:metadata>
    <opf:title>주간 업무 보고서</opf:title>
    <opf:language>ko</opf:language>
    <opf:meta name="creator" content="${TEACHER_NAME}"/>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
    <opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
    <opf:item id="settings" href="settings.xml" media-type="application/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="header" linear="yes"/>
    <opf:itemref idref="section0" linear="yes"/>
  </opf:spine>
</opf:package>`
    );

    // 6. Contents/header.xml
    contentsFolder.file('header.xml', buildHeaderXml());

    // 7. Contents/section0.xml
    const sectionXml = buildWeeklyPlanHwpxSectionXml(weeklyPlan);
    contentsFolder.file('section0.xml', sectionXml);

    // ZIP 생성 (base64) - mimetype 파일만 STORE가 유지되고 나머지는 DEFLATE 압축
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
      UTI: 'kr.co.hancom.hwpx',
      mimeType: 'application/hwp+zip',
      dialogTitle: `${startDate} 주간 업무 보고서 한글 문서(.hwpx) 공유`,
    });
  } catch (error) {
    console.error('Failed to export HWPX:', error);
    Alert.alert('문서 생성 오류', `한글 문서(.hwpx) 생성 중 오류가 발생했습니다.\n(${error?.message || error})`);
  }
};
