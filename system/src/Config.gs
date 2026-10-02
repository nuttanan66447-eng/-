/**
 * Dashboard โครงการ + แผนที่
 * Spreadsheet ID: 1bkodTUW0fiKa3gPv7Wlz60TRIJ27KRFsP9i5jXhWKGA
 *
 * วิธีใช้:
 * 1) เปิด Google Sheets > ส่วนขยาย > Apps Script
 * 2) วางไฟล์นี้ใน Code.gs
 * 3) สร้างไฟล์ HTML ชื่อ Index แล้ววาง Index.html
 * 4) Deploy > New deployment > Web app
 */

const CONFIG = {
  SPREADSHEET_ID: '1bkodTUW0fiKa3gPv7Wlz60TRIJ27KRFsP9i5jXhWKGA',

  // เริ่มใหม่: ใช้ชีทนี้เป็นฐานข้อมูลหลัก
  DATA_SHEET_NAME: 'ฐานข้อมูลโครงการ',
  LOCAL_ROAD_SHEET_NAME: 'ทะเบียนคุมสายทางทางหลวงท้องถิ่น',
  MAP_BOUNDARY_SHEET_NAME: 'ขอบเขตแผนที่ตำบลและหมู่บ้าน',
  MEMO_HISTORY_SHEET_NAME: 'ประวัติบันทึกข้อความรายสัปดาห์',
  BUILDING_INSPECTION_HISTORY_SHEET_NAME: 'ประวัติตรวจสอบสิ่งปลูกสร้างอาคาร',
  BUILDING_PERMIT_A1_HISTORY_SHEET_NAME: 'ประวัติใบ อ.1',
  WEEKLY_WORK_HISTORY_SHEET_NAME: 'ประวัติบันทึกการปฏิบัติงานประจำสัปดาห์',
  WEEKLY_PERFORMANCE_HISTORY_SHEET_NAME: 'ประวัติผลการดำเนินงานประจำสัปดาห์',
  WORK_REDUCTION_HISTORY_SHEET_NAME: 'ประวัติปรับลดปริมาณงาน',
  S_CURVE_HISTORY_SHEET_NAME: 'ประวัติ S-Curve',
  K_VALUE_HISTORY_SHEET_NAME: 'ประวัติคำนวณค่า K',
  PROJECT_SIGN_HISTORY_SHEET_NAME: 'ประวัติป้ายโครงการ',
  COMPLETION_REPORT_HISTORY_SHEET_NAME: 'ประวัติรายงานผลแล้วเสร็จ 100%',
  CONTRACTOR_NOTICE_HISTORY_SHEET_NAME: 'ประวัติแจ้งให้ผู้รับจ้างเข้าดำเนินการ',
  CENTRAL_PRICE_HISTORY_SHEET_NAME: 'ประวัติกำหนดราคากลาง',
  LOW_BID_NOTICE_HISTORY_SHEET_NAME: 'ประวัติแจ้งราคาต่ำกว่าราคากลาง 15%',
  COMPENSATION_HISTORY_SHEET_NAME: 'ประวัติเบิกค่าตอบแทน',
  TOR_DRAFT_HISTORY_SHEET_NAME: 'ประวัติร่าง TOR',
  TEST_RESULT_HISTORY_SHEET_NAME: 'ประวัติผลทดสอบ',
  PERFORMANCE_EVALUATION_HISTORY_SHEET_NAME: 'ประวัติแบบประเมินผลการปฏิบัติงาน',
  PROJECT_COMMITTEE_MEMORY_SHEET_NAME: 'จำกรรมการโครงการ',
  PERSONNEL_SHEET_NAME: 'รายชื่อบุคลากร',
  SYSTEM_OPTIONS_SHEET_NAME: 'ตัวเลือกระบบ',
  USER_SHEET_NAME: 'ผู้ใช้งานระบบ',

  // ไม่ผูกกับ gid เดิม เพราะลบชีทเริ่มใหม่แล้ว
  DATA_SHEET_GID: 0,

  // คงไว้เพื่อให้โค้ดเก่าบางส่วนไม่ error
  SHEET_GID: 0,

  HEADER_ROW: 0,
  MAX_ROWS: 5000,
  MAX_COLUMNS: 80,
  APP_TITLE: 'โครงการกองช่างเทศบาลตำบลสีแก้ว',
  DEFAULT_CENTER: [16.0538, 103.6520],
  DEFAULT_ZOOM: 11,

  ENTRY_PASSWORD_PROPERTY: 'DASHBOARD_ENTRY_PASSWORD',
  ROLE_PERMISSIONS_PROPERTY: 'DASHBOARD_ROLE_PERMISSIONS_V1'
}

const PROJECT_DATA_HEADERS = [
  'ชื่อโครงการ',
  'ระยะทาง',
  'ชื่อหน่วยงานท้องถิ่น',
  'ปริมาณงาน',
  'วันที่ผู้รับจ้างแจ้งลงงาน',
  'วันที่ผู้รับจ้างส่งมอบงาน',
  'งบประมาณ',
  'งบประมาณประจำปี',
  'คำสั่งที่',
  'ลงวันที่คำสั่ง',
  'เลขที่สัญญา',
  'ลงวันที่สัญญา',
  'วันเริ่มสัญญา',
  'สิ้นสุดสัญญา',
  'พิกัดโครงการ',
  'ค่างาน',
  'ค่าปรับวันละ',
  'สถานที่ก่อสร้าง',
  'หมู่ที่',
  'หมู่บ้าน',
  'ประเภทงาน',
  'สถานะ',
  'ความก้าวหน้า',
  'ระยะเวลาก่อนหมดสัญญา',
  'จำนวนผู้ควบคุมงาน',
  'ผู้ควบคุมงาน คนที่ 1',
  'ตำแหน่งผู้ควบคุมงาน คนที่ 1',
  'ผู้ควบคุมงาน คนที่ 2',
  'ตำแหน่งผู้ควบคุมงาน คนที่ 2',
  'ผู้รับจ้าง',
  'ที่อยู่ห้าง',
  'เบอร์ของผู้รับจ้าง',
  'เลขประจำตัวผู้เสียภาษี',
  'จำนวนคณะกรรมการตรวจรับงานจ้าง',
  'ประธานกรรมการตรวจรับงานจ้าง',
  'ตำแหน่งประธาน',
  'สังกัดประธาน',
  'กรรมการตรวจรับงานจ้าง 1',
  'ตำแหน่งกรรมการ 1',
  'สังกัดกรรมการ 1',
  'กรรมการตรวจรับงานจ้าง 2',
  'ตำแหน่งกรรมการ 2',
  'สังกัดกรรมการ 2',
  'กรรมการตรวจรับงานจ้าง 3',
  'ตำแหน่งกรรมการ 3',
  'สังกัดกรรมการ 3',
  'กรรมการตรวจรับงานจ้าง 4',
  'ตำแหน่งกรรมการ 4',
  'สังกัดกรรมการ 4',
  'หมายเหตุ',
  'วันตรวจรับงาน',
  'สร้างโดย',
  'แก้ไขโดย',
  'เลขที่คำสั่ง TOR/ราคากลาง',
  'ลงวันที่คำสั่ง TOR/ราคากลาง',
  'ประธานกรรมการ TOR',
  'กรรมการ TOR 1',
  'กรรมการ TOR 2',
  'ประธานกรรมการราคากลาง',
  'กรรมการราคากลาง 1',
  'กรรมการราคากลาง 2'
];

const LOCAL_ROAD_HEADERS = [
  'รหัสสายทาง',
  'ชื่อสายทาง',
  'ระยะทาง',
  'ผิวจราจร',
  'เขตทางกว้าง ม.',
  'สถานะ',
  'ลงทะเบียนเมื่อวันที่',
  'ชั้นทางในเขตเมือง',
  'กว้าง (ม.)',
  'ไหล่ทาง/ทางเท้ากว้าง ม. (ซ้าย)',
  'ไหล่ทาง/ทางเท้ากว้าง ม. (ขวา)',
  'ชั้นทางนอกเขตเมือง',
  'วัน/เดือน/ปี',
  'พิกัดเริ่มต้น',
  'พิกัดสิ้นสุด',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'สร้างโดย',
  'แก้ไขโดย'
];

const MAP_BOUNDARY_HEADERS = [
  'รหัสขอบเขต',
  'ประเภทขอบเขต',
  'ชื่อขอบเขต',
  'หมู่ที่',
  'สี',
  'GeoJSON',
  'จำนวนจุด',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'สร้างโดย',
  'แก้ไขโดย'
];


const MEMO_HISTORY_HEADERS = [
  'รหัสบันทึก',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'ประเภทบันทึกข้อความ',
  'สัปดาห์ที่',
  'วันที่ทำบันทึก',
  'เลขบันทึก',
  'จำนวนรายงานผลการดำเนินงานก่อสร้าง',
  'จำนวนบันทึกสภาพการปฏิบัติงาน',
  'จำนวนภาพถ่าย',
  'เรียน',
  'ผู้ควบคุมงาน',
  'ผู้ควบคุมงานคนที่ 2',
  'วันที่เริ่มสัปดาห์',
  'วันที่สิ้นสุดสัปดาห์',
  'HTML บันทึกข้อความ',
  'สร้างโดย',
  'แก้ไขโดย',
  'ภาพถ่ายแนบ JSON'
];




const WORK_REDUCTION_HISTORY_HEADERS = [
  'รหัสปรับลดปริมาณงาน',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'เลขบันทึก',
  'วันที่ทำบันทึก',
  'ครั้งที่ประชุม',
  'วันที่ประชุม',
  'วันที่ออกตรวจงาน',
  'วงเงินปรับลดรวม',
  'ผู้ควบคุมงาน',
  'ผู้ควบคุมงานคนที่ 2',
  'รายการปรับลด JSON',
  'ข้อมูลฟอร์ม JSON',
  'HTML ปรับลดปริมาณงาน',
  'สร้างโดย',
  'แก้ไขโดย'
];


const BUILDING_INSPECTION_HISTORY_HEADERS = [
  'รหัสตรวจสอบอาคาร',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'เลขบันทึก',
  'วันที่ทำบันทึก',
  'ผู้ยื่นคำร้อง',
  'โฉนดที่ดินเลขที่',
  'ข้อมูลตรวจสอบอาคาร JSON',
  'HTML ตรวจสอบอาคาร',
  'สร้างโดย',
  'แก้ไขโดย'
];


const BUILDING_PERMIT_A1_HISTORY_HEADERS = [
  'รหัสใบ อ.1',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสตรวจสอบอาคาร',
  'เลขที่ใบอนุญาต',
  'ปีใบอนุญาต พ.ศ.',
  'เลขที่คำขอ',
  'วันที่ออกใบอนุญาต',
  'ผู้ขออนุญาต',
  'ประเภทผู้ขออนุญาต',
  'โฉนดที่ดินเลขที่',
  'ข้อมูลใบ อ.1 JSON',
  'HTML ใบ อ.1',
  'สร้างโดย',
  'แก้ไขโดย'
];

const WEEKLY_WORK_HISTORY_HEADERS = [
  'รหัสบันทึกการปฏิบัติงาน',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'สัปดาห์ที่',
  'วันที่เริ่มสัปดาห์',
  'วันที่สิ้นสุดสัปดาห์',
  'ผู้ควบคุมงาน',
  'ผู้ควบคุมงานคนที่ 2',
  'ผู้รับจ้าง/ตัวแทนผู้รับจ้าง',
  'วันทำงาน JSON',
  'สภาพอากาศ JSON',
  'แรงงาน JSON',
  'เครื่องจักร JSON',
  'HTML บันทึกการปฏิบัติงาน',
  'ชนิดงานถนน',
  'สร้างโดย',
  'แก้ไขโดย'
];

const WEEKLY_PERFORMANCE_HISTORY_HEADERS = [
  'รหัสผลการดำเนินงาน',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'สัปดาห์ที่',
  'วันที่เริ่มสัปดาห์',
  'วันที่สิ้นสุดสัปดาห์',
  'ผู้ควบคุมงาน',
  'ผู้ควบคุมงานคนที่ 2',
  'หมายเหตุรวม',
  'รายการผลการดำเนินงาน JSON',
  'HTML ผลการดำเนินงาน',
  'สร้างโดย',
  'แก้ไขโดย'
];

const S_CURVE_HISTORY_HEADERS = [
  'รหัส S-Curve',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'วันที่เริ่มแผน',
  'วันที่สิ้นสุดแผน',
  'จำนวนสัปดาห์',
  'ผู้ควบคุมงาน',
  'ผู้ควบคุมงานคนที่ 2',
  'รายการ S-Curve JSON',
  'HTML S-Curve',
  'สร้างโดย',
  'แก้ไขโดย'
];

const K_VALUE_HISTORY_HEADERS = [
  'รหัสคำนวณค่า K',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'งวดที่ส่งงาน',
  'เดือนที่พิจารณาผล',
  'เดือนที่ส่งมอบงาน',
  'วันที่ส่งงาน',
  'วันที่พิจารณาผล',
  'ผู้คำนวณ',
  'ผู้ตรวจ',
  'ดัชนี JSON',
  'รายการสูตร JSON',
  'HTML คำนวณค่า K',
  'สร้างโดย',
  'แก้ไขโดย'
];

const PROJECT_SIGN_HISTORY_HEADERS = [
  'รหัสป้ายโครงการ',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'ข้อความหัวป้าย / หน่วยงาน',
  'ผู้แทนผู้รับจ้าง / โดย',
  'HTML ป้ายโครงการ',
  'สร้างโดย',
  'แก้ไขโดย'
];

const COMPLETION_REPORT_HISTORY_HEADERS = [
  'รหัสรายงานผลแล้วเสร็จ 100%',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'เลขบันทึก',
  'วันที่ทำบันทึก',
  'วันที่ผู้รับจ้างส่งมอบงาน',
  'เรียน',
  'ผู้ควบคุมงาน',
  'ผู้ควบคุมงานคนที่ 2',
  'HTML รายงานผลแล้วเสร็จ 100%',
  'ข้อมูลคนลงนาม JSON',
  'สร้างโดย',
  'แก้ไขโดย'
];


const CONTRACTOR_NOTICE_HISTORY_HEADERS = [
  'รหัสแจ้งผู้รับจ้าง',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'เลขบันทึก',
  'วันที่ทำบันทึก',
  'เรียน',
  'ผู้ควบคุมงาน',
  'ผู้ควบคุมงานคนที่ 2',
  'ความก้าวหน้าประมาณ',
  'งานที่แล้วเสร็จ',
  'งานที่ยังไม่ได้ดำเนินการ',
  'HTML แจ้งผู้รับจ้าง',
  'ข้อมูลคนลงนาม JSON',
  'สร้างโดย',
  'แก้ไขโดย'
];

const CENTRAL_PRICE_HISTORY_HEADERS = [
  'รหัสกำหนดราคากลาง',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'วันที่ประชุม',
  'ราคากลาง',
  'เลขบันทึกรายงานผล',
  'เลขบันทึกเชิญประชุม',
  'ข้อมูลราคากลาง JSON',
  'HTML รายงานผล',
  'HTML เชิญประชุม',
  'HTML รายงานการประชุม',
  'HTML ตารางวงเงิน',
  'สร้างโดย',
  'แก้ไขโดย'
];

const LOW_BID_NOTICE_HISTORY_HEADERS = [
  'รหัสเอกสารราคาต่ำ', 'วันที่สร้าง', 'วันที่แก้ไข', 'รหัสโครงการ', 'ชื่อโครงการ',
  'ผู้เสนอราคา', 'วงเงินงบประมาณ', 'ราคากลาง', 'ราคาที่เสนอ', 'ต่ำกว่าราคากลางร้อยละ',
  'ข้อมูลเอกสาร JSON', 'HTML ชุดเอกสาร', 'สร้างโดย', 'แก้ไขโดย'
];

const COMPENSATION_HISTORY_HEADERS = [
  'รหัสเบิกค่าตอบแทน',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'วันที่ทำบันทึก',
  'เลขบันทึก',
  'วันที่ประชุม/ตรวจรับ',
  'คำสั่งที่',
  'ประเภทเอกสารล่าสุด',
  'ข้อมูลเบิกค่าตอบแทน JSON',
  'HTML TOR และราคากลาง',
  'HTML ตรวจรับพัสดุ',
  'HTML ผู้ควบคุมงาน',
  'สร้างโดย',
  'แก้ไขโดย'
];

const TOR_DRAFT_HISTORY_HEADERS = [
  'รหัสร่าง TOR',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'ประเภทเอกสาร TOR',
  'เลขที่คำสั่ง',
  'ลงวันที่คำสั่ง',
  'วันที่ทำเอกสาร/วันที่ประชุม',
  'ประธานกรรมการ TOR',
  'กรรมการ TOR 1',
  'กรรมการ TOR 2',
  'กรรมการและเลขานุการ',
  'ข้อมูลร่าง TOR JSON',
  'HTML ร่าง TOR',
  'สร้างโดย',
  'แก้ไขโดย'
];


const TEST_RESULT_HISTORY_HEADERS = [
  'รหัสผลทดสอบ',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'ประเภทผลทดสอบ',
  'ชื่อประเภทผลทดสอบ',
  'เลขบันทึก',
  'วันที่ทำเอกสาร',
  'ข้อมูลผลทดสอบ JSON',
  'HTML ผลทดสอบ',
  'สร้างโดย',
  'แก้ไขโดย'
];

const PERFORMANCE_EVALUATION_HISTORY_HEADERS = [
  'รหัสแบบประเมิน',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'ชื่อผู้รับการประเมิน',
  'ประเภทแบบประเมิน',
  'ชื่อประเภทแบบประเมิน',
  'รอบการประเมิน',
  'ปีงบประมาณ',
  'จำนวนครั้งที่บันทึก',
  'ข้อมูลแบบประเมิน JSON',
  'HTML แบบประเมิน',
  'สร้างโดย',
  'แก้ไขโดย'
];

const PROJECT_COMMITTEE_MEMORY_HEADERS = [
  'รหัสโครงการ',
  'ชื่อโครงการ',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'กรรมการ JSON'
];

const PERSONNEL_HEADERS = [
  'รหัสบุคลากร',
  'ประเภท',
  'ชื่อ-สกุล',
  'ตำแหน่ง',
  'สังกัด',
  'ลำดับ',
  'วันที่แก้ไข'
];

const USER_HEADERS = [
  'ชื่อผู้ใช้',
  'รหัสผ่าน',
  'ชื่อ-สกุล',
  'กอง/สังกัด',
  'ตำแหน่ง',
  'บทบาท',
  'สถานะ',
  'วันที่แก้ไข'
];

const SYSTEM_OPTION_HEADERS = [
  'รหัสตัวเลือก',
  'หมวดหมู่',
  'ชื่อตัวเลือก',
  'รายละเอียด 1',
  'รายละเอียด 2',
  'รายละเอียด 3',
  'ลำดับ',
  'สถานะ',
  'วันที่แก้ไข'
];


const ROLE_PERMISSION_KEYS = [
  'dashboard_supervisor',
  'dashboard_clerk',
  'dashboard_local_road',
  'local_road_entry',
  'document_library',
  'building_inspection',
  'engineer_reports',
  'k_reports',
  'test_results',
  'tor_draft',
  'compensation',
  'central_price',
  'low_bid_notice',
  'construction_duration',
  'performance_evaluation',
  'entry_data',
  'map_boundary_edit',
  'personnel',
  'system_options',
  'user_manager'
];

const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    dashboard_supervisor: true, dashboard_clerk: true, dashboard_local_road: true, local_road_entry: true, document_library: true, building_inspection: true,
    engineer_reports: true, k_reports: true, test_results: true, tor_draft: true, compensation: true, central_price: true, low_bid_notice: true, construction_duration: true, performance_evaluation: true,
    entry_data: true, map_boundary_edit: true, personnel: true, system_options: true, user_manager: true
  },
  engineering_supervisor: {
    dashboard_supervisor: true, dashboard_clerk: false, dashboard_local_road: true, local_road_entry: true, document_library: true, building_inspection: true,
    engineer_reports: true, k_reports: true, test_results: true, tor_draft: true, compensation: true, central_price: true, low_bid_notice: true, construction_duration: true, performance_evaluation: true,
    entry_data: true, map_boundary_edit: true, personnel: false, system_options: false, user_manager: false
  },
  engineering_clerk: {
    dashboard_supervisor: false, dashboard_clerk: true, dashboard_local_road: true, local_road_entry: false, document_library: true, building_inspection: true,
    engineer_reports: false, k_reports: false, test_results: false, tor_draft: false, compensation: false, central_price: false, low_bid_notice: false, construction_duration: false, performance_evaluation: false,
    entry_data: false, map_boundary_edit: false, personnel: false, system_options: false, user_manager: false
  },
  engineer: {
    dashboard_supervisor: true, dashboard_clerk: false, dashboard_local_road: true, local_road_entry: true, document_library: true, building_inspection: true,
    engineer_reports: true, k_reports: true, test_results: true, tor_draft: true, compensation: true, central_price: true, low_bid_notice: true, construction_duration: true, performance_evaluation: true,
    entry_data: true, map_boundary_edit: true, personnel: false, system_options: false, user_manager: false
  },
  viewer: {
    dashboard_supervisor: true, dashboard_clerk: true, dashboard_local_road: true, local_road_entry: false, document_library: true, building_inspection: false,
    engineer_reports: false, k_reports: false, test_results: false, tor_draft: false, compensation: false, central_price: false, low_bid_notice: false, construction_duration: false, performance_evaluation: false,
    entry_data: false, map_boundary_edit: false, personnel: false, system_options: false, user_manager: false
  }
};
