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
  return `<hp:p paraPrIDRef="${paraPrIDRef}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">${runContent || createRun('', 0)}</hp:p>`;
};

/**
 * 표 셀(Cell) 생성 헬퍼
 * OWPML 표준: hp:tc 아래에 hp:cellAddr, hp:cellSpan, hp:cellSz, hp:cellMargin, 그리고 hp:subList 내부에 문단이 위치해야 함
 */
const createCell = ({
  paragraphs = [],
  width = 6600,
  height = 5102,
  colAddr = 0,
  rowAddr = 0,
  colSpan = 1,
  rowSpan = 1,
  borderFillIDRef = 2,
  vertAlign = 'CENTER',
  margin = { left: 280, right: 280, top: 280, bottom: 280 },
}) => {
  const content = Array.isArray(paragraphs) ? paragraphs.join('') : paragraphs;
  const textWidth = Math.max(800, width - (margin.left + margin.right));
  return `
    <hp:tc borderFillIDRef="${borderFillIDRef}">
      <hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/>
      <hp:cellSpan colSpan="${colSpan}" rowSpan="${rowSpan}"/>
      <hp:cellSz width="${width}" height="${height}"/>
      <hp:cellMargin left="${margin.left}" right="${margin.right}" top="${margin.top}" bottom="${margin.bottom}"/>
      <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${vertAlign}" linkListIDRef="0" linkListNextIDRef="0" textWidth="${textWidth}" fieldName="">
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
 * OWPML 표준: 표는 <hs:sec>의 직계 자식이 아니며, 반드시 <hp:p><hp:run charPrIDRef="0"><hp:tbl> 계층으로 배치되어야 함
 */
const createTableParagraph = ({
  id = 1,
  rows = [],
  rowCnt = 1,
  colCnt = 1,
  width = 42520,
  height = 4000,
  borderFillIDRef = 2,
}) => {
  return `
  <hp:p paraPrIDRef="1" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
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
         version="1.2" secCnt="1">
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

    <!-- 테두리 / 배경 스타일 목록 (OWPML 표준 테두리/채우기 정의) -->
    <hh:borderFills itemCnt="8">
      <!-- 1: 테두리 없음 / 투명 (기본 글자 모양 charPr 및 일반 텍스트용) -->
      <hh:borderFill id="1" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="NONE"/>
        <hh:rightBorder type="NONE"/>
        <hh:topBorder type="NONE"/>
        <hh:bottomBorder type="NONE"/>
        <hh:diagonal type="NONE"/>
      </hh:borderFill>
      <!-- 2: 기본 데이터 셀 (단선 #D1D5DB, 흰색 배경) -->
      <hh:borderFill id="2" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.12 mm" color="#D1D5DB"/>
        <hh:rightBorder type="SOLID" width="0.12 mm" color="#D1D5DB"/>
        <hh:topBorder type="SOLID" width="0.12 mm" color="#D1D5DB"/>
        <hh:bottomBorder type="SOLID" width="0.12 mm" color="#D1D5DB"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#FFFFFF" hatchColor="#FFFFFF" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
      <!-- 3: 표 헤더 셀 (단선 #94A3B8, 소프트 슬레이트 배경 #F1F5F9) -->
      <hh:borderFill id="3" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.12 mm" color="#94A3B8"/>
        <hh:rightBorder type="SOLID" width="0.12 mm" color="#94A3B8"/>
        <hh:topBorder type="SOLID" width="0.15 mm" color="#475569"/>
        <hh:bottomBorder type="SOLID" width="0.15 mm" color="#475569"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#F1F5F9" hatchColor="#FFFFFF" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
      <!-- 4: 시간 열 셀 (단선 #D1D5DB, 연회색 배경 #F8FAFC) -->
      <hh:borderFill id="4" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.12 mm" color="#94A3B8"/>
        <hh:rightBorder type="SOLID" width="0.12 mm" color="#D1D5DB"/>
        <hh:topBorder type="SOLID" width="0.12 mm" color="#D1D5DB"/>
        <hh:bottomBorder type="SOLID" width="0.12 mm" color="#D1D5DB"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#F8FAFC" hatchColor="#FFFFFF" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
      <!-- 5: 점심시간 셀 (단선 #E2E8F0, 은은한 파스텔 크림 옐로우 #FEF9C3) -->
      <hh:borderFill id="5" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
        <hh:rightBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
        <hh:topBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
        <hh:bottomBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#FEF9C3" hatchColor="#FFFFFF" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
      <!-- 6: 하단 정보 패널 헤더 (단선 #94A3B8, 배경 #F1F5F9) -->
      <hh:borderFill id="6" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:rightBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:topBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:bottomBorder type="SOLID" width="0.12 mm" color="#CBD5E1"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#F1F5F9" hatchColor="#FFFFFF" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
      <!-- 7: 하단 정보 패널 본문 (단선 #94A3B8, 배경 #FFFFFF) -->
      <hh:borderFill id="7" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:rightBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:topBorder type="SOLID" width="0.12 mm" color="#CBD5E1"/>
        <hh:bottomBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#FFFFFF" hatchColor="#FFFFFF" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
      <!-- 8: 하단 전체 통합 박스 셀 (외곽선 #94A3B8, 내부 #FFFFFF) -->
      <hh:borderFill id="8" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:rightBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:topBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:bottomBorder type="SOLID" width="0.15 mm" color="#94A3B8"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#FFFFFF" hatchColor="#FFFFFF" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
    </hh:borderFills>

    <!-- 글자 모양 목록 (OWPML 표준 장평 100, 상대크기 100, 세련된 비즈니스 폰트 규격) -->
    <hh:charProperties itemCnt="15">
      <!-- 0: 기본 본문 (9pt) -->
      <hh:charPr id="0" height="900" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 1: 문서 대제목 (16pt, Bold, 프리미엄 딥 네이비) -->
      <hh:charPr id="1" height="1600" textColor="#0F172A" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="-2" latin="-2" hanja="-2" japanese="-2" other="-2" symbol="-2" user="-2"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 2: 문서 부제목 (8.5pt, 슬레이트 그레이) -->
      <hh:charPr id="2" height="850" textColor="#64748B" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 3: 표 헤더 (8.5pt, Bold, 다크 차콜) -->
      <hh:charPr id="3" height="850" textColor="#1E293B" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="-1" latin="-1" hanja="-1" japanese="-1" other="-1" symbol="-1" user="-1"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 4: 수업 시간 + 학생 이름 (8pt, Bold, 선명한 블랙) -->
      <hh:charPr id="4" height="800" textColor="#0F172A" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="-1" latin="-1" hanja="-1" japanese="-1" other="-1" symbol="-1" user="-1"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 5: 과목명 (7.5pt, Bold, 로열 블루 #1D4ED8) -->
      <hh:charPr id="5" height="750" textColor="#1D4ED8" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 6: 주소 및 연락처 (7pt, 중간 슬레이트 #475569) -->
      <hh:charPr id="6" height="700" textColor="#475569" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 7: 특이사항 메모 (7pt, Bold, 포인트 레드 #DC2626) -->
      <hh:charPr id="7" height="700" textColor="#DC2626" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 8: 점심시간 텍스트 (8pt, Bold, 차분한 브라운 #854D0E) -->
      <hh:charPr id="8" height="800" textColor="#854D0E" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 9: 하단 섹션 대분류 타이틀 (8.5pt, Bold, 딥 네이비 #1E3A8A) -->
      <hh:charPr id="9" height="850" textColor="#1E3A8A" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="-1" latin="-1" hanja="-1" japanese="-1" other="-1" symbol="-1" user="-1"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 10: 일요일 섹션 대분류 타이틀 (8.5pt, Bold, 딥 레드 #991B1B) -->
      <hh:charPr id="10" height="850" textColor="#991B1B" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="-1" latin="-1" hanja="-1" japanese="-1" other="-1" symbol="-1" user="-1"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 11: 하단 소항목 소제목 (7.5pt, Bold, #334155) -->
      <hh:charPr id="11" height="750" textColor="#334155" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 12: 수업 구분선 (6pt, 연회색) -->
      <hh:charPr id="12" height="600" textColor="#CBD5E1" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 13: 시간 열 라벨 (8pt, Bold, 딥 슬레이트 #475569) -->
      <hh:charPr id="13" height="800" textColor="#475569" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="-1" latin="-1" hanja="-1" japanese="-1" other="-1" symbol="-1" user="-1"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <!-- 14: 예정된 수업 없음 안내문 (7.5pt, 연회색 #94A3B8) -->
      <hh:charPr id="14" height="750" textColor="#94A3B8" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
    </hh:charProperties>

    <!-- 문단 모양 목록 -->
    <hh:paraProperties itemCnt="8">
      <!-- 0: 일반 본문 좌측 정렬 (줄간격 130%) -->
      <hh:paraPr id="0" align="left">
        <hh:lineSpacing type="percent" value="130"/>
      </hh:paraPr>
      <!-- 1: 일반 본문 중앙 정렬 (줄간격 130%) -->
      <hh:paraPr id="1" align="center">
        <hh:lineSpacing type="percent" value="130"/>
      </hh:paraPr>
      <!-- 2: 문서 대제목/부제목 중앙 정렬 (줄간격 120%) -->
      <hh:paraPr id="2" align="center">
        <hh:lineSpacing type="percent" value="120"/>
      </hh:paraPr>
      <!-- 3: 표 내부 컴팩트 좌측 정렬 (줄간격 120%) -->
      <hh:paraPr id="3" align="left">
        <hh:lineSpacing type="percent" value="120"/>
      </hh:paraPr>
      <!-- 4: 표 내부 컴팩트 중앙 정렬 (줄간격 120%) -->
      <hh:paraPr id="4" align="center">
        <hh:lineSpacing type="percent" value="120"/>
      </hh:paraPr>
      <!-- 5: 하단 섹션 소제목 좌측 정렬 (줄간격 125%) -->
      <hh:paraPr id="5" align="left">
        <hh:lineSpacing type="percent" value="125"/>
      </hh:paraPr>
      <!-- 6: 제목 하단 미세 여백 문단 (줄간격 60%) -->
      <hh:paraPr id="6" align="center">
        <hh:lineSpacing type="percent" value="60"/>
      </hh:paraPr>
      <!-- 7: 표 사이 여백 문단 (줄간격 80%) -->
      <hh:paraPr id="7" align="center">
        <hh:lineSpacing type="percent" value="80"/>
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
  const docSubTitle = '학원수업 / 방문수업';

  // 요일 헤더 계산
  const getDayHeader = (offset, label) => {
    const d = new Date(year, month - 1, day + offset);
    return `${label} (${d.getMonth() + 1}/${d.getDate()})`;
  };

  const dayHeaders = [
    getDayHeader(0, '월'),
    getDayHeader(1, '화'),
    getDayHeader(2, '수'),
    getDayHeader(3, '목'),
    getDayHeader(4, '금'),
    getDayHeader(5, '토'),
  ];
  const sundayHeader = getDayHeader(6, '일요일');

  const scheduleItems = weeklyPlan?.scheduleItems || [];

  const timeSlots = [
    { label: '09:00', hour: 9 },
    { label: '10:00', hour: 10 },
    { label: '11:00', hour: 11 },
    { label: '12:00', hour: 12, isLunch: true },
    { label: '13:00', hour: 13 },
    { label: '14:00', hour: 14 },
    { label: '15:00', hour: 15 },
    { label: '16:00', hour: 16 },
    { label: '17:00', hour: 17 },
    { label: '18:00', hour: 18 },
    { label: '19:00', hour: 19 },
    { label: '20:00', hour: 20 },
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

  // 셀 내 수업 카드 문단 생성 (단정하고 시각적으로 정돈된 카드 형태)
  const renderItemParagraphs = (item) => {
    const pars = [];
    // 1) 시간 + 이름
    const timeAndName = `${item.startTime || ''} ${item.studentName || ''}`.trim();
    pars.push(createParagraph([createRun(timeAndName, 4)], 3));

    // 2) 과목
    if (item.subject) {
      pars.push(createParagraph([createRun(`[${item.subject}]`, 5)], 3));
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
      pars.push(createParagraph([createRun(`※ ${noteText}`, 7)], 3));
    }

    return pars;
  };

  // A4 세로 표준 규격 (본문 유효폭: 42520 HWPUnit = 59528 - (8504 * 2))
  const TIME_COL_WIDTH = 3220;
  const DAY_COL_WIDTH = 6550; // 6550 * 6 = 39300
  const TOTAL_TABLE_WIDTH = 42520; // 3220 + 39300 = 42520

  // 1. 메인 시간표 헤더 행 (시간, 월~토)
  const headerCells = [
    createCell({
      paragraphs: [createParagraph([createRun('구 분', 3)], 4)],
      width: TIME_COL_WIDTH,
      height: 2268,
      colAddr: 0,
      rowAddr: 0,
      borderFillIDRef: 3,
      margin: { left: 280, right: 280, top: 280, bottom: 280 },
    }),
    ...dayHeaders.map((dh, idx) =>
      createCell({
        paragraphs: [createParagraph([createRun(dh, 3)], 4)],
        width: DAY_COL_WIDTH,
        height: 2268,
        colAddr: idx + 1,
        rowAddr: 0,
        borderFillIDRef: 3,
        margin: { left: 280, right: 280, top: 280, bottom: 280 },
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
          paragraphs: [createParagraph([createRun(slot.label, 13)], 4)],
          width: TIME_COL_WIDTH,
          height: 1417,
          colAddr: 0,
          rowAddr: currentRow,
          borderFillIDRef: 4,
          margin: { left: 280, right: 280, top: 280, bottom: 280 },
        }),
        createCell({
          paragraphs: [createParagraph([createRun('☕ 12:00 ~ 13:00 점심 및 이동 시간', 8)], 4)],
          width: DAY_COL_WIDTH * 6,
          height: 1417,
          colAddr: 1,
          rowAddr: currentRow,
          colSpan: 6,
          borderFillIDRef: 5,
          margin: { left: 280, right: 280, top: 280, bottom: 280 },
        }),
      ];
      tableRows.push(createRow(lunchCells));
      return;
    }

    const rowCells = [
      createCell({
        paragraphs: [createParagraph([createRun(slot.label, 13)], 4)],
        width: TIME_COL_WIDTH,
        height: 5102,
        colAddr: 0,
        rowAddr: currentRow,
        borderFillIDRef: 4,
        margin: { left: 280, right: 280, top: 280, bottom: 280 },
      }),
    ];

    [1, 2, 3, 4, 5, 6].forEach((dayVal, colIdx) => {
      const items = getItemsForSlot(dayVal, slot.hour);
      if (items.length === 0) {
        rowCells.push(
          createCell({
            paragraphs: [createParagraph([], 3)],
            width: DAY_COL_WIDTH,
            height: 5102,
            colAddr: colIdx + 1,
            rowAddr: currentRow,
            borderFillIDRef: 2,
            margin: { left: 280, right: 280, top: 280, bottom: 280 },
          })
        );
      } else {
        const cellPars = [];
        items.forEach((it, idx) => {
          if (idx > 0) {
            cellPars.push(createParagraph([createRun('------------------------', 12)], 4));
          }
          cellPars.push(...renderItemParagraphs(it));
        });
        rowCells.push(
          createCell({
            paragraphs: cellPars,
            width: DAY_COL_WIDTH,
            height: 5102,
            colAddr: colIdx + 1,
            rowAddr: currentRow,
            borderFillIDRef: 2,
            margin: { left: 280, right: 280, top: 280, bottom: 280 },
          })
        );
      }
    });

    tableRows.push(createRow(rowCells));
  });

  // 3. 하단 2단 정보 테이블 (기타 업무, 일요일 시간표)
  // 좌: 17520, 우: 25000 (합계 42520)
  const BOTTOM_LEFT_WIDTH = 17520;
  const BOTTOM_RIGHT_WIDTH = 25000;

  // 좌측 기타 업무 내용 포맷팅
  const formatBulletList = (text, defaultText) => {
    const raw = text || defaultText;
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith('#') ? `  • ${line.substring(1).trim()}` : `  • ${line}`))
      .join('\n');
  };

  const colLeftPars = [
    createParagraph([createRun('■ 기타 업무 (전달물 / 특이사항)', 9)], 3),
    createParagraph([createRun('', 0)], 6),
    createParagraph([createRun('▶ 금주 주요사항', 11)], 5),
    createParagraph([createRun(formatBulletList(weeklyPlan?.mainNotes, '#개학 후 시간변동 체크\n#마감보고서 제출'), 6)], 3),
    createParagraph([createRun('', 0)], 6),
    createParagraph([createRun('▶ 전주 결석', 11)], 5),
    createParagraph([createRun(formatBulletList(weeklyPlan?.prevAbsentNotes, '#개인사정 결석'), 6)], 3),
    createParagraph([createRun('', 0)], 6),
    createParagraph([createRun('▶ 특이사항', 11)], 5),
    createParagraph([createRun(formatBulletList(weeklyPlan?.specialNotes, '공지사항 확인'), 6)], 3),
  ];

  // 우측 일요일 시간표 내용 포맷팅
  const colRightPars = [
    createParagraph([createRun(`■ ${sundayHeader} 시간표`, 10)], 3),
    createParagraph([createRun('', 0)], 6),
  ];
  if (sundayItems.length === 0) {
    colRightPars.push(createParagraph([createRun('일요일 예정된 수업이 없습니다.', 14)], 3));
  } else {
    sundayItems.forEach((it, idx) => {
      if (idx > 0) {
        colRightPars.push(createParagraph([createRun('------------------------', 12)], 4));
      }
      colRightPars.push(...renderItemParagraphs(it));
    });
  }

  const bottomRow = createRow([
    createCell({
      paragraphs: colLeftPars,
      width: BOTTOM_LEFT_WIDTH,
      height: 1800,
      colAddr: 0,
      rowAddr: 0,
      borderFillIDRef: 8,
      vertAlign: 'TOP',
      margin: { left: 280, right: 280, top: 280, bottom: 280 },
    }),
    createCell({
      paragraphs: colRightPars,
      width: BOTTOM_RIGHT_WIDTH,
      height: 1800,
      colAddr: 1,
      rowAddr: 0,
      borderFillIDRef: 8,
      vertAlign: 'TOP',
      margin: { left: 280, right: 280, top: 280, bottom: 280 },
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
  <!-- 첫 번째 문단: 구역(섹션) 속성 정의 (A4 세로형 표준 1장 최적화, 쪽 테두리 제거) -->
  <hp:p id="1000000001" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">
        <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
        <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
        <hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="HIDE_ALL" fill="HIDE_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
        <hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>
        <hp:pagePr landscape="NARROWLY" width="59528" height="84188" gutterType="LEFT_ONLY">
          <hp:margin header="1417" footer="1417" gutter="0" left="8504" right="8504" top="4252" bottom="4252"/>
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
      </hp:secPr>
      <hp:ctrl>
        <hp:colPr id="0" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
    <hp:run charPrIDRef="0"><hp:t/></hp:run>
  </hp:p>

  <!-- 문서 제목 및 부제목 (품격 있는 헤더) -->
  ${createParagraph([createRun(docTitle, 1)], 2)}
  ${createParagraph([createRun(docSubTitle, 2)], 2)}
  ${createParagraph([createRun('', 0)], 6)}

  <!-- 1. 주간 시간표 메인 테이블 (총 너비: 42520 HWPUnit) -->
  ${createTableParagraph({
    id: 1,
    rows: tableRows,
    rowCnt: timeSlots.length + 1,
    colCnt: 7,
    width: TOTAL_TABLE_WIDTH,
    height: 2268 + 1417 + (timeSlots.length - 1) * 5102,
    borderFillIDRef: 2,
  })}

  <!-- 표 사이 미세 간격 -->
  ${createParagraph([createRun('', 0)], 7)}

  <!-- 2. 하단 2단 정보 테이블 (기타 업무, 일요일 시간표 - 총 너비: 42520 HWPUnit) -->
  ${createTableParagraph({
    id: 2,
    rows: [bottomRow],
    rowCnt: 1,
    colCnt: 2,
    width: TOTAL_TABLE_WIDTH,
    height: 1800,
    borderFillIDRef: 8,
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

    // 2. version.xml (한컴오피스 한글 2020 호환 HCFVersion 메타데이터)
    zip.file(
      'version.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="0" micro="0" buildNumber="0" os="1" xmlVersion="1.2" application="Hancom Office Hangul" appVersion="11, 0, 0, 2128 WIN32LEWindows_10"/>`
    );

    // 3. settings.xml (캐럿 위치 및 뷰어 설정)
    zip.file(
      'settings.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">\n  <ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>\n</ha:HWPApplicationSetting>`
    );

    // 4. META-INF/container.xml, manifest.xml, container.rdf (표준 매니페스트 및 리소스 매핑)
    const metaFolder = zip.folder('META-INF');
    metaFolder.file(
      'container.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">\n  <ocf:rootfiles>\n    <ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>\n  </ocf:rootfiles>\n</ocf:container>`
    );
    metaFolder.file(
      'manifest.xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`
    );
    metaFolder.file(
      'container.rdf',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/></rdf:Description><rdf:Description rdf:about="Contents/header.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/></rdf:Description><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/></rdf:Description><rdf:Description rdf:about="Contents/section0.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/></rdf:Description><rdf:Description rdf:about=""><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/></rdf:Description></rdf:RDF>`
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
