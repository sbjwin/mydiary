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
    return `<hp:run charPrIDRef="${charPrIDRef}"/>`;
  }
  return `<hp:run charPrIDRef="${charPrIDRef}"><hp:t>${escapeXml(text)}</hp:t></hp:run>`;
};

/**
 * 문단(Paragraph) 생성 헬퍼
 */
const createParagraph = (runs = [], paraPrIDRef = 0) => {
  const runContent = Array.isArray(runs) ? runs.join('') : runs;
  return `<hp:p id="0" paraPrIDRef="${paraPrIDRef}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">${runContent || createRun('', 0)}</hp:p>`;
};

/**
 * 표 셀(Cell) 생성 헬퍼
 * OWPML 표준: hp:tc 아래에 hp:subList, hp:cellAddr, hp:cellSpan, hp:cellSz, hp:cellMargin 순서 배치
 */
const createCell = ({
  paragraphs = [],
  width = 7965,
  height = 5102,
  colAddr = 0,
  rowAddr = 0,
  colSpan = 1,
  rowSpan = 1,
  borderFillIDRef = 6,
  vertAlign = 'TOP',
  hasMargin = 1,
  margin = { left: 280, right: 280, top: 280, bottom: 280 },
}) => {
  const content = Array.isArray(paragraphs) ? paragraphs.join('') : paragraphs;
  const m = margin || { left: 280, right: 280, top: 280, bottom: 280 };
  return `<hp:tc name="" header="0" hasMargin="${hasMargin}" protect="0" editable="0" dirty="0" borderFillIDRef="${borderFillIDRef}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${vertAlign}" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${content || createParagraph([], 7)}</hp:subList><hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/><hp:cellSpan colSpan="${colSpan}" rowSpan="${rowSpan}"/><hp:cellSz width="${width}" height="${height}"/><hp:cellMargin left="${m.left}" right="${m.right}" top="${m.top}" bottom="${m.bottom}"/></hp:tc>`;
};

/**
 * 표 행(Row) 생성 헬퍼
 */
const createRow = (cells = []) => {
  return `<hp:tr>${cells.join('')}</hp:tr>`;
};

/**
 * 템플릿 기반 공식 OWPML header.xml 문자열
 */
const TEMPLATE_HEADER_XML = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\" ?><hh:head xmlns:ha=\"http://www.hancom.co.kr/hwpml/2011/app\" xmlns:hp=\"http://www.hancom.co.kr/hwpml/2011/paragraph\" xmlns:hp10=\"http://www.hancom.co.kr/hwpml/2016/paragraph\" xmlns:hs=\"http://www.hancom.co.kr/hwpml/2011/section\" xmlns:hc=\"http://www.hancom.co.kr/hwpml/2011/core\" xmlns:hh=\"http://www.hancom.co.kr/hwpml/2011/head\" xmlns:hhs=\"http://www.hancom.co.kr/hwpml/2011/history\" xmlns:hm=\"http://www.hancom.co.kr/hwpml/2011/master-page\" xmlns:hpf=\"http://www.hancom.co.kr/schema/2011/hpf\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf/\" xmlns:ooxmlchart=\"http://www.hancom.co.kr/hwpml/2016/ooxmlchart\" xmlns:epub=\"http://www.idpf.org/2007/ops\" xmlns:config=\"urn:oasis:names:tc:opendocument:xmlns:config:1.0\" version=\"1.2\" secCnt=\"1\"><hh:beginNum page=\"1\" footnote=\"1\" endnote=\"1\" pic=\"1\" tbl=\"1\" equation=\"1\"/><hh:refList><hh:fontfaces itemCnt=\"7\"><hh:fontface lang=\"HANGUL\" fontCnt=\"1\"><hh:font id=\"0\" face=\"맑은 고딕\" type=\"TTF\" isEmbedded=\"0\"><hh:typeInfo familyType=\"FCAT_GOTHIC\" weight=\"5\" proportion=\"3\" contrast=\"2\" strokeVariation=\"0\" armStyle=\"0\" letterform=\"2\" midline=\"0\" xHeight=\"4\"/></hh:font></hh:fontface><hh:fontface lang=\"LATIN\" fontCnt=\"1\"><hh:font id=\"0\" face=\"맑은 고딕\" type=\"TTF\" isEmbedded=\"0\"><hh:typeInfo familyType=\"FCAT_GOTHIC\" weight=\"5\" proportion=\"3\" contrast=\"2\" strokeVariation=\"0\" armStyle=\"0\" letterform=\"2\" midline=\"0\" xHeight=\"4\"/></hh:font></hh:fontface><hh:fontface lang=\"HANJA\" fontCnt=\"1\"><hh:font id=\"0\" face=\"맑은 고딕\" type=\"TTF\" isEmbedded=\"0\"><hh:typeInfo familyType=\"FCAT_GOTHIC\" weight=\"5\" proportion=\"3\" contrast=\"2\" strokeVariation=\"0\" armStyle=\"0\" letterform=\"2\" midline=\"0\" xHeight=\"4\"/></hh:font></hh:fontface><hh:fontface lang=\"JAPANESE\" fontCnt=\"1\"><hh:font id=\"0\" face=\"맑은 고딕\" type=\"TTF\" isEmbedded=\"0\"><hh:typeInfo familyType=\"FCAT_GOTHIC\" weight=\"5\" proportion=\"3\" contrast=\"2\" strokeVariation=\"0\" armStyle=\"0\" letterform=\"2\" midline=\"0\" xHeight=\"4\"/></hh:font></hh:fontface><hh:fontface lang=\"OTHER\" fontCnt=\"1\"><hh:font id=\"0\" face=\"맑은 고딕\" type=\"TTF\" isEmbedded=\"0\"><hh:typeInfo familyType=\"FCAT_GOTHIC\" weight=\"5\" proportion=\"3\" contrast=\"2\" strokeVariation=\"0\" armStyle=\"0\" letterform=\"2\" midline=\"0\" xHeight=\"4\"/></hh:font></hh:fontface><hh:fontface lang=\"SYMBOL\" fontCnt=\"1\"><hh:font id=\"0\" face=\"맑은 고딕\" type=\"TTF\" isEmbedded=\"0\"><hh:typeInfo familyType=\"FCAT_GOTHIC\" weight=\"5\" proportion=\"3\" contrast=\"2\" strokeVariation=\"0\" armStyle=\"0\" letterform=\"2\" midline=\"0\" xHeight=\"4\"/></hh:font></hh:fontface><hh:fontface lang=\"USER\" fontCnt=\"1\"><hh:font id=\"0\" face=\"맑은 고딕\" type=\"TTF\" isEmbedded=\"0\"><hh:typeInfo familyType=\"FCAT_GOTHIC\" weight=\"5\" proportion=\"3\" contrast=\"2\" strokeVariation=\"0\" armStyle=\"0\" letterform=\"2\" midline=\"0\" xHeight=\"4\"/></hh:font></hh:fontface></hh:fontfaces><hh:borderFills itemCnt=\"24\"><hh:borderFill id=\"1\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:rightBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:topBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:bottomBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:diagonal type=\"SOLID\" width=\"0.1 mm\" color=\"#000000\"/></hh:borderFill><hh:borderFill id=\"2\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"NONE\" color=\"#000000\"/><hh:rightBorder type=\"NONE\" color=\"#000000\"/><hh:topBorder type=\"NONE\" color=\"#000000\"/><hh:bottomBorder type=\"NONE\" color=\"#000000\"/></hh:borderFill><hh:borderFill id=\"3\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#D1D5DB\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#D1D5DB\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#D1D5DB\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#D1D5DB\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"4\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:rightBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:topBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:bottomBorder type=\"NONE\" width=\"0.1 mm\" color=\"#000000\"/><hh:diagonal type=\"SOLID\" width=\"0.1 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"none\" hatchColor=\"#000000\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"5\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"NONE\" color=\"#000000\"/><hh:rightBorder type=\"NONE\" color=\"#000000\"/><hh:topBorder type=\"NONE\" color=\"#000000\"/><hh:bottomBorder type=\"NONE\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"none\" hatchColor=\"#000000\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"6\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"7\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"DOUBLE_SLIM\" width=\"0.5 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#F1F5F9\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"8\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"DOUBLE_SLIM\" width=\"0.5 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"9\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#F1F5F9\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"10\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"DOUBLE_SLIM\" width=\"0.5 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#F1F5F9\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"11\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"DOUBLE_SLIM\" width=\"0.5 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#EBDEF1\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"12\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"DOUBLE_SLIM\" width=\"0.5 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#F8FAFC\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"13\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"DOUBLE_SLIM\" width=\"0.5 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"14\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#F8FAFC\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"15\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"16\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FEF9C3\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"17\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"18\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"19\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#F8FAFC\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"20\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#EBDEF1\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"21\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#DFE6F7\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"22\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"23\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hc:fillBrush><hc:winBrush faceColor=\"#FFFFFF\" hatchColor=\"#FFFFFF\" alpha=\"0\"/></hc:fillBrush></hh:borderFill><hh:borderFill id=\"24\" threeD=\"0\" shadow=\"0\" centerLine=\"NONE\" breakCellSeparateLine=\"0\"><hh:slash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:backSlash type=\"NONE\" Crooked=\"0\" isCounter=\"0\"/><hh:leftBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:rightBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/><hh:topBorder type=\"SOLID\" width=\"0.12 mm\" color=\"#000000\"/><hh:bottomBorder type=\"SOLID\" width=\"0.3 mm\" color=\"#000000\"/></hh:borderFill></hh:borderFills><hh:charProperties itemCnt=\"22\"><hh:charPr id=\"0\" height=\"900\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"2\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"1\" height=\"850\" textColor=\"#1E293B\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"2\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-1\" latin=\"-1\" hanja=\"-1\" japanese=\"-1\" other=\"-1\" symbol=\"-1\" user=\"-1\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"2\" height=\"700\" textColor=\"#475569\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"2\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"3\" height=\"700\" textColor=\"#DC2626\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"2\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"4\" height=\"800\" textColor=\"#854D0E\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"2\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"5\" height=\"800\" textColor=\"#475569\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"2\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-1\" latin=\"-1\" hanja=\"-1\" japanese=\"-1\" other=\"-1\" symbol=\"-1\" user=\"-1\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"6\" height=\"600\" textColor=\"#475569\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"7\" height=\"700\" textColor=\"#1D4ED8\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"8\" height=\"700\" textColor=\"#0F172A\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-1\" latin=\"-1\" hanja=\"-1\" japanese=\"-1\" other=\"-1\" symbol=\"-1\" user=\"-1\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"9\" height=\"850\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-1\" latin=\"-1\" hanja=\"-1\" japanese=\"-1\" other=\"-1\" symbol=\"-1\" user=\"-1\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"10\" height=\"750\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"11\" height=\"700\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"12\" height=\"900\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"13\" height=\"800\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-1\" latin=\"-1\" hanja=\"-1\" japanese=\"-1\" other=\"-1\" symbol=\"-1\" user=\"-1\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"14\" height=\"600\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"15\" height=\"700\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-1\" latin=\"-1\" hanja=\"-1\" japanese=\"-1\" other=\"-1\" symbol=\"-1\" user=\"-1\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"16\" height=\"700\" textColor=\"#000000\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"17\" height=\"700\" textColor=\"#0000FF\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"18\" height=\"750\" textColor=\"#0000FF\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"19\" height=\"1400\" textColor=\"#0F172A\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-2\" latin=\"-2\" hanja=\"-2\" japanese=\"-2\" other=\"-2\" symbol=\"-2\" user=\"-2\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"20\" height=\"1100\" textColor=\"#0F172A\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-2\" latin=\"-2\" hanja=\"-2\" japanese=\"-2\" other=\"-2\" symbol=\"-2\" user=\"-2\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr><hh:charPr id=\"21\" height=\"1300\" textColor=\"#0F172A\" shadeColor=\"none\" useFontSpace=\"0\" useKerning=\"0\" symMark=\"NONE\" borderFillIDRef=\"5\"><hh:fontRef hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:ratio hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:spacing hangul=\"-2\" latin=\"-2\" hanja=\"-2\" japanese=\"-2\" other=\"-2\" symbol=\"-2\" user=\"-2\"/><hh:relSz hangul=\"100\" latin=\"100\" hanja=\"100\" japanese=\"100\" other=\"100\" symbol=\"100\" user=\"100\"/><hh:offset hangul=\"0\" latin=\"0\" hanja=\"0\" japanese=\"0\" other=\"0\" symbol=\"0\" user=\"0\"/><hh:bold/><hh:strikeout shape=\"3D\" color=\"#000000\"/></hh:charPr></hh:charProperties><hh:tabProperties itemCnt=\"1\"><hh:tabPr id=\"0\" autoTabLeft=\"0\" autoTabRight=\"0\"/></hh:tabProperties><hh:numberings itemCnt=\"1\"><hh:numbering id=\"1\" start=\"0\"><hh:paraHead start=\"1\" level=\"1\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"2\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"3\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"4\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"5\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"6\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"7\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"8\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"9\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead><hh:paraHead start=\"1\" level=\"10\" align=\"LEFT\" useInstWidth=\"0\" autoIndent=\"1\" widthAdjust=\"0\" textOffsetType=\"PERCENT\" textOffset=\"50\" numFormat=\"DIGIT\" charPrIDRef=\"4294967295\" checkable=\"0\">^N</hh:paraHead></hh:numbering></hh:numberings><hh:paraProperties itemCnt=\"8\"><hh:paraPr id=\"0\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"JUSTIFY\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing value=\"130\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"1\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr><hh:paraPr id=\"1\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"JUSTIFY\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing type=\"BETWEEN_LINES\" value=\"130\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"1\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr><hh:paraPr id=\"2\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"JUSTIFY\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing type=\"PERCENT\" value=\"120\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"1\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr><hh:paraPr id=\"3\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"JUSTIFY\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing value=\"125\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"1\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr><hh:paraPr id=\"4\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"JUSTIFY\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing type=\"AT_LEAST\" value=\"60\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"1\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr><hh:paraPr id=\"5\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"CENTER\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing type=\"PERCENT\" value=\"120\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"4\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr><hh:paraPr id=\"6\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"CENTER\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing type=\"BETWEEN_LINES\" value=\"120\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"4\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr><hh:paraPr id=\"7\" tabPrIDRef=\"0\" condense=\"0\" fontLineHeight=\"0\" snapToGrid=\"1\" suppressLineNumbers=\"0\" checked=\"0\"><hh:align horizontal=\"JUSTIFY\" vertical=\"BASELINE\"/><hh:heading type=\"NONE\" idRef=\"0\" level=\"0\"/><hh:breakSetting breakLatinWord=\"KEEP_WORD\" breakNonLatinWord=\"BREAK_WORD\" widowOrphan=\"0\" keepWithNext=\"0\" keepLines=\"0\" pageBreakBefore=\"0\" lineWrap=\"BREAK\"/><hh:autoSpacing eAsianEng=\"0\" eAsianNum=\"0\"/><hh:margin><hc:intent value=\"0\" unit=\"HWPUNIT\"/><hc:left value=\"0\" unit=\"HWPUNIT\"/><hc:right value=\"0\" unit=\"HWPUNIT\"/><hc:prev value=\"0\" unit=\"HWPUNIT\"/><hc:next value=\"0\" unit=\"HWPUNIT\"/></hh:margin><hh:lineSpacing type=\"PERCENT\" value=\"100\" unit=\"HWPUNIT\"/><hh:border borderFillIDRef=\"4\" offsetLeft=\"0\" offsetRight=\"0\" offsetTop=\"0\" offsetBottom=\"0\" connect=\"0\" ignoreMargin=\"0\"/></hh:paraPr></hh:paraProperties><hh:styles itemCnt=\"1\"><hh:style id=\"0\" type=\"PARA\" name=\"바탕글\" engName=\"Normal\" paraPrIDRef=\"0\" charPrIDRef=\"0\" nextStyleIDRef=\"0\" langID=\"0\" lockForm=\"0\"/></hh:styles></hh:refList><hh:compatibleDocument targetProgram=\"HWP201X\"><hh:layoutCompatibility/></hh:compatibleDocument><hh:docOption><hh:linkinfo path=\"\" pageInherit=\"0\" footnoteInherit=\"0\"/></hh:docOption><hh:trackchageConfig flags=\"56\"/></hh:head>";

/**
 * OWPML header.xml 생성
 */
export const buildHeaderXml = () => {
  return TEMPLATE_HEADER_XML;
};

/**
 * 주간 계획 데이터로부터 OWPML section0.xml 본문 생성
 * 템플릿(hwpx-template.hwpx) 19개 행 완결 단일 통합 표 규격 100% 일치
 */
export const buildWeeklyPlanHwpxSectionXml = (weeklyPlan) => {
  const startDate = weeklyPlan?.startDate || '2026-09-14';
  const [year, month, day] = startDate.split('-').map(Number);

  // 요일 헤더 계산
  const getDayHeader = (offset, label) => {
    const d = new Date(year, month - 1, day + offset);
    return `${label} (${d.getMonth() + 1}/${d.getDate()})`;
  };

  const dayHeaders = [
    { label: getDayHeader(0, '월'), colAddr: 1, colSpan: 1, width: 7965, bf: 7 },
    { label: getDayHeader(1, '화'), colAddr: 2, colSpan: 1, width: 7965, bf: 7 },
    { label: getDayHeader(2, '수'), colAddr: 3, colSpan: 2, width: 8531, bf: 7 },
    { label: getDayHeader(3, '목'), colAddr: 5, colSpan: 1, width: 7965, bf: 7 },
    { label: getDayHeader(4, '금'), colAddr: 6, colSpan: 2, width: 8531, bf: 7 },
    { label: getDayHeader(5, '토'), colAddr: 8, colSpan: 1, width: 7965, bf: 11 },
  ];

  const sundayDate = new Date(year, month - 1, day + 6);
  const sundayHeader = `${sundayDate.getMonth() + 1}/${sundayDate.getDate()}`;

  const scheduleItems = weeklyPlan?.scheduleItems || [];

  const timeSlots = [
    { label: '9시', hour: 9, height: 2550, bfTime: 12, bfDay: 8, bfSat: 13 },
    { label: '10시', hour: 10, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '11시', hour: 11, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '12:00', hour: 12, height: 1417, isLunch: true, bfTime: 14, bfBar: 16 },
    { label: '1시', hour: 13, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '2시', hour: 14, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '3시', hour: 15, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '4시', hour: 16, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '5시', hour: 17, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '6시', hour: 18, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '7시', hour: 19, height: 5102, bfTime: 14, bfDay: 6, bfSat: 15 },
    { label: '8시', hour: 20, height: 5102, bfTime: 19, bfDay: 17, bfSat: 18 },
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

  // 평일(월~토) 수업 카드 문단 생성
  const renderWeekdayItemParagraphs = (item) => {
    const pars = [];
    const timeAndName = `${item.startTime || ''} ${item.studentName || ''}`.trim();
    pars.push(createParagraph([createRun(timeAndName, 8)], 7));

    if (item.subject) {
      pars.push(createParagraph([createRun(`[${item.subject}]`, 7)], 7));
    }

    if (item.address) {
      const addrLines = item.address.split('\n').map((s) => s.trim()).filter(Boolean);
      addrLines.forEach((line) => {
        pars.push(createParagraph([createRun(line, 6)], 7));
      });
    }

    if (item.phoneInfo) {
      const formatted = formatPhoneInfo(item.phoneInfo);
      const phoneLines = formatted.split('\n').map((s) => s.trim()).filter(Boolean);
      phoneLines.forEach((p) => {
        pars.push(createParagraph([createRun(p, 2)], 7));
      });
    }

    if (item.statusNote) {
      const noteText = item.statusNote.startsWith('=>') ? item.statusNote : `=> ${item.statusNote}`;
      pars.push(createParagraph([createRun(`※ ${noteText}`, 3)], 7));
    }

    return pars;
  };

  // 일요일 수업 카드 문단 생성
  const renderSundayItemParagraphs = (item) => {
    const pars = [];
    const timeAndName = `${item.startTime || ''} ${item.studentName || ''}`.trim();
    pars.push(createParagraph([createRun(timeAndName, 13)], 7));

    if (item.subject) {
      pars.push(createParagraph([createRun(`[${item.subject}]`, 17)], 7));
    }

    if (item.address) {
      const addrLines = item.address.split('\n').map((s) => s.trim()).filter(Boolean);
      addrLines.forEach((line) => {
        pars.push(createParagraph([createRun(line, 14)], 7));
      });
    }

    if (item.phoneInfo) {
      const formatted = formatPhoneInfo(item.phoneInfo);
      const phoneLines = formatted.split('\n').map((s) => s.trim()).filter(Boolean);
      phoneLines.forEach((p) => {
        pars.push(createParagraph([createRun(p, 11)], 7));
      });
    }

    if (item.statusNote) {
      const noteText = item.statusNote.startsWith('=>') ? item.statusNote : `=> ${item.statusNote}`;
      pars.push(createParagraph([createRun(`※ ${noteText}`, 3)], 7));
    }

    return pars;
  };

  const tableRows = [];

  // Row 0: 학원수업 / 방문수업 (colSpan 9)
  tableRows.push(
    createRow([
      createCell({
        paragraphs: [createParagraph([createRun('학원수업 / 방문수업', 1)], 6)],
        width: 52142,
        height: 1984,
        colAddr: 0,
        rowAddr: 0,
        colSpan: 9,
        rowSpan: 1,
        borderFillIDRef: 9,
        vertAlign: 'CENTER',
      }),
    ])
  );

  // Row 1: 요일 헤더 행
  const row1Cells = [
    createCell({
      paragraphs: [createParagraph([], 6)],
      width: 3220,
      height: 1700,
      colAddr: 0,
      rowAddr: 1,
      colSpan: 1,
      rowSpan: 1,
      borderFillIDRef: 10,
      vertAlign: 'CENTER',
    }),
    ...dayHeaders.map((dh) =>
      createCell({
        paragraphs: [createParagraph([createRun(dh.label, 1)], 6)],
        width: dh.width,
        height: 1700,
        colAddr: dh.colAddr,
        rowAddr: 1,
        colSpan: dh.colSpan,
        rowSpan: 1,
        borderFillIDRef: dh.bf,
        vertAlign: 'CENTER',
      })
    ),
  ];
  tableRows.push(createRow(row1Cells));

  // Row 2 ~ Row 13: 주간 시간대별 행
  timeSlots.forEach((slot, idx) => {
    const rowAddr = idx + 2;

    if (slot.isLunch) {
      const lunchCells = [
        createCell({
          paragraphs: [createParagraph([createRun(slot.label, 5)], 6)],
          width: 3220,
          height: slot.height,
          colAddr: 0,
          rowAddr,
          colSpan: 1,
          rowSpan: 1,
          borderFillIDRef: slot.bfTime,
          vertAlign: 'CENTER',
        }),
        createCell({
          paragraphs: [createParagraph([createRun('☕ 12:00 ~ 13:00 점심 및 이동 시간', 4)], 6)],
          width: 48922,
          height: slot.height,
          colAddr: 1,
          rowAddr,
          colSpan: 8,
          rowSpan: 1,
          borderFillIDRef: slot.bfBar,
          vertAlign: 'CENTER',
        }),
      ];
      tableRows.push(createRow(lunchCells));
      return;
    }

    const rowCells = [
      createCell({
        paragraphs: [createParagraph([createRun(slot.label, 5)], 6)],
        width: 3220,
        height: slot.height,
        colAddr: 0,
        rowAddr,
        colSpan: 1,
        rowSpan: 1,
        borderFillIDRef: slot.bfTime,
        vertAlign: 'CENTER',
      }),
    ];

    dayHeaders.forEach((dh, dIdx) => {
      const dayOfWeek = dIdx + 1; // 1:월 ~ 6:토
      const items = getItemsForSlot(dayOfWeek, slot.hour);
      const isSaturday = dayOfWeek === 6;
      const bf = isSaturday ? slot.bfSat : slot.bfDay;

      let cellParagraphs = [];
      if (items.length === 0) {
        cellParagraphs = [createParagraph([], 7)];
      } else {
        items.forEach((it, itIdx) => {
          if (itIdx > 0) {
            cellParagraphs.push(createParagraph([createRun('------------------------', 14)], 6));
          }
          cellParagraphs.push(...renderWeekdayItemParagraphs(it));
        });
      }

      rowCells.push(
        createCell({
          paragraphs: cellParagraphs,
          width: dh.width,
          height: slot.height,
          colAddr: dh.colAddr,
          rowAddr,
          colSpan: dh.colSpan,
          rowSpan: 1,
          borderFillIDRef: bf,
          vertAlign: 'TOP',
        })
      );
    });

    tableRows.push(createRow(rowCells));
  });

  // Row 14: 하단 섹션 타이틀 행
  tableRows.push(
    createRow([
      createCell({
        paragraphs: [createParagraph([createRun('■ 기타 업무 (전달물 / 특이사항)', 9)], 5)],
        width: 19150,
        height: 2026,
        colAddr: 0,
        rowAddr: 14,
        colSpan: 3,
        rowSpan: 1,
        borderFillIDRef: 21,
        vertAlign: 'CENTER',
        hasMargin: 0,
      }),
      createCell({
        paragraphs: [createParagraph([createRun(`■ 일요일 (${sundayHeader}) 시간표`, 9)], 5)],
        width: 32992,
        height: 2026,
        colAddr: 3,
        rowAddr: 14,
        colSpan: 6,
        rowSpan: 1,
        borderFillIDRef: 20,
        vertAlign: 'CENTER',
      }),
    ])
  );

  // 하단 좌측 기타업무 문단 서식화
  const formatBulletList = (text, defaultText) => {
    const raw = text || defaultText;
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines
      .map((line) => (line.startsWith('#') ? `  • ${line.substring(1).trim()}` : `  • ${line}`))
      .join('<hp:lineBreak/>');
  };

  const notesParas = [
    createParagraph([createRun('▶ 금주 주요사항', 10)], 3),
    createParagraph(
      [`<hp:run charPrIDRef="11"><hp:t>${formatBulletList(weeklyPlan?.mainNotes, '#개학 후 시간변동 체크\n#마감보고서 제출')}</hp:t></hp:run>`],
      2
    ),
    createParagraph([createRun('', 12)], 4),
    createParagraph([createRun('▶ 전주 결석', 10)], 3),
    createParagraph(
      [`<hp:run charPrIDRef="11"><hp:t>${formatBulletList(weeklyPlan?.prevAbsentNotes, '#개인사정 결석')}</hp:t></hp:run>`],
      2
    ),
    createParagraph([createRun('', 12)], 4),
    createParagraph([createRun('▶ 특이사항', 10)], 3),
    createParagraph(
      [`<hp:run charPrIDRef="11"><hp:t>${formatBulletList(weeklyPlan?.specialNotes, '공지사항 확인')}</hp:t></hp:run>`],
      2
    ),
  ];

  // 일요일 시간대별 슬롯 정의 (2단 4행)
  // 좌: 10시, 11시, 1시, 2시 / 우: 3시, 4시, (빈칸), (빈칸)
  const sundayLeftSlots = [
    { label: '10시', hour: 10, bfTime: 22, bfItem: 6 },
    { label: '11시', hour: 11, bfTime: 22, bfItem: 6 },
    { label: '1시', hour: 13, bfTime: 22, bfItem: 6 },
    { label: '2시', hour: 14, bfTime: 23, bfItem: 17 },
  ];
  const sundayRightSlots = [
    { label: '3시', hour: 15, bfTime: 6, bfItem: 15 },
    { label: '4시', hour: 16, bfTime: 6, bfItem: 15 },
    { label: '', hour: 17, bfTime: 6, bfItem: 15 },
    { label: '', hour: 18, bfTime: 17, bfItem: 18 },
  ];

  const getSundayItemsForHour = (hour) => {
    return sundayItems.filter((item) => {
      const rawHour = (item.startTime || '').match(/\d{1,2}/);
      if (!rawHour) return false;
      return parseInt(rawHour[0], 10) === hour;
    });
  };

  // Row 15 ~ Row 18 생성
  for (let r = 0; r < 4; r++) {
    const rowAddr = 15 + r;
    const lSlot = sundayLeftSlots[r];
    const rSlot = sundayRightSlots[r];
    const cells = [];

    // Row 15의 첫 셀: 기타업무 4행 병합
    if (r === 0) {
      cells.push(
        createCell({
          paragraphs: notesParas,
          width: 19150,
          height: 11500,
          colAddr: 0,
          rowAddr: 15,
          colSpan: 3,
          rowSpan: 4,
          borderFillIDRef: 24,
          vertAlign: 'TOP',
        })
      );
    }

    // 좌측 시간 셀 (colAddr 3)
    cells.push(
      createCell({
        paragraphs: lSlot.label ? [createParagraph([createRun(lSlot.label, 16)], 5)] : [createParagraph([], 5)],
        width: 3786,
        height: 2875,
        colAddr: 3,
        rowAddr,
        colSpan: 1,
        rowSpan: 1,
        borderFillIDRef: lSlot.bfTime,
        vertAlign: 'CENTER',
      })
    );

    // 좌측 수업 셀 (colAddr 4 span 2)
    const lItems = getSundayItemsForHour(lSlot.hour);
    let lPars = [];
    if (lItems.length > 0) {
      lItems.forEach((it, idx) => {
        if (idx > 0) lPars.push(createParagraph([createRun('------------------------', 14)], 6));
        lPars.push(...renderSundayItemParagraphs(it));
      });
    } else {
      lPars = [createParagraph([], 7)];
    }
    cells.push(
      createCell({
        paragraphs: lPars,
        width: 12710,
        height: 2875,
        colAddr: 4,
        rowAddr,
        colSpan: 2,
        rowSpan: 1,
        borderFillIDRef: lSlot.bfItem,
        vertAlign: 'TOP',
      })
    );

    // 우측 시간 셀 (colAddr 6)
    cells.push(
      createCell({
        paragraphs: rSlot.label ? [createParagraph([createRun(rSlot.label, 8)], 5)] : [createParagraph([], 5)],
        width: 3786,
        height: 2875,
        colAddr: 6,
        rowAddr,
        colSpan: 1,
        rowSpan: 1,
        borderFillIDRef: rSlot.bfTime,
        vertAlign: 'CENTER',
      })
    );

    // 우측 수업 셀 (colAddr 7 span 2)
    const rItems = getSundayItemsForHour(rSlot.hour);
    let rPars = [];
    if (rItems.length > 0) {
      rItems.forEach((it, idx) => {
        if (idx > 0) rPars.push(createParagraph([createRun('------------------------', 14)], 6));
        rPars.push(...renderSundayItemParagraphs(it));
      });
    } else {
      rPars = [createParagraph([], 7)];
    }
    cells.push(
      createCell({
        paragraphs: rPars,
        width: 12710,
        height: 2875,
        colAddr: 7,
        rowAddr,
        colSpan: 2,
        rowSpan: 1,
        borderFillIDRef: rSlot.bfItem,
        vertAlign: 'TOP',
      })
    );

    tableRows.push(createRow(cells));
  }

  // XML 본문 조립
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<hs:sec xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
  <hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">
        <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
        <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
        <hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="HIDE_ALL" fill="HIDE_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
        <hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>
        <hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY">
          <hp:margin header="0" footer="0" gutter="0" left="2834" right="2834" top="2834" bottom="0"/>
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
        <hp:pageBorderFill type="BOTH">
          <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
        </hp:pageBorderFill>
      </hp:secPr>
      <hp:ctrl>
        <hp:colPr id="0" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
  </hp:p>
  <hp:p id="0" paraPrIDRef="5" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="20"><hp:t>${year}년 ${month}월 ${day}일 주간의 </hp:t></hp:run>
    <hp:run charPrIDRef="21"><hp:t>${TEACHER_NAME}</hp:t></hp:run>
    <hp:run charPrIDRef="20"><hp:t> 업무 보고서</hp:t></hp:run>
  </hp:p>
  <hp:p id="0" paraPrIDRef="5" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:tbl id="1" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="19" colCnt="9" cellSpacing="0" borderFillIDRef="9" noAdjust="0">
        <hp:sz width="52142" widthRelTo="ABSOLUTE" height="42749" heightRelTo="ABSOLUTE" protect="0"/>
        <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>
        <hp:outMargin left="0" right="0" top="0" bottom="0"/>
        <hp:inMargin left="0" right="0" top="0" bottom="0"/>
        ${tableRows.join('')}
      </hp:tbl>
    </hp:run>
  </hp:p>
  <hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"/></hp:p>
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

    const startDate = weeklyPlan?.startDate || '2026-09-14';
    const [year, month, day] = startDate.split('-').map(Number);
    const fileName = `주간업무보고서_${year}년_${month}월_${day}일.hwpx`;

    const zip = new JSZip();

    // 1. mimetype (KS X 6101 표준: 무압축 STORE 필수)
    zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });

    // 2. version.xml
    zip.file(
      'version.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="0" micro="0" buildNumber="0" os="1" xmlVersion="1.2" application="Hancom Office Hangul" appVersion="11, 0, 0, 2128 WIN32LEWindows_10"/>`
    );

    // 3. settings.xml
    zip.file(
      'settings.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">\n  <ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>\n</ha:HWPApplicationSetting>`
    );

    // 4. META-INF/container.xml, manifest.xml, container.rdf
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

    // 5. Contents/content.hpf
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
      UTI: 'kr.co.hancom.hwpx',
      mimeType: 'application/hwp+zip',
      dialogTitle: `${startDate} 주간 업무 보고서 한글 문서(.hwpx) 공유`,
    });
  } catch (error) {
    console.error('Failed to export HWPX:', error);
    Alert.alert('문서 생성 오류', `한글 문서(.hwpx) 생성 중 오류가 발생했습니다.\n(${error?.message || error})`);
  }
};
