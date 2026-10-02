function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function cloneRolePermissions_(source) {
  const roles = ['admin', 'engineering_supervisor', 'engineering_clerk', 'engineer', 'viewer'];
  const output = {};
  roles.forEach(function(role) {
    output[role] = {};
    ROLE_PERMISSION_KEYS.forEach(function(key) {
      output[role][key] = !!(source && source[role] && source[role][key]);
    });
  });
  ROLE_PERMISSION_KEYS.forEach(function(key) { output.admin[key] = true; });
  return output;
}

function normalizeRolePermissions_(input) {
  const merged = cloneRolePermissions_(DEFAULT_ROLE_PERMISSIONS);
  if (input && typeof input === 'object') {
    Object.keys(merged).forEach(function(role) {
      ROLE_PERMISSION_KEYS.forEach(function(key) {
        if (input[role] && Object.prototype.hasOwnProperty.call(input[role], key)) {
          merged[role][key] = !!input[role][key];
        }
      });
    });
  }
  ROLE_PERMISSION_KEYS.forEach(function(key) { merged.admin[key] = true; });
  return merged;
}

function getRolePermissions_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(CONFIG.ROLE_PERMISSIONS_PROPERTY) || '';
    return normalizeRolePermissions_(raw ? JSON.parse(raw) : null);
  } catch (error) {
    return cloneRolePermissions_(DEFAULT_ROLE_PERMISSIONS);
  }
}

function getRolePermissionsForAdmin(adminUsername) {
  assertAdminUser_(adminUsername);
  return { ok: true, rolePermissions: getRolePermissions_() };
}

function saveRolePermissionsFromAdmin(adminUsername, permissions) {
  assertAdminUser_(adminUsername);
  const normalized = normalizeRolePermissions_(permissions || {});
  PropertiesService.getScriptProperties().setProperty(CONFIG.ROLE_PERMISSIONS_PROPERTY, JSON.stringify(normalized));
  return { ok: true, rolePermissions: normalized };
}


function setupPersonnelSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getPersonnelSheet_(ss);
  ensureDefaultExecutiveRows_(sheet);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทรายชื่อบุคลากรและคณะผู้บริหารเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: PERSONNEL_HEADERS
  };
}

function ensureDefaultExecutiveRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const types = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues()
      .map(function(row) { return String(row[0] || '').trim(); });
    if (types.indexOf('executive') !== -1) return;
  }

  const nowText = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  const defaults = [
    ['EXE-DEFAULT-1', 'executive', 'นางอัมภา รัตนสวนจิก', 'นายกเทศมนตรีตำบลสีแก้ว', '', 1, nowText],
    ['EXE-DEFAULT-2', 'executive', 'ร้อยตำรวจเอกกิตติศักดิ์ สินธุชาติ', 'รองนายกเทศมนตรีตำบลสีแก้ว', '', 2, nowText],
    ['EXE-DEFAULT-3', 'executive', 'นางทองพูล ยุขจร', 'รองนายกเทศมนตรีตำบลสีแก้ว', '', 3, nowText]
  ];
  sheet.getRange(sheet.getLastRow() + 1, 1, defaults.length, PERSONNEL_HEADERS.length).setValues(defaults);
}

function getPersonnelSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.PERSONNEL_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PERSONNEL_SHEET_NAME);
  }
  preparePersonnelSheet_(sheet);
  return sheet;
}

function preparePersonnelSheet_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), PERSONNEL_HEADERS.length);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function(v) { return String(v || '').trim(); });

  const hasHeader = PERSONNEL_HEADERS.every(function(header) {
    return currentHeaders.indexOf(header) !== -1;
  });

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, PERSONNEL_HEADERS.length).setValues([PERSONNEL_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function getPersonnelConfig() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return getPersonnelConfig_(ss);
}

function getPersonnelConfig_(ss) {
  try {
    const sheet = getPersonnelSheet_(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { ok: true, hasCustom: false, supervisors: [], committees: [], executives: [] };
    }

    const values = sheet.getRange(2, 1, lastRow - 1, PERSONNEL_HEADERS.length).getDisplayValues();
    const supervisors = [];
    const committees = [];
    const executives = [];

    values.forEach(function(row, index) {
      const id = String(row[0] || '').trim();
      const type = String(row[1] || '').trim();
      const name = String(row[2] || '').trim();
      if (!name) return;
      const person = {
        id: id || createPersonnelId_(type || 'person', index + 1),
        type: type || '',
        name: name,
        position: String(row[3] || '').trim(),
        department: String(row[4] || '').trim(),
        order: Number(row[5] || index + 1) || (index + 1)
      };
      if (type === 'supervisor') supervisors.push(person);
      if (type === 'committee') committees.push(person);
      if (type === 'executive') executives.push(person);
    });

    supervisors.sort(function(a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'th'); });
    committees.sort(function(a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'th'); });
    executives.sort(function(a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'th'); });

    return { ok: true, hasCustom: supervisors.length > 0 || committees.length > 0 || executives.length > 0, supervisors: supervisors, committees: committees, executives: executives };
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return { ok: false, hasCustom: false, supervisors: [], committees: [], executives: [], message: getErrorMessage_(error) };
  }
}

function savePersonnelConfig(personnel) {
  if (!personnel) throw new Error('ไม่พบข้อมูลรายชื่อบุคลากร');

  const supervisors = Array.isArray(personnel.supervisors) ? personnel.supervisors : [];
  const committees = Array.isArray(personnel.committees) ? personnel.committees : [];
  const executives = Array.isArray(personnel.executives) ? personnel.executives : [];
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getPersonnelSheet_(ss);
  const nowText = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');

  const rows = [];
  supervisors.forEach(function(person, index) {
    const name = String(person && person.name || '').trim();
    if (!name) return;
    rows.push([
      String(person.id || '').trim() || createPersonnelId_('SUP', index + 1),
      'supervisor',
      name,
      String(person.position || '').trim(),
      String(person.department || '').trim(),
      index + 1,
      nowText
    ]);
  });

  committees.forEach(function(person, index) {
    const name = String(person && person.name || '').trim();
    if (!name) return;
    rows.push([
      String(person.id || '').trim() || createPersonnelId_('COM', index + 1),
      'committee',
      name,
      String(person.position || '').trim(),
      String(person.department || '').trim(),
      index + 1,
      nowText
    ]);
  });


  executives.forEach(function(person, index) {
    const name = String(person && person.name || '').trim();
    if (!name) return;
    rows.push([
      String(person.id || '').trim() || createPersonnelId_('EXE', index + 1),
      'executive',
      name,
      String(person.position || '').trim(),
      String(person.department || '').trim(),
      index + 1,
      nowText
    ]);
  });

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), PERSONNEL_HEADERS.length)).clearContent();
  }
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, PERSONNEL_HEADERS.length).setValues(rows);
  }

  return getPersonnelConfig_(ss);
}

function createPersonnelId_(prefix, index) {
  return String(prefix || 'PER') + '-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss') + '-' + String(index || Math.floor(Math.random() * 900 + 100));
}


function setupUserSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getUserSheet_(ss);
  ensureDefaultUserRows_(sheet);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทผู้ใช้งานระบบเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: USER_HEADERS
  };
}

function getUserSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.USER_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.USER_SHEET_NAME);
  prepareUserSheet_(sheet);
  return sheet;
}

function prepareUserSheet_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), USER_HEADERS.length);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function(v) { return String(v || '').trim(); });
  const hasHeader = USER_HEADERS.every(function(header) { return currentHeaders.indexOf(header) !== -1; });
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
    sheet.setFrozenRows(1);
  }
  try {
    sheet.getRange(1, 1, 1, USER_HEADERS.length).setFontWeight('bold').setBackground('#dbeafe');
  } catch (error) {}
}

function ensureDefaultUserRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) return;
  const nowText = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const defaults = [
    ['admin', '1234', 'นายณัฐธนัน มะธิปิไข', 'กองช่าง', 'วิศวกรโยธาปฏิบัติการ', 'admin', 'active', nowText],
    ['jakkrit', '1234', 'นายจักรกริช พนมเสริฐ', 'กองช่าง', 'ผู้ควบคุมงาน', 'engineering_supervisor', 'active', nowText],
    ['clerk', '1234', 'ธุรการกองช่าง', 'กองช่าง', 'ธุรการกองช่าง', 'engineering_clerk', 'active', nowText],
    ['viewer', '1234', 'ผู้เยี่ยมชม', 'กองช่าง', 'ผู้ดูข้อมูล', 'viewer', 'active', nowText]
  ];
  sheet.getRange(2, 1, defaults.length, USER_HEADERS.length).setValues(defaults);
}

function loginUser(username, password) {
  const userNameText = String(username || '').trim();
  const passText = String(password || '').trim();
  if (!userNameText || !passText) return { ok: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getUserSheet_(ss);
  ensureDefaultUserRows_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: false, message: 'ยังไม่มีผู้ใช้งานในชีทผู้ใช้งานระบบ' };

  const values = sheet.getRange(2, 1, lastRow - 1, USER_HEADERS.length).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const sheetUsername = String(row[0] || '').trim();
    const sheetPassword = String(row[1] || '').trim();
    const status = String(row[6] || 'active').trim().toLowerCase();
    if (sheetUsername === userNameText && sheetPassword === passText) {
      if (status && status !== 'active' && status !== 'ใช้งาน') {
        return { ok: false, message: 'ผู้ใช้นี้ถูกปิดการใช้งาน' };
      }
      const role = normalizeUserRole_(row[5] || 'viewer');
      const user = {
        username: sheetUsername,
        fullName: String(row[2] || sheetUsername).trim(),
        department: String(row[3] || '').trim(),
        position: String(row[4] || '').trim(),
        role: role,
        roleLabel: getUserRoleLabel_(role)
      };
      return {
        ok: true,
        user: user
      };
    }
  }
  return { ok: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

function normalizeUserRole_(role) {
  const r = String(role || '').trim().toLowerCase();
  if (['admin', 'administrator', 'ผู้ดูแล', 'ผู้ดูแลระบบ'].indexOf(r) !== -1) return 'admin';
  if (['engineering_supervisor', 'engineer_supervisor', 'supervisor_engineering', 'ผู้ควบคุมงานกองช่าง', 'ผู้ควบคุมงาน'].indexOf(r) !== -1) return 'engineering_supervisor';
  if (['engineering_clerk', 'clerk', 'ธุรการกองช่าง', 'ธุรการ'].indexOf(r) !== -1) return 'engineering_clerk';
  if (['engineer', 'staff', 'editor', 'ช่าง', 'กองช่าง', 'ผู้แก้ไข'].indexOf(r) !== -1) return 'engineer';
  return 'viewer';
}

function getUserRoleLabel_(role) {
  const r = normalizeUserRole_(role);
  if (r === 'admin') return 'ผู้ดูแลระบบ';
  if (r === 'engineering_supervisor') return 'ผู้ควบคุมงานกองช่าง';
  if (r === 'engineering_clerk') return 'ธุรการกองช่าง';
  if (r === 'engineer') return 'เจ้าหน้าที่กองช่าง';
  return 'ผู้ดูข้อมูล';
}

function normalizeUserStatus_(status) {
  const s = String(status || '').trim().toLowerCase();
  if (['disabled', 'inactive', 'off', 'ปิด', 'ปิดใช้งาน', 'ปิดการใช้งาน'].indexOf(s) !== -1) return 'disabled';
  return 'active';
}

function findUserRow_(sheet, username) {
  const key = String(username || '').trim();
  if (!key) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, USER_HEADERS.length).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    const rowUsername = String(values[i][0] || '').trim();
    if (rowUsername === key) {
      return { rowNumber: i + 2, values: values[i] };
    }
  }
  return null;
}

function assertAdminUser_(adminUsername) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getUserSheet_(ss);
  ensureDefaultUserRows_(sheet);
  const found = findUserRow_(sheet, adminUsername);
  if (!found) throw new Error('ไม่พบสิทธิ์ผู้ดูแลระบบ กรุณาเข้าสู่ระบบใหม่');
  const role = normalizeUserRole_(found.values[5] || 'viewer');
  const status = normalizeUserStatus_(found.values[6] || 'active');
  if (role !== 'admin' || status !== 'active') throw new Error('บัญชีนี้ไม่มีสิทธิ์จัดการผู้ใช้งาน');
  return { ss: ss, sheet: sheet, admin: found };
}

function assertSystemOptionManagerUser_(username) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getUserSheet_(ss);
  ensureDefaultUserRows_(sheet);
  const found = findUserRow_(sheet, username);
  if (!found) throw new Error('ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
  const role = normalizeUserRole_(found.values[5] || 'viewer');
  const status = normalizeUserStatus_(found.values[6] || 'active');
  const permissions = getRolePermissions_();
  if (status !== 'active' || (role !== 'admin' && !(permissions[role] && permissions[role].system_options))) throw new Error('บัญชีนี้ไม่มีสิทธิ์จัดการรายการตัวเลือก');
  return { ss:ss, sheet:sheet, user:found };
}

function getUserManagementList_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, USER_HEADERS.length).getDisplayValues();
  return values
    .filter(function(row) { return String(row[0] || '').trim(); })
    .map(function(row) {
      const role = normalizeUserRole_(row[5] || 'viewer');
      const status = normalizeUserStatus_(row[6] || 'active');
      return {
        username: String(row[0] || '').trim(),
        fullName: String(row[2] || '').trim(),
        department: String(row[3] || '').trim(),
        position: String(row[4] || '').trim(),
        role: role,
        roleLabel: getUserRoleLabel_(role),
        status: status,
        updatedAt: String(row[7] || '').trim()
      };
    });
}

function getUsersForAdmin(adminUsername) {
  const ctx = assertAdminUser_(adminUsername);
  return { ok: true, users: getUserManagementList_(ctx.sheet), rolePermissions: getRolePermissions_() };
}

function resolveProjectLocation_(constructionSite, villageNo, villageName) {
  const site = String(constructionSite || '').trim();
  const normalized = site.replace(/[๐-๙]/g, function(digit) { return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(digit)); });
  const match = normalized.match(/^หมู่(?:ที่)?\s*(\d+)\s*(.*)$/);
  const oldNo = String(villageNo || '').trim();
  if (site && !match) return { villageNo: '', villageName: '', label: site };
  const no = match ? match[1] : oldNo;
  const name = match ? (match[2].trim() || (no === oldNo ? String(villageName || '').trim() : '')) : String(villageName || '').trim();
  return { villageNo: no, villageName: name, label: [no ? 'หมู่ ' + no : '', name].filter(Boolean).join(' ') };
}

function getSystemOptionsForAdmin(adminUsername) {
  assertSystemOptionManagerUser_(adminUsername);
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSystemOptionsSheet_(ss);
  return { ok: true, options: readSystemOptions_(sheet, false) };
}

function ensureSystemOptionCatalogFromAdmin(adminUsername, catalog) {
  assertSystemOptionManagerUser_(adminUsername);
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSystemOptionsSheet_(ss);
  // รุ่นก่อนเคยนำวันที่จากประวัติโครงการมาเข้าใจผิดว่าเป็นชื่อผู้รับจ้าง
  // ล้างเฉพาะค่าที่มีรูปแบบวันที่ไทยชัดเจนก่อนคืนรายการให้ผู้ดูแล
  if (sheet.getLastRow() > 1) {
    const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 2).getDisplayValues();
    const thaiDatePattern = /^\s*\d{1,2}\s+(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+\d{4}\s*$/;
    for (let i = values.length - 1; i >= 0; i--) {
      if (String(values[i][0]).trim() === 'ผู้รับจ้าง' && thaiDatePattern.test(String(values[i][1] || ''))) sheet.deleteRow(i + 2);
    }
  }
  const existing = readSystemOptions_(sheet, false);
  const existingCategories = {};
  existing.forEach(function(item){ existingCategories[item.category] = true; });
  const now = new Date();
  const rows = [];
  (Array.isArray(catalog) ? catalog : []).forEach(function(group){
    const category = String(group && group.category || '').trim();
    if (!category || existingCategories[category]) return;
    const seen = {};
    (Array.isArray(group.options) ? group.options : []).forEach(function(option,index){
      const item = option && typeof option === 'object' ? option : { label: option };
      const label = String(item.label || '').trim();
      if (!label || seen[label]) return;
      seen[label] = true;
      rows.push([
        'OPT-' + Utilities.getUuid(), category, label,
        String(item.detail1 || '').trim(),
        String(item.detail2 || '').trim(),
        String(item.detail3 || '').trim(),
        index + 1, 'active', now
      ]);
    });
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1,1,rows.length,SYSTEM_OPTION_HEADERS.length).setValues(rows);
  return { ok:true, options:readSystemOptions_(sheet,false) };
}

function saveSystemOptionFromAdmin(adminUsername, data) {
  assertSystemOptionManagerUser_(adminUsername);
  data = data || {};
  const category = String(data.category || '').trim();
  const label = String(data.label || '').trim();
  if (!category) throw new Error('กรุณาระบุหมวดหมู่');
  if (!label) throw new Error('กรุณาระบุชื่อตัวเลือก');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSystemOptionsSheet_(ss);
  const id = String(data.id || '').trim() || ('OPT-' + Utilities.getUuid());
  const values = [id, category, label, String(data.detail1 || '').trim(), String(data.detail2 || '').trim(), String(data.detail3 || '').trim(), Number(data.sortOrder || 0), String(data.status || 'active') === 'disabled' ? 'disabled' : 'active', new Date()];
  const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues() : [];
  let targetRow = 0;
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { targetRow = i + 2; break; }
  if (targetRow) sheet.getRange(targetRow, 1, 1, SYSTEM_OPTION_HEADERS.length).setValues([values]);
  else sheet.appendRow(values);
  return { ok: true, option: systemOptionRowToObject_(values), options: readSystemOptions_(sheet, false) };
}

function deleteSystemOptionFromAdmin(adminUsername, optionId) {
  assertSystemOptionManagerUser_(adminUsername);
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSystemOptionsSheet_(ss);
  const id = String(optionId || '').trim();
  if (!id) throw new Error('ไม่พบรหัสตัวเลือก');
  const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues() : [];
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      // Keep a tombstone so deleting the last option cannot reseed the category.
      sheet.getRange(i + 2, 8).setValue('deleted');
      sheet.getRange(i + 2, 9).setValue(new Date());
      return { ok: true, options: readSystemOptions_(sheet, false) };
    }
  }
  throw new Error('ไม่พบตัวเลือกที่ต้องการลบ');
}

function getSystemOptionsSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.SYSTEM_OPTIONS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SYSTEM_OPTIONS_SHEET_NAME);
  if (sheet.getLastRow() < 1) sheet.getRange(1, 1, 1, SYSTEM_OPTION_HEADERS.length).setValues([SYSTEM_OPTION_HEADERS]);
  const headers = sheet.getRange(1, 1, 1, SYSTEM_OPTION_HEADERS.length).getDisplayValues()[0];
  if (headers.join('|') !== SYSTEM_OPTION_HEADERS.join('|')) sheet.getRange(1, 1, 1, SYSTEM_OPTION_HEADERS.length).setValues([SYSTEM_OPTION_HEADERS]);
  sheet.setFrozenRows(1);
  if (sheet.getLastRow() === 1) seedSystemOptions_(sheet);
  migrateSystemOptionCatalogV2_(sheet);
  return sheet;
}

function migrateSystemOptionCatalogV2_(sheet) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SYSTEM_OPTIONS_CATALOG_VERSION') === '3') return;
  const categories = sheet.getLastRow() > 1 ? sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getDisplayValues().map(function(r){ return String(r[0] || '').trim(); }) : [];
  const missingDefaults = {
    'ประเภทผลทดสอบ': ['ทดสอบดิน','ทดสอบเหล็ก','ทดสอบคอนกรีต','ทดสอบการสะท้อนแสง AC','ทดสอบความหนา AC','ทดสอบล้างก้อนยาง AC','ขออนุมัติใช้วัสดุ AC','ทดสอบออกแบบส่วนผสม Job-mix'],
    'จำนวนก้อนตัวอย่างต่อ Sta.': ['๑ ก้อน/Sta.','๒ ก้อน/Sta.','๓ ก้อน/Sta.'],
    'ตำแหน่งก้อนตัวอย่าง': ['ซ้าย','ขวา','กลาง'],
    'เกณฑ์หักส่วนต่างค่า K': ['2% — มาตรการผ่อนผันชั่วคราว','4% — เกณฑ์ปกติ'],
    'อัตราค่าปรับ': ['ร้อยละ 0.10 ของราคางานจ้างต่อวัน','ร้อยละ 0.25 ของราคางานจ้างต่อวัน — กรณีงานก่อสร้างสาธารณูปโภคที่มีผลกระทบต่อการจราจร'],
    'ประเภทภาพถ่ายโครงการ': ['ภาพถ่ายสภาพการปฏิบัติงานของผู้รับจ้าง (ก่อนดำเนินงาน)','ภาพถ่ายสภาพการปฏิบัติงานของผู้รับจ้าง (ขณะดำเนินงาน)','ภาพถ่ายสภาพการปฏิบัติงานของผู้รับจ้าง (ดำเนินงานแล้วเสร็จ)'],
    'ประเภทผู้ขออนุญาต': ['บุคคลธรรมดา','นิติบุคคล'],
    'การดำเนินการอาคาร': ['ก่อสร้าง','ดัดแปลง','รื้อถอน','เคลื่อนย้าย'],
    'จำนวนผู้ควบคุมงาน': ['1 คน','2 คน'],
    'จำนวนกรรมการตรวจรับ': ['3 คน','5 คน'],
    'ผิวจราจร': ['ถนนดิน','ลูกรัง','ถนนดิน,คสล.','ลูกรัง,คสล.','คสล.','ถนนดิน,คสล.,เสริมผิวลาดยาง','ลูกรัง,คสล.,เสริมผิวลาดยาง','คสล.,เสริมผิวลาดยาง','แอสฟัลท์ติกคอนกรีต'],
    'การปฏิบัติหน้าที่ใต้ชื่อ': ['ปฏิบัติราชการแทน','รักษาราชการแทน','รักษาการในตำแหน่ง'],
    'ตำแหน่งที่ปฏิบัติหน้าที่': ['นายกเทศมนตรีตำบลสีแก้ว','ปลัดเทศบาลตำบลสีแก้ว']
  };
  const now = new Date();
  const rows = [];
  Object.keys(missingDefaults).forEach(function(category){
    if (categories.indexOf(category) !== -1) return;
    missingDefaults[category].forEach(function(label,index){ rows.push(['OPT-' + Utilities.getUuid(),category,label,'','','',index + 1,'active',now]); });
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SYSTEM_OPTION_HEADERS.length).setValues(rows);
  props.setProperty('SYSTEM_OPTIONS_CATALOG_VERSION','3');
}

function seedSystemOptions_(sheet) {
  const defaults = {
    'ประเภทงาน': ['งานถนน','งานวางท่อ/ระบายน้ำ','งานประปา','งานไฟฟ้า','งานอาคาร','งานสะพาน','งานแหล่งน้ำ','อื่น ๆ'],
    'สถานที่ก่อสร้าง': Array.from({length: 22}, function(_, i) { return 'หมู่ที่ ' + (i + 1); }),
    'ประเภทงบประมาณ': ['งบเทศบัญญัติ','เงินเหลือจ่าย','เงินอุดหนุนเฉพาะกิจ','เงินสะสม','อื่น ๆ'],
    'สถานะโครงการ': ['กำหนดราคากลาง','ดำเนินการ','รอผลทดสอบ','รอตรวจรับงาน','แล้วเสร็จ','ล่าช้า'],
    'สภาพอากาศ': ['ปกติ','แดดออก','มีเมฆ','ฝนตก','หยุดงาน'],
    'ประเภทผลทดสอบ': ['ทดสอบดิน','ทดสอบเหล็ก','ทดสอบคอนกรีต','ทดสอบการสะท้อนแสง AC','ทดสอบความหนา AC','ทดสอบล้างก้อนยาง AC','ขออนุมัติใช้วัสดุ AC','ทดสอบออกแบบส่วนผสม Job-mix'],
    'จำนวนก้อนตัวอย่างต่อ Sta.': ['๑ ก้อน/Sta.','๒ ก้อน/Sta.','๓ ก้อน/Sta.'],
    'ตำแหน่งก้อนตัวอย่าง': ['ซ้าย','ขวา','กลาง'],
    'เกณฑ์หักส่วนต่างค่า K': ['2% — มาตรการผ่อนผันชั่วคราว','4% — เกณฑ์ปกติ'],
    'อัตราค่าปรับ': ['ร้อยละ 0.10 ของราคางานจ้างต่อวัน','ร้อยละ 0.25 ของราคางานจ้างต่อวัน — กรณีงานก่อสร้างสาธารณูปโภคที่มีผลกระทบต่อการจราจร'],
    'ประเภทภาพถ่ายโครงการ': ['ภาพถ่ายสภาพการปฏิบัติงานของผู้รับจ้าง (ก่อนดำเนินงาน)','ภาพถ่ายสภาพการปฏิบัติงานของผู้รับจ้าง (ขณะดำเนินงาน)','ภาพถ่ายสภาพการปฏิบัติงานของผู้รับจ้าง (ดำเนินงานแล้วเสร็จ)'],
    'ประเภทผู้ขออนุญาต': ['บุคคลธรรมดา','นิติบุคคล'],
    'การดำเนินการอาคาร': ['ก่อสร้าง','ดัดแปลง','รื้อถอน','เคลื่อนย้าย'],
    'จำนวนผู้ควบคุมงาน': ['1 คน','2 คน'],
    'จำนวนกรรมการตรวจรับ': ['3 คน','5 คน'],
    'ผิวจราจร': ['ถนนดิน','ลูกรัง','ถนนดิน,คสล.','ลูกรัง,คสล.','คสล.','ถนนดิน,คสล.,เสริมผิวลาดยาง','ลูกรัง,คสล.,เสริมผิวลาดยาง','คสล.,เสริมผิวลาดยาง','แอสฟัลท์ติกคอนกรีต'],
    'การปฏิบัติหน้าที่ใต้ชื่อ': ['ปฏิบัติราชการแทน','รักษาราชการแทน','รักษาการในตำแหน่ง'],
    'ตำแหน่งที่ปฏิบัติหน้าที่': ['นายกเทศมนตรีตำบลสีแก้ว','ปลัดเทศบาลตำบลสีแก้ว']
  };
  const now = new Date();
  const rows = [];
  Object.keys(defaults).forEach(function(category) {
    defaults[category].forEach(function(label, index) {
      rows.push(['OPT-' + Utilities.getUuid(), category, label, '', '', '', index + 1, 'active', now]);
    });
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, SYSTEM_OPTION_HEADERS.length).setValues(rows);
}

function systemOptionRowToObject_(row) {
  return { id: String(row[0] || ''), category: String(row[1] || ''), label: String(row[2] || ''), detail1: String(row[3] || ''), detail2: String(row[4] || ''), detail3: String(row[5] || ''), sortOrder: Number(row[6] || 0), status: String(row[7] || 'active') };
}

function readSystemOptions_(sheet, activeOnly) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, SYSTEM_OPTION_HEADERS.length).getDisplayValues().map(systemOptionRowToObject_).filter(function(item) { return item.id && (!activeOnly || item.status === 'active'); }).sort(function(a, b) { return a.category.localeCompare(b.category, 'th') || a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'th'); });
}

function getSystemOptionsConfig_(ss) {
  return readSystemOptions_(getSystemOptionsSheet_(ss), false);
}

function saveUserFromAdmin(adminUsername, data) {
  const ctx = assertAdminUser_(adminUsername);
  const sheet = ctx.sheet;
  data = data || {};

  const originalUsername = String(data.originalUsername || '').trim();
  const username = String(data.username || '').trim();
  const password = String(data.password || '').trim();
  const fullName = String(data.fullName || username).trim();
  const department = String(data.department || '').trim();
  const position = String(data.position || '').trim();
  const role = normalizeUserRole_(data.role || 'viewer');
  const status = normalizeUserStatus_(data.status || 'active');

  if (!username) throw new Error('กรุณากรอกชื่อผู้ใช้');
  if (/\s/.test(username)) throw new Error('ชื่อผู้ใช้ห้ามมีช่องว่าง');

  const targetKey = originalUsername || username;
  const existing = originalUsername ? findUserRow_(sheet, originalUsername) : findUserRow_(sheet, username);
  const duplicate = findUserRow_(sheet, username);
  if (duplicate && (!existing || duplicate.rowNumber !== existing.rowNumber)) {
    throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  }
  if (!existing && !password) throw new Error('กรุณากรอกรหัสผ่านสำหรับผู้ใช้ใหม่');

  // กันปัญหาล็อกตัวเองออกจากระบบโดยไม่ตั้งใจ
  if (String(targetKey) === String(adminUsername) && (role !== 'admin' || status !== 'active')) {
    throw new Error('ไม่สามารถลดสิทธิ์หรือปิดการใช้งานบัญชีผู้ดูแลระบบที่กำลังใช้งานอยู่');
  }

  const nowText = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  if (existing) {
    const old = existing.values;
    const nextPassword = password || String(old[1] || '').trim();
    sheet.getRange(existing.rowNumber, 1, 1, USER_HEADERS.length).setValues([[
      username,
      nextPassword,
      fullName,
      department,
      position,
      role,
      status,
      nowText
    ]]);
  } else {
    sheet.appendRow([username, password, fullName, department, position, role, status, nowText]);
  }

  return { ok: true, users: getUserManagementList_(sheet) };
}

function setUserStatusFromAdmin(adminUsername, username, status) {
  const ctx = assertAdminUser_(adminUsername);
  const sheet = ctx.sheet;
  const targetUsername = String(username || '').trim();
  const normalizedStatus = normalizeUserStatus_(status || 'active');
  if (!targetUsername) throw new Error('ไม่พบชื่อผู้ใช้ที่ต้องการแก้ไข');
  if (targetUsername === String(adminUsername).trim() && normalizedStatus !== 'active') {
    throw new Error('ไม่สามารถปิดการใช้งานบัญชีผู้ดูแลระบบที่กำลังใช้งานอยู่');
  }
  const found = findUserRow_(sheet, targetUsername);
  if (!found) throw new Error('ไม่พบผู้ใช้งานนี้');
  const row = found.values.slice();
  row[6] = normalizedStatus;
  row[7] = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  sheet.getRange(found.rowNumber, 1, 1, USER_HEADERS.length).setValues([row]);
  return { ok: true, users: getUserManagementList_(sheet) };
}

function setupMemoHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getMemoHistorySheet_(ss);

  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติบันทึกข้อความเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId()
  };
}

function getMemoHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getMemoHistorySheet_(ss);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      ok: true,
      memos: []
    };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, MEMO_HISTORY_HEADERS.length).getDisplayValues();

  const memos = values.map(function(row) {
      const obj = {};
      MEMO_HISTORY_HEADERS.forEach(function(header, index) {
        obj[header] = row[index] || '';
      });
      return obj;
    })
    .filter(function(item) {
      return String(item['รหัสโครงการ'] || '') === String(projectId || '');
    })
    .sort(function(a, b) {
      return Number(a['สัปดาห์ที่'] || 0) - Number(b['สัปดาห์ที่'] || 0);
    });

  return {
    ok: true,
    memos: memos
  };
}

function saveMemoHistory(password, memoData) {
  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }

  if (!memoData || !String(memoData.projectId || '').trim()) {
    throw new Error('ไม่พบรหัสโครงการ');
  }

  if (!String(memoData.weekNo || '').trim()) {
    throw new Error('กรุณาเลือกสัปดาห์ที่');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getMemoHistorySheet_(ss);
  const now = new Date();
  const memoId = String(memoData.memoId || '').trim() || createMemoHistoryId_();

  const rowObject = {
    'รหัสบันทึก': memoId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': memoData.projectId || '',
    'ชื่อโครงการ': memoData.projectName || '',
    'ประเภทบันทึกข้อความ': memoData.memoType || '',
    'สัปดาห์ที่': memoData.weekNo || '',
    'วันที่ทำบันทึก': memoData.memoDate || '',
    'เลขบันทึก': memoData.memoNo || '',
    'จำนวนรายงานผลการดำเนินงานก่อสร้าง': memoData.constructionReportCount || '',
    'จำนวนบันทึกสภาพการปฏิบัติงาน': memoData.workConditionCount || '',
    'จำนวนภาพถ่าย': memoData.photoCount || '',
    'เรียน': memoData.memoTo || '',
    'ผู้ควบคุมงาน': memoData.supervisor || '',
    'ผู้ควบคุมงานคนที่ 2': memoData.supervisor2 || '',
    'วันที่เริ่มสัปดาห์': memoData.periodStart || '',
    'วันที่สิ้นสุดสัปดาห์': memoData.periodEnd || '',
    'HTML บันทึกข้อความ': memoData.memoHtml || '',
    'ภาพถ่ายแนบ JSON': memoData.photoAttachmentsJson || ''
  };

  const row = MEMO_HISTORY_HEADERS.map(function(header) {
    return rowObject[header] === undefined ? '' : rowObject[header];
  });

  const existingRow = findMemoHistoryRow_(sheet, memoId);
  applyAuditToHistoryRow_(sheet, MEMO_HISTORY_HEADERS, row, existingRow, memoData);

  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, MEMO_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    message: existingRow ? 'แก้ไขบันทึกข้อความเรียบร้อยแล้ว' : 'บันทึกประวัติบันทึกข้อความเรียบร้อยแล้ว',
    memoId: memoId
  };
}


function setupWorkReductionHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWorkReductionHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติปรับลดปริมาณงานเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId()
  };
}

function getWorkReductionHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWorkReductionHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, histories: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, WORK_REDUCTION_HISTORY_HEADERS.length).getDisplayValues();
  const histories = values.map(function(row) {
      const obj = {};
      WORK_REDUCTION_HISTORY_HEADERS.forEach(function(header, index) {
        obj[header] = row[index] || '';
      });
      return obj;
    })
    .filter(function(item) {
      return !String(projectId || '').trim() || String(item['รหัสโครงการ'] || '') === String(projectId || '');
    })
    .sort(function(a, b) {
      const ad = String(a['วันที่แก้ไข'] || a['วันที่สร้าง'] || '');
      const bd = String(b['วันที่แก้ไข'] || b['วันที่สร้าง'] || '');
      return bd.localeCompare(ad);
    });
  return { ok: true, histories: histories };
}

function saveWorkReductionHistory(password, workReductionData) {
  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }
  if (!workReductionData || !String(workReductionData.projectId || '').trim()) {
    throw new Error('ไม่พบรหัสโครงการ');
  }
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWorkReductionHistorySheet_(ss);
  const now = new Date();
  const requestedWorkReductionId = String(workReductionData.workReductionId || workReductionData.historyId || '').trim();
  const projectHistoryRows = findHistoryRowsByProject_(sheet, WORK_REDUCTION_HISTORY_HEADERS, workReductionData.projectId);
  const existingRow = findWorkReductionHistoryRow_(sheet, requestedWorkReductionId) || (projectHistoryRows.length ? projectHistoryRows[projectHistoryRows.length - 1] : 0);
  const workReductionId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || requestedWorkReductionId) : (requestedWorkReductionId || createWorkReductionHistoryId_());
  const rowObject = {
    'รหัสปรับลดปริมาณงาน': workReductionId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': workReductionData.projectId || '',
    'ชื่อโครงการ': workReductionData.projectName || '',
    'เลขบันทึก': workReductionData.memoNo || '',
    'วันที่ทำบันทึก': workReductionData.memoDate || '',
    'ครั้งที่ประชุม': workReductionData.meetingNo || '',
    'วันที่ประชุม': workReductionData.meetingDate || '',
    'วันที่ออกตรวจงาน': workReductionData.inspectDate || '',
    'วงเงินปรับลดรวม': workReductionData.cutAmount || '',
    'ผู้ควบคุมงาน': workReductionData.supervisor || '',
    'ผู้ควบคุมงานคนที่ 2': workReductionData.supervisor2 || '',
    'รายการปรับลด JSON': workReductionData.rowsJson || '',
    'ข้อมูลฟอร์ม JSON': workReductionData.formJson || '',
    'HTML ปรับลดปริมาณงาน': workReductionData.workReductionHtml || workReductionData.html || ''
  };
  const row = WORK_REDUCTION_HISTORY_HEADERS.map(function(header) {
    return rowObject[header] === undefined ? '' : rowObject[header];
  });
  applyAuditToHistoryRow_(sheet, WORK_REDUCTION_HISTORY_HEADERS, row, existingRow, workReductionData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, WORK_REDUCTION_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  removeDuplicateHistoryRowsByProject_(sheet, WORK_REDUCTION_HISTORY_HEADERS, workReductionData.projectId, existingRow || sheet.getLastRow());
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขประวัติปรับลดปริมาณงานเรียบร้อยแล้ว' : 'บันทึกประวัติปรับลดปริมาณงานเรียบร้อยแล้ว',
    workReductionId: workReductionId
  };
}

function deleteWorkReductionHistory(workReductionId) {
  return deleteHistoryRowById_(CONFIG.WORK_REDUCTION_HISTORY_SHEET_NAME, WORK_REDUCTION_HISTORY_HEADERS, workReductionId, 'ประวัติปรับลดปริมาณงาน');
}

function deleteWorkReductionHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.WORK_REDUCTION_HISTORY_SHEET_NAME, WORK_REDUCTION_HISTORY_HEADERS, projectId, 'ประวัติปรับลดปริมาณงาน');
}

function getWorkReductionHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.WORK_REDUCTION_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.WORK_REDUCTION_HISTORY_SHEET_NAME);
  prepareWorkReductionHistorySheet_(sheet);
  return sheet;
}

function prepareWorkReductionHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = WORK_REDUCTION_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([WORK_REDUCTION_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0]
    .map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = WORK_REDUCTION_HISTORY_HEADERS.every(function(header, index) {
    return String(currentHeaders[index] || '').trim() === header;
  });
  if (!firstRequiredMatch) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([WORK_REDUCTION_HISTORY_HEADERS]);
  }
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#dbeafe');
    sheet.autoResizeColumns(1, Math.min(requiredLen, 12));
  } catch (error) {
    // ไม่ต้องหยุดระบบ
  }
}

function findWorkReductionHistoryRow_(sheet, workReductionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === String(workReductionId || '').trim()) return i + 2;
  }
  return 0;
}

function createWorkReductionHistoryId_() {
  return 'WR-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}


function setupBuildingInspectionHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getBuildingInspectionHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติตรวจสอบสิ่งปลูกสร้างอาคารเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId()
  };
}

function getBuildingInspectionHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getBuildingInspectionHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, inspections: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, BUILDING_INSPECTION_HISTORY_HEADERS.length).getDisplayValues();
  const targetProjectId = String(projectId || '').trim();
  const inspections = values.map(function(row) {
      const obj = {};
      BUILDING_INSPECTION_HISTORY_HEADERS.forEach(function(header, index) {
        obj[header] = row[index] || '';
      });
      return obj;
    })
    .filter(function(item) {
      return !targetProjectId || String(item['รหัสโครงการ'] || '') === targetProjectId;
    })
    .reverse();
  return { ok: true, inspections: inspections };
}

function getAllBuildingInspectionHistories() {
  return getBuildingInspectionHistories('');
}

function saveBuildingInspectionHistory(password, inspectionData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!inspectionData) throw new Error('ไม่พบข้อมูลบันทึกตรวจสอบอาคาร');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getBuildingInspectionHistorySheet_(ss);
  const now = new Date();
  const requestedInspectionId = String(inspectionData.inspectionId || '').trim();
  const applicantKey = normalizeBuildingHistoryPersonKey_(inspectionData.applicantName);
  let existingRow = findBuildingInspectionHistoryRow_(sheet, requestedInspectionId);
  const applicantRows = findBuildingHistoryRowsByHeader_(sheet, BUILDING_INSPECTION_HISTORY_HEADERS, 'ผู้ยื่นคำร้อง', applicantKey);
  if (!existingRow && applicantRows.length) existingRow = applicantRows[applicantRows.length - 1];
  const existingId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || '').trim() : '';
  const inspectionId = existingId || requestedInspectionId || createBuildingInspectionHistoryId_();
  const dataJson = inspectionData.dataJson || JSON.stringify(inspectionData.data || {});

  const rowObject = {
    'รหัสตรวจสอบอาคาร': inspectionId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': inspectionData.projectId || '',
    'ชื่อโครงการ': inspectionData.projectName || '',
    'เลขบันทึก': inspectionData.memoNo || '',
    'วันที่ทำบันทึก': inspectionData.memoDate || '',
    'ผู้ยื่นคำร้อง': inspectionData.applicantName || '',
    'โฉนดที่ดินเลขที่': inspectionData.deedNo || '',
    'ข้อมูลตรวจสอบอาคาร JSON': dataJson || '',
    'HTML ตรวจสอบอาคาร': inspectionData.inspectionHtml || '',
    'สร้างโดย': inspectionData.createdBy || inspectionData.auditUserName || '',
    'แก้ไขโดย': inspectionData.updatedBy || inspectionData.auditUserName || ''
  };

  const row = BUILDING_INSPECTION_HISTORY_HEADERS.map(function(header) {
    return rowObject[header] === undefined ? '' : rowObject[header];
  });

  applyAuditToHistoryRow_(sheet, BUILDING_INSPECTION_HISTORY_HEADERS, row, existingRow, inspectionData);

  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, BUILDING_INSPECTION_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    existingRow = sheet.getLastRow();
  }
  // หนึ่งผู้ยื่นคำร้องมีประวัติฉบับล่าสุดเพียงรายการเดียว
  findBuildingHistoryRowsByHeader_(sheet, BUILDING_INSPECTION_HISTORY_HEADERS, 'ผู้ยื่นคำร้อง', applicantKey)
    .filter(function(rowNo) { return rowNo !== existingRow; })
    .sort(function(a, b) { return b - a; })
    .forEach(function(rowNo) { sheet.deleteRow(rowNo); });
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขบันทึกตรวจสอบสิ่งปลูกสร้างอาคารเรียบร้อยแล้ว' : 'บันทึกประวัติตรวจสอบสิ่งปลูกสร้างอาคารเรียบร้อยแล้ว',
    inspectionId: inspectionId
  };
}

function deleteBuildingInspectionHistory(inspectionId) {
  return deleteHistoryRowById_(CONFIG.BUILDING_INSPECTION_HISTORY_SHEET_NAME, BUILDING_INSPECTION_HISTORY_HEADERS, inspectionId, 'ประวัติตรวจสอบสิ่งปลูกสร้างอาคาร');
}

function getBuildingInspectionHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.BUILDING_INSPECTION_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.BUILDING_INSPECTION_HISTORY_SHEET_NAME);
  prepareBuildingInspectionHistorySheet_(sheet);
  return sheet;
}

function prepareBuildingInspectionHistorySheet_(sheet) {
  const requiredLen = BUILDING_INSPECTION_HISTORY_HEADERS.length;
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([BUILDING_INSPECTION_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), requiredLen)).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  const matched = BUILDING_INSPECTION_HISTORY_HEADERS.every(function(header, index) {
    return String(currentHeaders[index] || '').trim() === header;
  });
  if (!matched) sheet.getRange(1, 1, 1, requiredLen).setValues([BUILDING_INSPECTION_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bbf7d0');
  } catch (error) {}
}

function findBuildingInspectionHistoryRow_(sheet, inspectionId) {
  const targetId = String(inspectionId || '').trim();
  if (!targetId || sheet.getLastRow() <= 1) return 0;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === targetId) return i + 2;
  }
  return 0;
}

function createBuildingInspectionHistoryId_() {
  const tz = Session.getScriptTimeZone() || 'Asia/Bangkok';
  return 'BI-' + Utilities.formatDate(new Date(), tz, 'yyyyMMddHHmmss') + '-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function normalizeBuildingHistoryPersonKey_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findBuildingHistoryRowsByHeader_(sheet, headers, headerName, normalizedValue) {
  const target = String(normalizedValue || '').trim();
  const columnIndex = headers.indexOf(headerName);
  if (!target || columnIndex < 0 || sheet.getLastRow() <= 1) return [];
  const values = sheet.getRange(2, columnIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  const rows = [];
  values.forEach(function(row, index) {
    if (normalizeBuildingHistoryPersonKey_(row[0]) === target) rows.push(index + 2);
  });
  return rows;
}


function setupBuildingPermitA1HistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getBuildingPermitA1HistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติใบ อ.1 เรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId()
  };
}

function getBuildingPermitA1Histories(sourceInspectionId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getBuildingPermitA1HistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, permits: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, BUILDING_PERMIT_A1_HISTORY_HEADERS.length).getDisplayValues();
  const targetInspectionId = String(sourceInspectionId || '').trim();
  const permits = values.map(function(row) {
      const obj = {};
      BUILDING_PERMIT_A1_HISTORY_HEADERS.forEach(function(header, index) {
        obj[header] = row[index] || '';
      });
      return obj;
    })
    .filter(function(item) {
      return !targetInspectionId || String(item['รหัสตรวจสอบอาคาร'] || '') === targetInspectionId;
    })
    .reverse();
  return { ok: true, permits: permits };
}

function getAllBuildingPermitA1Histories() {
  return getBuildingPermitA1Histories('');
}

function saveBuildingPermitA1History(password, permitData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!permitData) throw new Error('ไม่พบข้อมูลใบ อ.1');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getBuildingPermitA1HistorySheet_(ss);
  const now = new Date();
  const requestedA1HistoryId = String(permitData.a1HistoryId || '').trim();
  const applicantKey = normalizeBuildingHistoryPersonKey_(permitData.applicantName);
  let existingRow = findBuildingPermitA1HistoryRow_(sheet, requestedA1HistoryId);
  const applicantRows = findBuildingHistoryRowsByHeader_(sheet, BUILDING_PERMIT_A1_HISTORY_HEADERS, 'ผู้ขออนุญาต', applicantKey);
  if (!existingRow && applicantRows.length) existingRow = applicantRows[applicantRows.length - 1];
  const existingId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || '').trim() : '';
  const a1HistoryId = existingId || requestedA1HistoryId || createBuildingPermitA1HistoryId_();
  const dataJson = permitData.dataJson || JSON.stringify(permitData.data || {});

  const rowObject = {
    'รหัสใบ อ.1': a1HistoryId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสตรวจสอบอาคาร': permitData.sourceInspectionId || '',
    'เลขที่ใบอนุญาต': permitData.permitNo || '',
    'ปีใบอนุญาต พ.ศ.': permitData.permitYear || '',
    'เลขที่คำขอ': permitData.requestNo || '',
    'วันที่ออกใบอนุญาต': permitData.issuedDate || '',
    'ผู้ขออนุญาต': permitData.applicantName || '',
    'ประเภทผู้ขออนุญาต': permitData.applicantType || '',
    'โฉนดที่ดินเลขที่': permitData.deedNo || '',
    'ข้อมูลใบ อ.1 JSON': dataJson || '',
    'HTML ใบ อ.1': permitData.a1Html || '',
    'สร้างโดย': permitData.createdBy || permitData.auditUserName || '',
    'แก้ไขโดย': permitData.updatedBy || permitData.auditUserName || ''
  };

  const row = BUILDING_PERMIT_A1_HISTORY_HEADERS.map(function(header) {
    return rowObject[header] === undefined ? '' : rowObject[header];
  });

  applyAuditToHistoryRow_(sheet, BUILDING_PERMIT_A1_HISTORY_HEADERS, row, existingRow, permitData);

  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, BUILDING_PERMIT_A1_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    existingRow = sheet.getLastRow();
  }
  // หนึ่งผู้ยื่นคำร้อง/เจ้าของอาคารมีประวัติใบ อ.1 ฉบับล่าสุดเพียงรายการเดียว
  findBuildingHistoryRowsByHeader_(sheet, BUILDING_PERMIT_A1_HISTORY_HEADERS, 'ผู้ขออนุญาต', applicantKey)
    .filter(function(rowNo) { return rowNo !== existingRow; })
    .sort(function(a, b) { return b - a; })
    .forEach(function(rowNo) { sheet.deleteRow(rowNo); });
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขประวัติใบ อ.1 เรียบร้อยแล้ว' : 'บันทึกประวัติใบ อ.1 เรียบร้อยแล้ว',
    a1HistoryId: a1HistoryId
  };
}

function deleteBuildingPermitA1History(a1HistoryId) {
  return deleteHistoryRowById_(CONFIG.BUILDING_PERMIT_A1_HISTORY_SHEET_NAME, BUILDING_PERMIT_A1_HISTORY_HEADERS, a1HistoryId, 'ประวัติใบ อ.1');
}

function getBuildingPermitA1HistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.BUILDING_PERMIT_A1_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.BUILDING_PERMIT_A1_HISTORY_SHEET_NAME);
  prepareBuildingPermitA1HistorySheet_(sheet);
  return sheet;
}

function prepareBuildingPermitA1HistorySheet_(sheet) {
  const requiredLen = BUILDING_PERMIT_A1_HISTORY_HEADERS.length;
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([BUILDING_PERMIT_A1_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), requiredLen)).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  const matched = BUILDING_PERMIT_A1_HISTORY_HEADERS.every(function(header, index) {
    return String(currentHeaders[index] || '').trim() === header;
  });
  if (!matched) sheet.getRange(1, 1, 1, requiredLen).setValues([BUILDING_PERMIT_A1_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bfdbfe');
  } catch (error) {}
}

function findBuildingPermitA1HistoryRow_(sheet, a1HistoryId) {
  const targetId = String(a1HistoryId || '').trim();
  if (!targetId || sheet.getLastRow() <= 1) return 0;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === targetId) return i + 2;
  }
  return 0;
}

function createBuildingPermitA1HistoryId_() {
  const tz = Session.getScriptTimeZone() || 'Asia/Bangkok';
  return 'A1-' + Utilities.formatDate(new Date(), tz, 'yyyyMMddHHmmss') + '-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function getMemoHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.MEMO_HISTORY_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.MEMO_HISTORY_SHEET_NAME);
  }

  prepareMemoHistorySheet_(sheet);
  return sheet;
}

function prepareMemoHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = MEMO_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);

  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([MEMO_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, lastCol)
    .getDisplayValues()[0]
    .map(function(value) {
      return String(value || '').trim();
    });

  const firstRequiredMatch = MEMO_HISTORY_HEADERS.every(function(header, index) {
    return String(currentHeaders[index] || '').trim() === header;
  });

  if (!firstRequiredMatch) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([MEMO_HISTORY_HEADERS]);
  }

  repairMemoHistoryRowsAfterSupervisor2Insert_(sheet);

  sheet.setFrozenRows(1);

  try {
    sheet.getRange(1, 1, 1, requiredLen)
      .setFontWeight('bold')
      .setBackground('#fde68a');
  } catch (error) {
    // ไม่ต้องหยุดระบบ
  }
}

function isHistoryHtmlValue_(value) {
  const text = String(value || '');
  return /<\/?[a-z][\s\S]*>/i.test(text) ||
    text.indexOf('memo-garuda') !== -1 ||
    text.indexOf('weekly-') !== -1 ||
    text.indexOf('data:image') !== -1 ||
    text.indexOf('class=') !== -1;
}

function repairMemoHistoryRowsAfterSupervisor2Insert_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = MEMO_HISTORY_HEADERS.length;

  if (lastRow <= 1) return;

  const idx = {};
  MEMO_HISTORY_HEADERS.forEach(function(header, index) {
    idx[header] = index;
  });

  const range = sheet.getRange(2, 1, lastRow - 1, requiredLen);
  const values = range.getValues();
  let changed = false;

  values.forEach(function(row) {
    const valueAtEndDate = row[idx['วันที่สิ้นสุดสัปดาห์']];
    const valueAtHtmlColumn = row[idx['HTML บันทึกข้อความ']];

    // เวอร์ชันก่อนหน้าแทรกคอลัมน์ “ผู้ควบคุมงานคนที่ 2” แต่เขียนหัวตารางทับของเดิม
    // ทำให้ HTML ทั้งฉบับถูกเลื่อนไปอยู่ช่อง “วันที่สิ้นสุดสัปดาห์” และแสดงเป็นโค้ดในหน้าประวัติ
    if (isHistoryHtmlValue_(valueAtEndDate) && !isHistoryHtmlValue_(valueAtHtmlColumn)) {
      const oldPeriodStart = row[idx['ผู้ควบคุมงานคนที่ 2']];
      const oldPeriodEnd = row[idx['วันที่เริ่มสัปดาห์']];
      const oldMemoHtml = row[idx['วันที่สิ้นสุดสัปดาห์']];
      const oldCreatedBy = row[idx['HTML บันทึกข้อความ']];
      const oldEditedBy = row[idx['สร้างโดย']];

      row[idx['ผู้ควบคุมงานคนที่ 2']] = '';
      row[idx['วันที่เริ่มสัปดาห์']] = oldPeriodStart || '';
      row[idx['วันที่สิ้นสุดสัปดาห์']] = oldPeriodEnd || '';
      row[idx['HTML บันทึกข้อความ']] = oldMemoHtml || '';
      row[idx['สร้างโดย']] = oldCreatedBy || '';
      row[idx['แก้ไขโดย']] = oldEditedBy || '';
      changed = true;
    }
  });

  if (changed) {
    range.setValues(values);
  }
}

function findMemoHistoryRow_(sheet, memoId) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return 0;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(memoId || '')) {
      return i + 2;
    }
  }

  return 0;
}

function createMemoHistoryId_() {
  return 'MEMO-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}


function setupWeeklyWorkHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWeeklyWorkHistorySheet_(ss);
  return { ok: true, message: 'สร้าง/เตรียมชีทประวัติบันทึกการปฏิบัติงานเรียบร้อย', sheetName: sheet.getName(), gid: sheet.getSheetId() };
}

function getWeeklyWorkHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWeeklyWorkHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, works: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, WEEKLY_WORK_HISTORY_HEADERS.length).getDisplayValues();
  const works = values.map(function(row) {
    const obj = {};
    WEEKLY_WORK_HISTORY_HEADERS.forEach(function(header, index) { obj[header] = row[index] || ''; });
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) { return Number(a['สัปดาห์ที่'] || 0) - Number(b['สัปดาห์ที่'] || 0); });
  return { ok: true, works: works };
}

/** คืนเลขสัปดาห์ล่าสุดที่บันทึกไว้ในรายงานช่างของโครงการ */
function getSCurveHandoverWeek(projectId) {
  const targetProjectId = String(projectId || '').trim();
  if (!targetProjectId) return { ok: true, weekCount: 0, found: false };
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWeeklyWorkHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, weekCount: 0, found: false };
  const projectCol = WEEKLY_WORK_HISTORY_HEADERS.indexOf('รหัสโครงการ') + 1;
  const weekCol = WEEKLY_WORK_HISTORY_HEADERS.indexOf('สัปดาห์ที่') + 1;
  const workDaysCol = WEEKLY_WORK_HISTORY_HEADERS.indexOf('วันทำงาน JSON') + 1;
  const firstCol = Math.min(projectCol, weekCol, workDaysCol);
  const lastCol = Math.max(projectCol, weekCol, workDaysCol);
  const values = sheet.getRange(2, firstCol, lastRow - 1, lastCol - firstCol + 1).getDisplayValues();
  let latestReportWeek = 0;
  let handoverWeek = 0;
  values.forEach(function(row) {
    const valueAt = function(column) { return row[column - firstCol] || ''; };
    if (String(valueAt(projectCol)).trim() !== targetProjectId) return;
    const weekText = String(valueAt(weekCol) || '').replace(/[๐-๙]/g, function(digit) {
      return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(digit));
    });
    const match = weekText.match(/\d+/);
    const week = match ? Number(match[0]) : 0;
    if (week > latestReportWeek) latestReportWeek = week;
    const workDaysJson = String(valueAt(workDaysCol) || '');
    if ((workDaysJson.indexOf('ผู้รับจ้างแจ้งส่งมอบงาน') !== -1 || workDaysJson.indexOf('ผู้รับจ้างส่งมอบงาน') !== -1) && week > handoverWeek) {
      handoverWeek = week;
    }
  });
  return {
    ok: true,
    weekCount: latestReportWeek,
    handoverWeek: handoverWeek,
    found: latestReportWeek > 0,
    source: handoverWeek === latestReportWeek && handoverWeek > 0 ? 'handover' : 'latest_report'
  };
}

function saveWeeklyWorkHistory(password, workData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!workData || !String(workData.projectId || '').trim()) throw new Error('ไม่พบรหัสโครงการ');
  if (!String(workData.weekNo || '').trim()) throw new Error('กรุณาเลือกสัปดาห์ที่');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWeeklyWorkHistorySheet_(ss);
  const now = new Date();
  const weeklyWorkId = String(workData.weeklyWorkId || '').trim() || createWeeklyWorkHistoryId_();
  const milestoneDates = validateWeeklyWorkMilestones_(sheet, workData, weeklyWorkId);
  const rowObject = {
    'รหัสบันทึกการปฏิบัติงาน': weeklyWorkId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': workData.projectId || '',
    'ชื่อโครงการ': workData.projectName || '',
    'สัปดาห์ที่': workData.weekNo || '',
    'วันที่เริ่มสัปดาห์': workData.periodStart || '',
    'วันที่สิ้นสุดสัปดาห์': workData.periodEnd || '',
    'ผู้ควบคุมงาน': workData.supervisor || '',
    'ผู้ควบคุมงานคนที่ 2': workData.supervisor2 || '',
    'ผู้รับจ้าง/ตัวแทนผู้รับจ้าง': workData.contractorRep || '',
    'วันทำงาน JSON': workData.workDaysJson || '',
    'สภาพอากาศ JSON': workData.weatherJson || '',
    'แรงงาน JSON': workData.laborJson || '',
    'เครื่องจักร JSON': workData.machineryJson || '',
    'HTML บันทึกการปฏิบัติงาน': workData.workHtml || '',
    'ชนิดงานถนน': workData.roadKind || ''
  };
  const row = WEEKLY_WORK_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  const existingRow = findWeeklyWorkHistoryRow_(sheet, weeklyWorkId);
  applyAuditToHistoryRow_(sheet, WEEKLY_WORK_HISTORY_HEADERS, row, existingRow, workData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now; row[2] = now;
    sheet.getRange(existingRow, 1, 1, WEEKLY_WORK_HISTORY_HEADERS.length).setValues([row]);
  } else sheet.appendRow(row);
  updateProjectContractorMilestoneDates_(ss, workData.projectId, milestoneDates);
  SpreadsheetApp.flush();
  return { ok: true, message: existingRow ? 'แก้ไขบันทึกการปฏิบัติงานเรียบร้อยแล้ว' : 'บันทึกประวัติบันทึกการปฏิบัติงานเรียบร้อยแล้ว', weeklyWorkId: weeklyWorkId };
}

/** ตรวจไม่ให้เหตุการณ์แจ้งลงงาน/แจ้งส่งมอบงานซ้ำในโครงการเดียวกัน */
function validateWeeklyWorkMilestones_(sheet, workData, weeklyWorkId) {
  const parseDays = function(value) {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) { return []; }
  };
  const typeOf = function(value) {
    const text = String(value || '').trim().replace(/\s+/g, '');
    if (text === 'ผู้รับจ้างแจ้งลงงาน') return 'notice';
    if (text === 'ผู้รับจ้างแจ้งส่งมอบงาน' || text === 'ผู้รับจ้างส่งมอบงาน') return 'handover';
    return '';
  };
  const collect = function(days) {
    const result = { notice: [], handover: [] };
    parseDays(days).forEach(function(day) {
      const date = String(day && day.date || '').trim();
      const entries = day && Array.isArray(day.entries) ? day.entries : [];
      entries.forEach(function(entry) {
        const type = typeOf(entry);
        if (type) result[type].push(date);
      });
    });
    return result;
  };
  const labels = { notice: 'ผู้รับจ้างแจ้งลงงาน', handover: 'ผู้รับจ้างแจ้งส่งมอบงาน' };
  const current = collect(workData.workDaysJson || '[]');
  ['notice', 'handover'].forEach(function(type) {
    if (current[type].length > 1) throw new Error(labels[type] + ' บันทึกได้เพียง 1 วันต่อโครงการ');
  });
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, WEEKLY_WORK_HISTORY_HEADERS.length).getDisplayValues();
    const idIndex = WEEKLY_WORK_HISTORY_HEADERS.indexOf('รหัสบันทึกการปฏิบัติงาน');
    const projectIndex = WEEKLY_WORK_HISTORY_HEADERS.indexOf('รหัสโครงการ');
    const weekIndex = WEEKLY_WORK_HISTORY_HEADERS.indexOf('สัปดาห์ที่');
    const daysIndex = WEEKLY_WORK_HISTORY_HEADERS.indexOf('วันทำงาน JSON');
    rows.forEach(function(row) {
      if (String(row[idIndex] || '').trim() === String(weeklyWorkId || '').trim()) return;
      if (String(row[projectIndex] || '').trim() !== String(workData.projectId || '').trim()) return;
      const existing = collect(row[daysIndex] || '[]');
      ['notice', 'handover'].forEach(function(type) {
        if (current[type].length && existing[type].length) {
          const week = String(row[weekIndex] || '').trim();
          throw new Error(labels[type] + ' ถูกบันทึกไว้แล้ว' + (week ? 'ในสัปดาห์ที่ ' + week : ''));
        }
      });
    });
  }
  return {
    contractorNoticeDate: current.notice[0] || '',
    contractorDeliveryDate: current.handover[0] || ''
  };
}

/** ส่งวันที่เหตุการณ์จากรายงานช่างกลับไปยังข้อมูลโครงการ */
function updateProjectContractorMilestoneDates_(ss, projectId, milestoneDates) {
  const rowNumber = Number(projectId || 0);
  if (!rowNumber || rowNumber < 2 || !milestoneDates) return false;
  if (!milestoneDates.contractorNoticeDate && !milestoneDates.contractorDeliveryDate) return false;
  const sheet = getProjectDataSheet_(ss);
  if (rowNumber > sheet.getLastRow()) return false;
  const lastColumn = Math.min(Math.max(sheet.getLastColumn(), 1), CONFIG.MAX_COLUMNS);
  const sampleRows = Math.min(sheet.getLastRow(), 50);
  const display = sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues();
  const headerIndex = CONFIG.HEADER_ROW > 0 ? CONFIG.HEADER_ROW - 1 : detectHeaderRow_(display);
  if (headerIndex < 0 || rowNumber <= headerIndex + 1) return false;
  const headers = sheet.getRange(headerIndex + 1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function(header, index) { return String(header || ('คอลัมน์ ' + (index + 1))).trim(); });
  const aliases = buildAliasIndex_(headers);
  const output = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];
  const before = output.slice();
  if (milestoneDates.contractorNoticeDate) {
    setOutputValue_(output, aliases, ['วันที่ผู้รับจ้างแจ้งลงงาน', 'วันที่แจ้งลงงาน', 'แจ้งลงงาน', 'วันแจ้งลงงาน'], milestoneDates.contractorNoticeDate);
  }
  if (milestoneDates.contractorDeliveryDate) {
    setOutputValue_(output, aliases, ['วันที่ผู้รับจ้างส่งมอบงาน', 'วันที่ส่งมอบงาน', 'ส่งมอบงาน', 'วันส่งมอบงาน'], milestoneDates.contractorDeliveryDate);
  }
  let changed = false;
  for (let col = 0; col < lastColumn; col++) {
    if (String(before[col] || '').trim() !== String(output[col] || '').trim()) {
      sheet.getRange(rowNumber, col + 1).setValue(output[col]);
      changed = true;
    }
  }
  return changed;
}

function getWeeklyWorkHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.WEEKLY_WORK_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.WEEKLY_WORK_HISTORY_SHEET_NAME);
  prepareWeeklyWorkHistorySheet_(sheet);
  return sheet;
}

function prepareWeeklyWorkHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = WEEKLY_WORK_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) { sheet.getRange(1, 1, 1, requiredLen).setValues([WEEKLY_WORK_HISTORY_HEADERS]); sheet.setFrozenRows(1); return; }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = WEEKLY_WORK_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([WEEKLY_WORK_HISTORY_HEADERS]);
  repairWeeklyWorkRowsAfterSupervisor2Insert_(sheet);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bbf7d0'); } catch (error) {}
}

function repairWeeklyWorkRowsAfterSupervisor2Insert_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = WEEKLY_WORK_HISTORY_HEADERS.length;
  if (lastRow <= 1) return;

  const idx = {};
  WEEKLY_WORK_HISTORY_HEADERS.forEach(function(header, index) { idx[header] = index; });

  const range = sheet.getRange(2, 1, lastRow - 1, requiredLen);
  const values = range.getValues();
  let changed = false;

  values.forEach(function(row) {
    const valueAtOldHtml = row[idx['เครื่องจักร JSON']];
    const valueAtHtmlColumn = row[idx['HTML บันทึกการปฏิบัติงาน']];

    if (isHistoryHtmlValue_(valueAtOldHtml) && !isHistoryHtmlValue_(valueAtHtmlColumn)) {
      const oldContractor = row[idx['ผู้ควบคุมงานคนที่ 2']];
      const oldWorkDays = row[idx['ผู้รับจ้าง/ตัวแทนผู้รับจ้าง']];
      const oldWeather = row[idx['วันทำงาน JSON']];
      const oldLabor = row[idx['สภาพอากาศ JSON']];
      const oldMachinery = row[idx['แรงงาน JSON']];
      const oldWorkHtml = row[idx['เครื่องจักร JSON']];
      const oldRoadKind = row[idx['HTML บันทึกการปฏิบัติงาน']];
      const oldCreatedBy = row[idx['ชนิดงานถนน']];
      const oldEditedBy = row[idx['สร้างโดย']];

      row[idx['ผู้ควบคุมงานคนที่ 2']] = '';
      row[idx['ผู้รับจ้าง/ตัวแทนผู้รับจ้าง']] = oldContractor || '';
      row[idx['วันทำงาน JSON']] = oldWorkDays || '';
      row[idx['สภาพอากาศ JSON']] = oldWeather || '';
      row[idx['แรงงาน JSON']] = oldLabor || '';
      row[idx['เครื่องจักร JSON']] = oldMachinery || '';
      row[idx['HTML บันทึกการปฏิบัติงาน']] = oldWorkHtml || '';
      row[idx['ชนิดงานถนน']] = oldRoadKind || '';
      row[idx['สร้างโดย']] = oldCreatedBy || '';
      row[idx['แก้ไขโดย']] = oldEditedBy || '';
      changed = true;
    }
  });

  if (changed) range.setValues(values);
}

function findWeeklyWorkHistoryRow_(sheet, weeklyWorkId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0] || '') === String(weeklyWorkId || '')) return i + 2;
  return 0;
}

function createWeeklyWorkHistoryId_() {
  return 'WORK-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}



function setupWeeklyPerformanceHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWeeklyPerformanceHistorySheet_(ss);
  return { ok: true, message: 'สร้าง/เตรียมชีทประวัติผลการดำเนินงานเรียบร้อย', sheetName: sheet.getName(), gid: sheet.getSheetId() };
}

function getWeeklyPerformanceHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWeeklyPerformanceHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, performances: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, WEEKLY_PERFORMANCE_HISTORY_HEADERS.length).getDisplayValues();
  const performances = values.map(function(row) {
    const obj = {};
    WEEKLY_PERFORMANCE_HISTORY_HEADERS.forEach(function(header, index) { obj[header] = row[index] || ''; });
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) { return Number(a['สัปดาห์ที่'] || 0) - Number(b['สัปดาห์ที่'] || 0); });
  return { ok: true, performances: performances };
}

function saveWeeklyPerformanceHistory(password, performanceData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!performanceData || !String(performanceData.projectId || '').trim()) throw new Error('ไม่พบรหัสโครงการ');
  if (!String(performanceData.weekNo || '').trim()) throw new Error('กรุณาเลือกสัปดาห์ที่');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getWeeklyPerformanceHistorySheet_(ss);
  const now = new Date();
  const weeklyPerformanceId = String(performanceData.weeklyPerformanceId || '').trim() || createWeeklyPerformanceHistoryId_();
  const rowObject = {
    'รหัสผลการดำเนินงาน': weeklyPerformanceId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': performanceData.projectId || '',
    'ชื่อโครงการ': performanceData.projectName || '',
    'สัปดาห์ที่': performanceData.weekNo || '',
    'วันที่เริ่มสัปดาห์': performanceData.periodStart || '',
    'วันที่สิ้นสุดสัปดาห์': performanceData.periodEnd || '',
    'ผู้ควบคุมงาน': performanceData.supervisor || '',
    'ผู้ควบคุมงานคนที่ 2': performanceData.supervisor2 || '',
    'หมายเหตุรวม': performanceData.summaryNote || '',
    'รายการผลการดำเนินงาน JSON': performanceData.rowsJson || '',
    'HTML ผลการดำเนินงาน': performanceData.performanceHtml || ''
  };
  const row = WEEKLY_PERFORMANCE_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  const existingRow = findWeeklyPerformanceHistoryRow_(sheet, weeklyPerformanceId);
  applyAuditToHistoryRow_(sheet, WEEKLY_PERFORMANCE_HISTORY_HEADERS, row, existingRow, performanceData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, WEEKLY_PERFORMANCE_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  SpreadsheetApp.flush();
  return { ok: true, message: existingRow ? 'แก้ไขผลการดำเนินงานเรียบร้อยแล้ว' : 'บันทึกประวัติผลการดำเนินงานเรียบร้อยแล้ว', weeklyPerformanceId: weeklyPerformanceId };
}

function getWeeklyPerformanceHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.WEEKLY_PERFORMANCE_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.WEEKLY_PERFORMANCE_HISTORY_SHEET_NAME);
  prepareWeeklyPerformanceHistorySheet_(sheet);
  return sheet;
}

function prepareWeeklyPerformanceHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = WEEKLY_PERFORMANCE_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([WEEKLY_PERFORMANCE_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = WEEKLY_PERFORMANCE_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([WEEKLY_PERFORMANCE_HISTORY_HEADERS]);
  repairWeeklyPerformanceRowsAfterSupervisor2Insert_(sheet);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bfdbfe'); } catch (error) {}
}

function repairWeeklyPerformanceRowsAfterSupervisor2Insert_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = WEEKLY_PERFORMANCE_HISTORY_HEADERS.length;
  if (lastRow <= 1) return;

  const idx = {};
  WEEKLY_PERFORMANCE_HISTORY_HEADERS.forEach(function(header, index) { idx[header] = index; });

  const range = sheet.getRange(2, 1, lastRow - 1, requiredLen);
  const values = range.getValues();
  let changed = false;

  values.forEach(function(row) {
    const valueAtRowsJson = row[idx['รายการผลการดำเนินงาน JSON']];
    const valueAtHtmlColumn = row[idx['HTML ผลการดำเนินงาน']];

    if (isHistoryHtmlValue_(valueAtRowsJson) && !isHistoryHtmlValue_(valueAtHtmlColumn)) {
      const oldSummaryNote = row[idx['ผู้ควบคุมงานคนที่ 2']];
      const oldRowsJson = row[idx['หมายเหตุรวม']];
      const oldPerformanceHtml = row[idx['รายการผลการดำเนินงาน JSON']];
      const oldCreatedBy = row[idx['HTML ผลการดำเนินงาน']];
      const oldEditedBy = row[idx['สร้างโดย']];

      row[idx['ผู้ควบคุมงานคนที่ 2']] = '';
      row[idx['หมายเหตุรวม']] = oldSummaryNote || '';
      row[idx['รายการผลการดำเนินงาน JSON']] = oldRowsJson || '';
      row[idx['HTML ผลการดำเนินงาน']] = oldPerformanceHtml || '';
      row[idx['สร้างโดย']] = oldCreatedBy || '';
      row[idx['แก้ไขโดย']] = oldEditedBy || '';
      changed = true;
    }
  });

  if (changed) range.setValues(values);
}

function findWeeklyPerformanceHistoryRow_(sheet, weeklyPerformanceId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(weeklyPerformanceId || '')) return i + 2;
  }
  return 0;
}

function createWeeklyPerformanceHistoryId_() {
  return 'PERF-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}






function setupSCurveHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSCurveHistorySheet_(ss);
  return { ok: true, message: 'สร้าง/เตรียมชีทประวัติ S-Curve เรียบร้อย', sheetName: sheet.getName(), gid: sheet.getSheetId() };
}

function getSCurveHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSCurveHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, sCurves: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, S_CURVE_HISTORY_HEADERS.length).getDisplayValues();
  const sCurves = values.map(function(row) {
    const obj = {};
    S_CURVE_HISTORY_HEADERS.forEach(function(header, index) { obj[header] = row[index] || ''; });
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) { return new Date(a['วันที่แก้ไข'] || a['วันที่สร้าง'] || 0) - new Date(b['วันที่แก้ไข'] || b['วันที่สร้าง'] || 0); });
  return { ok: true, sCurves: sCurves };
}

function saveSCurveHistory(password, sCurveData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!sCurveData || !String(sCurveData.projectId || '').trim()) throw new Error('ไม่พบรหัสโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSCurveHistorySheet_(ss);
  const now = new Date();
  const requestedSCurveId = String(sCurveData.sCurveId || '').trim();
  const projectHistoryRows = findHistoryRowsByProject_(sheet, S_CURVE_HISTORY_HEADERS, sCurveData.projectId);
  const existingRow = findSCurveHistoryRow_(sheet, requestedSCurveId) || (projectHistoryRows.length ? projectHistoryRows[projectHistoryRows.length - 1] : 0);
  const sCurveId = existingRow
    ? String(sheet.getRange(existingRow, 1).getDisplayValue() || requestedSCurveId)
    : (requestedSCurveId || createSCurveHistoryId_());
  const rowObject = {
    'รหัส S-Curve': sCurveId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': sCurveData.projectId || '',
    'ชื่อโครงการ': sCurveData.projectName || '',
    'วันที่เริ่มแผน': sCurveData.periodStart || '',
    'วันที่สิ้นสุดแผน': sCurveData.periodEnd || '',
    'จำนวนสัปดาห์': sCurveData.weekCount || '',
    'ผู้ควบคุมงาน': sCurveData.supervisor || '',
    'ผู้ควบคุมงานคนที่ 2': sCurveData.supervisor2 || '',
    'รายการ S-Curve JSON': sCurveData.rowsJson || '',
    'HTML S-Curve': sCurveData.sCurveHtml || ''
  };
  const row = S_CURVE_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  applyAuditToHistoryRow_(sheet, S_CURVE_HISTORY_HEADERS, row, existingRow, sCurveData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, S_CURVE_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  removeDuplicateHistoryRowsByProject_(sheet, S_CURVE_HISTORY_HEADERS, sCurveData.projectId, existingRow || sheet.getLastRow());
  SpreadsheetApp.flush();
  return { ok: true, message: existingRow ? 'บันทึกทับประวัติ S-Curve เดิมเรียบร้อยแล้ว' : 'บันทึกประวัติ S-Curve เรียบร้อยแล้ว', sCurveId: sCurveId };
}

function getSCurveHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.S_CURVE_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.S_CURVE_HISTORY_SHEET_NAME);
  prepareSCurveHistorySheet_(sheet);
  return sheet;
}

function prepareSCurveHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = S_CURVE_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([S_CURVE_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = S_CURVE_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([S_CURVE_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#fef3c7'); } catch (error) {}
}

function findSCurveHistoryRow_(sheet, sCurveId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(sCurveId || '')) return i + 2;
  }
  return 0;
}

function createSCurveHistoryId_() {
  return 'SCURVE-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function setupKValueHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getKValueHistorySheet_(ss);
  return { ok: true, message: 'สร้าง/เตรียมชีทประวัติคำนวณค่า K เรียบร้อย', sheetName: sheet.getName(), gid: sheet.getSheetId() };
}

/* ===== พรีวิวที่ผู้ใช้แก้ข้อความเอง (ใช้ร่วมกันทุกหน้า) ===== */
function getEditedPreviewHistorySheet_(ss) {
  const headers = ['ประเภทประวัติ', 'รหัสประวัติ', 'ลำดับส่วน', 'จำนวนส่วน', 'HTML พรีวิว', 'วันที่แก้ไข', 'ผู้แก้ไข'];
  let sheet = ss.getSheetByName('พรีวิวแก้ไข');
  if (!sheet) sheet = ss.insertSheet('พรีวิวแก้ไข');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function getEditedPreviewHistory(historyType, historyId) {
  const type = String(historyType || '').trim();
  const id = String(historyId || '').trim();
  if (!type || !id) return { ok: true, html: '' };
  const sheet = getEditedPreviewHistorySheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
  if (sheet.getLastRow() <= 1) return { ok: true, html: '' };
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getDisplayValues()
    .filter(function(row) { return String(row[0]) === type && String(row[1]) === id; })
    .sort(function(a, b) { return Number(a[2] || 0) - Number(b[2] || 0); });
  return { ok: true, html: rows.map(function(row) { return row[4] || ''; }).join('') };
}

function saveEditedPreviewHistory(password, previewData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  previewData = Object.assign({}, previewData || {});
  const type = String(previewData && previewData.historyType || '').trim();
  const id = String(previewData && previewData.historyId || '').trim();
  const html = String(previewData && previewData.html || '');
  if (!type || !id) throw new Error('ไม่พบประเภทหรือรหัสประวัติเอกสาร');
  if (!html) throw new Error('ไม่พบข้อความพรีวิวสำหรับบันทึก');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getEditedPreviewHistorySheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
    if (sheet.getLastRow() > 1) {
      const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
      const rowsToDelete = [];
      values.forEach(function(row, index) {
        if (String(row[0]) === type && String(row[1]) === id) rowsToDelete.push(index + 2);
      });
      rowsToDelete.sort(function(a, b) { return b - a; }).forEach(function(rowNumber) { sheet.deleteRow(rowNumber); });
    }
    const chunkSize = 45000;
    const chunks = [];
    for (let offset = 0; offset < html.length; offset += chunkSize) chunks.push(html.slice(offset, offset + chunkSize));
    const now = new Date();
    const editor = String(previewData.updatedBy || previewData.createdBy || '').trim();
    const rows = chunks.map(function(chunk, index) { return [type, id, index + 1, chunks.length, chunk, now, editor]; });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    SpreadsheetApp.flush();
    return { ok: true, message: 'บันทึกข้อความพรีวิวที่แก้ไขเรียบร้อยแล้ว', parts: chunks.length };
  } finally {
    lock.releaseLock();
  }
}

function getKValueHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getKValueHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, kValues: [] };
  const matches = sheet.getRange(2, 4, lastRow - 1, 1).createTextFinder(String(projectId || '')).matchEntireCell(true).findAll();
  if (!matches.length) return { ok: true, kValues: [] };
  const latestRow = Math.max.apply(null, matches.map(function(cell) { return cell.getRow(); }));
  const row = sheet.getRange(latestRow, 1, 1, K_VALUE_HISTORY_HEADERS.length).getDisplayValues()[0];
  const item = {};
  K_VALUE_HISTORY_HEADERS.forEach(function(header, index) { item[header] = row[index] || ''; });
  return { ok: true, kValues: [item] };
}

function saveKValueHistory(password, kValueData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!kValueData || !String(kValueData.projectId || '').trim()) throw new Error('ไม่พบรหัสโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getKValueHistorySheet_(ss);
  const now = new Date();
  const projectId = String(kValueData.projectId || '').trim();
  const projectMatches = sheet.getLastRow() > 1
    ? sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).createTextFinder(projectId).matchEntireCell(true).findAll().map(function(cell) { return cell.getRow(); })
    : [];
  let requestedRow = String(kValueData.kValueId || '').trim() ? findKValueHistoryRow_(sheet, kValueData.kValueId) : 0;
  if (requestedRow && String(sheet.getRange(requestedRow, 4).getDisplayValue() || '').trim() !== projectId) requestedRow = 0;
  const existingRow = requestedRow || (projectMatches.length ? Math.max.apply(null, projectMatches) : 0);
  const existingId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || '').trim() : '';
  const kValueId = existingId || String(kValueData.kValueId || '').trim() || createKValueHistoryId_();
  const rowObject = {
    'รหัสคำนวณค่า K': kValueId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': kValueData.projectId || '',
    'ชื่อโครงการ': kValueData.projectName || '',
    'งวดที่ส่งงาน': kValueData.workPeriod || '',
    'เดือนที่พิจารณาผล': kValueData.baseMonth || '',
    'เดือนที่ส่งมอบงาน': kValueData.deliveryMonth || '',
    'วันที่ส่งงาน': kValueData.deliveryDate || '',
    'วันที่พิจารณาผล': kValueData.considerDate || '',
    'ผู้คำนวณ': kValueData.calculatorName || '',
    'ผู้ตรวจ': kValueData.checkerName || '',
    'ดัชนี JSON': kValueData.indexJson || '',
    'รายการสูตร JSON': kValueData.rowsJson || '',
    'HTML คำนวณค่า K': kValueData.kValueHtml || ''
  };
  const row = K_VALUE_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  applyAuditToHistoryRow_(sheet, K_VALUE_HISTORY_HEADERS, row, existingRow, kValueData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, K_VALUE_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  // หนึ่งโครงการมีประวัติคำนวณค่า K เพียงรายการเดียว ลบรายการเก่าที่ซ้ำหลังบันทึกทับสำเร็จ
  projectMatches.filter(function(rowNumber) { return rowNumber !== existingRow; }).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
  });
  SpreadsheetApp.flush();
  return { ok: true, message: existingRow ? 'บันทึกทับประวัติคำนวณค่า K เดิมเรียบร้อยแล้ว' : 'บันทึกประวัติคำนวณค่า K เรียบร้อยแล้ว', kValueId: kValueId };
}

function getKValueHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.K_VALUE_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.K_VALUE_HISTORY_SHEET_NAME);
  prepareKValueHistorySheet_(sheet);
  return sheet;
}

function prepareKValueHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = K_VALUE_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([K_VALUE_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = K_VALUE_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([K_VALUE_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#dcfce7'); } catch (error) {}
}

function findKValueHistoryRow_(sheet, kValueId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(kValueId || '')) return i + 2;
  }
  return 0;
}

function createKValueHistoryId_() {
  return 'KVALUE-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function fetchKescalationIndexData(monthSlug) {
  const slug = String(monthSlug || 'latest').trim() || 'latest';
  const url = /^latest$/i.test(slug) ? 'https://kescalation.com/download/latest' : 'https://kescalation.com/download/' + encodeURIComponent(slug);
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Google Apps Script)' } });
  const html = response.getContentText('UTF-8') || '';
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const indexes = {};
  ['M','S','C','I','F','A','E','PE','PVC','G','AC','W','GIP'].forEach(function(code) {
    const reO = new RegExp(code + 'o\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)', 'i');
    const reT = new RegExp(code + 't\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)', 'i');
    const mo = clean.match(reO);
    const mt = clean.match(reT);
    if (mo || mt) indexes[code] = { o: mo ? mo[1] : '', t: mt ? mt[1] : '' };
  });
  return { ok: true, url: url, status: response.getResponseCode(), title: title, indexes: indexes, note: Object.keys(indexes).length ? 'ดึงข้อมูลได้บางส่วนจากหน้า Kescalation' : 'เปิดหน้า Kescalation ได้ แต่ไม่พบค่าดัชนีใน HTML ให้กรอกค่าดัชนีในฟอร์มตามหน้าเว็บ/ไฟล์ดาวน์โหลด' };
}
/**
 * ดึงดัชนีราคาเพื่อคำนวณค่า K จาก Open API ของสำนักงานนโยบายและยุทธศาสตร์การค้า (TPSO)
 * ใช้ฐานข้อมูลเดียวกับหน้า https://yotathai-k.vercel.app/ แต่เรียกผ่าน UrlFetchApp เพื่อเลี่ยงปัญหา CORS ใน Web App
 */
const TPSO_K_API_BASE_ = 'https://index-api.tpso.go.th';
const TPSO_K_YEAR_BASE_ = 2530;
const TPSO_K_FORMULA_INDEX_CODES_ = ['M', 'S', 'C', 'I', 'F', 'A', 'E', 'PE', 'PVC', 'G', 'AC', 'W', 'GIP'];

function fetchTpsoKIndexPairData(baseMonthSlug, deliveryMonthSlug) {
  const master = fetchTpsoKMasterData_();
  const range = getTpsoAvailableRange_(master);
  const baseRequested = normalizeTpsoKMonth_(baseMonthSlug || 'latest', master);
  const deliveryRequested = normalizeTpsoKMonth_(deliveryMonthSlug || baseMonthSlug || 'latest', master);
  const base = clampTpsoKMonthToAvailable_(baseRequested, master);
  const delivery = clampTpsoKMonthToAvailable_(deliveryRequested, master);

  const baseRows = fetchTpsoKMonthRows_(base.year, base.month, TPSO_K_FORMULA_INDEX_CODES_);
  const deliveryRows = fetchTpsoKMonthRows_(delivery.year, delivery.month, TPSO_K_FORMULA_INDEX_CODES_);
  const baseMap = mapTpsoKRowsToFormulaIndexes_(baseRows);
  const deliveryMap = mapTpsoKRowsToFormulaIndexes_(deliveryRows);

  const indexes = {};
  TPSO_K_FORMULA_INDEX_CODES_.forEach(function(code) {
    const o = baseMap[code] || '';
    const t = deliveryMap[code] || '';
    if (o || t) indexes[code] = { o: o, t: t };
  });

  const foundCodes = Object.keys(indexes);
  const adjustedNotes = [];
  if (!sameKMonth_(baseRequested, base)) {
    adjustedNotes.push('เดือนที่พิจารณาผลถูกปรับจาก ' + formatKMonthSlug_(baseRequested) + ' เป็น ' + formatKMonthSlug_(base));
  }
  if (!sameKMonth_(deliveryRequested, delivery)) {
    adjustedNotes.push('เดือนที่ส่งมอบงานถูกปรับจาก ' + formatKMonthSlug_(deliveryRequested) + ' เป็น ' + formatKMonthSlug_(delivery));
  }
  const latestNote = range && range.end ? 'ข้อมูล API ล่าสุดถึง ' + formatKMonthSlug_(range.end) : '';

  return {
    ok: true,
    source: 'TPSO Open API / Yotathai K-INDEX',
    requestedBaseMonth: formatKMonthSlug_(baseRequested),
    requestedDeliveryMonth: formatKMonthSlug_(deliveryRequested),
    baseMonth: formatKMonthSlug_(base),
    deliveryMonth: formatKMonthSlug_(delivery),
    latestMonth: range && range.end ? formatKMonthSlug_(range.end) : '',
    indexes: indexes,
    adjustedNote: adjustedNotes.join(' • '),
    note: foundCodes.length
      ? 'ดึงดัชนีจาก Open API กระทรวงพาณิชย์สำเร็จ (' + foundCodes.join(', ') + ')' + (latestNote ? ' • ' + latestNote : '')
      : 'เชื่อมต่อ Open API ได้ แต่ไม่พบรายการดัชนีที่ตรงกับ M/S/C/I/F/A/E/PE/PVC/G/AC/W/GIP ในเดือนที่เลือก' + (latestNote ? ' • ' + latestNote : '')
  };
}

function fetchTpsoKMasterData_() {
  const url = TPSO_K_API_BASE_ + '/OpenApi/K/Month/MasterData';
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'Accept': 'application/json' }
  });
  const code = response.getResponseCode();
  const text = response.getContentText('UTF-8') || '';
  if (code < 200 || code >= 300) throw new Error('TPSO MasterData HTTP ' + code + ': ' + text.slice(0, 180));
  return parseTpsoJson_(text, 'MasterData');
}

function fetchTpsoKMonthRows_(year, month, commodities) {
  const codes = Array.isArray(commodities) && commodities.length ? commodities : [];
  let rows = [];
  let data = postTpsoKMonth_(year, month, codes);
  flattenTpsoKRows_(data, rows, {});

  // สูตรชุดใหม่มีรหัสหลายตัว เช่น PE/PVC/G/AC/W/GIP บางเดือน API อาจไม่ตอบครบเมื่อส่งรหัสแบบเจาะจง
  // จึงดึงแบบไม่ระบุรหัสมารวมอีกครั้ง เพื่อให้ระบบตรวจจับจากชื่อดัชนีได้ด้วย
  if (codes.length) {
    try {
      const allData = postTpsoKMonth_(year, month, []);
      const allRows = [];
      flattenTpsoKRows_(allData, allRows, {});
      if (allRows.length) rows = rows.concat(allRows);
    } catch (error) {
      if (!rows.length) throw error;
    }
  }
  return rows;
}

function postTpsoKMonth_(year, month, commodities) {
  const url = TPSO_K_API_BASE_ + '/OpenApi/K/Month';
  const payload = {
    yearBase: TPSO_K_YEAR_BASE_,
    year: Number(year),
    month: Number(month),
    type: 'K',
    commodities: Array.isArray(commodities) ? commodities : []
  };
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'Accept': 'application/json' }
  });
  const code = response.getResponseCode();
  const text = response.getContentText('UTF-8') || '';
  if (code < 200 || code >= 300) throw new Error('TPSO Month HTTP ' + code + ' (' + year + '-' + month + '): ' + text.slice(0, 180));
  return parseTpsoJson_(text, 'Month ' + year + '-' + month);
}

function parseTpsoJson_(text, label) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('TPSO ส่งข้อมูลว่างกลับมา' + (label ? ' (' + label + ')' : ''));
  if (raw.charAt(0) === '<') throw new Error('TPSO ส่ง HTML กลับมาแทน JSON' + (label ? ' (' + label + ')' : ''));
  try { return JSON.parse(raw); }
  catch (error) { throw new Error('อ่านข้อมูล JSON จาก TPSO ไม่สำเร็จ' + (label ? ' (' + label + ')' : '') + ': ' + error.message); }
}

function normalizeTpsoKMonth_(value, master) {
  let s = String(value || '').trim();
  if (!s || /^latest$/i.test(s) || s === 'ล่าสุด') return getTpsoLatestMonth_(master);
  s = s.replace(/[๐-๙]/g, function(ch) { return '๐๑๒๓๔๕๖๗๘๙'.indexOf(ch); });
  const m = s.match(/(\d{4})\s*[-\/]\s*(\d{1,2})/);
  if (m) {
    let y = Number(m[1]);
    const mo = Math.max(1, Math.min(12, Number(m[2]) || 1));
    if (y < 2400) y += 543;
    return { year: y, month: mo };
  }
  const d = parseThaiMonthText_(s);
  if (d) return d;
  return getTpsoLatestMonth_(master);
}

function parseThaiMonthText_(text) {
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const s = String(text || '').trim();
  for (let i = 0; i < months.length; i++) {
    if (s.indexOf(months[i]) !== -1) {
      const yMatch = s.match(/(25\d{2}|20\d{2}|19\d{2})/);
      if (yMatch) {
        let y = Number(yMatch[1]);
        if (y < 2400) y += 543;
        return { year: y, month: i + 1 };
      }
    }
  }
  return null;
}

function getTpsoAvailableRange_(master) {
  const periods = [];
  collectTpsoPeriods_(master, periods);
  periods.sort(function(a, b) { return (a.year * 100 + a.month) - (b.year * 100 + b.month); });
  if (!periods.length) return null;
  return { start: periods[0], end: periods[periods.length - 1] };
}

function getTpsoLatestMonth_(master) {
  const range = getTpsoAvailableRange_(master);
  if (range && range.end) return { year: range.end.year, month: range.end.month };
  const now = new Date();
  return { year: now.getFullYear() + 543, month: now.getMonth() + 1 };
}

function clampTpsoKMonthToAvailable_(monthObj, master) {
  const range = getTpsoAvailableRange_(master);
  const m = { year: Number(monthObj && monthObj.year) || 0, month: Number(monthObj && monthObj.month) || 0 };
  if (!range || !range.start || !range.end || !m.year || !m.month) return m;
  if (compareKMonth_(m, range.start) < 0) return { year: range.start.year, month: range.start.month };
  if (compareKMonth_(m, range.end) > 0) return { year: range.end.year, month: range.end.month };
  return m;
}

function compareKMonth_(a, b) {
  return (Number(a.year) * 100 + Number(a.month)) - (Number(b.year) * 100 + Number(b.month));
}

function sameKMonth_(a, b) {
  return Number(a && a.year) === Number(b && b.year) && Number(a && a.month) === Number(b && b.month);
}

function formatKMonthSlug_(m) {
  if (!m || !m.year || !m.month) return '';
  return String(m.year) + '-' + String(m.month).padStart(2, '0');
}

function collectTpsoPeriods_(node, out) {
  if (!node) return;
  if (Array.isArray(node)) { node.forEach(function(x) { collectTpsoPeriods_(x, out); }); return; }
  if (typeof node !== 'object') return;
  if (Array.isArray(node.dataAvailablePeriods)) {
    node.dataAvailablePeriods.forEach(function(p) { collectTpsoPeriods_(p, out); });
  }
  const endYear = Number(node.endYear || (node.end && node.end.year) || 0);
  const endMonth = Number(node.endPeriod || node.endMonth || (node.end && (node.end.month || node.end.period)) || 0);
  const startYear = Number(node.startYear || (node.start && node.start.year) || 0);
  const startMonth = Number(node.startPeriod || node.startMonth || (node.start && (node.start.month || node.start.period)) || 0);
  if (startYear && startMonth) out.push({ year: startYear, month: startMonth });
  if (endYear && endMonth) out.push({ year: endYear, month: endMonth });
  Object.keys(node).forEach(function(key) {
    if (key !== 'commodities' && key !== 'children' && key !== 'dataAvailablePeriods') collectTpsoPeriods_(node[key], out);
  });
}

function flattenTpsoKRows_(node, out, inherited) {
  inherited = inherited || {};
  if (!node) return;
  if (Array.isArray(node)) { node.forEach(function(x) { flattenTpsoKRows_(x, out, inherited); }); return; }
  if (typeof node !== 'object') return;
  const own = {
    type: node.type || inherited.type || '',
    typeName: node.typeName || node.typeNameTH || inherited.typeName || '',
    commodityCode: node.commodityCode || node.code || inherited.commodityCode || '',
    commodityNameTH: node.commodityNameTH || node.name || node.commodityName || inherited.commodityNameTH || ''
  };
  const indexValue = node.index !== undefined ? node.index : (node.indexAVG !== undefined ? node.indexAVG : (node.averageIndex !== undefined ? node.averageIndex : node.value));
  if (indexValue !== undefined && indexValue !== null && String(indexValue).trim() !== '') {
    out.push({
      type: own.type,
      typeName: own.typeName,
      commodityCode: own.commodityCode,
      commodityNameTH: own.commodityNameTH,
      index: indexValue,
      year: node.year || inherited.year || '',
      month: node.month || inherited.month || ''
    });
  }
  if (Array.isArray(node.months)) node.months.forEach(function(m) { flattenTpsoKRows_(m, out, own); });
  if (Array.isArray(node.years)) node.years.forEach(function(y) { flattenTpsoKRows_(y, out, own); });
  if (Array.isArray(node.children)) node.children.forEach(function(c) { flattenTpsoKRows_(c, out, own); });
  if (Array.isArray(node.data)) flattenTpsoKRows_(node.data, out, own);
  if (Array.isArray(node.result)) flattenTpsoKRows_(node.result, out, own);
  if (Array.isArray(node.items)) flattenTpsoKRows_(node.items, out, own);
}

function mapTpsoKRowsToFormulaIndexes_(rows) {
  const map = {};
  (rows || []).forEach(function(row) {
    const code = detectKFormulaIndexCode_(row);
    const value = normalizeTpsoIndexValue_(row.index);
    if (code && value && !map[code]) map[code] = value;
  });
  return map;
}

function normalizeTpsoIndexValue_(value) {
  const n = Number(String(value || '').replace(/,/g, '').trim());
  return isFinite(n) ? String(Math.round(n * 1000) / 1000) : '';
}

function detectKFormulaIndexCode_(row) {
  const rawCode = String(row && row.commodityCode || '').trim().toUpperCase();
  if (/^(M|S|C|I|F|A|E|PE|PVC|G|AC|W|GIP)$/.test(rawCode)) return rawCode;
  const name = normalizeThaiForMatch_([
    row && row.commodityCode,
    row && row.commodityNameTH,
    row && row.typeName,
    row && row.typeNameTH
  ].join(' '));
  if (!name) return '';
  if (name.indexOf('ท่อเหล็กอาบสังกะสี') !== -1 || name.indexOf('ท่อเหล็กชุบสังกะสี') !== -1 || name.indexOf('gip') !== -1 || name.indexOf('galvanized') !== -1) return 'GIP';
  if (name.indexOf('ท่อซีเมนต์ใยหิน') !== -1 || name.indexOf('ซีเมนต์ใยหิน') !== -1 || name.indexOf('asbestoscement') !== -1) return 'AC';
  if (name.indexOf('ท่อpvc') !== -1 || name.indexOf('พีวีซี') !== -1 || name.indexOf('pvc') !== -1) return 'PVC';
  if (name.indexOf('ท่อhdpe') !== -1 || name.indexOf('hydensity') !== -1 || name.indexOf('highdensity') !== -1 || name.indexOf('polyethylene') !== -1 || name.indexOf('โพลีเอทิลีน') !== -1 || name.indexOf('pe') !== -1) return 'PE';
  if (name.indexOf('สายไฟ') !== -1 || name.indexOf('สายไฟฟ้า') !== -1 || name.indexOf('wire') !== -1 || name.indexOf('cable') !== -1) return 'W';
  if (name.indexOf('เหล็กแผ่นเรียบ') !== -1 || name.indexOf('แผ่นเรียบ') !== -1) return 'G';
  if (name.indexOf('แอสฟัลท์') !== -1 || name.indexOf('ยางมะตอย') !== -1) return 'A';
  if (name.indexOf('น้ำมันดีเซล') !== -1 || name.indexOf('ดีเซลหมุนเร็ว') !== -1) return 'F';
  if (name.indexOf('เครื่องจักร') !== -1 || name.indexOf('บริภัณฑ์') !== -1) return 'E';
  if (name.indexOf('ผู้บริโภค') !== -1) return 'I';
  if (name.indexOf('ซีเมนต์') !== -1 || name.indexOf('ซิเมนต์') !== -1) return 'C';
  if (name.indexOf('เหล็ก') !== -1 && name.indexOf('แผ่นเรียบ') === -1 && name.indexOf('ท่อ') === -1) return 'S';
  if (name.indexOf('วัสดุก่อสร้าง') !== -1 && (name.indexOf('ไม่รวมเหล็ก') !== -1 || name.indexOf('ไม่รวม') !== -1)) return 'M';
  return '';
}

function normalizeThaiForMatch_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/\s+/g, '')
    .replace(/และ/g, '')
    .trim();
}





function setupProjectSignHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectSignHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติป้ายโครงการเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: PROJECT_SIGN_HISTORY_HEADERS
  };
}

function getProjectSignHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectSignHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, signs: [] };

  const values = sheet.getRange(2, 1, lastRow - 1, PROJECT_SIGN_HISTORY_HEADERS.length).getDisplayValues();
  const signs = values.map(function(row) {
    const obj = {};
    PROJECT_SIGN_HISTORY_HEADERS.forEach(function(header, index) {
      obj[header] = row[index] || '';
    });
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) {
    const da = new Date(a['วันที่แก้ไข'] || a['วันที่สร้าง'] || 0).getTime() || 0;
    const db = new Date(b['วันที่แก้ไข'] || b['วันที่สร้าง'] || 0).getTime() || 0;
    return db - da;
  });

  return { ok: true, signs: signs };
}

function saveProjectSignHistory(password, signData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!signData || !String(signData.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectSignHistorySheet_(ss);
  const now = new Date();
  const requestedProjectSignId = String(signData.projectSignId || '').trim();
  const projectHistoryRows = findHistoryRowsByProject_(sheet, PROJECT_SIGN_HISTORY_HEADERS, signData.projectId);
  const existingRow = findProjectSignHistoryRow_(sheet, requestedProjectSignId) || (projectHistoryRows.length ? projectHistoryRows[projectHistoryRows.length - 1] : 0);
  const projectSignId = existingRow
    ? String(sheet.getRange(existingRow, 1).getDisplayValue() || requestedProjectSignId)
    : (requestedProjectSignId || createProjectSignHistoryId_());

  const rowObject = {
    'รหัสป้ายโครงการ': projectSignId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': signData.projectId || '',
    'ชื่อโครงการ': signData.projectName || '',
    'ข้อความหัวป้าย / หน่วยงาน': signData.agencyName || '',
    'ผู้แทนผู้รับจ้าง / โดย': signData.contractorRep || '',
    'HTML ป้ายโครงการ': signData.signHtml || ''
  };

  const row = PROJECT_SIGN_HISTORY_HEADERS.map(function(header) {
    return rowObject[header] === undefined ? '' : rowObject[header];
  });
  applyAuditToHistoryRow_(sheet, PROJECT_SIGN_HISTORY_HEADERS, row, existingRow, signData);

  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, PROJECT_SIGN_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  removeDuplicateHistoryRowsByProject_(sheet, PROJECT_SIGN_HISTORY_HEADERS, signData.projectId, existingRow || sheet.getLastRow());

  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'บันทึกทับประวัติป้ายโครงการเดิมเรียบร้อยแล้ว' : 'บันทึกประวัติป้ายโครงการเรียบร้อยแล้ว',
    projectSignId: projectSignId
  };
}

function getProjectSignHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.PROJECT_SIGN_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.PROJECT_SIGN_HISTORY_SHEET_NAME);
  prepareProjectSignHistorySheet_(sheet);
  return sheet;
}

function prepareProjectSignHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = PROJECT_SIGN_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([PROJECT_SIGN_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  const firstRequiredMatch = PROJECT_SIGN_HISTORY_HEADERS.every(function(header, index) {
    return String(currentHeaders[index] || '').trim() === header;
  });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([PROJECT_SIGN_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bbf7d0');
  } catch (error) {}
}

function findProjectSignHistoryRow_(sheet, projectSignId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(projectSignId || '')) return i + 2;
  }
  return 0;
}

function createProjectSignHistoryId_() {
  return 'SIGN-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function setupCompletionReportHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCompletionReportHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติรายงานผลแล้วเสร็จ 100% เรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: COMPLETION_REPORT_HISTORY_HEADERS
  };
}

function getCompletionReportHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCompletionReportHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, reports: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, COMPLETION_REPORT_HISTORY_HEADERS.length).getDisplayValues();
  const reports = values.map(function(row) {
    const obj = {};
    COMPLETION_REPORT_HISTORY_HEADERS.forEach(function(header, index) {
      obj[header] = row[index] || '';
    });
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) {
    const da = new Date(a['วันที่แก้ไข'] || a['วันที่สร้าง'] || 0).getTime() || 0;
    const db = new Date(b['วันที่แก้ไข'] || b['วันที่สร้าง'] || 0).getTime() || 0;
    return db - da;
  });
  return { ok: true, reports: reports };
}

function saveCompletionReportHistory(password, reportData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!reportData || !String(reportData.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCompletionReportHistorySheet_(ss);
  const now = new Date();
  const requestedCompletionReportId = String(reportData.completionReportId || '').trim();
  const projectHistoryRows = findHistoryRowsByProject_(sheet, COMPLETION_REPORT_HISTORY_HEADERS, reportData.projectId);
  const existingRow = findCompletionReportHistoryRow_(sheet, requestedCompletionReportId) || (projectHistoryRows.length ? projectHistoryRows[projectHistoryRows.length - 1] : 0);
  const completionReportId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || requestedCompletionReportId) : (requestedCompletionReportId || createCompletionReportHistoryId_());
  const rowObject = {
    'รหัสรายงานผลแล้วเสร็จ 100%': completionReportId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': reportData.projectId || '',
    'ชื่อโครงการ': reportData.projectName || '',
    'เลขบันทึก': reportData.memoNo || '',
    'วันที่ทำบันทึก': reportData.memoDate || '',
    'วันที่ผู้รับจ้างส่งมอบงาน': reportData.deliveryDate || '',
    'เรียน': reportData.memoTo || '',
    'ผู้ควบคุมงาน': reportData.supervisor || '',
    'ผู้ควบคุมงานคนที่ 2': reportData.supervisor2 || '',
    'HTML รายงานผลแล้วเสร็จ 100%': reportData.reportHtml || '',
    'ข้อมูลคนลงนาม JSON': reportData.signersJson || ''
  };
  const row = COMPLETION_REPORT_HISTORY_HEADERS.map(function(header) {
    return rowObject[header] === undefined ? '' : rowObject[header];
  });
  applyAuditToHistoryRow_(sheet, COMPLETION_REPORT_HISTORY_HEADERS, row, existingRow, reportData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, COMPLETION_REPORT_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  removeDuplicateHistoryRowsByProject_(sheet, COMPLETION_REPORT_HISTORY_HEADERS, reportData.projectId, existingRow || sheet.getLastRow());
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขประวัติรายงานผลแล้วเสร็จ 100% เรียบร้อยแล้ว' : 'บันทึกประวัติรายงานผลแล้วเสร็จ 100% เรียบร้อยแล้ว',
    completionReportId: completionReportId
  };
}

function getCompletionReportHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.COMPLETION_REPORT_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.COMPLETION_REPORT_HISTORY_SHEET_NAME);
  prepareCompletionReportHistorySheet_(sheet);
  return sheet;
}

function prepareCompletionReportHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = COMPLETION_REPORT_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([COMPLETION_REPORT_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  const firstRequiredMatch = COMPLETION_REPORT_HISTORY_HEADERS.every(function(header, index) {
    return String(currentHeaders[index] || '').trim() === header;
  });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([COMPLETION_REPORT_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#fecaca');
  } catch (error) {}
}

function findCompletionReportHistoryRow_(sheet, completionReportId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(completionReportId || '')) return i + 2;
  }
  return 0;
}

function createCompletionReportHistoryId_() {
  return 'COMP-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}


function setupContractorNoticeHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getContractorNoticeHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติแจ้งให้ผู้รับจ้างเข้าดำเนินการเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: CONTRACTOR_NOTICE_HISTORY_HEADERS
  };
}

function getContractorNoticeHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getContractorNoticeHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, notices: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, CONTRACTOR_NOTICE_HISTORY_HEADERS.length).getDisplayValues();
  const notices = values.map(function(row) {
    const obj = {};
    CONTRACTOR_NOTICE_HISTORY_HEADERS.forEach(function(header, index) {
      obj[header] = row[index] || '';
    });
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) {
    const da = new Date(a['วันที่แก้ไข'] || a['วันที่สร้าง'] || 0).getTime() || 0;
    const db = new Date(b['วันที่แก้ไข'] || b['วันที่สร้าง'] || 0).getTime() || 0;
    return db - da;
  });
  return { ok: true, notices: notices };
}

function saveContractorNoticeHistory(password, noticeData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!noticeData || !String(noticeData.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getContractorNoticeHistorySheet_(ss);
  const now = new Date();
  const requestedContractorNoticeId = String(noticeData.contractorNoticeId || '').trim();
  const projectHistoryRows = findHistoryRowsByProject_(sheet, CONTRACTOR_NOTICE_HISTORY_HEADERS, noticeData.projectId);
  const existingRow = findContractorNoticeHistoryRow_(sheet, requestedContractorNoticeId) || (projectHistoryRows.length ? projectHistoryRows[projectHistoryRows.length - 1] : 0);
  const contractorNoticeId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || requestedContractorNoticeId) : (requestedContractorNoticeId || createContractorNoticeHistoryId_());
  const rowObject = {
    'รหัสแจ้งผู้รับจ้าง': contractorNoticeId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': noticeData.projectId || '',
    'ชื่อโครงการ': noticeData.projectName || '',
    'เลขบันทึก': noticeData.memoNo || '',
    'วันที่ทำบันทึก': noticeData.memoDate || '',
    'เรียน': noticeData.memoTo || '',
    'ผู้ควบคุมงาน': noticeData.supervisor || '',
    'ผู้ควบคุมงานคนที่ 2': noticeData.supervisor2 || '',
    'ความก้าวหน้าประมาณ': normalizeProjectProgressWhole_(noticeData.progressPercent || 0),
    'งานที่แล้วเสร็จ': noticeData.completedItems || '',
    'งานที่ยังไม่ได้ดำเนินการ': noticeData.pendingItems || '',
    'HTML แจ้งผู้รับจ้าง': noticeData.noticeHtml || '',
    'ข้อมูลคนลงนาม JSON': noticeData.signersJson || ''
  };
  const row = CONTRACTOR_NOTICE_HISTORY_HEADERS.map(function(header) {
    return rowObject[header] === undefined ? '' : rowObject[header];
  });
  applyAuditToHistoryRow_(sheet, CONTRACTOR_NOTICE_HISTORY_HEADERS, row, existingRow, noticeData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, CONTRACTOR_NOTICE_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  removeDuplicateHistoryRowsByProject_(sheet, CONTRACTOR_NOTICE_HISTORY_HEADERS, noticeData.projectId, existingRow || sheet.getLastRow());
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขประวัติแจ้งให้ผู้รับจ้างเข้าดำเนินการเรียบร้อยแล้ว' : 'บันทึกประวัติแจ้งให้ผู้รับจ้างเข้าดำเนินการเรียบร้อยแล้ว',
    contractorNoticeId: contractorNoticeId
  };
}

function getContractorNoticeHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.CONTRACTOR_NOTICE_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.CONTRACTOR_NOTICE_HISTORY_SHEET_NAME);
  prepareContractorNoticeHistorySheet_(sheet);
  return sheet;
}

function prepareContractorNoticeHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = CONTRACTOR_NOTICE_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([CONTRACTOR_NOTICE_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  const firstRequiredMatch = CONTRACTOR_NOTICE_HISTORY_HEADERS.every(function(header, index) {
    return String(currentHeaders[index] || '').trim() === header;
  });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([CONTRACTOR_NOTICE_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#fed7aa');
  } catch (error) {}
}

function findContractorNoticeHistoryRow_(sheet, contractorNoticeId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(contractorNoticeId || '')) return i + 2;
  }
  return 0;
}

function createContractorNoticeHistoryId_() {
  return 'NOTICE-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function deleteContractorNoticeHistory(contractorNoticeId) {
  return deleteHistoryRowById_(CONFIG.CONTRACTOR_NOTICE_HISTORY_SHEET_NAME, CONTRACTOR_NOTICE_HISTORY_HEADERS, contractorNoticeId, 'ประวัติแจ้งให้ผู้รับจ้างเข้าดำเนินการ');
}

function deleteContractorNoticeHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.CONTRACTOR_NOTICE_HISTORY_SHEET_NAME, CONTRACTOR_NOTICE_HISTORY_HEADERS, projectId, 'ประวัติแจ้งให้ผู้รับจ้างเข้าดำเนินการ');
}

function deleteTestResultHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.TEST_RESULT_HISTORY_SHEET_NAME, TEST_RESULT_HISTORY_HEADERS, projectId, 'ประวัติผลทดสอบ');
}

function deleteProjectSignHistory(projectSignId) {
  return deleteHistoryRowById_(CONFIG.PROJECT_SIGN_HISTORY_SHEET_NAME, PROJECT_SIGN_HISTORY_HEADERS, projectSignId, 'ประวัติป้ายโครงการ');
}

function deleteTorDraftHistory(torDraftId) {
  return deleteHistoryRowById_(CONFIG.TOR_DRAFT_HISTORY_SHEET_NAME, TOR_DRAFT_HISTORY_HEADERS, torDraftId, 'ประวัติร่าง TOR');
}

function deleteTestResultHistory(testResultId) {
  return deleteHistoryRowById_(CONFIG.TEST_RESULT_HISTORY_SHEET_NAME, TEST_RESULT_HISTORY_HEADERS, testResultId, 'ประวัติผลทดสอบ');
}

function deleteCompensationHistory(compensationId) {
  return deleteHistoryRowById_(CONFIG.COMPENSATION_HISTORY_SHEET_NAME, COMPENSATION_HISTORY_HEADERS, compensationId, 'ประวัติเบิกค่าตอบแทน');
}

function deleteCentralPriceHistory(centralPriceId) {
  return deleteHistoryRowById_(CONFIG.CENTRAL_PRICE_HISTORY_SHEET_NAME, CENTRAL_PRICE_HISTORY_HEADERS, centralPriceId, 'ประวัติกำหนดราคากลาง');
}

function deleteCompensationHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.COMPENSATION_HISTORY_SHEET_NAME, COMPENSATION_HISTORY_HEADERS, projectId, 'ประวัติเบิกค่าตอบแทน');
}


function deleteCompletionReportHistory(completionReportId) {
  return deleteHistoryRowById_(CONFIG.COMPLETION_REPORT_HISTORY_SHEET_NAME, COMPLETION_REPORT_HISTORY_HEADERS, completionReportId, 'ประวัติรายงานผลแล้วเสร็จ 100%');
}

function deleteProjectSignHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.PROJECT_SIGN_HISTORY_SHEET_NAME, PROJECT_SIGN_HISTORY_HEADERS, projectId, 'ประวัติป้ายโครงการ');
}

function deleteCompletionReportHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.COMPLETION_REPORT_HISTORY_SHEET_NAME, COMPLETION_REPORT_HISTORY_HEADERS, projectId, 'ประวัติรายงานผลแล้วเสร็จ 100%');
}

function deleteMemoHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.MEMO_HISTORY_SHEET_NAME, MEMO_HISTORY_HEADERS, projectId, 'ประวัติบันทึกข้อความ');
}

function deleteWeeklyWorkHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.WEEKLY_WORK_HISTORY_SHEET_NAME, WEEKLY_WORK_HISTORY_HEADERS, projectId, 'ประวัติบันทึกการปฏิบัติงาน');
}

function deleteWeeklyPerformanceHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.WEEKLY_PERFORMANCE_HISTORY_SHEET_NAME, WEEKLY_PERFORMANCE_HISTORY_HEADERS, projectId, 'ประวัติผลการดำเนินงาน');
}

function deleteSCurveHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.S_CURVE_HISTORY_SHEET_NAME, S_CURVE_HISTORY_HEADERS, projectId, 'ประวัติ S-Curve');
}

function deleteKValueHistoriesByProject(projectId) {
  return deleteHistoryRowsByProject_(CONFIG.K_VALUE_HISTORY_SHEET_NAME, K_VALUE_HISTORY_HEADERS, projectId, 'ประวัติคำนวณค่า K');
}

function deleteMemoHistory(memoId) {
  return deleteHistoryRowById_(CONFIG.MEMO_HISTORY_SHEET_NAME, MEMO_HISTORY_HEADERS, memoId, 'ประวัติบันทึกข้อความ');
}

function deleteWeeklyWorkHistory(weeklyWorkId) {
  return deleteHistoryRowById_(CONFIG.WEEKLY_WORK_HISTORY_SHEET_NAME, WEEKLY_WORK_HISTORY_HEADERS, weeklyWorkId, 'ประวัติบันทึกการปฏิบัติงาน');
}

function deleteWeeklyPerformanceHistory(weeklyPerformanceId) {
  return deleteHistoryRowById_(CONFIG.WEEKLY_PERFORMANCE_HISTORY_SHEET_NAME, WEEKLY_PERFORMANCE_HISTORY_HEADERS, weeklyPerformanceId, 'ประวัติผลการดำเนินงาน');
}

function deleteSCurveHistory(sCurveId) {
  return deleteHistoryRowById_(CONFIG.S_CURVE_HISTORY_SHEET_NAME, S_CURVE_HISTORY_HEADERS, sCurveId, 'ประวัติ S-Curve');
}

function deleteKValueHistory(kValueId) {
  return deleteHistoryRowById_(CONFIG.K_VALUE_HISTORY_SHEET_NAME, K_VALUE_HISTORY_HEADERS, kValueId, 'ประวัติคำนวณค่า K');
}

function deleteHistoryRowById_(sheetName, headers, historyId, label) {
  const targetId = String(historyId || '').trim();
  if (!targetId) throw new Error('ไม่พบรหัสประวัติสำหรับลบ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีท ' + label);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error('ไม่มีประวัติให้ลบ');
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === targetId) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return { ok: true, deleted: 1, message: 'ลบ' + label + 'เรียบร้อยแล้ว' };
    }
  }
  throw new Error('ไม่พบประวัติที่เลือก');
}

function deleteHistoryRowsByProject_(sheetName, headers, projectId, label) {
  const targetId = String(projectId || '').trim();
  if (!targetId) throw new Error('ไม่พบรหัสโครงการสำหรับลบประวัติ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { ok: true, deleted: 0, message: 'ไม่พบชีท ' + label };
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, deleted: 0, message: 'ไม่มีประวัติให้ลบ' };
  const requiredLen = headers.length;
  const values = sheet.getRange(2, 1, lastRow - 1, requiredLen).getDisplayValues();
  const projectCol = headers.indexOf('รหัสโครงการ');
  if (projectCol < 0) throw new Error('ไม่พบคอลัมน์รหัสโครงการใน ' + label);
  let deleted = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][projectCol] || '').trim() === targetId) {
      sheet.deleteRow(i + 2);
      deleted++;
    }
  }
  SpreadsheetApp.flush();
  return { ok: true, deleted: deleted, message: 'ลบ' + label + 'จำนวน ' + deleted + ' รายการแล้ว' };
}

function findHistoryRowsByProject_(sheet, headers, projectId) {
  const targetId = String(projectId || '').trim();
  const lastRow = sheet.getLastRow();
  const projectCol = headers.indexOf('รหัสโครงการ');
  if (!targetId || lastRow <= 1 || projectCol < 0) return [];
  const values = sheet.getRange(2, projectCol + 1, lastRow - 1, 1).getDisplayValues();
  const rows = [];
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === targetId) rows.push(i + 2);
  }
  return rows;
}

function removeDuplicateHistoryRowsByProject_(sheet, headers, projectId, keepRow) {
  const rows = findHistoryRowsByProject_(sheet, headers, projectId);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i] !== keepRow) sheet.deleteRow(rows[i]);
  }
}


function setupCentralPriceHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCentralPriceHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติกำหนดราคากลางเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: CENTRAL_PRICE_HISTORY_HEADERS
  };
}

function getCentralPriceHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCentralPriceHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, histories: [] };
  const range = sheet.getRange(2, 1, lastRow - 1, CENTRAL_PRICE_HISTORY_HEADERS.length);
  const displayValues = range.getDisplayValues();
  const rawValues = range.getValues();
  const histories = displayValues.map(function(row, rowIndex) {
    const obj = {};
    CENTRAL_PRICE_HISTORY_HEADERS.forEach(function(header, index) { obj[header] = row[index] || ''; });
    const rawUpdated = rawValues[rowIndex][2];
    const rawCreated = rawValues[rowIndex][1];
    obj.__sortTime = rawUpdated instanceof Date
      ? rawUpdated.getTime()
      : (rawCreated instanceof Date ? rawCreated.getTime() : rowIndex);
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) {
    return Number(b.__sortTime || 0) - Number(a.__sortTime || 0);
  }).map(function(item) {
    delete item.__sortTime;
    return item;
  });
  return { ok: true, histories: histories };
}

function saveCentralPriceHistory(password, centralData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!centralData || !String(centralData.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCentralPriceHistorySheet_(ss);
  const now = new Date();
  const matchingRows = findCentralPriceHistoryRowsByProject_(sheet, centralData.projectId);
  let existingRow = matchingRows.length ? matchingRows[matchingRows.length - 1] : 0;
  matchingRows.slice(0, -1).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
    if (rowNumber < existingRow) existingRow--;
  });
  const storedId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || '').trim() : '';
  const centralPriceId = storedId || String(centralData.centralPriceId || '').trim() || createCentralPriceHistoryId_();
  const rowObject = {
    'รหัสกำหนดราคากลาง': centralPriceId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': centralData.projectId || '',
    'ชื่อโครงการ': centralData.projectName || '',
    'วันที่ประชุม': centralData.meetingDate || '',
    'ราคากลาง': centralData.amountText || '',
    'เลขบันทึกรายงานผล': centralData.reportMemoNo || '',
    'เลขบันทึกเชิญประชุม': centralData.inviteMemoNo || '',
    'ข้อมูลราคากลาง JSON': centralData.dataJson || '',
    'HTML รายงานผล': centralData.reportHtml || '',
    'HTML เชิญประชุม': centralData.inviteHtml || '',
    'HTML รายงานการประชุม': centralData.meetingHtml || '',
    'HTML ตารางวงเงิน': centralData.budgetTableHtml || ''
  };
  const row = CENTRAL_PRICE_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  applyAuditToHistoryRow_(sheet, CENTRAL_PRICE_HISTORY_HEADERS, row, existingRow, centralData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, CENTRAL_PRICE_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  updateProjectCommitteeMemoryFromCentralPrice_(ss, centralData);
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขประวัติกำหนดราคากลางเรียบร้อยแล้ว' : 'บันทึกประวัติกำหนดราคากลางเรียบร้อยแล้ว',
    centralPriceId: centralPriceId
  };
}

function findCentralPriceHistoryRowsByProject_(sheet, projectId) {
  const target = String(projectId || '').trim();
  const lastRow = sheet.getLastRow();
  if (!target || lastRow <= 1) return [];
  const projectIndex = CENTRAL_PRICE_HISTORY_HEADERS.indexOf('รหัสโครงการ') + 1;
  return sheet.getRange(2, projectIndex, lastRow - 1, 1).getDisplayValues().reduce(function(rows, item, index) {
    if (String(item[0] || '').trim() === target) rows.push(index + 2);
    return rows;
  }, []);
}

function getCentralPriceHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.CENTRAL_PRICE_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.CENTRAL_PRICE_HISTORY_SHEET_NAME);
  prepareCentralPriceHistorySheet_(sheet);
  return sheet;
}

function prepareCentralPriceHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = CENTRAL_PRICE_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([CENTRAL_PRICE_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = CENTRAL_PRICE_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([CENTRAL_PRICE_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#fde68a'); } catch (error) {}
}

function findCentralPriceHistoryRow_(sheet, centralPriceId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(centralPriceId || '')) return i + 2;
  }
  return 0;
}

function createCentralPriceHistoryId_() {
  return 'CP-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}




function setupTestResultHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getTestResultHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติผลทดสอบเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: TEST_RESULT_HISTORY_HEADERS
  };
}

function getTestResultHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getTestResultHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, histories: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, TEST_RESULT_HISTORY_HEADERS.length).getDisplayValues();
  const histories = values.map(function(row, index) {
    const obj = {};
    TEST_RESULT_HISTORY_HEADERS.forEach(function(header, index) { obj[header] = row[index] || ''; });
    obj.__rowNumber = index + 2;
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  });
  // ข้อมูลเวอร์ชันเดิมอาจมีหลายแถวของผลทดสอบประเภทเดียวกัน
  // ไล่จากแถวล่างสุดเพื่อเก็บฉบับล่าสุดเพียงรายการเดียว แล้วล้างแถวซ้ำจริงในชีท
  const seenTypes = {};
  const uniqueHistories = [];
  const duplicateRows = [];
  histories.slice().reverse().forEach(function(item) {
    const typeKey = getTestResultHistoryTypeKey_(item['ประเภทผลทดสอบ'], item['ชื่อประเภทผลทดสอบ']);
    if (seenTypes[typeKey]) duplicateRows.push(item.__rowNumber);
    else {
      seenTypes[typeKey] = true;
      uniqueHistories.push(item);
    }
  });
  duplicateRows.sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
  });
  uniqueHistories.forEach(function(item) { delete item.__rowNumber; });
  if (duplicateRows.length) SpreadsheetApp.flush();
  return { ok: true, histories: uniqueHistories };
}

function saveTestResultHistory(password, testData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!testData || !String(testData.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getTestResultHistorySheet_(ss);
  const now = new Date();
  const requestedId = String(testData.testResultId || '').trim();
  let existingRow = requestedId ? findTestResultHistoryRow_(sheet, requestedId) : 0;
  // หากผู้ใช้สร้างจากฟอร์มโดยไม่ได้กดแก้ไข ให้เขียนทับผลทดสอบประเภทเดิมของโครงการ
  // เพื่อให้หนึ่งโครงการมีเพียงหนึ่งประวัติต่อหนึ่งประเภทผลทดสอบ
  if (!existingRow) {
    existingRow = findTestResultHistoryRowByProjectType_(sheet, testData.projectId, testData.documentType);
  }
  const existingId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || '').trim() : '';
  const testResultId = existingId || requestedId || createTestResultHistoryId_();
  const overwritingExisting = !!existingRow;
  const rowObject = {
    'รหัสผลทดสอบ': testResultId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': testData.projectId || '',
    'ชื่อโครงการ': testData.projectName || '',
    'ประเภทผลทดสอบ': testData.documentType || '',
    'ชื่อประเภทผลทดสอบ': testData.documentTitle || '',
    'เลขบันทึก': testData.memoNo || '',
    'วันที่ทำเอกสาร': testData.memoDate || '',
    'ข้อมูลผลทดสอบ JSON': testData.dataJson || '',
    'HTML ผลทดสอบ': testData.html || ''
  };
  const row = TEST_RESULT_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  applyAuditToHistoryRow_(sheet, TEST_RESULT_HISTORY_HEADERS, row, existingRow, testData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, TEST_RESULT_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    existingRow = sheet.getLastRow();
  }
  // เก็บเฉพาะรายการล่าสุดของโครงการและประเภทนี้ เผื่อมีข้อมูลซ้ำจากเวอร์ชันเดิม
  deleteDuplicateTestResultHistoryRows_(sheet, existingRow, testData.projectId, testData.documentType);
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: overwritingExisting ? 'บันทึกทับประวัติผลทดสอบเดิมเรียบร้อยแล้ว' : 'บันทึกประวัติผลทดสอบเรียบร้อยแล้ว',
    testResultId: testResultId
  };
}

function getTestResultHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.TEST_RESULT_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.TEST_RESULT_HISTORY_SHEET_NAME);
  prepareTestResultHistorySheet_(sheet);
  return sheet;
}

function prepareTestResultHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = TEST_RESULT_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([TEST_RESULT_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = TEST_RESULT_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([TEST_RESULT_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bfdbfe'); } catch (error) {}
}

function findTestResultHistoryRow_(sheet, testResultId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(testResultId || '')) return i + 2;
  }
  return 0;
}

function findTestResultHistoryRowByProjectType_(sheet, projectId, documentType) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const projectCol = TEST_RESULT_HISTORY_HEADERS.indexOf('รหัสโครงการ') + 1;
  const typeCol = TEST_RESULT_HISTORY_HEADERS.indexOf('ประเภทผลทดสอบ') + 1;
  const titleCol = TEST_RESULT_HISTORY_HEADERS.indexOf('ชื่อประเภทผลทดสอบ') + 1;
  const width = Math.max(projectCol, typeCol, titleCol);
  const values = sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues();
  const projectKey = String(projectId || '').trim();
  const typeKey = getTestResultHistoryTypeKey_(documentType, '');
  // เลือกรายการล่างสุด ซึ่งเป็นรายการที่บันทึกล่าสุดในข้อมูลเดิม
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][projectCol - 1] || '').trim() === projectKey &&
        getTestResultHistoryTypeKey_(values[i][typeCol - 1], values[i][titleCol - 1]) === typeKey) return i + 2;
  }
  return 0;
}

function deleteDuplicateTestResultHistoryRows_(sheet, keepRow, projectId, documentType) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const projectCol = TEST_RESULT_HISTORY_HEADERS.indexOf('รหัสโครงการ') + 1;
  const typeCol = TEST_RESULT_HISTORY_HEADERS.indexOf('ประเภทผลทดสอบ') + 1;
  const titleCol = TEST_RESULT_HISTORY_HEADERS.indexOf('ชื่อประเภทผลทดสอบ') + 1;
  const width = Math.max(projectCol, typeCol, titleCol);
  const values = sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues();
  const projectKey = String(projectId || '').trim();
  const typeKey = getTestResultHistoryTypeKey_(documentType, '');
  for (let i = values.length - 1; i >= 0; i--) {
    const rowNumber = i + 2;
    if (rowNumber === keepRow) continue;
    if (String(values[i][projectCol - 1] || '').trim() === projectKey &&
        getTestResultHistoryTypeKey_(values[i][typeCol - 1], values[i][titleCol - 1]) === typeKey) sheet.deleteRow(rowNumber);
  }
}

function getTestResultHistoryTypeKey_(documentType, documentTitle) {
  const raw = String(documentType || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  const title = String(documentTitle || '').trim().toLowerCase();
  const text = raw + ' ' + title;
  if (/concrete|คอนกรีต/.test(text)) return 'concrete';
  if (/steel|เหล็ก/.test(text)) return 'steel';
  if (/soil|ดิน/.test(text)) return 'soil';
  if (/reflective|สะท้อนแสง/.test(text)) return 'reflectiveac';
  if (/thickness|ความหนา/.test(text)) return 'thicknessac';
  if (/rubberwash|ล้างก้อนยาง/.test(text)) return 'rubberwashac';
  if (/materialapproval|อนุมัติใช้วัสดุ/.test(text)) return 'materialapprovalac';
  if (/jobmix|ออกแบบส่วนผสม/.test(text)) return 'jobmix';
  return raw || title || 'ไม่ระบุประเภท';
}

function createTestResultHistoryId_() {
  return 'TR-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function setupCompensationHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCompensationHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติเบิกค่าตอบแทนเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: COMPENSATION_HISTORY_HEADERS
  };
}

function getCompensationHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCompensationHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, histories: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, COMPENSATION_HISTORY_HEADERS.length).getDisplayValues();
  const histories = values.map(function(row) {
    const obj = {};
    COMPENSATION_HISTORY_HEADERS.forEach(function(header, index) { obj[header] = row[index] || ''; });
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) {
    const da = new Date(a['วันที่แก้ไข'] || a['วันที่สร้าง'] || 0).getTime() || 0;
    const db = new Date(b['วันที่แก้ไข'] || b['วันที่สร้าง'] || 0).getTime() || 0;
    return db - da;
  });
  return { ok: true, histories: histories };
}

function saveCompensationHistory(password, compensationData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!compensationData || !String(compensationData.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getCompensationHistorySheet_(ss);
  const now = new Date();
  const matchingRows = findCompensationHistoryRowsByProjectAndType_(sheet, compensationData.projectId, compensationData.documentType);
  let existingRow = matchingRows.length ? matchingRows[matchingRows.length - 1] : 0;
  matchingRows.slice(0, -1).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
    if (rowNumber < existingRow) existingRow--;
  });
  const storedId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || '').trim() : '';
  const compensationId = storedId || String(compensationData.compensationId || '').trim() || createCompensationHistoryId_();
  const rowObject = {
    'รหัสเบิกค่าตอบแทน': compensationId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': compensationData.projectId || '',
    'ชื่อโครงการ': compensationData.projectName || '',
    'วันที่ทำบันทึก': compensationData.memoDate || '',
    'เลขบันทึก': compensationData.memoNo || '',
    'วันที่ประชุม/ตรวจรับ': compensationData.meetingDate || '',
    'คำสั่งที่': compensationData.orderNo || '',
    'ประเภทเอกสารล่าสุด': compensationData.documentType || '',
    'ข้อมูลเบิกค่าตอบแทน JSON': compensationData.dataJson || '',
    'HTML TOR และราคากลาง': compensationData.torPriceHtml || '',
    'HTML ตรวจรับพัสดุ': compensationData.inspectionHtml || '',
    'HTML ผู้ควบคุมงาน': compensationData.supervisorHtml || ''
  };
  if (existingRow) {
    ['HTML TOR และราคากลาง', 'HTML ตรวจรับพัสดุ', 'HTML ผู้ควบคุมงาน'].forEach(function(header) {
      if (!rowObject[header]) rowObject[header] = sheet.getRange(existingRow, COMPENSATION_HISTORY_HEADERS.indexOf(header) + 1).getValue() || '';
    });
  }
  const row = COMPENSATION_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  applyAuditToHistoryRow_(sheet, COMPENSATION_HISTORY_HEADERS, row, existingRow, compensationData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, COMPENSATION_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  updateProjectCommitteeMemoryFromCompensation_(ss, compensationData);
  if (!String(compensationData.documentType || '').includes('TOR และราคากลาง')) {
    updateProjectAcceptanceDateFromCompensation_(ss, compensationData.projectId, compensationData.meetingDate);
  }
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขประวัติเบิกค่าตอบแทนเรียบร้อยแล้ว' : 'บันทึกประวัติเบิกค่าตอบแทนเรียบร้อยแล้ว',
    compensationId: compensationId
  };
}

/**
 * เมื่อแก้ไข "วันที่ประชุม/ตรวจรับ" ในบันทึกค่าตอบแทน
 * ให้เก็บค่ากลับไปที่ช่องวันตรวจรับงานของโครงการเดียวกันด้วย
 */
function updateProjectAcceptanceDateFromCompensation_(ss, projectId, meetingDate) {
  const rowNumber = Number(projectId || 0);
  const value = String(meetingDate || '').trim();
  if (!rowNumber || rowNumber < 2 || !value) return false;

  const sheet = getProjectDataSheet_(ss);
  if (rowNumber > sheet.getLastRow()) return false;

  const lastColumn = Math.min(Math.max(sheet.getLastColumn(), 1), CONFIG.MAX_COLUMNS);
  const sampleRows = Math.min(sheet.getLastRow(), 50);
  const display = sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues();
  const headerIndex = CONFIG.HEADER_ROW > 0 ? CONFIG.HEADER_ROW - 1 : detectHeaderRow_(display);
  if (headerIndex < 0 || rowNumber <= headerIndex + 1) return false;

  const headers = sheet.getRange(headerIndex + 1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function(header, index) { return String(header || ('คอลัมน์ ' + (index + 1))).trim(); });
  const aliases = buildAliasIndex_(headers);
  const output = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];
  const before = output.slice();
  setOutputValue_(output, aliases, ['วันตรวจรับงาน', 'วันที่ตรวจรับงาน', 'วันตรวจรับ', 'วันที่ตรวจรับ'], value);

  for (let col = 0; col < lastColumn; col++) {
    if (String(before[col] || '').trim() !== String(output[col] || '').trim()) {
      sheet.getRange(rowNumber, col + 1).setValue(output[col]);
      return true;
    }
  }
  return false;
}

function getCompensationHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.COMPENSATION_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.COMPENSATION_HISTORY_SHEET_NAME);
  prepareCompensationHistorySheet_(sheet);
  return sheet;
}

function prepareCompensationHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = COMPENSATION_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([COMPENSATION_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = COMPENSATION_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([COMPENSATION_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bbf7d0'); } catch (error) {}
}

function findCompensationHistoryRowsByProjectAndType_(sheet, projectId, documentType) {
  const targetProject = String(projectId || '').trim();
  const targetType = String(documentType || '').trim();
  const lastRow = sheet.getLastRow();
  if (!targetProject || !targetType || lastRow <= 1) return [];
  const projectIndex = COMPENSATION_HISTORY_HEADERS.indexOf('รหัสโครงการ');
  const typeIndex = COMPENSATION_HISTORY_HEADERS.indexOf('ประเภทเอกสารล่าสุด');
  const values = sheet.getRange(2, 1, lastRow - 1, COMPENSATION_HISTORY_HEADERS.length).getDisplayValues();
  return values.reduce(function(rows, item, index) {
    if (String(item[projectIndex] || '').trim() === targetProject && String(item[typeIndex] || '').trim() === targetType) rows.push(index + 2);
    return rows;
  }, []);
}

function createCompensationHistoryId_() {
  return 'COMP-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}


function setupProjectCommitteeMemorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectCommitteeMemorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทจำกรรมการโครงการเรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: PROJECT_COMMITTEE_MEMORY_HEADERS
  };
}

function getProjectCommitteeMemory(projectId) {
  const requestedProjectId = String(projectId || '').trim();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const raw = getProjectCommitteeMemoryRaw_(ss, requestedProjectId);
  const inferred = inferProjectCommitteeMemoryFromHistories_(ss, requestedProjectId);
  // ให้ประวัติเอกสารล่าสุด เช่น หน้ากำหนดราคากลาง ทับค่าที่เคยจำไว้จากหน้าอื่น
  const merged = mergeCommitteeMemoryObjects_(raw && raw.data ? raw.data : {}, inferred || {});
  // ส่งรหัสโครงการกลับไปด้วย เพื่อให้หน้าเว็บตรวจว่าผลลัพธ์ยังเป็นของโครงการที่เลือกอยู่จริง
  return { ok: true, projectId: requestedProjectId, memory: merged || {}, source: raw && raw.row ? 'sheet+histories' : 'histories' };
}

function getProjectCommitteeMemorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.PROJECT_COMMITTEE_MEMORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.PROJECT_COMMITTEE_MEMORY_SHEET_NAME);
  prepareProjectCommitteeMemorySheet_(sheet);
  return sheet;
}

function prepareProjectCommitteeMemorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = PROJECT_COMMITTEE_MEMORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([PROJECT_COMMITTEE_MEMORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = PROJECT_COMMITTEE_MEMORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([PROJECT_COMMITTEE_MEMORY_HEADERS]);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#bfdbfe'); } catch (error) {}
}

function getProjectCommitteeMemoryRaw_(ss, projectId) {
  const pid = String(projectId || '').trim();
  if (!pid) return { row: 0, data: {} };
  const sheet = getProjectCommitteeMemorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { row: 0, data: {} };
  const values = sheet.getRange(2, 1, lastRow - 1, PROJECT_COMMITTEE_MEMORY_HEADERS.length).getDisplayValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0] || '').trim() === pid) {
      return { row: i + 2, data: parseJsonText_(values[i][4] || '{}') || {} };
    }
  }
  return { row: 0, data: {} };
}

function saveProjectCommitteeMemory_(ss, payload) {
  if (!payload || !String(payload.projectId || '').trim()) return;
  const sheet = getProjectCommitteeMemorySheet_(ss);
  const now = new Date();
  const projectId = String(payload.projectId || '').trim();
  const old = getProjectCommitteeMemoryRaw_(ss, projectId);
  const merged = mergeCommitteeMemoryObjects_(old && old.data ? old.data : {}, payload.memory || {});
  const row = [projectId, payload.projectName || '', old && old.row ? (sheet.getRange(old.row, 3).getValue() || now) : now, now, JSON.stringify(merged || {})];
  if (old && old.row) {
    sheet.getRange(old.row, 1, 1, PROJECT_COMMITTEE_MEMORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function mergeCommitteeMemoryObjects_(base, update) {
  const output = JSON.parse(JSON.stringify(base || {}));
  const source = update || {};
  Object.keys(source).forEach(function(key) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeCommitteeMemoryObjects_(output[key] || {}, value);
    } else if (value !== undefined && value !== null && String(value).trim() !== '') {
      output[key] = value;
    }
  });
  return output;
}

function parseJsonText_(text) {
  try { return JSON.parse(String(text || '{}')) || {}; } catch (error) { return {}; }
}

function updateProjectCommitteeMemoryFromCompensation_(ss, compensationData) {
  const data = parseJsonText_(compensationData && compensationData.dataJson);
  saveProjectCommitteeMemory_(ss, {
    projectId: compensationData.projectId || '',
    projectName: compensationData.projectName || '',
    memory: {
      tor: { chair: data.torChair || '', member1: data.torMember1 || '', member2: data.torMember2 || '' },
      price: { chair: data.priceChair || '', member1: data.priceMember1 || '', member2: data.priceMember2 || '' },
      inspection: { chair: data.inspectChair || '', member1: data.inspectMember1 || '', member2: data.inspectMember2 || '', member3: data.inspectMember3 || '', member4: data.inspectMember4 || '' },
      supervisor: { supervisor: data.supervisor || '' },
      torPriceOrder: {
        orderNo: data.torPriceOrderNo || data.orderNo || compensationData.orderNo || '',
        orderDate: data.torPriceOrderDate || data.orderDate || ''
      },
      rates: {
        torChairRate: data.torChairRate || '',
        torMemberRate: data.torMemberRate || '',
        inspectChairRate: data.inspectChairRate || '',
        inspectMemberRate: data.inspectMemberRate || '',
        supervisorRate: data.supervisorRate || '',
        inspectionMeetingCount: data.inspectionMeetingCount || ''
      }
    }
  });
}

function updateProjectCommitteeMemoryFromCentralPrice_(ss, centralData) {
  const data = parseJsonText_(centralData && centralData.dataJson);
  saveProjectCommitteeMemory_(ss, {
    projectId: centralData.projectId || '',
    projectName: centralData.projectName || '',
    memory: {
      price: {
        chair: data.chair && data.chair.name ? data.chair.name : '',
        member1: data.members && data.members[0] && data.members[0].name ? data.members[0].name : '',
        member2: data.members && data.members[1] && data.members[1].name ? data.members[1].name : ''
      },
      torPriceOrder: {
        orderNo: data.orderNo || centralData.orderNo || '',
        orderDate: data.orderDate || centralData.orderDate || ''
      }
    }
  });
}

function updateProjectCommitteeMemoryFromTorDraft_(ss, torData) {
  saveProjectCommitteeMemory_(ss, {
    projectId: torData.projectId || '',
    projectName: torData.projectName || '',
    memory: {
      tor: {
        chair: torData.chair || '',
        member1: torData.member1 || '',
        member2: torData.member2 || torData.secretary || '',
        secretary: torData.member2 || torData.secretary || ''
      }
    }
  });
}

function inferProjectCommitteeMemoryFromHistories_(ss, projectId) {
  const pid = String(projectId || '').trim();
  let memory = {};
  if (!pid) return memory;

  try {
    const compSheet = getCompensationHistorySheet_(ss);
    const last = compSheet.getLastRow();
    if (last > 1) {
      const values = compSheet.getRange(2, 1, last - 1, COMPENSATION_HISTORY_HEADERS.length).getDisplayValues();
      for (let i = values.length - 1; i >= 0; i--) {
        if (String(values[i][3] || '').trim() !== pid) continue;
        const data = parseJsonText_(values[i][10] || '{}');
        memory = mergeCommitteeMemoryObjects_(memory, {
          tor: { chair: data.torChair || '', member1: data.torMember1 || '', member2: data.torMember2 || '' },
          price: { chair: data.priceChair || '', member1: data.priceMember1 || '', member2: data.priceMember2 || '' },
          inspection: { chair: data.inspectChair || '', member1: data.inspectMember1 || '', member2: data.inspectMember2 || '', member3: data.inspectMember3 || '', member4: data.inspectMember4 || '' },
          supervisor: { supervisor: data.supervisor || '' },
          torPriceOrder: { orderNo: data.torPriceOrderNo || data.orderNo || '', orderDate: data.torPriceOrderDate || data.orderDate || '' },
          rates: { inspectionMeetingCount: data.inspectionMeetingCount || '' }
        });
        break;
      }
    }
  } catch (error) {}

  try {
    const cpSheet = getCentralPriceHistorySheet_(ss);
    const last = cpSheet.getLastRow();
    if (last > 1) {
      const values = cpSheet.getRange(2, 1, last - 1, CENTRAL_PRICE_HISTORY_HEADERS.length).getDisplayValues();
      for (let i = values.length - 1; i >= 0; i--) {
        if (String(values[i][3] || '').trim() !== pid) continue;
        const data = parseJsonText_(values[i][9] || '{}');
        memory = mergeCommitteeMemoryObjects_(memory, {
          price: {
            chair: data.chair && data.chair.name ? data.chair.name : '',
            member1: data.members && data.members[0] && data.members[0].name ? data.members[0].name : '',
            member2: data.members && data.members[1] && data.members[1].name ? data.members[1].name : ''
          },
          torPriceOrder: { orderNo: data.orderNo || '', orderDate: data.orderDate || '' }
        });
        break;
      }
    }
  } catch (error) {}

  try {
    const torSheet = getTorDraftHistorySheet_(ss);
    const last = torSheet.getLastRow();
    if (last > 1) {
      const range = torSheet.getRange(2, 1, last - 1, TOR_DRAFT_HISTORY_HEADERS.length);
      const values = range.getDisplayValues();
      const rawValues = range.getValues();
      let latestTor = null;
      let latestTime = -1;
      let latestRowIndex = -1;
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][3] || '').trim() !== pid) continue;
        const stored = parseJsonText_(values[i][13] || '{}');
        const candidate = {
          chair: stored.chair || values[i][9] || '',
          member1: stored.member1 || values[i][10] || '',
          member2: stored.member2 || stored.secretary || values[i][11] || values[i][12] || '',
          secretary: stored.member2 || stored.secretary || values[i][11] || values[i][12] || ''
        };
        if (!candidate.chair && !candidate.member1 && !candidate.member2) continue;
        const modified = rawValues[i][2];
        const created = rawValues[i][1];
        const modifiedTime = modified instanceof Date && !isNaN(modified.getTime()) ? modified.getTime() : 0;
        const createdTime = created instanceof Date && !isNaN(created.getTime()) ? created.getTime() : 0;
        const candidateTime = modifiedTime || createdTime || 0;
        if (candidateTime > latestTime || (candidateTime === latestTime && i > latestRowIndex)) {
          latestTor = candidate;
          latestTime = candidateTime;
          latestRowIndex = i;
        }
      }
      if (latestTor) memory = mergeCommitteeMemoryObjects_(memory, { tor: latestTor });
    }
  } catch (error) {}

  return memory;
}


function setupTorDraftHistorySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getTorDraftHistorySheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทประวัติร่าง TOR เรียบร้อย',
    sheetName: sheet.getName(),
    gid: sheet.getSheetId(),
    headers: TOR_DRAFT_HISTORY_HEADERS
  };
}

function getTorDraftHistories(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getTorDraftHistorySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, histories: [] };
  const range = sheet.getRange(2, 1, lastRow - 1, TOR_DRAFT_HISTORY_HEADERS.length);
  const values = range.getDisplayValues();
  const rawValues = range.getValues();
  const histories = values.map(function(row, rowIndex) {
    const obj = {};
    TOR_DRAFT_HISTORY_HEADERS.forEach(function(header, index) { obj[header] = row[index] || ''; });
    const modified = rawValues[rowIndex][2];
    const created = rawValues[rowIndex][1];
    const modifiedTime = modified instanceof Date && !isNaN(modified.getTime()) ? modified.getTime() : 0;
    const createdTime = created instanceof Date && !isNaN(created.getTime()) ? created.getTime() : 0;
    obj.__sortTime = modifiedTime || createdTime || 0;
    obj.__rowIndex = rowIndex;
    return obj;
  }).filter(function(item) {
    return String(item['รหัสโครงการ'] || '') === String(projectId || '');
  }).sort(function(a, b) {
    return (b.__sortTime - a.__sortTime) || (b.__rowIndex - a.__rowIndex);
  }).map(function(item) {
    delete item.__sortTime;
    delete item.__rowIndex;
    return item;
  });
  return { ok: true, histories: histories };
}

function getLatestTorKFormulaCodes(projectId) {
  const target = String(projectId || '').trim();
  if (!target) return { ok: true, codes: [] };
  const histories = getTorDraftHistories(target).histories || [];
  for (let i = 0; i < histories.length; i++) {
    const typeName = String(histories[i]['ประเภทเอกสาร TOR'] || '').trim();
    if (typeName !== 'specific' && typeName !== 'ebidding') continue;
    try {
      const data = JSON.parse(String(histories[i]['ข้อมูลร่าง TOR JSON'] || '{}'));
      const raw = data.kFormulaCodes || data.kFormulaCode || '';
      const codes = (Array.isArray(raw) ? raw : String(raw).split(/[;,|]/)).map(function(code) { return String(code || '').trim(); }).filter(Boolean);
      if (codes.length) return { ok: true, codes: codes };
    } catch (error) {}
  }
  return { ok: true, codes: [] };
}

function saveTorDraftHistory(password, torData) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!torData || !String(torData.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getTorDraftHistorySheet_(ss);
  const now = new Date();
  const matchingRows = findTorDraftHistoryRowsByProjectType_(sheet, torData.projectId, torData.torType);
  let existingRow = matchingRows.length ? matchingRows[matchingRows.length - 1] : 0;
  matchingRows.slice(0, -1).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
    if (rowNumber < existingRow) existingRow--;
  });
  const storedId = existingRow ? String(sheet.getRange(existingRow, 1).getDisplayValue() || '').trim() : '';
  const torDraftId = storedId || String(torData.torDraftId || '').trim() || createTorDraftHistoryId_();
  const rowObject = {
    'รหัสร่าง TOR': torDraftId,
    'วันที่สร้าง': now,
    'วันที่แก้ไข': now,
    'รหัสโครงการ': torData.projectId || '',
    'ชื่อโครงการ': torData.projectName || '',
    'ประเภทเอกสาร TOR': torData.torType || '',
    'เลขที่คำสั่ง': torData.orderNo || '',
    'ลงวันที่คำสั่ง': torData.orderDate || '',
    'วันที่ทำเอกสาร/วันที่ประชุม': torData.docDate || '',
    'ประธานกรรมการ TOR': torData.chair || '',
    'กรรมการ TOR 1': torData.member1 || '',
    'กรรมการ TOR 2': torData.member2 || torData.secretary || '',
    'กรรมการและเลขานุการ': torData.member2 || torData.secretary || '',
    'ข้อมูลร่าง TOR JSON': torData.dataJson || '',
    'HTML ร่าง TOR': torData.html || ''
  };
  const row = TOR_DRAFT_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  applyAuditToHistoryRow_(sheet, TOR_DRAFT_HISTORY_HEADERS, row, existingRow, torData);
  if (existingRow) {
    const oldCreated = sheet.getRange(existingRow, 2).getValue();
    row[1] = oldCreated || now;
    row[2] = now;
    sheet.getRange(existingRow, 1, 1, TOR_DRAFT_HISTORY_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  updateProjectCommitteeMemoryFromTorDraft_(ss, torData);
  SpreadsheetApp.flush();
  return {
    ok: true,
    message: existingRow ? 'แก้ไขประวัติร่าง TOR เรียบร้อยแล้ว' : 'บันทึกประวัติร่าง TOR เรียบร้อยแล้ว',
    torDraftId: torDraftId
  };
}

function findTorDraftHistoryRowsByProjectType_(sheet, projectId, torType) {
  const targetProject = String(projectId || '').trim();
  const targetType = String(torType || '').trim();
  const lastRow = sheet.getLastRow();
  if (!targetProject || !targetType || lastRow <= 1) return [];
  const projectIndex = TOR_DRAFT_HISTORY_HEADERS.indexOf('รหัสโครงการ');
  const typeIndex = TOR_DRAFT_HISTORY_HEADERS.indexOf('ประเภทเอกสาร TOR');
  const values = sheet.getRange(2, 1, lastRow - 1, TOR_DRAFT_HISTORY_HEADERS.length).getDisplayValues();
  return values.reduce(function(rows, item, index) {
    if (String(item[projectIndex] || '').trim() === targetProject && String(item[typeIndex] || '').trim() === targetType) rows.push(index + 2);
    return rows;
  }, []);
}

function getTorDraftHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.TOR_DRAFT_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.TOR_DRAFT_HISTORY_SHEET_NAME);
  prepareTorDraftHistorySheet_(sheet);
  return sheet;
}

function prepareTorDraftHistorySheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const requiredLen = TOR_DRAFT_HISTORY_HEADERS.length;
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, requiredLen).setValues([TOR_DRAFT_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); });
  const firstRequiredMatch = TOR_DRAFT_HISTORY_HEADERS.every(function(header, index) { return String(currentHeaders[index] || '').trim() === header; });
  if (!firstRequiredMatch) sheet.getRange(1, 1, 1, requiredLen).setValues([TOR_DRAFT_HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#dcfce7'); } catch (error) {}
}

function findTorDraftHistoryRow_(sheet, torDraftId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(torDraftId || '')) return i + 2;
  }
  return 0;
}

function createTorDraftHistoryId_() {
  return 'TOR-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

/**
 * รันฟังก์ชันนี้ครั้งแรก
 * เพื่อสร้าง/ซ่อมชีทฐานข้อมูลกลางสำหรับกรอกและแก้ไขข้อมูล
 */
function copyLegacyToProjectDataSheet() {
  return setupProjectDataSheet();
}

function setupDatabase() {
  const main = setupProjectDataSheet();
  const localRoad = setupLocalRoadSheet();
  const memo = setupMemoHistorySheet();
  const weeklyWork = setupWeeklyWorkHistorySheet();
  const weeklyPerformance = setupWeeklyPerformanceHistorySheet();
  const workReduction = setupWorkReductionHistorySheet();
  const sCurve = setupSCurveHistorySheet();
  const kValue = setupKValueHistorySheet();
  const projectSign = setupProjectSignHistorySheet();
  const completionReport = setupCompletionReportHistorySheet();
  const contractorNotice = setupContractorNoticeHistorySheet();
  const centralPrice = setupCentralPriceHistorySheet();
  const compensation = setupCompensationHistorySheet();
  const torDraft = setupTorDraftHistorySheet();
  const testResult = setupTestResultHistorySheet();
  const committeeMemory = setupProjectCommitteeMemorySheet();
  const personnel = setupPersonnelSheet();
  const systemOptionsSheet = getSystemOptionsSheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));

  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทฐานข้อมูลโครงการ ประวัติบันทึกข้อความ ประวัติบันทึกการปฏิบัติงาน ประวัติผลการดำเนินงาน ประวัติปรับลดปริมาณงาน ประวัติ S-Curve ประวัติคำนวณค่า K ประวัติป้ายโครงการ ประวัติรายงานผลแล้วเสร็จ 100% ประวัติแจ้งให้ผู้รับจ้างเข้าดำเนินการ ประวัติกำหนดราคากลาง ประวัติเบิกค่าตอบแทน ประวัติร่าง TOR ประวัติผลทดสอบ จำกรรมการโครงการ รายชื่อบุคลากร และคณะผู้บริหารเรียบร้อย',
    main: main,
    localRoad: localRoad,
    memo: memo,
    weeklyWork: weeklyWork,
    weeklyPerformance: weeklyPerformance,
    workReduction: workReduction,
    sCurve: sCurve,
    kValue: kValue,
    projectSign: projectSign,
    completionReport: completionReport,
    contractorNotice: contractorNotice,
    centralPrice: centralPrice,
    compensation: compensation,
    torDraft: torDraft,
    testResult: testResult,
    committeeMemory: committeeMemory,
    personnel: personnel,
    systemOptions: { ok: true, sheetName: systemOptionsSheet.getName(), sheetGid: systemOptionsSheet.getSheetId() }
  };
}

function setupLocalRoadSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getLocalRoadSheet_(ss);
  return {
    ok: true,
    message: 'สร้าง/เตรียมชีททะเบียนคุมสายทางทางหลวงท้องถิ่นเรียบร้อย',
    sheetName: sheet.getName(),
    sheetGid: sheet.getSheetId(),
    headers: LOCAL_ROAD_HEADERS
  };
}

function getLocalRoadSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.LOCAL_ROAD_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.LOCAL_ROAD_SHEET_NAME);
  prepareLocalRoadSheet_(sheet);
  return sheet;
}

function prepareLocalRoadSheet_(sheet) {
  const requiredLen = LOCAL_ROAD_HEADERS.length;
  if (sheet.getLastRow() < 1) {
    writeLocalRoadHeaders_(sheet);
    return;
  }
  const lastCol = Math.max(sheet.getLastColumn(), requiredLen);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0]
    .map(function(value) { return String(value || '').trim(); });
  const matches = LOCAL_ROAD_HEADERS.every(function(header, index) {
    return normalize_(currentHeaders[index] || '') === normalize_(header);
  });
  if (!matches) sheet.getRange(1, 1, 1, requiredLen).setValues([LOCAL_ROAD_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#dcfce7');
    sheet.autoResizeColumns(1, Math.min(requiredLen, 20));
  } catch (error) {
    // ไม่จำเป็นต้องหยุดระบบ หากจัดรูปแบบไม่ได้
  }
}

function writeLocalRoadHeaders_(sheet) {
  sheet.getRange(1, 1, 1, LOCAL_ROAD_HEADERS.length).setValues([LOCAL_ROAD_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, LOCAL_ROAD_HEADERS.length).setFontWeight('bold').setBackground('#dcfce7');
    sheet.autoResizeColumns(1, Math.min(LOCAL_ROAD_HEADERS.length, 20));
  } catch (error) {
    // ไม่จำเป็นต้องหยุดระบบ หากจัดรูปแบบไม่ได้
  }
}


function buildLocalRoadRowOutput_(formData, existingRow) {
  const aliases = buildAliasIndex_(LOCAL_ROAD_HEADERS);
  const output = Array.isArray(existingRow) && existingRow.length
    ? existingRow.slice(0, LOCAL_ROAD_HEADERS.length)
    : new Array(LOCAL_ROAD_HEADERS.length).fill('');
  while (output.length < LOCAL_ROAD_HEADERS.length) output.push('');
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
  const userName = getAuditUserName_(formData);
  const createdAt = getCellValueByHeader_(output, aliases, 'วันที่สร้าง') || now;
  const createdBy = getCellValueByHeader_(output, aliases, 'สร้างโดย') || userName;

  setOutputValue_(output, aliases, ['รหัสสายทาง'], String(formData.roadCode || '').trim());
  setOutputValue_(output, aliases, ['ชื่อสายทาง'], String(formData.roadName || '').trim());
  setOutputValue_(output, aliases, ['ระยะทาง'], formData.distance);
  setOutputValue_(output, aliases, ['ผิวจราจร'], formData.pavement);
  setOutputValue_(output, aliases, ['เขตทางกว้าง ม.', 'ไหล่ทาง/ทางเท้ากว้าง ม.'], formData.shoulderFootpathWidth);
  setOutputValue_(output, aliases, ['สถานะ'], formData.status);
  setOutputValue_(output, aliases, ['ลงทะเบียนเมื่อวันที่'], formData.registeredDate);
  setOutputValue_(output, aliases, ['ชั้นทางในเขตเมือง', 'ประเภท'], formData.urbanRoadClass);
  setOutputValue_(output, aliases, ['กว้าง (ม.)'], formData.width);
  setOutputValue_(output, aliases, ['ไหล่ทาง/ทางเท้ากว้าง ม. (ซ้าย)', 'ซ้าย'], formData.leftSide);
  setOutputValue_(output, aliases, ['ไหล่ทาง/ทางเท้ากว้าง ม. (ขวา)', 'ขวา'], formData.rightSide);
  setOutputValue_(output, aliases, ['ชั้นทางนอกเขตเมือง', 'การลงทะเบียน'], formData.ruralRoadClass);
  setOutputValue_(output, aliases, ['วัน/เดือน/ปี'], '');
  setOutputValue_(output, aliases, ['พิกัดเริ่มต้น'], formData.startCoordinate);
  setOutputValue_(output, aliases, ['พิกัดสิ้นสุด'], formData.endCoordinate);
  setOutputValue_(output, aliases, ['วันที่สร้าง'], createdAt);
  setOutputValue_(output, aliases, ['วันที่แก้ไข'], now);
  setOutputValue_(output, aliases, ['สร้างโดย'], createdBy);
  setOutputValue_(output, aliases, ['แก้ไขโดย'], userName);
  return output;
}

function getCellValueByHeader_(row, aliases, header) {
  const idx = aliases[normalize_(header)];
  if (idx === undefined) return '';
  return row[idx] === undefined ? '' : row[idx];
}

function saveLocalRoadEntry(password, formData) {
  if (arguments.length === 0) {
    return 'ฟังก์ชัน saveLocalRoadEntry ใช้จากหน้าเว็บเท่านั้น';
  }
  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }
  if (!formData || typeof formData !== 'object') {
    throw new Error('ไม่พบข้อมูลสายทางที่ต้องการบันทึก');
  }
  const roadCode = String(formData.roadCode || '').trim();
  const roadName = String(formData.roadName || '').trim();
  if (!roadCode) throw new Error('กรุณากรอกรหัสสายทาง');
  if (!roadName) throw new Error('กรุณากรอกชื่อสายทาง');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getLocalRoadSheet_(ss);
  const output = buildLocalRoadRowOutput_(formData, null);
  sheet.appendRow(output);
  return {
    ok: true,
    message: 'บันทึกข้อมูลสายทางทางหลวงท้องถิ่นเรียบร้อย',
    rowNumber: sheet.getLastRow(),
    sheetName: sheet.getName()
  };
}


function updateLocalRoadEntry(password, formData) {
  if (arguments.length === 0) {
    return 'ฟังก์ชัน updateLocalRoadEntry ใช้จากหน้าเว็บเท่านั้น';
  }
  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }
  if (!formData || typeof formData !== 'object') {
    throw new Error('ไม่พบข้อมูลสายทางที่ต้องการแก้ไข');
  }
  const rowNumber = Number(formData.rowNumber || 0);
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    throw new Error('ไม่พบแถวข้อมูลสายทางที่ต้องการแก้ไข');
  }
  const roadCode = String(formData.roadCode || '').trim();
  const roadName = String(formData.roadName || '').trim();
  if (!roadCode) throw new Error('กรุณากรอกรหัสสายทาง');
  if (!roadName) throw new Error('กรุณากรอกชื่อสายทาง');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getLocalRoadSheet_(ss);
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), LOCAL_ROAD_HEADERS.length);
  if (rowNumber > lastRow) {
    throw new Error('ไม่พบข้อมูลสายทางที่ต้องการแก้ไข');
  }
  const existingRow = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0] || [];
  const output = buildLocalRoadRowOutput_(formData, existingRow);
  sheet.getRange(rowNumber, 1, 1, LOCAL_ROAD_HEADERS.length).setValues([output]);
  return {
    ok: true,
    message: 'แก้ไขข้อมูลสายทางทางหลวงท้องถิ่นเรียบร้อย',
    rowNumber: rowNumber,
    sheetName: sheet.getName()
  };
}

function getAllLocalRoadEntries() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = getLocalRoadSheet_(ss);
    const lastRow = sheet.getLastRow();
    const lastColumn = Math.max(sheet.getLastColumn(), LOCAL_ROAD_HEADERS.length);
    if (lastRow < 2) {
      return {
        ok: true,
        sheetName: sheet.getName(),
        entries: [],
        updatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')
      };
    }
    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
      .map(function(header, index) { return String(header || LOCAL_ROAD_HEADERS[index] || ('คอลัมน์ ' + (index + 1))).trim(); });
    const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues();
    const entries = values.map(function(row, index) {
      const item = { rowNumber: index + 2 };
      headers.forEach(function(header, column) {
        item[header] = String(row[column] || '').trim();
      });
      return item;
    }).filter(function(item) {
      return LOCAL_ROAD_HEADERS.slice(0, 13).some(function(header) { return String(item[header] || '').trim() !== ''; });
    });
    return {
      ok: true,
      sheetName: sheet.getName(),
      entries: entries,
      updatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')
    };
  } catch (error) {
    return { ok: false, message: 'อ่านข้อมูลสายทางไม่สำเร็จ: ' + getErrorMessage_(error), entries: [] };
  }
}


function getActiveUserForPermission_(username) {
  const userNameText = String(username || '').trim();
  if (!userNameText) throw new Error('กรุณาเข้าสู่ระบบก่อนวาด/แก้ไขขอบเขตแผนที่');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getUserSheet_(ss);
  ensureDefaultUserRows_(sheet);
  const found = findUserRow_(sheet, userNameText);
  if (!found) throw new Error('ไม่พบผู้ใช้งานนี้ในระบบ');
  const role = normalizeUserRole_(found.values[5] || 'viewer');
  const status = normalizeUserStatus_(found.values[6] || 'active');
  if (status !== 'active') throw new Error('ผู้ใช้นี้ถูกปิดการใช้งาน');
  return {
    username: String(found.values[0] || userNameText).trim(),
    fullName: String(found.values[2] || userNameText).trim(),
    role: role
  };
}

function userHasRolePermission_(username, permissionKey) {
  const user = getActiveUserForPermission_(username);
  if (user.role === 'admin') return { ok: true, user: user };
  const key = String(permissionKey || '').trim();
  const permissions = getRolePermissions_();
  if (permissions && permissions[user.role] && permissions[user.role][key]) {
    return { ok: true, user: user };
  }
  return { ok: false, user: user };
}

function assertMapBoundaryEditPermission_(payload) {
  const username = payload && typeof payload === 'object'
    ? String(payload.auditUsername || payload.username || '').trim()
    : '';
  const checked = userHasRolePermission_(username, 'map_boundary_edit');
  if (!checked.ok) throw new Error('บัญชีนี้ไม่มีสิทธิ์วาด/แก้ไข/ลบขอบเขตแผนที่ กรุณาให้ผู้ดูแลระบบติ๊กสิทธิ์ “วาด/แก้ไขขอบเขตแผนที่” ก่อน');
  return checked.user;
}

function getMapBoundarySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.MAP_BOUNDARY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.MAP_BOUNDARY_SHEET_NAME);
  prepareMapBoundarySheet_(sheet);
  return sheet;
}

function prepareMapBoundarySheet_(sheet) {
  const requiredLen = MAP_BOUNDARY_HEADERS.length;
  const lastColumn = Math.max(sheet.getLastColumn(), requiredLen);
  const currentHeaders = sheet.getLastRow() >= 1
    ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(value) { return String(value || '').trim(); })
    : [];
  const matches = MAP_BOUNDARY_HEADERS.every(function(header, index) {
    return normalize_(currentHeaders[index] || '') === normalize_(header);
  });
  if (!matches) sheet.getRange(1, 1, 1, requiredLen).setValues([MAP_BOUNDARY_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, requiredLen).setFontWeight('bold').setBackground('#dbeafe');
    sheet.autoResizeColumns(1, Math.min(requiredLen, 11));
  } catch (error) {
    // ไม่จำเป็นต้องหยุดระบบ หากจัดรูปแบบไม่ได้
  }
}

function normalizeMapBoundaryType_(type) {
  const text = String(type || '').trim().toLowerCase();
  if (text === 'tambon' || text.indexOf('ตำบล') !== -1) return 'tambon';
  return 'village';
}

function sanitizeMapBoundaryColor_(color) {
  const text = String(color || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : '#16a34a';
}

function normalizeMapBoundaryLineStyle_(style) {
  return String(style || '').trim().toLowerCase() === 'dashed' ? 'dashed' : 'solid';
}

function normalizeMapBoundaryFillMode_(mode, fillEnabled) {
  const text = String(mode || '').trim().toLowerCase();
  if (text === 'outline' || text === 'border' || text === 'none' || text === 'no-fill' || text === 'nofill' || text === 'false') return 'outline';
  if (fillEnabled === false || String(fillEnabled).toLowerCase() === 'false') return 'outline';
  return 'fill';
}

function normalizeMapBoundaryFeature_(boundaryData) {
  let geoJson = boundaryData && boundaryData.geoJson;
  if (typeof geoJson === 'string') {
    geoJson = JSON.parse(geoJson);
  }
  if (!geoJson || typeof geoJson !== 'object') {
    throw new Error('ไม่พบข้อมูล GeoJSON ของขอบเขต');
  }
  const geometry = geoJson.type === 'Feature' ? geoJson.geometry : geoJson;
  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || !Array.isArray(geometry.coordinates[0])) {
    throw new Error('GeoJSON ต้องเป็น Polygon เท่านั้น');
  }
  const ring = geometry.coordinates[0].filter(function(pair) {
    return Array.isArray(pair) && Number.isFinite(Number(pair[0])) && Number.isFinite(Number(pair[1]));
  }).map(function(pair) {
    return [Number(pair[0]), Number(pair[1])];
  });
  if (ring.length < 4) {
    throw new Error('กรุณาวาดขอบเขตอย่างน้อย 3 จุด และปิดรูปหลายเหลี่ยม');
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);

  const inputProps = geoJson && geoJson.properties ? geoJson.properties : {};
  const boundaryType = normalizeMapBoundaryType_(boundaryData.boundaryType || inputProps.boundaryType);
  const color = sanitizeMapBoundaryColor_(boundaryData.color || inputProps.color);
  const lineStyle = normalizeMapBoundaryLineStyle_(boundaryData.lineStyle || inputProps.lineStyle);
  const fillEnabled = Object.prototype.hasOwnProperty.call(boundaryData, 'fillEnabled') ? boundaryData.fillEnabled : inputProps.fillEnabled;
  const fillMode = normalizeMapBoundaryFillMode_(boundaryData.fillMode || inputProps.fillMode, fillEnabled);
  const villageNo = boundaryType === 'village' ? String(boundaryData.villageNo || inputProps.villageNo || '').trim() : '';
  const boundaryName = String(boundaryData.boundaryName || inputProps.boundaryName || '').trim() || (boundaryType === 'tambon' ? 'ตำบลสีแก้ว' : (villageNo ? ('หมู่ที่ ' + villageNo) : 'ขอบเขตหมู่บ้าน'));
  return {
    type: 'Feature',
    properties: {
      boundaryType: boundaryType,
      boundaryName: boundaryName,
      villageNo: villageNo,
      color: color,
      lineStyle: lineStyle,
      fillMode: fillMode,
      fillEnabled: fillMode !== 'outline'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring]
    }
  };
}

function mapBoundaryRowToObject_(row, rowNumber) {
  let geoJson = null;
  try {
    geoJson = row[5] ? JSON.parse(String(row[5])) : null;
  } catch (error) {
    geoJson = null;
  }
  const props = geoJson && geoJson.properties ? geoJson.properties : {};
  return {
    rowNumber: rowNumber,
    boundaryId: String(row[0] || '').trim(),
    boundaryType: normalizeMapBoundaryType_(row[1]),
    boundaryName: String(row[2] || '').trim(),
    villageNo: String(row[3] || '').trim(),
    color: sanitizeMapBoundaryColor_(row[4]),
    lineStyle: normalizeMapBoundaryLineStyle_(props.lineStyle),
    fillMode: normalizeMapBoundaryFillMode_(props.fillMode, props.fillEnabled),
    fillEnabled: normalizeMapBoundaryFillMode_(props.fillMode, props.fillEnabled) !== 'outline',
    geoJson: geoJson,
    pointCount: String(row[6] || '').trim(),
    createdAt: String(row[7] || '').trim(),
    updatedAt: String(row[8] || '').trim(),
    createdBy: String(row[9] || '').trim(),
    updatedBy: String(row[10] || '').trim()
  };
}

function getMapBoundariesFromSheet_(ss) {
  const sheet = getMapBoundarySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, MAP_BOUNDARY_HEADERS.length).getDisplayValues();
  return values.map(function(row, index) {
    return mapBoundaryRowToObject_(row, index + 2);
  }).filter(function(item) {
    return item.boundaryId && item.geoJson;
  });
}

function getMapBoundaries() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    return {
      ok: true,
      sheetName: CONFIG.MAP_BOUNDARY_SHEET_NAME,
      boundaries: getMapBoundariesFromSheet_(ss),
      updatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')
    };
  } catch (error) {
    return { ok: false, message: 'อ่านข้อมูลขอบเขตแผนที่ไม่สำเร็จ: ' + getErrorMessage_(error), boundaries: [] };
  }
}

function findMapBoundaryRowById_(sheet, boundaryId) {
  const id = String(boundaryId || '').trim();
  if (!id || sheet.getLastRow() < 2) return -1;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === id) return i + 2;
  }
  return -1;
}

function saveMapBoundary(password, boundaryData) {
  if (arguments.length === 0) return 'ฟังก์ชัน saveMapBoundary ใช้จากหน้าเว็บเท่านั้น';
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  if (!boundaryData || typeof boundaryData !== 'object') throw new Error('ไม่พบข้อมูลขอบเขตที่ต้องการบันทึก');
  assertMapBoundaryEditPermission_(boundaryData);

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getMapBoundarySheet_(ss);
  const feature = normalizeMapBoundaryFeature_(boundaryData);
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
  const userName = getAuditUserName_(boundaryData);
  const boundaryId = String(boundaryData.boundaryId || '').trim() || ('BND-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyyMMddHHmmss') + '-' + Utilities.getUuid().slice(0, 8));
  const rowNumber = findMapBoundaryRowById_(sheet, boundaryId);
  let createdAt = now;
  let createdBy = userName;
  if (rowNumber > 1) {
    const old = sheet.getRange(rowNumber, 1, 1, MAP_BOUNDARY_HEADERS.length).getDisplayValues()[0] || [];
    createdAt = String(old[7] || '').trim() || now;
    createdBy = String(old[9] || '').trim() || userName;
  }
  const props = feature.properties || {};
  const pointCount = Math.max(0, (feature.geometry.coordinates[0] || []).length - 1);
  const output = [
    boundaryId,
    props.boundaryType || 'village',
    props.boundaryName || '',
    props.villageNo || '',
    sanitizeMapBoundaryColor_(props.color),
    JSON.stringify(feature),
    pointCount,
    createdAt,
    now,
    createdBy,
    userName
  ];
  const targetRow = rowNumber > 1 ? rowNumber : sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, 1, MAP_BOUNDARY_HEADERS.length).setValues([output]);
  return {
    ok: true,
    message: rowNumber > 1 ? 'แก้ไขขอบเขตแผนที่เรียบร้อย' : 'บันทึกขอบเขตแผนที่เรียบร้อย',
    boundary: mapBoundaryRowToObject_(output, targetRow),
    boundaries: getMapBoundariesFromSheet_(ss)
  };
}

function deleteMapBoundary(password, boundaryId, auditData) {
  if (arguments.length === 0) return 'ฟังก์ชัน deleteMapBoundary ใช้จากหน้าเว็บเท่านั้น';
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  assertMapBoundaryEditPermission_(auditData || {});
  const id = String(boundaryId || '').trim();
  if (!id) throw new Error('ไม่พบรหัสขอบเขตที่ต้องการลบ');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getMapBoundarySheet_(ss);
  const rowNumber = findMapBoundaryRowById_(sheet, id);
  if (rowNumber < 2) throw new Error('ไม่พบขอบเขตที่ต้องการลบ');
  sheet.deleteRow(rowNumber);
  return {
    ok: true,
    message: 'ลบขอบเขตแผนที่เรียบร้อย',
    boundaries: getMapBoundariesFromSheet_(ss)
  };
}

function setupProjectDataSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss, false);

  prepareProjectDataSheet_(sheet);

  return {
    ok: true,
    message: 'สร้าง/เตรียมชีทฐานข้อมูลโครงการเรียบร้อย',
    dataSheetName: sheet.getName(),
    dataSheetGid: sheet.getSheetId(),
    headers: PROJECT_DATA_HEADERS
  };
}

function resetProjectDataSheetFromOld() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss, false);
  sheet.clearContents();
  writeProjectDataHeaders_(sheet);
  const importedRows = importLegacyDataToProjectDataSheet_(ss, sheet, true);
  return {
    ok: true,
    message: 'ล้างและนำเข้าข้อมูลจากชีทเดิมใหม่เรียบร้อย',
    dataSheetName: sheet.getName(),
    dataSheetGid: sheet.getSheetId(),
    importedRows: importedRows
  };
}

function clearProjectData() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss, false);
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), PROJECT_DATA_HEADERS.length)).clearContent();
  }

  return 'ล้างข้อมูลโครงการเรียบร้อยแล้ว เหลือหัวตารางไว้';
}

/**
 * ชีทที่ Dashboard ใช้อ่าน/เพิ่ม/แก้ไข/ลบจริง
 */
function getProjectDataSheet_(ss, allowImport) {
  let sheet = ss.getSheetByName(CONFIG.DATA_SHEET_NAME);

  if (!sheet && CONFIG.DATA_SHEET_GID) {
    try {
      sheet = getSheetByGid_(ss, CONFIG.DATA_SHEET_GID);
    } catch (error) {
      sheet = null;
    }
  }

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DATA_SHEET_NAME);
  }

  prepareProjectDataSheet_(sheet);
  return sheet;
}

/** เพิ่มหัวคอลัมน์ที่ขาดต่อท้าย โดยไม่เปลี่ยนหัวเดิมหรือข้อมูลเดิม */
function prepareProjectDataSheet_(sheet) {
  if (sheet.getLastRow() < 1) {
    writeProjectDataHeaders_(sheet);
    return;
  }
  const lastCol = sheet.getLastColumn();
  const currentHeaders = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0]
    : [];
  const existing = currentHeaders.map(function(value) { return normalize_(value); });
  const acceptanceAliases = ['วันตรวจรับงาน', 'วันที่ตรวจรับงาน', 'วันตรวจรับ', 'วันที่ตรวจรับ'].map(normalize_);
  const missing = PROJECT_DATA_HEADERS.filter(function(header) {
    if (existing.indexOf(normalize_(header)) >= 0) return false;
    if (header === 'วันตรวจรับงาน' && acceptanceAliases.some(function(alias) {
      return existing.indexOf(alias) >= 0;
    })) return false;
    return true;
  });
  if (missing.length) {
    const requiredColumns = lastCol + missing.length;
    if (sheet.getMaxColumns() < requiredColumns) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredColumns - sheet.getMaxColumns());
    }
    const range = sheet.getRange(1, lastCol + 1, 1, missing.length);
    range.setValues([missing]);
    try { range.setFontWeight('bold').setBackground('#e0f2fe'); } catch (error) {}
  }
  sheet.setFrozenRows(1);
}

function writeProjectDataHeaders_(sheet) {
  sheet.getRange(1, 1, 1, PROJECT_DATA_HEADERS.length)
    .setValues([PROJECT_DATA_HEADERS]);

  sheet.setFrozenRows(1);

  try {
    sheet.getRange(1, 1, 1, PROJECT_DATA_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#e0f2fe');

    sheet.autoResizeColumns(1, Math.min(PROJECT_DATA_HEADERS.length, 20));
  } catch (error) {
    // ไม่จำเป็นต้องหยุดระบบ หากจัดรูปแบบไม่ได้
  }
}

function importLegacyDataToProjectDataSheet_(ss, targetSheet, forceClear) {
  let sourceSheet;

  try {
    sourceSheet = getSheetByGid_(ss, 0);
  } catch (error) {
    return 0;
  }

  const sourceLastRow = sourceSheet.getLastRow();
  const sourceLastCol = Math.min(sourceSheet.getLastColumn(), CONFIG.MAX_COLUMNS);

  if (sourceLastRow < 1 || sourceLastCol < 1) return 0;

  const sourceDisplay = sourceSheet
    .getRange(1, 1, Math.min(sourceLastRow, CONFIG.MAX_ROWS), sourceLastCol)
    .getDisplayValues();

  const headerIndex = CONFIG.HEADER_ROW > 0
    ? CONFIG.HEADER_ROW - 1
    : detectHeaderRow_(sourceDisplay);

  if (headerIndex < 0 || headerIndex >= sourceDisplay.length - 1) return 0;

  const sourceHeaders = sourceDisplay[headerIndex]
    .map(function(header, index) {
      return String(header || ('คอลัมน์ ' + (index + 1))).trim();
    });

  const sourceAliases = buildAliasIndex_(sourceHeaders);
  const targetAliases = buildAliasIndex_(PROJECT_DATA_HEADERS);

  const outputRows = [];

  for (let r = headerIndex + 1; r < sourceDisplay.length; r++) {
    const row = sourceDisplay[r];

    if (!row.some(function(value) {
      return String(value || '').trim() !== '';
    })) {
      continue;
    }

    const formData = buildFormDataFromRow_(row, sourceAliases);

    if (!formData.projectName || !String(formData.projectName).trim()) {
      continue;
    }

    const output = new Array(PROJECT_DATA_HEADERS.length).fill('');
    setProjectOutputValues_(output, targetAliases, formData);
    outputRows.push(output);
  }

  if (forceClear) {
    targetSheet.clearContents();
    writeProjectDataHeaders_(targetSheet);
  }

  if (outputRows.length) {
    const startRow = Math.max(targetSheet.getLastRow() + 1, 2);
    targetSheet.getRange(startRow, 1, outputRows.length, PROJECT_DATA_HEADERS.length)
      .setValues(outputRows);
  }

  SpreadsheetApp.flush();

  return outputRows.length;
}

/**
 * แปลงข้อมูล 1 แถวจากหัวคอลัมน์ใด ๆ ให้เป็น field กลางของฟอร์ม
 */
function buildFormDataFromRow_(row, aliases) {
  const pick = function(names) {
    return pick_(row, aliases, names);
  };

  const lat = pick([
    'ละติจูด', 'latitude', 'พิกัดละติจูด', 'ค่าละติจูด', 'lat'
  ]);

  const lng = pick([
    'ลองจิจูด', 'ลอนจิจูด', 'longitude',
    'พิกัดลองจิจูด', 'ค่าลองจิจูด', 'lng', 'lon', 'long'
  ]);

  const coordinate = pick([
    'พิกัดโครงการ', 'พิกัดสถานที่', 'พิกัดที่ตั้ง',
    'พิกัด', 'ตำแหน่งโครงการ', 'ตำแหน่งที่ตั้ง',
    'latitude,longitude', 'lat,long', 'lat,lng',
    'google maps', 'googlemap', 'ลิงก์แผนที่', 'แผนที่'
  ]) || (lat && lng ? lat + ', ' + lng : '');

  const villageNo = pick(['หมู่ที่', 'หมู่', 'ม.', 'เลขหมู่']);
  const villageName = pick(['หมู่บ้าน', 'บ้าน', 'ชื่อหมู่บ้าน']);
  const contractorForRow = pick(['ผู้รับจ้าง', 'คู่สัญญา', 'บริษัท', 'ห้างหุ้นส่วน']);
  const sanitizeContractorManualValue = function(value) {
    const text = String(value || '').trim();
    return contractorForRow && text === contractorForRow ? '' : text;
  };

  return {
    projectName: pick(['ชื่อโครงการ', 'โครงการ', 'รายการโครงการ', 'ชื่องาน', 'รายการ', 'ชื่อรายการ']),
    distance: pick(['ระยะทาง', 'เส้นทาง']),
    localAgency: pick(['ชื่อหน่วยงานท้องถิ่น', 'หน่วยงานท้องถิ่น', 'ชื่อหน่วยงาน', 'หน่วยงาน']),
    workScope: pick(['ปริมาณงาน', 'รายละเอียดปริมาณงาน', 'รายละเอียดงาน']),
    contractorNoticeDate: pick(['วันที่ผู้รับจ้างแจ้งลงงาน', 'วันที่แจ้งลงงาน', 'แจ้งลงงาน', 'วันแจ้งลงงาน']),
    contractorDeliveryDate: pick(['วันที่ผู้รับจ้างส่งมอบงาน', 'วันที่ส่งมอบงาน', 'ส่งมอบงาน', 'วันส่งมอบงาน']),
    contractorNoticeDate: pick(['วันที่ผู้รับจ้างแจ้งลงงาน', 'วันที่แจ้งลงงาน', 'แจ้งลงงาน']),
    acceptanceDate: pick(['วันตรวจรับงาน', 'วันที่ตรวจรับงาน', 'วันตรวจรับ', 'วันที่ตรวจรับ']),

    budgetType: pick([
      'งบประมาณ', 'งบประเภท', 'ประเภทงบ', 'ประเภทงบประมาณ',
      'แหล่งงบประมาณ', 'แหล่งที่มาของงบประมาณ', 'แหล่งเงิน'
    ]),
    budgetYear: pick(['งบประมาณประจำปี', 'ปีงบประมาณ', 'ปีงบ', 'งบประมาณปี', 'พ.ศ.', 'ปี', 'ปีงบฯ']),

    orderNo: pick(['คำสั่งที่', 'เลขที่คำสั่ง', 'คำสั่ง']),
    orderDate: pick(['ลงวันที่คำสั่ง', 'วันที่คำสั่ง', 'ลงวันที่คำสั่งแต่งตั้ง', 'ลงวันที่']),
    contractNo: pick(['เลขที่สัญญา', 'สัญญาเลขที่', 'เลขสัญญา']),
    contractDate: pick(['ลงวันที่สัญญา', 'วันที่สัญญา', 'วันที่ลงสัญญา']),
    startDate: pick([
      'วันเริ่มสัญญา', 'เริ่มสัญญา', 'วันที่เริ่มสัญญา',
      'วันเริ่ม', 'วันที่เริ่ม', 'วันเริ่มงาน', 'วันที่เริ่มงาน',
      'เริ่มต้น', 'วันเริ่มต้น'
    ]),
    endDate: pick([
      'สิ้นสุดสัญญา', 'วันสิ้นสุดสัญญา', 'วันที่สิ้นสุดสัญญา',
      'วันสิ้นสุด', 'วันที่สิ้นสุด', 'วันสิ้นสุดงาน', 'วันที่สิ้นสุดงาน',
      'สิ้นสุด', 'วันครบกำหนด'
    ]),

    coordinate: coordinate,
    workValue: pick(['ค่างาน', 'ค่าจ้าง', 'ราคาจ้าง', 'วงเงินตามสัญญา', 'วงเงินสัญญา']),
    finePerDay: pick(['ค่าปรับวันละ', 'ค่าปรับ', 'ค่าปรับ/วัน', 'ค่าปรับ วันละ']),

    constructionSite: pick([
      'สถานที่ก่อสร้าง', 'สถานที่ดำเนินการ', 'พื้นที่ก่อสร้าง',
      'สถานที่', 'พื้นที่', 'ที่ตั้งโครงการ'
    ]) || (villageNo && villageName ? 'หมู่ที่ ' + villageNo + ' ' + villageName : ''),
    villageNo: villageNo,
    villageName: villageName,

    type: pick([
      'ประเภทโครงการ', 'ประเภทงาน', 'ประเภทงานก่อสร้าง',
      'ประเภทโครงการ/กิจกรรม', 'หมวดงาน', 'หมวดหมู่งาน',
      'หมวดโครงการ', 'ชนิดงาน', 'ลักษณะงาน', 'ลักษณะโครงการ',
      'กลุ่มงาน', 'ประเภท'
    ]),
    status: pick(['สถานะ', 'สถานะโครงการ', 'ผลการดำเนินงาน', 'ความคืบหน้า']),
    progress: pick(['ร้อยละความก้าวหน้า', 'ความก้าวหน้า', 'เปอร์เซ็นต์', '%', 'progress']),
    remainingDaysText: pick(['ระยะเวลาก่อนหมดสัญญา', 'วันคงเหลือ', 'จำนวนวันก่อนหมดสัญญา', 'วันก่อนหมดสัญญา']),

    supervisorCount: pick(['จำนวนผู้ควบคุมงาน']),
    supervisor: pick([
      'ผู้ควบคุมงาน คนที่ 1', 'ผู้ควบคุมงานคนที่1',
      'ผู้ควบคุมงาน 1', 'ผู้ควบคุมงาน1',
      'ผู้ควบคุมงาน', 'นายช่างผู้ควบคุมงาน'
    ]),
    supervisorPosition: pick([
      'ตำแหน่งผู้ควบคุมงาน คนที่ 1', 'ตำแหน่งผู้ควบคุมงานคนที่1',
      'ตำแหน่งผู้ควบคุมงาน 1', 'ตำแหน่งผู้ควบคุมงาน'
    ]),
    supervisor2: pick([
      'ผู้ควบคุมงาน คนที่ 2', 'ผู้ควบคุมงาน คนที่2', 'ผู้ควบคุมงานคนที่ 2', 'ผู้ควบคุมงานคนที่2',
      'ผู้ควบคุมงาน 2', 'ผู้ควบคุมงาน2', 'ผู้ควบคุมงาน คนที่ ๒', 'ผู้ควบคุมงานคนที่ ๒', 'ผู้ควบคุมงานคนที่๒',
      'ผู้ควบคุมงาน ๒', 'ผู้ควบคุมงาน๒', 'supervisor2', 'supervisor 2', 'supervisor_2', 'secondSupervisor'
    ]),
    supervisor2Position: pick([
      'ตำแหน่งผู้ควบคุมงาน คนที่ 2', 'ตำแหน่งผู้ควบคุมงาน คนที่2', 'ตำแหน่งผู้ควบคุมงานคนที่ 2', 'ตำแหน่งผู้ควบคุมงานคนที่2',
      'ตำแหน่งผู้ควบคุมงาน 2', 'ตำแหน่งผู้ควบคุมงาน2', 'ตำแหน่งผู้ควบคุมงาน คนที่ ๒', 'ตำแหน่งผู้ควบคุมงานคนที่ ๒',
      'ตำแหน่งผู้ควบคุมงานคนที่๒', 'ตำแหน่งผู้ควบคุมงาน ๒', 'ตำแหน่งผู้ควบคุมงาน๒', 'supervisor2Position', 'supervisor 2 position', 'supervisor_2_position'
    ]),

    contractor: contractorForRow,
    contractorAddress: sanitizeContractorManualValue(pick(['ที่อยู่ห้าง', 'ที่อยู่ผู้รับจ้าง', 'ที่อยู่บริษัท'])),
    contractorPhone: sanitizeContractorManualValue(pick(['เบอร์ของผู้รับจ้าง', 'เบอร์ผู้รับจ้าง', 'เบอร์โทรผู้รับจ้าง', 'เบอร์'])),
    taxId: sanitizeContractorManualValue(pick(['เลขประจำตัวผู้เสียภาษี', 'เลขผู้เสียภาษี', 'เลขภาษี'])),

    committeeCount: pick(['จำนวนคณะกรรมการตรวจรับงานจ้าง', 'จำนวนคณะกรรมการตรวจการจ้าง', 'จำนวนกรรมการตรวจรับ']),
    chairmanName: pick(['ประธานกรรมการตรวจรับงานจ้าง', 'ประธานกรรมการตรวจรับ', 'ประธานตรวจรับ', 'ประธาน']),
    chairmanPosition: pick(['ตำแหน่งประธาน', 'ตำแหน่งประธานกรรมการ', 'ตำแหน่งประธานกรรมการตรวจรับงานจ้าง']),
    chairmanDepartment: pick(['สังกัดประธาน', 'หน่วยงานประธาน', 'สังกัดประธานกรรมการตรวจรับงานจ้าง']),

    committee1Name: pick(['กรรมการตรวจรับงานจ้าง 1', 'กรรมการตรวจรับงานจ้าง1', 'กรรมการตรวจรับ 1', 'กรรมการตรวจรับ1', 'กรรมการ1', 'กรรมการ 1']),
    committee1Position: pick(['ตำแหน่งกรรมการ 1', 'ตำแหน่งกรรมการ1']),
    committee1Department: pick(['สังกัดกรรมการ 1', 'สังกัดกรรมการ1']),

    committee2Name: pick(['กรรมการตรวจรับงานจ้าง 2', 'กรรมการตรวจรับงานจ้าง2', 'กรรมการตรวจรับ 2', 'กรรมการตรวจรับ2', 'กรรมการ2', 'กรรมการ 2']),
    committee2Position: pick(['ตำแหน่งกรรมการ 2', 'ตำแหน่งกรรมการ2']),
    committee2Department: pick(['สังกัดกรรมการ 2', 'สังกัดกรรมการ2']),

    committee3Name: pick(['กรรมการตรวจรับงานจ้าง 3', 'กรรมการตรวจรับงานจ้าง3', 'กรรมการตรวจรับ 3', 'กรรมการตรวจรับ3', 'กรรมการ3', 'กรรมการ 3']),
    committee3Position: pick(['ตำแหน่งกรรมการ 3', 'ตำแหน่งกรรมการ3']),
    committee3Department: pick(['สังกัดกรรมการ 3', 'สังกัดกรรมการ3']),

    committee4Name: pick(['กรรมการตรวจรับงานจ้าง 4', 'กรรมการตรวจรับงานจ้าง4', 'กรรมการตรวจรับ 4', 'กรรมการตรวจรับ4', 'กรรมการ4', 'กรรมการ 4']),
    committee4Position: pick(['ตำแหน่งกรรมการ 4', 'ตำแหน่งกรรมการ4']),
    committee4Department: pick(['สังกัดกรรมการ 4', 'สังกัดกรรมการ4']),

    note: pick(['หมายเหตุ'])
  };
}



function doGet() {
  setupUserSheet();
  setupProjectDataSheet();
  setupLocalRoadSheet();
  setupMemoHistorySheet();
  setupWorkReductionHistorySheet();
  setupCompletionReportHistorySheet();
  setupContractorNoticeHistorySheet();

  const template = HtmlService.createTemplateFromFile('Index');
  template.appTitle = CONFIG.APP_TITLE;
  return template.evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * รันฟังก์ชันนี้จากหน้า Apps Script ก่อน เพื่ออนุญาตสิทธิ์และตรวจสอบชีต
 */

/**
 * ล้างค่ารหัสผ่านส่วนกลางรุ่นเก่า
 */
function setupEntryPassword() {
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.ENTRY_PASSWORD_PROPERTY);
  return 'ล้างรหัสผ่านส่วนกลางรุ่นเก่าแล้ว';
}

/**
 * ตรวจรหัสผ่านจากหน้าเว็บ
 */
function testUserSessionSecurity() {
  return 'ระบบใช้รูปแบบการเข้าสู่ระบบเดิม โดยไม่กำหนดอายุเซสชัน 6 ชั่วโมง';
}

function setupPerformanceEvaluationHistorySheet() {
  const sheet = getPerformanceEvaluationHistorySheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
  return { ok: true, sheetName: sheet.getName(), gid: sheet.getSheetId() };
}

function getPerformanceEvaluationHistories() {
  const sheet = getPerformanceEvaluationHistorySheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { ok: true, histories: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, PERFORMANCE_EVALUATION_HISTORY_HEADERS.length).getDisplayValues();
  const histories = values.map(function(row, index) {
    const item = {};
    PERFORMANCE_EVALUATION_HISTORY_HEADERS.forEach(function(header, column) { item[header] = row[column] || ''; });
    item.__row = index + 2;
    return item;
  }).sort(function(a, b) { return b.__row - a.__row; });
  histories.forEach(function(item) { delete item.__row; });
  return { ok: true, histories: histories };
}

function normalizeEvaluationHistoryKey_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function findPerformanceEvaluationRowsByKey_(sheet, employee, type, round, year) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, PERFORMANCE_EVALUATION_HISTORY_HEADERS.length).getDisplayValues();
  const employeeIndex = PERFORMANCE_EVALUATION_HISTORY_HEADERS.indexOf('ชื่อผู้รับการประเมิน');
  const roundIndex = PERFORMANCE_EVALUATION_HISTORY_HEADERS.indexOf('รอบการประเมิน');
  const yearIndex = PERFORMANCE_EVALUATION_HISTORY_HEADERS.indexOf('ปีงบประมาณ');
  // หนึ่งคนมีได้หนึ่งรายการต่อรอบและปี โดยไม่สร้างแถวซ้ำเมื่อเปลี่ยนชนิดแบบประเมิน
  const target = [employee, round, year].map(normalizeEvaluationHistoryKey_);
  return values.reduce(function(rows, row, index) {
    const actual = [row[employeeIndex], row[roundIndex], row[yearIndex]].map(normalizeEvaluationHistoryKey_);
    if (actual.every(function(value, i) { return value === target[i]; })) rows.push(index + 2);
    return rows;
  }, []);
}

function savePerformanceEvaluationHistory(password, data) {
  if (!isValidEntryPassword_(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
  data = data || {};
  if (!String(data.employee || '').trim()) throw new Error('กรุณาเลือกชื่อผู้รับการประเมิน');
  if (!String(data.round || '').trim() || !String(data.year || '').trim()) throw new Error('กรุณาระบุรอบและปีงบประมาณ');
  const sheet = getPerformanceEvaluationHistorySheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
  const now = new Date();
  const matches = findPerformanceEvaluationRowsByKey_(sheet, data.employee, data.evaluationType, data.round, data.year);
  let existingRow = matches.length ? matches[matches.length - 1] : 0;
  matches.slice(0, -1).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
    if (rowNumber < existingRow) existingRow--;
  });
  const previous = existingRow ? sheet.getRange(existingRow, 1, 1, PERFORMANCE_EVALUATION_HISTORY_HEADERS.length).getValues()[0] : [];
  const previousId = existingRow ? String(previous[0] || '').trim() : '';
  const previousCount = existingRow ? Number(previous[8] || 0) : 0;
  const evaluationId = previousId || String(data.evaluationId || '').trim() || ('EV-' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100));
  const rowObject = {
    'รหัสแบบประเมิน': evaluationId,
    'วันที่สร้าง': existingRow ? (previous[1] || now) : now,
    'วันที่แก้ไข': now,
    'ชื่อผู้รับการประเมิน': data.employee || '',
    'ประเภทแบบประเมิน': data.evaluationType || '',
    'ชื่อประเภทแบบประเมิน': data.evaluationTypeLabel || '',
    'รอบการประเมิน': data.round || '',
    'ปีงบประมาณ': data.year || '',
    'จำนวนครั้งที่บันทึก': previousCount + 1,
    'ข้อมูลแบบประเมิน JSON': data.dataJson || '',
    'HTML แบบประเมิน': data.html || ''
  };
  const row = PERFORMANCE_EVALUATION_HISTORY_HEADERS.map(function(header) { return rowObject[header] === undefined ? '' : rowObject[header]; });
  applyAuditToHistoryRow_(sheet, PERFORMANCE_EVALUATION_HISTORY_HEADERS, row, existingRow, data);
  if (existingRow) sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  return { ok: true, evaluationId: evaluationId, overwritten: !!existingRow, saveCount: previousCount + 1, message: existingRow ? 'บันทึกทับรายการเดิมแล้ว' : 'บันทึกแบบประเมินแล้ว' };
}

function getPerformanceEvaluationHistorySheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.PERFORMANCE_EVALUATION_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.PERFORMANCE_EVALUATION_HISTORY_SHEET_NAME);
  const width = PERFORMANCE_EVALUATION_HISTORY_HEADERS.length;
  if (sheet.getLastRow() < 1) sheet.getRange(1, 1, 1, width).setValues([PERFORMANCE_EVALUATION_HISTORY_HEADERS]);
  else {
    const headers = sheet.getRange(1, 1, 1, Math.max(width, sheet.getLastColumn())).getDisplayValues()[0];
    if (!PERFORMANCE_EVALUATION_HISTORY_HEADERS.every(function(header, i) { return String(headers[i] || '').trim() === header; })) sheet.getRange(1, 1, 1, width).setValues([PERFORMANCE_EVALUATION_HISTORY_HEADERS]);
  }
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#e9d5ff'); } catch (error) {}
  return sheet;
}

/**
 * ฟังก์ชันนี้กด Run ได้ เพื่อยืนยันสิทธิ์ Apps Script
 */
function testOpenSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss, false);
  return 'เปิดชีทฐานข้อมูลโครงการได้: ' + sheet.getName() + ' (gid=' + sheet.getSheetId() + ')';
}

function checkEntryPassword(password) {
  return isValidEntryPassword_(password);
}

function isValidEntryPassword_(password) {
  return true;
}

function getAuditUserName_(data) {
  const value = data && (data.auditUserName || data.updatedBy || data.createdBy || data.userName || data.username);
  return String(value || '').trim() || 'ไม่ระบุผู้ใช้';
}

function applyAuditToHistoryRow_(sheet, headers, row, existingRow, data) {
  const createdByIndex = headers.indexOf('สร้างโดย');
  const updatedByIndex = headers.indexOf('แก้ไขโดย');
  if (createdByIndex < 0 && updatedByIndex < 0) return row;
  const userName = getAuditUserName_(data);
  if (createdByIndex >= 0) {
    let oldCreatedBy = '';
    if (existingRow) {
      try { oldCreatedBy = sheet.getRange(existingRow, createdByIndex + 1).getDisplayValue(); } catch (error) { oldCreatedBy = ''; }
    }
    row[createdByIndex] = oldCreatedBy || userName;
  }
  if (updatedByIndex >= 0) row[updatedByIndex] = userName;
  return row;
}

/* ===== ประวัติแจ้งกรณีผู้เสนอราคาต่ำกว่าราคากลาง 15% ===== */
function getLowBidNoticeSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.LOW_BID_NOTICE_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.LOW_BID_NOTICE_HISTORY_SHEET_NAME);
  const n = LOW_BID_NOTICE_HISTORY_HEADERS.length;
  if (sheet.getLastRow() < 1) sheet.getRange(1, 1, 1, n).setValues([LOW_BID_NOTICE_HISTORY_HEADERS]);
  else {
    const headers = sheet.getRange(1, 1, 1, Math.max(n, sheet.getLastColumn())).getDisplayValues()[0];
    if (!LOW_BID_NOTICE_HISTORY_HEADERS.every(function(h, i) { return String(headers[i] || '').trim() === h; })) sheet.getRange(1, 1, 1, n).setValues([LOW_BID_NOTICE_HISTORY_HEADERS]);
  }
  sheet.setFrozenRows(1);
  try { sheet.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#fee2e2'); } catch (error) {}
  return sheet;
}

function getLowBidNoticeHistories(projectId) {
  const sheet = getLowBidNoticeSheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
  const last = sheet.getLastRow();
  if (last <= 1) return { ok: true, histories: [] };
  const display = sheet.getRange(2, 1, last - 1, LOW_BID_NOTICE_HISTORY_HEADERS.length).getDisplayValues();
  const raw = sheet.getRange(2, 1, last - 1, LOW_BID_NOTICE_HISTORY_HEADERS.length).getValues();
  const histories = display.map(function(row, ri) {
    const item = {};
    LOW_BID_NOTICE_HISTORY_HEADERS.forEach(function(h, i) { item[h] = row[i] || ''; });
    item.__time = raw[ri][2] instanceof Date ? raw[ri][2].getTime() : ri;
    return item;
  }).filter(function(item) { return String(item['รหัสโครงการ'] || '') === String(projectId || ''); })
    .sort(function(a, b) { return b.__time - a.__time; }).map(function(item) { delete item.__time; return item; });
  return { ok: true, histories: histories };
}

function saveLowBidNoticeHistory(password, data) {
  if (!data || !String(data.projectId || '').trim()) throw new Error('กรุณาเลือกโครงการ');
  const sheet = getLowBidNoticeSheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
  const now = new Date();
  const id = String(data.lowBidId || '').trim() || ('LB-' + Utilities.getUuid());
  let rowNo = 0;
  const last = sheet.getLastRow();
  if (last > 1) {
    const ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { rowNo = i + 2; break; }
  }
  const obj = {
    'รหัสเอกสารราคาต่ำ': id, 'วันที่สร้าง': now, 'วันที่แก้ไข': now,
    'รหัสโครงการ': data.projectId || '', 'ชื่อโครงการ': data.projectName || '',
    'ผู้เสนอราคา': data.contractor || '', 'วงเงินงบประมาณ': data.budget || '',
    'ราคากลาง': data.centralPrice || '', 'ราคาที่เสนอ': data.offerPrice || '',
    'ต่ำกว่าราคากลางร้อยละ': data.percentBelowCentral || '',
    'ข้อมูลเอกสาร JSON': data.dataJson || '', 'HTML ชุดเอกสาร': data.documentHtml || ''
  };
  const row = LOW_BID_NOTICE_HISTORY_HEADERS.map(function(h) { return obj[h] === undefined ? '' : obj[h]; });
  applyAuditToHistoryRow_(sheet, LOW_BID_NOTICE_HISTORY_HEADERS, row, rowNo, data);
  if (rowNo) {
    row[1] = sheet.getRange(rowNo, 2).getValue() || now;
    sheet.getRange(rowNo, 1, 1, row.length).setValues([row]);
  } else sheet.appendRow(row);
  return { ok: true, lowBidId: id, message: rowNo ? 'แก้ไขประวัติเรียบร้อยแล้ว' : 'บันทึกประวัติเรียบร้อยแล้ว' };
}

function deleteLowBidNoticeHistory(lowBidId) {
  const sheet = getLowBidNoticeSheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID));
  const last = sheet.getLastRow();
  if (last <= 1) return { ok: true };
  const ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(lowBidId || '')) { sheet.deleteRow(i + 2); return { ok: true, message: 'ลบประวัติเรียบร้อยแล้ว' }; }
  }
  return { ok: true, message: 'ไม่พบรายการ' };
}

function setProjectAuditValues_(output, aliases, formData, isEdit) {
  const userName = getAuditUserName_(formData);
  if (!isEdit) {
    setOutputValue_(output, aliases, ['สร้างโดย', 'ผู้สร้าง', 'ชื่อผู้สร้าง'], userName);
  }
  setOutputValue_(output, aliases, ['แก้ไขโดย', 'ผู้แก้ไข', 'ชื่อผู้แก้ไข'], userName);
}

/**
 * บันทึกข้อมูลจากหน้าเพิ่มข้อมูลลงชีต
 */
function saveProjectEntry(password, formData) {
  if (arguments.length === 0) {
    return 'ฟังก์ชัน saveProjectEntry ใช้จากหน้าเว็บเท่านั้น';
  }

  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }

  if (!formData || typeof formData !== 'object') {
    throw new Error('ไม่พบข้อมูลที่ต้องการบันทึก');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss);

  const lastRow = Math.max(sheet.getLastRow(), 1);
  const lastColumn = Math.min(
    Math.max(sheet.getLastColumn(), 1),
    CONFIG.MAX_COLUMNS
  );

  const sampleRows = Math.min(lastRow, 50);
  const display = sheet
    .getRange(1, 1, sampleRows, lastColumn)
    .getDisplayValues();

  const headerIndex = CONFIG.HEADER_ROW > 0
    ? CONFIG.HEADER_ROW - 1
    : detectHeaderRow_(display);

  if (headerIndex < 0) {
    throw new Error('ไม่พบหัวตารางสำหรับบันทึกข้อมูล');
  }

  const headers = sheet
    .getRange(headerIndex + 1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function(header, index) {
      return String(header || ('คอลัมน์ ' + (index + 1))).trim();
    });

  const aliases = buildAliasIndex_(headers);
  const output = new Array(lastColumn).fill('');

  try {
    formData.status = resolveAutoProjectStatus_('', formData.status, formData.acceptanceDate, buildAutoStatusSource_(ss));
  } catch (error) {
    if (String(formData.acceptanceDate || '').trim()) formData.status = 'แล้วเสร็จ';
  }

  setProjectOutputValues_(output, aliases, formData);
  setProjectAuditValues_(output, aliases, formData, false);

  sheet.appendRow(output);

  return {
    ok: true,
    message: 'บันทึกข้อมูลเรียบร้อย',
    rowNumber: sheet.getLastRow()
  };
}


function getProjectByRowNumberForEdit(password, rowNumber) {
  if (arguments.length === 0) {
    return 'ฟังก์ชัน getProjectByRowNumberForEdit ใช้จากหน้าเว็บเท่านั้น';
  }

  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }

  return getProjectByRowNumber(rowNumber);
}

function getProjectByRowNumber(rowNumber) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss);
  const row = Number(rowNumber);

  if (!row || row < 2 || row > sheet.getLastRow()) {
    throw new Error('ไม่พบแถวข้อมูลโครงการ');
  }

  const lastColumn = Math.min(Math.max(sheet.getLastColumn(), 1), CONFIG.MAX_COLUMNS);
  const sampleRows = Math.min(sheet.getLastRow(), 50);
  const display = sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues();

  const headerIndex = CONFIG.HEADER_ROW > 0
    ? CONFIG.HEADER_ROW - 1
    : detectHeaderRow_(display);

  if (headerIndex < 0) {
    throw new Error('ไม่พบหัวตาราง');
  }

  if (row <= headerIndex + 1) {
    throw new Error('แถวที่เลือกเป็นหัวตาราง ไม่ใช่ข้อมูลโครงการ');
  }

  const headers = sheet
    .getRange(headerIndex + 1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function(header, index) {
      return String(header || ('คอลัมน์ ' + (index + 1))).trim();
    });

  const values = sheet.getRange(row, 1, 1, lastColumn).getDisplayValues()[0];
  const aliases = buildAliasIndex_(headers);
  const raw = {};

  headers.forEach(function(header, index) {
    raw[header] = values[index];
  });

  try {
    const autoStatusSource = buildAutoStatusSource_(ss);
    const statusFromSheet = pick_(values, aliases, ['สถานะ', 'สถานะโครงการ', 'ผลการดำเนินงาน', 'ความคืบหน้า']) || '';
    const acceptanceDate = pick_(values, aliases, ['วันตรวจรับงาน', 'วันที่ตรวจรับงาน', 'วันตรวจรับ', 'วันที่ตรวจรับ']) || '';
    raw['สถานะ'] = resolveAutoProjectStatus_(String(row), statusFromSheet, acceptanceDate, autoStatusSource);
    if (acceptanceDate) raw['วันตรวจรับงาน'] = acceptanceDate;
  } catch (error) {
    // ถ้าคำนวณสถานะอัตโนมัติไม่ได้ ให้คงค่าจากชีทเดิมไว้
  }

  return {
    ok: true,
    rowNumber: row,
    raw: raw
  };
}

function updateProjectEntry(password, rowNumber, formData) {
  if (arguments.length === 0) {
    return 'ฟังก์ชัน updateProjectEntry ใช้จากหน้าเว็บเท่านั้น ห้ามกด Run ตรง ๆ';
  }

  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }

  if (!formData || typeof formData !== 'object') {
    throw new Error('ไม่พบข้อมูลที่ต้องการแก้ไข');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss);
  const row = Number(rowNumber);

  if (!row || row < 2 || row > sheet.getLastRow()) {
    throw new Error('ไม่พบแถวข้อมูลโครงการสำหรับแก้ไข');
  }

  const lastColumn = Math.min(Math.max(sheet.getLastColumn(), 1), CONFIG.MAX_COLUMNS);
  const sampleRows = Math.min(sheet.getLastRow(), 50);
  const display = sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues();

  const headerIndex = CONFIG.HEADER_ROW > 0
    ? CONFIG.HEADER_ROW - 1
    : detectHeaderRow_(display);

  if (headerIndex < 0) {
    throw new Error('ไม่พบหัวตารางสำหรับแก้ไขข้อมูล');
  }

  if (row <= headerIndex + 1) {
    throw new Error('ไม่สามารถแก้ไขแถวหัวตารางได้');
  }

  const headers = sheet
    .getRange(headerIndex + 1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function(header, index) {
      return String(header || ('คอลัมน์ ' + (index + 1))).trim();
    });

  const aliases = buildAliasIndex_(headers);
  const current = sheet.getRange(row, 1, 1, lastColumn).getDisplayValues()[0];
  const output = current.slice();

  try {
    formData.status = resolveAutoProjectStatus_(String(row), formData.status, formData.acceptanceDate, buildAutoStatusSource_(ss));
  } catch (error) {
    if (String(formData.acceptanceDate || '').trim()) formData.status = 'แล้วเสร็จ';
  }

  setProjectOutputValues_(output, aliases, formData);
  setProjectAuditValues_(output, aliases, formData, true);

  let updatedColumns = 0;

  for (let col = 0; col < lastColumn; col++) {
    const beforeValue = String(current[col] ?? '').trim();
    const afterValue = String(output[col] ?? '').trim();

    if (beforeValue !== afterValue) {
      sheet.getRange(row, col + 1).setValue(afterValue);
      updatedColumns++;
    }
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    message: updatedColumns > 0
      ? 'แก้ไขข้อมูลโครงการเรียบร้อยแล้ว'
      : 'ตรวจสอบแล้ว ไม่มีข้อมูลที่เปลี่ยนแปลง หรือหัวคอลัมน์ไม่ตรงกับฟอร์ม',
    rowNumber: row,
    updatedColumns: updatedColumns
  };
}

function deleteProjectEntry(password, rowNumber) {
  if (arguments.length === 0) {
    return 'ฟังก์ชัน deleteProjectEntry ใช้จากหน้าเว็บเท่านั้น';
  }

  if (!isValidEntryPassword_(password)) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss);
  const row = Number(rowNumber);

  if (!row || row < 2 || row > sheet.getLastRow()) {
    throw new Error('ไม่พบแถวข้อมูลโครงการสำหรับลบ');
  }

  const lastColumn = Math.min(Math.max(sheet.getLastColumn(), 1), CONFIG.MAX_COLUMNS);
  const sampleRows = Math.min(sheet.getLastRow(), 50);
  const display = sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues();

  const headerIndex = CONFIG.HEADER_ROW > 0
    ? CONFIG.HEADER_ROW - 1
    : detectHeaderRow_(display);

  if (row <= headerIndex + 1) {
    throw new Error('ไม่สามารถลบแถวหัวตารางได้');
  }

  sheet.deleteRow(row);

  return {
    ok: true,
    message: 'ลบโครงการเรียบร้อยแล้ว'
  };
}

function setProjectOutputValues_(output, aliases, formData) {
  const torPriceFields = {
    torPriceOrderNo:'เลขที่คำสั่ง TOR/ราคากลาง', torPriceOrderDate:'ลงวันที่คำสั่ง TOR/ราคากลาง',
    torChair:'ประธานกรรมการ TOR', torMember1:'กรรมการ TOR 1', torMember2:'กรรมการ TOR 2',
    priceChair:'ประธานกรรมการราคากลาง', priceMember1:'กรรมการราคากลาง 1', priceMember2:'กรรมการราคากลาง 2'
  };
  Object.keys(torPriceFields).forEach(function(field) { setOutputValue_(output, aliases, [torPriceFields[field]], formData[field]); });
  setOutputValue_(output, aliases, [
    'ชื่อโครงการ', 'โครงการ', 'รายการโครงการ', 'ชื่องาน', 'รายการ', 'ชื่อรายการ'
  ], formData.projectName);

  setOutputValue_(output, aliases, ['ระยะทาง'], formData.distance);

  setOutputValue_(output, aliases, [
    'ชื่อหน่วยงานท้องถิ่น', 'หน่วยงานท้องถิ่น', 'ชื่อหน่วยงาน', 'หน่วยงาน'
  ], formData.localAgency);

  setOutputValue_(output, aliases, ['ปริมาณงาน', 'รายละเอียดปริมาณงาน', 'รายละเอียดงาน'], formData.workScope);
  setOutputValue_(output, aliases, ['วันที่ผู้รับจ้างแจ้งลงงาน', 'วันที่แจ้งลงงาน', 'แจ้งลงงาน', 'วันแจ้งลงงาน'], formData.contractorNoticeDate);
  setOutputValue_(output, aliases, ['วันที่ผู้รับจ้างส่งมอบงาน', 'วันที่ส่งมอบงาน', 'ส่งมอบงาน', 'วันส่งมอบงาน'], formData.contractorDeliveryDate);
  setOutputValue_(output, aliases, ['วันที่ผู้รับจ้างแจ้งลงงาน', 'วันที่แจ้งลงงาน', 'แจ้งลงงาน'], formData.contractorNoticeDate);
  setOutputValue_(output, aliases, ['วันตรวจรับงาน', 'วันที่ตรวจรับงาน', 'วันตรวจรับ', 'วันที่ตรวจรับ'], formData.acceptanceDate);

  setOutputValue_(output, aliases, [
    'งบประมาณ', 'งบประเภท', 'ประเภทงบ', 'ประเภทงบประมาณ',
    'แหล่งงบประมาณ', 'แหล่งที่มาของงบประมาณ', 'แหล่งเงิน'
  ], formData.budgetType);

  setOutputValue_(output, aliases, ['งบประมาณประจำปี', 'ปีงบประมาณ', 'ปีงบ', 'งบประมาณปี', 'พ.ศ.', 'ปี', 'ปีงบฯ'], formData.budgetYear);
  setOutputValue_(output, aliases, ['คำสั่งที่', 'เลขที่คำสั่ง', 'คำสั่ง'], formData.orderNo);
  setOutputValue_(output, aliases, ['ลงวันที่คำสั่ง', 'วันที่คำสั่ง', 'ลงวันที่'], formData.orderDate);
  setOutputValue_(output, aliases, ['เลขที่สัญญา', 'สัญญาเลขที่', 'เลขสัญญา'], formData.contractNo);
  setOutputValue_(output, aliases, ['ลงวันที่สัญญา', 'วันที่สัญญา'], formData.contractDate);
  setOutputValue_(output, aliases, ['วันเริ่มสัญญา', 'เริ่มสัญญา', 'วันที่เริ่มสัญญา', 'วันเริ่ม', 'วันที่เริ่ม', 'วันเริ่มงาน', 'วันที่เริ่มงาน', 'เริ่มต้น', 'วันเริ่มต้น'], formData.startDate);
  setOutputValue_(output, aliases, ['สิ้นสุดสัญญา', 'วันสิ้นสุดสัญญา', 'วันที่สิ้นสุดสัญญา', 'วันสิ้นสุด', 'วันที่สิ้นสุด', 'วันสิ้นสุดงาน', 'วันที่สิ้นสุดงาน', 'สิ้นสุด', 'วันครบกำหนด'], formData.endDate);

  setOutputValue_(output, aliases, [
    'พิกัดโครงการ', 'พิกัดสถานที่', 'พิกัดที่ตั้ง', 'พิกัด',
    'ตำแหน่งโครงการ', 'ตำแหน่งที่ตั้ง'
  ], formData.coordinate);

  setOutputValue_(output, aliases, ['ค่างาน', 'ค่าจ้าง', 'ราคาจ้าง', 'วงเงินตามสัญญา', 'วงเงินสัญญา'], formatWorkValueWithComma_(formData.workValue));
  setOutputValue_(output, aliases, ['ค่าปรับวันละ', 'ค่าปรับ', 'ค่าปรับ/วัน', 'ค่าปรับ วันละ'], formData.finePerDay);
  setOutputValue_(output, aliases, ['สถานที่ก่อสร้าง', 'สถานที่ดำเนินการ', 'พื้นที่ก่อสร้าง', 'สถานที่', 'พื้นที่', 'ที่ตั้งโครงการ'], formData.constructionSite);

  const projectLocation = resolveProjectLocation_(formData.constructionSite, formData.villageNo, formData.villageName);
  setOutputValue_(output, aliases, ['หมู่ที่', 'หมู่', 'ม.', 'เลขหมู่'], projectLocation.villageNo);
  setOutputValue_(output, aliases, ['หมู่บ้าน', 'บ้าน', 'ชื่อหมู่บ้าน'], projectLocation.villageName);

  setOutputValue_(output, aliases, [
    'ประเภทโครงการ', 'ประเภทงาน', 'ประเภทงานก่อสร้าง',
    'ประเภทโครงการ/กิจกรรม', 'หมวดงาน', 'หมวดหมู่งาน',
    'หมวดโครงการ', 'ชนิดงาน', 'ลักษณะงาน', 'ลักษณะโครงการ',
    'กลุ่มงาน', 'ประเภท'
  ], formData.type);

  setOutputValue_(output, aliases, ['สถานะ', 'สถานะโครงการ', 'ผลการดำเนินงาน', 'ความคืบหน้า'], formData.status);
  setOutputValue_(output, aliases, ['ร้อยละความก้าวหน้า', 'ความก้าวหน้า', 'เปอร์เซ็นต์', '%', 'progress'], normalizeProjectProgressWhole_(formData.progress));
  setOutputValue_(output, aliases, ['ระยะเวลาก่อนหมดสัญญา', 'วันคงเหลือ', 'จำนวนวันก่อนหมดสัญญา', 'วันก่อนหมดสัญญา'], formData.remainingDaysText);

  setOutputValue_(output, aliases, ['จำนวนผู้ควบคุมงาน'], formData.supervisorCount);
  setOutputValue_(output, aliases, ['ผู้ควบคุมงาน คนที่ 1', 'ผู้ควบคุมงานคนที่1', 'ผู้ควบคุมงาน 1', 'ผู้ควบคุมงาน1', 'ผู้ควบคุมงาน', 'นายช่างผู้ควบคุมงาน'], formData.supervisor);
  setOutputValue_(output, aliases, ['ตำแหน่งผู้ควบคุมงาน คนที่ 1', 'ตำแหน่งผู้ควบคุมงานคนที่1', 'ตำแหน่งผู้ควบคุมงาน 1', 'ตำแหน่งผู้ควบคุมงาน'], formData.supervisorPosition);
  setOutputValue_(output, aliases, ['ผู้ควบคุมงาน คนที่ 2', 'ผู้ควบคุมงาน คนที่2', 'ผู้ควบคุมงานคนที่ 2', 'ผู้ควบคุมงานคนที่2', 'ผู้ควบคุมงาน 2', 'ผู้ควบคุมงาน2', 'ผู้ควบคุมงาน คนที่ ๒', 'ผู้ควบคุมงานคนที่ ๒', 'ผู้ควบคุมงานคนที่๒', 'ผู้ควบคุมงาน ๒', 'ผู้ควบคุมงาน๒'], formData.supervisor2);
  setOutputValue_(output, aliases, ['ตำแหน่งผู้ควบคุมงาน คนที่ 2', 'ตำแหน่งผู้ควบคุมงาน คนที่2', 'ตำแหน่งผู้ควบคุมงานคนที่ 2', 'ตำแหน่งผู้ควบคุมงานคนที่2', 'ตำแหน่งผู้ควบคุมงาน 2', 'ตำแหน่งผู้ควบคุมงาน2', 'ตำแหน่งผู้ควบคุมงาน คนที่ ๒', 'ตำแหน่งผู้ควบคุมงานคนที่ ๒', 'ตำแหน่งผู้ควบคุมงานคนที่๒', 'ตำแหน่งผู้ควบคุมงาน ๒', 'ตำแหน่งผู้ควบคุมงาน๒'], formData.supervisor2Position);

  setOutputValue_(output, aliases, ['ผู้รับจ้าง', 'คู่สัญญา', 'บริษัท', 'ห้างหุ้นส่วน'], formData.contractor);

  // รับค่าที่ระบบเติมจากสมุดรายชื่อผู้รับจ้างหรือค่าที่ผู้ใช้แก้ไขเอง
  // ป้องกันเฉพาะกรณีเบราว์เซอร์เติมชื่อผู้รับจ้างซ้ำผิดช่อง
  const contractorTextForManualFields = String(formData.contractor || '').trim();
  let contractorAddressManual = String(formData.contractorAddress || '').trim();
  let contractorPhoneManual = String(formData.contractorPhone || '').trim();
  let taxIdManual = String(formData.taxId || '').trim();
  if (contractorTextForManualFields) {
    if (contractorAddressManual === contractorTextForManualFields) contractorAddressManual = '';
    if (contractorPhoneManual === contractorTextForManualFields) contractorPhoneManual = '';
    if (taxIdManual === contractorTextForManualFields) taxIdManual = '';
  }
  setOutputValue_(output, aliases, ['ที่อยู่ห้าง', 'ที่อยู่ผู้รับจ้าง', 'ที่อยู่บริษัท'], contractorAddressManual);
  setOutputValue_(output, aliases, ['เบอร์ของผู้รับจ้าง', 'เบอร์ผู้รับจ้าง', 'เบอร์โทรผู้รับจ้าง', 'เบอร์'], contractorPhoneManual);
  setOutputValue_(output, aliases, ['เลขประจำตัวผู้เสียภาษี', 'เลขผู้เสียภาษี', 'เลขภาษี'], taxIdManual);

  setOutputValue_(output, aliases, ['จำนวนคณะกรรมการตรวจรับงานจ้าง', 'จำนวนคณะกรรมการตรวจการจ้าง', 'จำนวนกรรมการตรวจรับ'], formData.committeeCount);

  setOutputValue_(output, aliases, ['ประธานกรรมการตรวจรับงานจ้าง', 'ประธานกรรมการตรวจรับ', 'ประธานตรวจรับ', 'ประธาน'], formData.chairmanName);
  setOutputValue_(output, aliases, ['ตำแหน่งประธาน', 'ตำแหน่งประธานกรรมการ', 'ตำแหน่งประธานกรรมการตรวจรับงานจ้าง'], formData.chairmanPosition);
  setOutputValue_(output, aliases, ['สังกัดประธาน', 'หน่วยงานประธาน', 'สังกัดประธานกรรมการตรวจรับงานจ้าง'], formData.chairmanDepartment);

  setOutputValue_(output, aliases, ['กรรมการตรวจรับงานจ้าง 1', 'กรรมการตรวจรับงานจ้าง1', 'กรรมการตรวจรับ 1', 'กรรมการตรวจรับ1', 'กรรมการ1', 'กรรมการ 1'], formData.committee1Name);
  setOutputValue_(output, aliases, ['ตำแหน่งกรรมการ 1', 'ตำแหน่งกรรมการ1'], formData.committee1Position);
  setOutputValue_(output, aliases, ['สังกัดกรรมการ 1', 'สังกัดกรรมการ1'], formData.committee1Department);

  setOutputValue_(output, aliases, ['กรรมการตรวจรับงานจ้าง 2', 'กรรมการตรวจรับงานจ้าง2', 'กรรมการตรวจรับ 2', 'กรรมการตรวจรับ2', 'กรรมการ2', 'กรรมการ 2'], formData.committee2Name);
  setOutputValue_(output, aliases, ['ตำแหน่งกรรมการ 2', 'ตำแหน่งกรรมการ2'], formData.committee2Position);
  setOutputValue_(output, aliases, ['สังกัดกรรมการ 2', 'สังกัดกรรมการ2'], formData.committee2Department);

  setOutputValue_(output, aliases, ['กรรมการตรวจรับงานจ้าง 3', 'กรรมการตรวจรับงานจ้าง3', 'กรรมการตรวจรับ 3', 'กรรมการตรวจรับ3', 'กรรมการ3', 'กรรมการ 3'], formData.committee3Name);
  setOutputValue_(output, aliases, ['ตำแหน่งกรรมการ 3', 'ตำแหน่งกรรมการ3'], formData.committee3Position);
  setOutputValue_(output, aliases, ['สังกัดกรรมการ 3', 'สังกัดกรรมการ3'], formData.committee3Department);

  setOutputValue_(output, aliases, ['กรรมการตรวจรับงานจ้าง 4', 'กรรมการตรวจรับงานจ้าง4', 'กรรมการตรวจรับ 4', 'กรรมการตรวจรับ4', 'กรรมการ4', 'กรรมการ 4'], formData.committee4Name);
  setOutputValue_(output, aliases, ['ตำแหน่งกรรมการ 4', 'ตำแหน่งกรรมการ4'], formData.committee4Position);
  setOutputValue_(output, aliases, ['สังกัดกรรมการ 4', 'สังกัดกรรมการ4'], formData.committee4Department);

  setOutputValue_(output, aliases, ['หมายเหตุ'], formData.note);
}


function setOutputValue_(output, aliases, candidateNames, value) {
  // อนุญาตให้บันทึกค่าว่างได้ เพื่อให้การล้างวันที่/ล้างช่องกรอกในหน้าแก้ไขมีผลจริง
  // เดิมถ้า value เป็นค่าว่างจะ return ทำให้ล้างวันตรวจรับงาน/วันที่อื่น ๆ แล้วบันทึกไม่ได้
  if (value === undefined || value === null) {
    return;
  }

  const col = findColumn_(aliases, candidateNames);

  if (col >= 0 && col < output.length) {
    output[col] = String(value).trim();
  }
}

function testConnection() {
  const result = {
    ok: false,
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    requestedGid: CONFIG.DATA_SHEET_GID
  };

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    result.spreadsheetName = ss.getName();

    const sheets = ss.getSheets().map(function(sheet) {
      return {
        name: sheet.getName(),
        gid: sheet.getSheetId(),
        lastRow: sheet.getLastRow(),
        lastColumn: sheet.getLastColumn()
      };
    });

    result.availableSheets = sheets;

    const sheet = getProjectDataSheet_(ss);
    result.selectedSheet = sheet.getName();
    result.selectedGid = sheet.getSheetId();
    result.lastRow = sheet.getLastRow();
    result.lastColumn = sheet.getLastColumn();
    result.ok = true;

    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    result.error = getErrorMessage_(error);
    result.stack = error && error.stack ? String(error.stack) : '';
    console.error(JSON.stringify(result, null, 2));
    throw new Error(
      'เชื่อมต่อ Google Sheets ไม่สำเร็จ: ' + result.error +
      '\\nตรวจสอบว่าสัญชีที่รันสคริปต์เปิดชีตนี้ได้ และกดอนุญาตสิทธิ์แล้ว'
    );
  }
}

/**
 * ใช้ตรวจว่าระบบจับหัวคอลัมน์ใดเป็นงบประมาณ ประเภทงาน และพิกัด
 * รันแล้วดู Execution log
 */
function debugDetectedColumns() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getProjectDataSheet_(ss);

  const lastRow = Math.min(sheet.getLastRow(), 50);
  const lastColumn = Math.min(sheet.getLastColumn(), CONFIG.MAX_COLUMNS);
  const display = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();

  const headerIndex = CONFIG.HEADER_ROW > 0
    ? CONFIG.HEADER_ROW - 1
    : detectHeaderRow_(display);

  const headers = display[headerIndex].map(function(header, index) {
    return String(header || ('คอลัมน์ ' + (index + 1))).trim();
  });

  const aliases = buildAliasIndex_(headers);

  const result = {
    sheetName: sheet.getName(),
    headerRow: headerIndex + 1,
    headers: headers,
    detected: {
      budgetColumn: columnInfo_(headers, findColumn_(aliases, [
        'งบประเภท', 'ประเภทงบ', 'ประเภทงบประมาณ',
        'แหล่งงบประมาณ', 'แหล่งที่มาของงบประมาณ', 'แหล่งเงิน',
        'งบประมาณ', 'งบประมาณ (บาท)', 'งบประมาณบาท',
        'งบประมาณโครงการ', 'งบประมาณที่ได้รับ', 'งบประมาณอนุมัติ',
        'วงเงินงบประมาณ', 'วงเงินตามสัญญา', 'วงเงินสัญญา',
        'วงเงิน', 'ราคากลาง', 'ราคาจ้าง', 'ค่าก่อสร้าง',
        'จำนวนเงิน', 'งบ'
      ])),
      typeColumn: columnInfo_(headers, findColumn_(aliases, [
        'ประเภทโครงการ', 'ประเภทงาน', 'ประเภทงานก่อสร้าง',
        'ประเภทโครงการ/กิจกรรม', 'หมวดงาน', 'หมวดหมู่งาน',
        'หมวดโครงการ', 'ชนิดงาน', 'ลักษณะงาน',
        'ลักษณะโครงการ', 'กลุ่มงาน', 'ประเภท'
      ])),
      latitudeColumn: columnInfo_(headers, findColumn_(aliases, [
        'ละติจูด', 'latitude', 'พิกัดละติจูด', 'ค่าละติจูด', 'lat'
      ])),
      longitudeColumn: columnInfo_(headers, findColumn_(aliases, [
        'ลองจิจูด', 'ลอนจิจูด', 'longitude',
        'พิกัดลองจิจูด', 'ค่าลองจิจูด', 'lng', 'lon', 'long'
      ])),
      combinedCoordinateColumn: columnInfo_(headers, findColumn_(aliases, [
        'พิกัดโครงการ', 'พิกัดสถานที่', 'พิกัดที่ตั้ง',
        'พิกัด', 'ตำแหน่งโครงการ', 'ตำแหน่งที่ตั้ง',
        'latitude,longitude', 'lat,long', 'lat,lng',
        'google maps', 'googlemap', 'ลิงก์แผนที่', 'แผนที่'
      ]))
    }
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function columnInfo_(headers, index) {
  return index >= 0
    ? { index: index + 1, header: headers[index] }
    : { index: null, header: null };
}



/**
 * คำนวณสถานะโครงการอัตโนมัติจากประวัติราคากลาง / บันทึกการปฏิบัติงาน / ผลการดำเนินงาน / วันตรวจรับงาน
 */
function buildAutoStatusSource_(ss) {
  const source = {
    central: {},
    work: {},
    performanceComplete: {}
  };

  // ประวัติกำหนดราคากลาง
  try {
    const sheet = ss.getSheetByName(CONFIG.CENTRAL_PRICE_HISTORY_SHEET_NAME);
    if (sheet && sheet.getLastRow() > 1) {
      // ใช้เฉพาะคอลัมน์รหัสโครงการ ไม่อ่านคอลัมน์ HTML เอกสารขนาดใหญ่
      const values = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getDisplayValues();
      values.forEach(function(row) {
        const projectId = String(row[0] || '').trim();
        if (projectId) source.central[projectId] = true;
      });
    }
  } catch (error) {
    console.warn('อ่านประวัติกำหนดราคากลางไม่สำเร็จ: ' + getErrorMessage_(error));
  }

  // ประวัติบันทึกการปฏิบัติงานประจำสัปดาห์
  try {
    const sheet = ss.getSheetByName(CONFIG.WEEKLY_WORK_HISTORY_SHEET_NAME);
    if (sheet && sheet.getLastRow() > 1) {
      // อ่านช่วงรหัสโครงการถึงวันทำงาน JSON เท่านั้น ตัด HTML และ JSON อื่นที่ไม่ใช้
      const values = sheet.getRange(2, 4, sheet.getLastRow() - 1, 9).getDisplayValues();
      values.forEach(function(row) {
        const projectId = String(row[0] || '').trim();
        if (!projectId) return;
        const text = String(row[8] || ''); // วันทำงาน JSON (คอลัมน์ 12)
        if (!source.work[projectId]) {
          source.work[projectId] = { hasNotice: false, hasTest: false, hasHandover: false };
        }
        const info = source.work[projectId];
        if (text.indexOf('ผู้รับจ้างแจ้งลงงาน') !== -1) info.hasNotice = true;
        if (text.indexOf('ผู้รับจ้างส่งผลทดสอบ') !== -1) info.hasTest = true;
        if (text.indexOf('ผู้รับจ้างแจ้งส่งมอบงาน') !== -1 || text.indexOf('ผู้รับจ้างส่งมอบงาน') !== -1) info.hasHandover = true;
      });
    }
  } catch (error) {
    console.warn('อ่านประวัติบันทึกการปฏิบัติงานไม่สำเร็จ: ' + getErrorMessage_(error));
  }

  // ประวัติผลการดำเนินงานประจำสัปดาห์
  try {
    const sheet = ss.getSheetByName(CONFIG.WEEKLY_PERFORMANCE_HISTORY_SHEET_NAME);
    if (sheet && sheet.getLastRow() > 1) {
      // อ่านถึงรายการผลงาน JSON เท่านั้น ไม่ดึง HTML ผลการดำเนินงาน
      const values = sheet.getRange(2, 4, sheet.getLastRow() - 1, 9).getDisplayValues();
      values.forEach(function(row) {
        const projectId = String(row[0] || '').trim();
        if (!projectId) return;
        const summaryNote = String(row[7] || '');
        const rowsJson = String(row[8] || '');
        let totalPercent = 0;
        try {
          const rows = JSON.parse(rowsJson || '[]');
          if (Array.isArray(rows)) {
            totalPercent = rows.reduce(function(sum, item) {
              return sum + parseNumber_(item && item.totalPercent);
            }, 0);
          }
        } catch (err) {
          totalPercent = 0;
        }
        // ผลงานรวมครบ 100% แล้วเท่านั้น จึงถือว่าเข้าข่ายรอผลทดสอบ
        // ใช้ 99.99 เพื่อกันปัญหาทศนิยมจากการคำนวณในตารางผลการดำเนินงาน
        if (totalPercent >= 99.99) {
          source.performanceComplete[projectId] = true;
        }
      });
    }
  } catch (error) {
    console.warn('อ่านประวัติผลการดำเนินงานไม่สำเร็จ: ' + getErrorMessage_(error));
  }

  return source;
}

function resolveAutoProjectStatus_(projectId, currentStatus, acceptanceDate, source) {
  const id = String(projectId || '').trim();
  const info = (source && source.work && source.work[id]) || {};
  let status = String(currentStatus || '').trim();

  if (source && source.central && source.central[id]) status = 'กำหนดราคากลาง';
  if (info.hasNotice) status = 'กำลังดำเนินการ';

  // รอผลทดสอบ = มีบันทึกการทำงานแล้ว + ผลงานรวมครบ 100% + ยังไม่มีรายการ "ผู้รับจ้างส่งผลทดสอบ"
  // ถ้าผลงานยังไม่ครบ 100% ให้คงสถานะเป็น "กำลังดำเนินการ" ไม่ใช่ "รอผลทดสอบ"
  if (source && source.performanceComplete && source.performanceComplete[id] && !info.hasTest) status = 'รอผลทดสอบ';

  if (info.hasTest && info.hasHandover) status = 'รอตรวจรับงาน';
  if (String(acceptanceDate || '').trim()) status = 'แล้วเสร็จ';

  return status || 'ไม่ระบุ';
}

function parseDateForProgress_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  let text = toArabicDigits_(String(value || '').trim());
  if (!text) return null;

  const thaiMonths = {
    'มกราคม': 1, 'ม.ค.': 1, 'มค': 1,
    'กุมภาพันธ์': 2, 'ก.พ.': 2, 'กพ': 2,
    'มีนาคม': 3, 'มี.ค.': 3, 'มีค': 3,
    'เมษายน': 4, 'เม.ย.': 4, 'เมย': 4,
    'พฤษภาคม': 5, 'พ.ค.': 5, 'พค': 5,
    'มิถุนายน': 6, 'มิ.ย.': 6, 'มิย': 6,
    'กรกฎาคม': 7, 'ก.ค.': 7, 'กค': 7,
    'สิงหาคม': 8, 'ส.ค.': 8, 'สค': 8,
    'กันยายน': 9, 'ก.ย.': 9, 'กย': 9,
    'ตุลาคม': 10, 'ต.ค.': 10, 'ตค': 10,
    'พฤศจิกายน': 11, 'พ.ย.': 11, 'พย': 11,
    'ธันวาคม': 12, 'ธ.ค.': 12, 'ธค': 12
  };

  const monthMatch = text.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
  if (monthMatch) {
    let day = Number(monthMatch[1]);
    let month = thaiMonths[monthMatch[2]] || thaiMonths[monthMatch[2].replace(/\./g, '')];
    let year = Number(monthMatch[3]);
    if (year > 2400) year -= 543;
    if (day && month && year) return new Date(year, month - 1, day);
  }

  const slashMatch = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slashMatch) {
    let day = Number(slashMatch[1]);
    let month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2500;
    if (year > 2400) year -= 543;
    return new Date(year, month - 1, day);
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    let year = Number(isoMatch[1]);
    let month = Number(isoMatch[2]);
    let day = Number(isoMatch[3]);
    if (year > 2400) year -= 543;
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function normalizeProjectProgressWhole_(value) {
  const n = parseNumber_(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function calculateProjectAutoProgress_(status, startDateText, endDateText, progressDisplay) {
  const sheetProgress = parseNumber_(progressDisplay);
  const s = String(status || '').trim();
  let progress = sheetProgress;

  if (s === 'แล้วเสร็จ') {
    progress = 100;
  } else if (s === 'ตรวจรับงาน' || s === 'รอตรวจรับงาน') {
    progress = 98;
  } else if (s === 'รอผลทดสอบ') {
    progress = 95;
  } else if (s === 'กำหนดราคากลาง') {
    progress = 0;
  } else if (s === 'ดำเนินการ' || s === 'อยู่ระหว่างดำเนินการ' || s === 'กำลังดำเนินการ' || s === 'ล่าช้า') {
    const startDate = parseDateForProgress_(startDateText);
    const endDate = parseDateForProgress_(endDateText);
    progress = 0;
    if (startDate && endDate && endDate.getTime() > startDate.getTime()) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const totalDays = (endDate.getTime() - startDate.getTime()) / 86400000;
      const elapsedDays = (today.getTime() - startDate.getTime()) / 86400000;
      progress = elapsedDays / totalDays * 100;
    }
  }

  return normalizeProjectProgressWhole_(progress);
}

/** อ่านผลงานสะสมล่าสุดจากรายงานผลการดำเนินงานประจำสัปดาห์สำหรับหน้า Dashboard */
function normalizeDashboardProjectName_(value) {
  return String(value || '')
    .replace(/^\s*โครงการ\s*/i, '')
    .replace(/[\s\u00a0]+/g, '')
    .replace(/[()（）.,，]/g, '')
    .toLowerCase();
}

function calculateWeeklyHistoryProjectProgress_(rowsJson) {
  let rows = [];
  try {
    rows = JSON.parse(String(rowsJson || '[]'));
  } catch (error) {
    return null;
  }
  if (!Array.isArray(rows) || !rows.length) return null;

  const hasStoredTotal = rows.some(function(row) {
    return row && row.totalPercent !== undefined && String(row.totalPercent).trim() !== '';
  });
  let total = 0;
  if (hasStoredTotal) {
    total = rows.reduce(function(sum, row) {
      return sum + parseNumber_(row && row.totalPercent);
    }, 0);
  } else {
    const amountSum = rows.reduce(function(sum, row) {
      return sum + parseNumber_(row && row.amount);
    }, 0);
    total = rows.reduce(function(sum, row) {
      const quantity = parseNumber_(row && row.quantity);
      const completed = parseNumber_(row && (row.total !== undefined ? row.total : row.weekly));
      const storedShare = parseNumber_(row && row.share);
      const share = storedShare || (amountSum ? parseNumber_(row && row.amount) / amountSum * 100 : 0);
      const storedItemPercent = parseNumber_(row && row.itemPercent);
      const itemPercent = storedItemPercent || (quantity ? completed / quantity * 100 : 0);
      return sum + (itemPercent / 100 * share);
    }, 0);
  }
  return Number.isFinite(total) ? Math.min(100, Math.max(0, total)) : null;
}

function buildWeeklyPerformanceProgressSource_(ss) {
  const result = { byProjectId: {}, byProjectName: {} };
  const sheet = ss.getSheetByName(CONFIG.WEEKLY_PERFORMANCE_HISTORY_SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return result;

  const width = Math.min(sheet.getLastColumn(), WEEKLY_PERFORMANCE_HISTORY_HEADERS.length);
  const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  const indexes = {};
  headers.forEach(function(header, index) { indexes[header] = index; });
  const projectIdIndex = indexes['รหัสโครงการ'];
  const projectNameIndex = indexes['ชื่อโครงการ'];
  const weekIndex = indexes['สัปดาห์ที่'];
  const rowsJsonIndex = indexes['รายการผลการดำเนินงาน JSON'];
  if (rowsJsonIndex === undefined) return result;

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getDisplayValues();
  values.forEach(function(row, rowIndex) {
    const progress = calculateWeeklyHistoryProjectProgress_(row[rowsJsonIndex]);
    if (progress === null) return;
    const projectId = projectIdIndex === undefined ? '' : String(row[projectIdIndex] || '').trim();
    const projectName = projectNameIndex === undefined ? '' : normalizeDashboardProjectName_(row[projectNameIndex]);
    const week = weekIndex === undefined ? 0 : (parseNumber_(row[weekIndex]) || 0);
    const item = { progress: progress, week: week, order: rowIndex };
    const keepLatest = function(current) {
      return !current || week > current.week || (week === current.week && rowIndex > current.order);
    };
    if (projectId && keepLatest(result.byProjectId[projectId])) result.byProjectId[projectId] = item;
    if (projectName && keepLatest(result.byProjectName[projectName])) result.byProjectName[projectName] = item;
  });
  return result;
}

function getWeeklyPerformanceProjectProgress_(source, projectId, projectName) {
  if (!source) return null;
  const byId = source.byProjectId && source.byProjectId[String(projectId || '').trim()];
  if (byId && Number.isFinite(byId.progress)) return byId.progress;
  const key = normalizeDashboardProjectName_(projectName);
  const byName = key && source.byProjectName && source.byProjectName[key];
  return byName && Number.isFinite(byName.progress) ? byName.progress : null;
}

function getDashboardDataFast() {
  const oldMaxRows = CONFIG.MAX_ROWS;
  const oldMaxColumns = CONFIG.MAX_COLUMNS;
  try {
    // โหลดหน้าแรกให้เร็วขึ้น ป้องกัน Web App ค้างที่หน้า "กำลังโหลดข้อมูล"
    CONFIG.MAX_ROWS = Math.min(Number(CONFIG.MAX_ROWS || 1200), 1200);
    CONFIG.MAX_COLUMNS = Math.min(Number(CONFIG.MAX_COLUMNS || 70), 70);
    const payload = getDashboardData();
    if (payload && payload.ok) {
      payload.fastMode = true;
    }
    return payload;
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return emptyPayload_('โหลดข้อมูลแบบเร็วไม่สำเร็จ: ' + getErrorMessage_(error));
  } finally {
    CONFIG.MAX_ROWS = oldMaxRows;
    CONFIG.MAX_COLUMNS = oldMaxColumns;
  }
}

function getDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = getProjectDataSheet_(ss);

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow < 1 || lastColumn < 1) {
      return emptyPayload_('ชีตไม่มีข้อมูล');
    }

    const readRows = Math.min(lastRow, CONFIG.MAX_ROWS);
    const readColumns = Math.min(lastColumn, CONFIG.MAX_COLUMNS);

    // อ่านเฉพาะช่วงที่มีข้อมูล ไม่ใช้ getDataRange()
    // และใช้ getDisplayValues() เพียงครั้งเดียวเพื่อลดภาระบริการ Sheets
    const display = sheet
      .getRange(1, 1, readRows, readColumns)
      .getDisplayValues();

    if (!display.length) {
      return emptyPayload_('ไม่พบข้อมูลในชีต');
    }

    const headerIndex = CONFIG.HEADER_ROW > 0
      ? CONFIG.HEADER_ROW - 1
      : detectHeaderRow_(display);

    if (headerIndex < 0 || headerIndex >= display.length) {
      return emptyPayload_(
        'ไม่พบแถวหัวตาราง กรุณากำหนด CONFIG.HEADER_ROW เป็นเลขแถวจริง'
      );
    }

    const headers = display[headerIndex].map(function(header, index) {
      const text = String(header || '').trim();
      return text || ('คอลัมน์ ' + (index + 1));
    });

    const aliases = buildAliasIndex_(headers);
    const autoStatusSource = buildAutoStatusSource_(ss);
    const rows = [];

    for (let r = headerIndex + 1; r < display.length; r++) {
      const row = display[r];

      if (row.every(function(value) {
        return String(value || '').trim() === '';
      })) {
        continue;
      }

      // ส่งกลับเฉพาะฟิลด์ที่มีค่า ลดขนาดข้อมูลที่ส่งไปหน้าเว็บ
      const item = {};
      headers.forEach(function(header, column) {
        const value = String(row[column] || '').trim();
        if (value !== '') item[header] = value;
      });

      const projectName = pick_(row, aliases, [
        'ชื่อโครงการ', 'โครงการ', 'รายการโครงการ',
        'ชื่องาน', 'รายการ', 'ชื่อรายการ'
      ]) || ('โครงการลำดับที่ ' + (r - headerIndex));

      const storedVillageNo = pick_(row, aliases, [
        'หมู่ที่', 'หมู่', 'ม.', 'เลขหมู่'
      ]);

      const storedVillageName = pick_(row, aliases, [
        'หมู่บ้าน', 'บ้าน', 'ชื่อหมู่บ้าน'
      ]);
      const constructionSite = pick_(row, aliases, ['สถานที่ก่อสร้าง', 'สถานที่ดำเนินการ', 'พื้นที่ก่อสร้าง', 'สถานที่', 'พื้นที่', 'ที่ตั้งโครงการ']);
      const projectLocation = resolveProjectLocation_(constructionSite, storedVillageNo, storedVillageName);
      const villageNo = projectLocation.villageNo;
      const villageName = projectLocation.villageName;

      const year = pick_(row, aliases, [
        'งบประมาณประจำปี',
        'ปีงบประมาณ',
        'ปีงบ',
        'งบประมาณปี',
        'พ.ศ.',
        'ปี'
      ]);

      const statusFromSheet = pick_(row, aliases, [
        'สถานะ', 'สถานะโครงการ',
        'ผลการดำเนินงาน', 'ความคืบหน้า'
      ]) || 'ไม่ระบุ';

      const acceptanceDate = pick_(row, aliases, [
        'วันตรวจรับงาน', 'วันที่ตรวจรับงาน', 'วันตรวจรับ', 'วันที่ตรวจรับ'
      ]);

      const status = resolveAutoProjectStatus_(String(r + 1), statusFromSheet, acceptanceDate, autoStatusSource);

      const typeFromSheet = pick_(row, aliases, [
        'ประเภทโครงการ',
        'ประเภทงาน',
        'ประเภทงานก่อสร้าง',
        'ประเภทโครงการ/กิจกรรม',
        'หมวดงาน',
        'หมวดหมู่งาน',
        'หมวดโครงการ',
        'ชนิดงาน',
        'ลักษณะงาน',
        'ลักษณะโครงการ',
        'กลุ่มงาน',
        'ประเภท'
      ]);

      // ตรวจชื่อโครงการร่วมด้วย เพื่อป้องกันคำว่า "คสล."
      // ในงานวางท่อหรือบ่อพักถูกตีความเป็นงานถนน
      const type = resolveProjectType_(
        typeFromSheet,
        projectName
      );

      const contractor = pick_(row, aliases, [
        'ผู้รับจ้าง', 'คู่สัญญา', 'บริษัท', 'ห้างหุ้นส่วน'
      ]);

      // อ่านประเภทงบ/แหล่งงบก่อน เช่น "เงินเหลือจ่าย"
      const budgetDisplay = pick_(row, aliases, [
        'งบประเภท',
        'ประเภทงบ',
        'ประเภทงบประมาณ',
        'แหล่งงบประมาณ',
        'แหล่งที่มาของงบประมาณ',
        'แหล่งเงิน',
        'งบประมาณ',
        'งบประมาณ (บาท)',
        'งบประมาณบาท',
        'งบประมาณโครงการ',
        'งบประมาณที่ได้รับ',
        'งบประมาณอนุมัติ',
        'วงเงินงบประมาณ',
        'วงเงินตามสัญญา',
        'วงเงินสัญญา',
        'วงเงิน',
        'ราคากลาง',
        'ราคาจ้าง',
        'ค่าก่อสร้าง',
        'จำนวนเงิน',
        'งบ'
      ]);

      const budget = parseNumber_(budgetDisplay);

      const progressDisplay = pick_(row, aliases, [
        'ร้อยละความก้าวหน้า', 'ความก้าวหน้า',
        'เปอร์เซ็นต์', '%', 'progress'
      ]);

      const startDateForProgress = pick_(row, aliases, [
        'เริ่มสัญญา', 'วันเริ่มสัญญา', 'วันที่เริ่มสัญญา',
        'วันเริ่มงาน', 'วันที่เริ่มงาน',
        'วันเริ่มดำเนินการ', 'วันที่เริ่มดำเนินการ',
        'วันเริ่มต้น', 'วันที่เริ่มต้น'
      ]);

      const endDateForProgress = pick_(row, aliases, [
        'สิ้นสุดสัญญา', 'วันกำหนดแล้วเสร็จ',
        'วันสิ้นสุด', 'วันที่สิ้นสุด',
        'วันสิ้นสุดสัญญา', 'ครบกำหนดสัญญา'
      ]);

      const progress = calculateProjectAutoProgress_(status, startDateForProgress, endDateForProgress, progressDisplay);

      const coord = extractCoordinate_(row, aliases);

      rows.push({
        rowNumber: r + 1,
        projectName: projectName,
        villageNo: villageNo,
        villageName: villageName,
        constructionSite: constructionSite,
        villageLabel: projectLocation.label,
        year: year,
        status: status,
        acceptanceDate: acceptanceDate,
        type: type,
        contractor: contractor,
        budget: budget,
        budgetDisplay: budgetDisplay || formatMoney_(budget),
        progress: progress,
        lat: coord.lat,
        lng: coord.lng,
        hasLocation:
          Number.isFinite(coord.lat) &&
          Number.isFinite(coord.lng),
        fields: item
      });
    }

    return {
      ok: true,
      appTitle: CONFIG.APP_TITLE,
      spreadsheetName: ss.getName(),
      sheetName: sheet.getName(),
      sheetGid: sheet.getSheetId(),
      updatedAt: Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone() || 'Asia/Bangkok',
        'dd/MM/yyyy HH:mm'
      ),
      defaultCenter: CONFIG.DEFAULT_CENTER,
      defaultZoom: CONFIG.DEFAULT_ZOOM,
      headerRow: headerIndex + 1,
      sourceLastRow: lastRow,
      sourceLastColumn: lastColumn,
      readRows: readRows,
      readColumns: readColumns,
      truncated:
        lastRow > CONFIG.MAX_ROWS ||
        lastColumn > CONFIG.MAX_COLUMNS,
      headers: headers,
      rows: rows,
      mapBoundaries: getMapBoundariesFromSheet_(ss),
      personnel: getPersonnelConfig_(ss),
      systemOptions: getSystemOptionsConfig_(ss),
      rolePermissions: getRolePermissions_()
    };
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return emptyPayload_(
      'อ่านข้อมูลไม่สำเร็จ: ' + getErrorMessage_(error)
    );
  }
}

function getSheetByGid_(ss, gid) {
  const targetGid = Number(gid);
  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === targetGid) {
      return sheets[i];
    }
  }

  const available = sheets.map(function(sheet) {
    return sheet.getName() + ' (gid=' + sheet.getSheetId() + ')';
  }).join(', ');

  throw new Error(
    'ไม่พบชีต gid=' + targetGid +
    ' ชีตที่พบ: ' + available
  );
}

function getErrorMessage_(error) {
  if (!error) return 'ไม่ทราบสาเหตุ';
  if (error.message) return String(error.message);
  return String(error);
}

/**
 * ตรวจหาแถวหัวตารางจาก 30 แถวแรก
 * จะให้คะแนนแถวที่พบคำสำคัญ เช่น ชื่อโครงการ หมู่ที่ งบประมาณ สถานะ พิกัด
 */
function detectHeaderRow_(display) {
  const keywordGroups = [
    ['ชื่อโครงการ', 'โครงการ', 'ชื่องาน', 'รายการโครงการ'],
    ['หมู่ที่', 'หมู่', 'หมู่บ้าน', 'บ้าน'],
    ['งบประมาณประจำปี', 'ปีงบประมาณ', 'ปีงบ', 'งบประมาณปี', 'ปี'],
    ['งบประเภท', 'ประเภทงบ', 'แหล่งงบประมาณ', 'งบประมาณ', 'วงเงิน', 'ราคากลาง'],
    ['สถานะ', 'ความก้าวหน้า', 'ผลการดำเนินงาน'],
    ['ประเภทโครงการ', 'ประเภทงาน', 'หมวดงาน'],
    ['พิกัด', 'ละติจูด', 'ลองจิจูด', 'latitude', 'longitude', 'lat', 'lng'],
    ['ผู้รับจ้าง', 'คู่สัญญา']
  ];

  let bestIndex = -1;
  let bestScore = -1;
  const maxRows = Math.min(display.length, 30);

  for (let r = 0; r < maxRows; r++) {
    const normalizedCells = display[r]
      .map(normalize_)
      .filter(Boolean);

    if (!normalizedCells.length) continue;

    let score = 0;
    keywordGroups.forEach(group => {
      const found = normalizedCells.some(cell =>
        group.some(keyword => {
          const key = normalize_(keyword);
          return cell === key || cell.includes(key) || key.includes(cell);
        })
      );
      if (found) score += 3;
    });

    // เพิ่มคะแนนเมื่อแถวมีหัวข้อหลายช่องและไม่ใช่ข้อความยาวเพียงช่องเดียว
    const shortCells = normalizedCells.filter(cell => cell.length <= 40).length;
    score += Math.min(shortCells, 8) * 0.25;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = r;
    }
  }

  // ต้องพบคำสำคัญอย่างน้อยหนึ่งกลุ่ม
  if (bestScore >= 3) return bestIndex;

  // สำรอง: ใช้แถวแรกที่มีข้อมูลตั้งแต่ 2 ช่องขึ้นไป
  for (let r = 0; r < maxRows; r++) {
    const nonEmpty = display[r].filter(v => String(v).trim() !== '').length;
    if (nonEmpty >= 2) return r;
  }

  return -1;
}

function emptyPayload_(message) {
  return {
    ok: false,
    message,
    appTitle: CONFIG.APP_TITLE,
    defaultCenter: CONFIG.DEFAULT_CENTER,
    defaultZoom: CONFIG.DEFAULT_ZOOM,
    headers: [],
    rows: []
  };
}

function normalize_(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[().\-_/\\]/g, '');
}

function buildAliasIndex_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    map[normalize_(header)] = index;
  });
  return map;
}

function findColumn_(aliases, candidateNames) {
  // 1. ตรงกันทั้งหมดก่อน
  for (const name of candidateNames) {
    const key = normalize_(name);
    if (Object.prototype.hasOwnProperty.call(aliases, key)) {
      return aliases[key];
    }
  }

  // 2. ให้หัวคอลัมน์จริงมีคำเพิ่มได้ เช่น "งบประมาณโครงการ(บาท)"
  // ห้ามใช้ key.includes(headerKey) เพราะจะทำให้ "พิกัด"
  // ถูกจับเป็นทั้ง "พิกัด X" และ "พิกัด Y"
  for (const [headerKey, index] of Object.entries(aliases)) {
    for (const name of candidateNames) {
      const key = normalize_(name);
      if (key.length >= 3 && headerKey.includes(key)) {
        return index;
      }
    }
  }

  return -1;
}

function findColumnExact_(aliases, candidateNames) {
  for (const name of candidateNames) {
    const key = normalize_(name);
    if (Object.prototype.hasOwnProperty.call(aliases, key)) {
      return aliases[key];
    }
  }
  return -1;
}

function pick_(row, aliases, candidateNames) {
  const col = findColumn_(aliases, candidateNames);
  return col >= 0 ? String(row[col] ?? '').trim() : '';
}

function pickRaw_(row, aliases, candidateNames) {
  const col = findColumn_(aliases, candidateNames);
  return col >= 0 ? row[col] : '';
}

function parseNumber_(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  let text = toArabicDigits_(String(value ?? '').trim());
  if (!text) return 0;

  // รองรับรูปแบบบัญชี เช่น (1,250,000.00)
  const negativeByParentheses = /^\s*\(.*\)\s*$/.test(text);

  text = text
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\d.\-]/g, '');

  let n = Number(text);
  if (!Number.isFinite(n)) return 0;
  if (negativeByParentheses && n > 0) n *= -1;

  return n;
}

function toArabicDigits_(value) {
  const thaiDigits = '๐๑๒๓๔๕๖๗๘๙';
  return String(value ?? '').replace(/[๐-๙]/g, function(digit) {
    return String(thaiDigits.indexOf(digit));
  });
}

function resolveProjectType_(typeFromSheet, projectName) {
  const sourceType = String(typeFromSheet || '').trim();
  const projectText = normalize_(projectName);

  // คำที่บ่งชี้ชัดว่าเป็นงานวางท่อหรือระบบระบายน้ำ
  const pipeAndDrainageWords = [
    'วางท่อ',
    'ท่อลอด',
    'ท่อระบายน้ำ',
    'รางระบายน้ำ',
    'บ่อพัก',
    'บ่อรับน้ำ',
    'ระบายน้ำ',
    'ท่อคสล',
    'ท่อคอนกรีต'
  ];

  const isPipeOrDrainage = pipeAndDrainageWords.some(function(word) {
    return projectText.includes(normalize_(word));
  });

  // หากชื่อโครงการระบุชัดว่าเป็นงานท่อ ให้แก้ประเภทที่คลาดเคลื่อน
  // เช่น แหล่งข้อมูลเดิมเป็น "งานถนน" เพราะพบคำว่า คสล.
  if (isPipeOrDrainage) {
    return 'งานวางท่อ/ระบายน้ำ';
  }

  // ถ้ามีประเภทจากชีตและไม่ใช่ค่าว่าง ให้ใช้ค่าจากชีต
  if (
    sourceType &&
    sourceType !== '-' &&
    normalize_(sourceType) !== normalize_('ไม่ระบุ')
  ) {
    return sourceType;
  }

  return inferProjectType_(projectName);
}

function inferProjectType_(projectName) {
  const text = normalize_(projectName);

  // เรียงงานเฉพาะก่อนงานถนน เพื่อไม่ให้คำทั่วไปกลบประเภทจริง
  const rules = [
    {
      words: [
        'วางท่อ',
        'ท่อลอด',
        'ท่อระบายน้ำ',
        'รางระบายน้ำ',
        'บ่อพัก',
        'บ่อรับน้ำ',
        'ระบายน้ำ',
        'ท่อคสล',
        'ท่อคอนกรีต'
      ],
      value: 'งานวางท่อ/ระบายน้ำ'
    },
    {
      words: [
        'ประปา',
        'หอถัง',
        'ระบบประปา',
        'ระบบน้ำประปา'
      ],
      value: 'งานประปา'
    },
    {
      words: [
        'ไฟฟ้า',
        'โคมไฟ',
        'ไฟส่องสว่าง'
      ],
      value: 'งานไฟฟ้า'
    },
    {
      words: [
        'สะพาน'
      ],
      value: 'งานสะพาน'
    },
    {
      words: [
        'อาคาร',
        'ศาลา',
        'ห้องน้ำ',
        'สำนักงาน'
      ],
      value: 'งานอาคาร'
    },
    {
      words: [
        'ขุดลอก',
        'ลำห้วย',
        'คลอง'
      ],
      value: 'งานแหล่งน้ำ'
    },
    {
      words: [
        'ถนนคอนกรีต',
        'ถนนคสล',
        'ผิวจราจร',
        'แอสฟัลต์',
        'asphalticconcrete',
        'ลาดยาง',
        'ถนน',
        'ทางหลวง'
      ],
      value: 'งานถนน'
    }
  ];

  for (const rule of rules) {
    const matched = rule.words.some(function(word) {
      return text.includes(normalize_(word));
    });

    if (matched) {
      return rule.value;
    }
  }

  return 'ไม่ระบุ';
}

function formatMoney_(value) {
  return Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatWorkValueWithComma_(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const text = toArabicDigits_(raw)
    .replace(/,/g, '')
    .replace(/\s*บาท\s*$/i, '')
    .trim();
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return raw;

  const number = Number(match[0]);
  if (!Number.isFinite(number)) return raw;

  const hasDecimals = /\.\d+/.test(match[0]);
  const digits = hasDecimals ? 2 : 0;
  return number.toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function extractCoordinate_(row, aliases) {
  // คอลัมน์ละติจูด/ลองจิจูดต้องเป็นคนละคอลัมน์
  const latCol = findColumn_(aliases, [
    'ละติจูด',
    'latitude',
    'พิกัดละติจูด',
    'ค่าละติจูด',
    'lat'
  ]);

  const lngCol = findColumn_(aliases, [
    'ลองจิจูด',
    'ลอนจิจูด',
    'longitude',
    'พิกัดลองจิจูด',
    'ค่าลองจิจูด',
    'lng',
    'lon',
    'long'
  ]);

  if (latCol >= 0 && lngCol >= 0 && latCol !== lngCol) {
    const lat = parseCoordinateValue_(row[latCol]);
    const lng = parseCoordinateValue_(row[lngCol]);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return normalizeLatLng_(lat, lng);
    }
  }

  // กรณีหัวคอลัมน์เป็น X/Y ให้ยอมรับเฉพาะชื่อที่ตรงกันเท่านั้น
  const xCol = findColumnExact_(aliases, [
    'พิกัดx', 'x', 'utm x', 'coordinate x'
  ]);
  const yCol = findColumnExact_(aliases, [
    'พิกัดy', 'y', 'utm y', 'coordinate y'
  ]);

  if (xCol >= 0 && yCol >= 0 && xCol !== yCol) {
    const first = parseCoordinateValue_(row[xCol]);
    const second = parseCoordinateValue_(row[yCol]);

    if (Number.isFinite(first) && Number.isFinite(second)) {
      const normalized = normalizeLatLng_(first, second);
      if (normalized.lat !== null && normalized.lng !== null) {
        return normalized;
      }
    }
  }

  // กรณีเก็บพิกัดสองค่าในช่องเดียว
  const combinedCol = findColumn_(aliases, [
    'พิกัดโครงการ',
    'พิกัดสถานที่',
    'พิกัดที่ตั้ง',
    'พิกัด',
    'ตำแหน่งโครงการ',
    'ตำแหน่งที่ตั้ง',
    'latitude,longitude',
    'lat,long',
    'lat,lng',
    'google maps',
    'googlemap',
    'ลิงก์แผนที่',
    'แผนที่'
  ]);

  if (combinedCol >= 0) {
    const parsed = parseCombinedCoordinate_(row[combinedCol]);
    if (parsed) return parsed;
  }

  // สำรอง: ตรวจเฉพาะช่องที่มีรูปแบบพิกัดชัดเจน
  for (const cell of row) {
    const text = String(cell ?? '').trim();
    if (!looksLikeCoordinatePair_(text)) continue;

    const parsed = parseCombinedCoordinate_(text);
    if (parsed) return parsed;
  }

  return { lat: null, lng: null };
}

function looksLikeCoordinatePair_(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;

  return (
    /@-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?/.test(text) ||
    /[?&](?:q|query|ll)=/i.test(text) ||
    /-?\d{1,3}\.\d+\s*[,，;]\s*-?\d{1,3}\.\d+/.test(text) ||
    /\d{1,3}[°].*[NS].*\d{1,3}[°].*[EW]/i.test(text)
  );
}

function parseCombinedCoordinate_(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  // รองรับ URL Google Maps ที่มี @lat,lng หรือ query=lat,lng
  let match = text.match(/@(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) match = text.match(/[?&](?:q|query|ll)=(-?\d{1,3}(?:\.\d+)?)[,%2C\s]+(-?\d{1,3}(?:\.\d+)?)/i);
  if (match) return normalizeLatLng_(Number(match[1]), Number(match[2]));

  // เลขทศนิยม 2 ค่า
  match = text.match(/(-?\d{1,3}(?:\.\d+)?)\s*[,，;\s]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (match) {
    const normalized = normalizeLatLng_(Number(match[1]), Number(match[2]));
    if (isValidThaiCoordinate_(normalized.lat, normalized.lng)) return normalized;
  }

  // DMS เช่น 15°58'55.9"N 103°38'58.1"E
  const dms = text.match(
    /(\d{1,3})[°\s]+(\d{1,2})['′\s]+(\d{1,2}(?:\.\d+)?)["″\s]*([NS])[\s,;]+(\d{1,3})[°\s]+(\d{1,2})['′\s]+(\d{1,2}(?:\.\d+)?)["″\s]*([EW])/i
  );
  if (dms) {
    const lat = dmsToDecimal_(+dms[1], +dms[2], +dms[3], dms[4]);
    const lng = dmsToDecimal_(+dms[5], +dms[6], +dms[7], dms[8]);
    return normalizeLatLng_(lat, lng);
  }

  return null;
}

function parseCoordinateValue_(value) {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim();
  if (!text) return NaN;

  const direct = Number(text.replace(/,/g, ''));
  if (Number.isFinite(direct)) return direct;

  const dms = text.match(/(\d{1,3})[°\s]+(\d{1,2})['′\s]+(\d{1,2}(?:\.\d+)?)["″\s]*([NSEW])/i);
  if (dms) return dmsToDecimal_(+dms[1], +dms[2], +dms[3], dms[4]);

  const number = text.match(/-?\d{1,3}(?:\.\d+)?/);
  return number ? Number(number[0]) : NaN;
}

function dmsToDecimal_(deg, min, sec, direction) {
  let result = deg + min / 60 + sec / 3600;
  if (/^[SW]$/i.test(direction)) result *= -1;
  return result;
}

function normalizeLatLng_(a, b) {
  let lat = Number(a);
  let lng = Number(b);

  // สลับอัตโนมัติหากกรอก longitude ก่อน latitude
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    [lat, lng] = [lng, lat];
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { lat: null, lng: null };
  }
  return { lat, lng };
}

function isValidThaiCoordinate_(lat, lng) {
  // ไม่บังคับว่าต้องอยู่ไทย แต่ใช้ช่วยลดการจับเลขทั่วไปผิดเป็นพิกัด
  return Number.isFinite(lat) && Number.isFinite(lng) &&
         lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
         (Math.abs(lat) > 1 || Math.abs(lng) > 1);
}

/**
 * ดึงชื่อไฟล์จริงจาก Google Drive สำหรับหน้าเอกสารดาวน์โหลด
 * ใช้ชื่อไฟล์ใน Drive แทนชื่อสำรองเดิม
 */
const DOCUMENT_LIBRARY_SHEET_NAME = 'เอกสารดาวน์โหลด';
const DOCUMENT_LIBRARY_HEADERS = ['รหัสไฟล์ Google Drive', 'ชื่อเอกสาร', 'ลำดับ', 'วันที่เพิ่ม', 'เพิ่มโดย'];
const DEFAULT_DOCUMENT_LIBRARY_IDS = [
  '1uK0nlzmFsCc36ttZdMuzV57KTgWD0u8F','1uwqjb8Mfs2R3UG-RI48ztS__JeUv83oG','1725CLxh_vKzGy-L5neF8HbdUg5lcUWR8',
  '14Z6OJdzdp-sNz86yBvnQhX2afyUdBhsS','1qGNqwfq5vE9MqMNrgKsaO7uKRXNTVBAc','1Vc2l1yoNyLtMyt_-2t7eF93urLG7e21K',
  '1VlGz64ISK-uxxV6MG8T7oRsFfnxPGJ6c','1u6OnI6Xh37SLI7nZJc0ZapKcMIZvGJkZ','1uqEFqPBWgpwzLEKhsH72A_1aIXMEjcYL',
  '1U6g90dyp-5cU_HYa_BrdUypCIaEO2zpd','1TnejcTtdsWj2K36V_gxESX6zLQFWPvQl','1SWJVlNoch1pAdhS7A_ilA8JHgQlBAW9O',
  '1YsGc3btTps74Mc-g9lPbPwJGFP6NdEgY'
];

function getDocumentLibrarySheet_(ss) {
  let sheet = ss.getSheetByName(DOCUMENT_LIBRARY_SHEET_NAME);
  const created = !sheet;
  if (!sheet) sheet = ss.insertSheet(DOCUMENT_LIBRARY_SHEET_NAME);
  sheet.getRange(1, 1, 1, DOCUMENT_LIBRARY_HEADERS.length).setValues([DOCUMENT_LIBRARY_HEADERS]);
  sheet.setFrozenRows(1);
  if (created && DEFAULT_DOCUMENT_LIBRARY_IDS.length) {
    const now = new Date();
    const rows = DEFAULT_DOCUMENT_LIBRARY_IDS.map(function(id, index) {
      let title = '';
      try { title = DriveApp.getFileById(id).getName() || ''; } catch (error) {}
      return [id, title, index + 1, now, 'ระบบเดิม'];
    });
    sheet.getRange(2, 1, rows.length, DOCUMENT_LIBRARY_HEADERS.length).setValues(rows);
  }
  return sheet;
}

function extractDocumentLibraryDriveId_(source) {
  const text = String(source || '').trim();
  if (!text) return '';
  const patterns = [/\/d\/([a-zA-Z0-9_-]{20,})/, /[?&]id=([a-zA-Z0-9_-]{20,})/, /^([a-zA-Z0-9_-]{20,})$/];
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) return match[1];
  }
  return '';
}

function getDocumentLibraryFiles() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getDocumentLibrarySheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, DOCUMENT_LIBRARY_HEADERS.length).getDisplayValues()
    .filter(function(row) { return String(row[0] || '').trim(); })
    .map(function(row, index) {
      const id = String(row[0] || '').trim();
      let title = String(row[1] || '').trim();
      if (!title) { try { title = DriveApp.getFileById(id).getName() || ''; } catch (error) {} }
      return { id: id, title: title || ('ไฟล์ Google Drive ' + (index + 1)), order: Number(row[2] || index + 1) || index + 1 };
    })
    .sort(function(a, b) { return a.order - b.order; });
}

function saveDocumentLibraryFileFromAdmin(adminUsername, data) {
  const ctx = assertAdminUser_(adminUsername);
  const source = data && data.source;
  const id = extractDocumentLibraryDriveId_(source);
  if (!id) throw new Error('ลิงก์ Google Drive หรือรหัสไฟล์ไม่ถูกต้อง');
  let driveName = '';
  try { driveName = DriveApp.getFileById(id).getName() || ''; }
  catch (error) { throw new Error('ไม่สามารถเข้าถึงไฟล์ Google Drive นี้ได้ กรุณาตรวจสอบสิทธิ์แชร์ไฟล์'); }
  const sheet = getDocumentLibrarySheet_(ctx.ss);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    if (ids.some(function(row) { return String(row[0] || '').trim() === id; })) throw new Error('ไฟล์นี้มีอยู่ในรายการแล้ว');
  }
  const title = String(data && data.title || '').trim() || driveName;
  sheet.appendRow([id, title, Math.max(1, lastRow), new Date(), String(adminUsername || '').trim()]);
  SpreadsheetApp.flush();
  return { ok: true, message: 'เพิ่มเอกสารเรียบร้อยแล้ว', id: id, title: title };
}

function deleteDocumentLibraryFileFromAdmin(adminUsername, fileId) {
  const ctx = assertAdminUser_(adminUsername);
  const id = String(fileId || '').trim();
  if (!id) throw new Error('ไม่พบรหัสไฟล์ที่ต้องการลบ');
  const sheet = getDocumentLibrarySheet_(ctx.ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error('ไม่พบไฟล์ในรายการ');
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === id) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return { ok: true, message: 'นำเอกสารออกจากรายการแล้ว', id: id };
    }
  }
  throw new Error('ไม่พบไฟล์ในรายการ');
}

function getDriveFileNamesForDocumentLibrary(fileIds) {
  const ids = Array.isArray(fileIds) ? fileIds : [];
  return ids.map(function(id) {
    const fileId = String(id || '').trim();
    const result = { id: fileId, name: '', ok: false, error: '' };
    if (!fileId) return result;
    try {
      const file = DriveApp.getFileById(fileId);
      result.name = file.getName() || '';
      result.ok = true;
    } catch (err) {
      result.error = err && err.message ? err.message : String(err || 'ไม่สามารถอ่านชื่อไฟล์ได้');
    }
    return result;
  });
}


/* ============================================================================
 * หมากฮอสออนไลน์ระหว่างผู้ใช้งานคนละเครื่อง
 * - บันทึกสถานะห้องลง Google Sheets
 * - ใช้ LockService ป้องกันการเดินพร้อมกัน
 * - ตรวจสอบกติกาที่ฝั่งเซิร์ฟเวอร์ทุกครั้ง
 * ========================================================================== */
const ONLINE_CHECKERS_SHEET_NAME = 'ห้องหมากฮอสออนไลน์';
const ONLINE_CHECKERS_HEADERS = [
  'รหัสห้อง',
  'สถานะ',
  'ผู้ใช้ฝ่ายแดง',
  'ชื่อฝ่ายแดง',
  'ผู้ใช้ฝ่ายดำ',
  'ชื่อฝ่ายดำ',
  'กระดาน JSON',
  'ตาเดิน',
  'บังคับเดินต่อแถว',
  'บังคับเดินต่อคอลัมน์',
  'ผู้ชนะ',
  'เวอร์ชัน',
  'การเดินล่าสุด',
  'วันที่สร้าง',
  'วันที่แก้ไข'
];

const ONLINE_CHECKERS_ROOM_CACHE_SECONDS = 21600;
const ONLINE_CHECKERS_USER_CACHE_SECONDS = 120;
const ONLINE_CHECKERS_SHEET_CACHE_SECONDS = 21600;

function getOnlineCheckersCache_() {
  try {
    return CacheService.getScriptCache();
  } catch (error) {
    return null;
  }
}

function getOnlineCheckersRoomCacheKey_(sheet, roomCode) {
  return 'online-checkers-room-row:' + sheet.getSheetId() + ':' +
    String(roomCode || '').trim().toUpperCase();
}

function putOnlineCheckersRoomRowCache_(sheet, roomCode, rowNumber) {
  const cache = getOnlineCheckersCache_();
  if (!cache || !rowNumber) return;
  try {
    cache.put(
      getOnlineCheckersRoomCacheKey_(sheet, roomCode),
      String(rowNumber),
      ONLINE_CHECKERS_ROOM_CACHE_SECONDS
    );
  } catch (error) {}
}

function getOnlineCheckersSheet_(ss) {
  let sheet = ss.getSheetByName(ONLINE_CHECKERS_SHEET_NAME);
  let created = false;
  if (!sheet) {
    sheet = ss.insertSheet(ONLINE_CHECKERS_SHEET_NAME);
    created = true;
  }

  const cache = getOnlineCheckersCache_();
  const readyKey = 'online-checkers-sheet-ready:' + sheet.getSheetId() + ':v2';
  if (!created && cache) {
    try {
      if (cache.get(readyKey) === '1') return sheet;
    } catch (error) {}
  }

  const required = ONLINE_CHECKERS_HEADERS.length;
  const headers = sheet.getRange(1, 1, 1, required).getDisplayValues()[0]
    .map(function(value) { return String(value || '').trim(); });
  const matches = ONLINE_CHECKERS_HEADERS.every(function(header, index) {
    return headers[index] === header;
  });
  if (!matches) sheet.getRange(1, 1, 1, required).setValues([ONLINE_CHECKERS_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, required).setFontWeight('bold').setBackground('#fee2e2');
  } catch (error) {}

  if (cache) {
    try {
      cache.put(readyKey, '1', ONLINE_CHECKERS_SHEET_CACHE_SECONDS);
    } catch (error) {}
  }
  return sheet;
}

function getOnlineCheckersActiveUser_(username) {
  const key = String(username || '').trim();
  if (!key) throw new Error('กรุณาเข้าสู่ระบบก่อนเล่นหมากฮอสออนไลน์');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const cache = getOnlineCheckersCache_();
  const cacheKey = 'online-checkers-active-user:' + key.toLowerCase();

  if (cache) {
    try {
      const cachedText = cache.get(cacheKey);
      if (cachedText) {
        const cached = JSON.parse(cachedText);
        if (cached && cached.status === 'active') {
          return {
            ss: ss,
            username: key,
            fullName: String(cached.fullName || key).trim()
          };
        }
      }
    } catch (error) {}
  }

  const userSheet = getUserSheet_(ss);
  ensureDefaultUserRows_(userSheet);
  const found = findUserRow_(userSheet, key);
  if (!found) throw new Error('ไม่พบบัญชีผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
  const status = normalizeUserStatus_(found.values[6] || 'active');
  if (status !== 'active') throw new Error('บัญชีผู้ใช้งานนี้ถูกปิดการใช้งาน');

  const fullName = String(found.values[2] || key).trim();
  if (cache) {
    try {
      cache.put(
        cacheKey,
        JSON.stringify({ status:'active', fullName:fullName }),
        ONLINE_CHECKERS_USER_CACHE_SECONDS
      );
    } catch (error) {}
  }
  return { ss:ss, username:key, fullName:fullName };
}

function createOnlineCheckersInitialBoard_() {
  const board = Array.from({ length: 8 }, function() { return Array(8).fill(''); });
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 1) board[row][col] = 'b';
    }
  }
  for (let row = 6; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 1) board[row][col] = 'r';
    }
  }
  return board;
}

function onlineCheckersPiecePlayer_(piece) {
  const text = String(piece || '');
  if (!text) return '';
  return text.toLowerCase() === 'r' ? 'red' : 'black';
}

function onlineCheckersIsKing_(piece) {
  return piece === 'R' || piece === 'B';
}

function onlineCheckersInside_(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function onlineCheckersDirections_(piece) {
  if (onlineCheckersIsKing_(piece)) return [[-1,-1],[-1,1],[1,-1],[1,1]];
  return onlineCheckersPiecePlayer_(piece) === 'red'
    ? [[-1,-1],[-1,1]]
    : [[1,-1],[1,1]];
}

function onlineCheckersPromote_(piece, row) {
  if (piece === 'r' && row === 0) return 'R';
  if (piece === 'b' && row === 7) return 'B';
  return piece;
}

function onlineCheckersPromotionEndsTurn_(piece, toRow) {
  if (!piece || onlineCheckersIsKing_(piece)) return false;
  return (piece === 'r' && toRow === 0) || (piece === 'b' && toRow === 7);
}

function getOnlineCheckersMovesFrom_(board, row, col, captureOnly) {
  if (!board || !onlineCheckersInside_(row, col)) return [];
  const piece = board[row][col];
  if (!piece) return [];
  const player = onlineCheckersPiecePlayer_(piece);
  const moves = [];

  if (onlineCheckersIsKing_(piece)) {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(direction) {
      let scanRow = row + direction[0];
      let scanCol = col + direction[1];

      while (onlineCheckersInside_(scanRow, scanCol) && !board[scanRow][scanCol]) {
        if (!captureOnly) {
          moves.push({
            fromRow:row, fromCol:col, toRow:scanRow, toCol:scanCol, capture:null
          });
        }
        scanRow += direction[0];
        scanCol += direction[1];
      }

      if (!onlineCheckersInside_(scanRow, scanCol)) return;
      const seenPiece = board[scanRow][scanCol];
      if (!seenPiece || onlineCheckersPiecePlayer_(seenPiece) === player) return;

      const landingRow = scanRow + direction[0];
      const landingCol = scanCol + direction[1];
      if (onlineCheckersInside_(landingRow, landingCol) && !board[landingRow][landingCol]) {
        moves.push({
          fromRow:row, fromCol:col, toRow:landingRow, toCol:landingCol,
          capture:{ row:scanRow, col:scanCol }
        });
      }
    });
    return captureOnly ? moves.filter(function(move) { return Boolean(move.capture); }) : moves;
  }

  onlineCheckersDirections_(piece).forEach(function(direction) {
    const nextRow = row + direction[0];
    const nextCol = col + direction[1];
    if (!onlineCheckersInside_(nextRow, nextCol)) return;
    if (!board[nextRow][nextCol] && !captureOnly) {
      moves.push({ fromRow:row, fromCol:col, toRow:nextRow, toCol:nextCol, capture:null });
    }
    const middlePiece = board[nextRow][nextCol];
    const jumpRow = row + direction[0] * 2;
    const jumpCol = col + direction[1] * 2;
    if (
      middlePiece &&
      onlineCheckersPiecePlayer_(middlePiece) !== player &&
      onlineCheckersInside_(jumpRow, jumpCol) &&
      !board[jumpRow][jumpCol]
    ) {
      moves.push({
        fromRow:row,
        fromCol:col,
        toRow:jumpRow,
        toCol:jumpCol,
        capture:{ row:nextRow, col:nextCol }
      });
    }
  });
  return captureOnly ? moves.filter(function(move) { return Boolean(move.capture); }) : moves;
}

function getOnlineCheckersAllCaptures_(board, player) {
  const captures = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (onlineCheckersPiecePlayer_(board[row][col]) !== player) continue;
      getOnlineCheckersMovesFrom_(board, row, col, true).forEach(function(move) {
        captures.push(move);
      });
    }
  }
  return captures;
}

function getOnlineCheckersAllMoves_(board, player) {
  const captures = getOnlineCheckersAllCaptures_(board, player);
  if (captures.length) return captures;
  const moves = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (onlineCheckersPiecePlayer_(board[row][col]) !== player) continue;
      getOnlineCheckersMovesFrom_(board, row, col, false)
        .filter(function(move) { return !move.capture; })
        .forEach(function(move) { moves.push(move); });
    }
  }
  return moves;
}

function findOnlineCheckersRoomRow_(sheet, roomCode) {
  const code = String(roomCode || '').trim().toUpperCase();
  const lastRow = sheet.getLastRow();
  if (!code || lastRow <= 1) return 0;

  const cache = getOnlineCheckersCache_();
  const cacheKey = getOnlineCheckersRoomCacheKey_(sheet, code);
  if (cache) {
    try {
      const cachedRow = Number(cache.get(cacheKey));
      if (cachedRow >= 2 && cachedRow <= lastRow) {
        const cachedCode = String(sheet.getRange(cachedRow, 1).getDisplayValue() || '')
          .trim().toUpperCase();
        if (cachedCode === code) return cachedRow;
        cache.remove(cacheKey);
      }
    } catch (error) {}
  }

  const found = sheet.getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(code)
    .matchEntireCell(true)
    .matchCase(false)
    .findNext();
  const rowNumber = found ? found.getRow() : 0;
  if (rowNumber) putOnlineCheckersRoomRowCache_(sheet, code, rowNumber);
  return rowNumber;
}

function generateOnlineCheckersRoomCode_(sheet) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    if (!findOnlineCheckersRoomRow_(sheet, code)) return code;
  }
  const seed = Number(new Date().getTime()) % 10000;
  for (let offset = 0; offset < 10000; offset += 1) {
    const code = String((seed + offset) % 10000).padStart(4, '0');
    if (!findOnlineCheckersRoomRow_(sheet, code)) return code;
  }
  throw new Error('ไม่สามารถสร้างรหัสห้อง 4 หลักได้ กรุณาลองใหม่อีกครั้ง');
}

function parseOnlineCheckersRoomRow_(row, rowNumber, username) {
  let board;
  try {
    board = JSON.parse(String(row[6] || '[]'));
  } catch (error) {
    board = createOnlineCheckersInitialBoard_();
  }
  if (!Array.isArray(board) || board.length !== 8) board = createOnlineCheckersInitialBoard_();
  const redUsername = String(row[2] || '').trim();
  const blackUsername = String(row[4] || '').trim();
  const playerColor = username === redUsername ? 'red' : (username === blackUsername ? 'black' : '');
  const forcedRowText = String(row[8] == null ? '' : row[8]).trim();
  const forcedColText = String(row[9] == null ? '' : row[9]).trim();
  return {
    rowNumber: rowNumber,
    code: String(row[0] || '').trim().toUpperCase(),
    status: String(row[1] || 'waiting').trim(),
    redUsername: redUsername,
    redName: String(row[3] || redUsername).trim(),
    blackUsername: blackUsername,
    blackName: String(row[5] || blackUsername).trim(),
    board: board,
    turn: String(row[7] || 'red').trim() === 'black' ? 'black' : 'red',
    forcedFrom: forcedRowText !== '' && forcedColText !== ''
      ? { row:Number(forcedRowText), col:Number(forcedColText) }
      : null,
    winner: String(row[10] || '').trim(),
    version: Number(row[11]) || 1,
    lastMove: String(row[12] || '').trim(),
    createdAt: String(row[13] || '').trim(),
    updatedAt: String(row[14] || '').trim(),
    playerColor: playerColor
  };
}

function onlineCheckersRoomResponse_(room) {
  return {
    ok: true,
    room: {
      code: room.code,
      status: room.status,
      redUsername: room.redUsername,
      redName: room.redName,
      blackUsername: room.blackUsername,
      blackName: room.blackName,
      board: room.board,
      turn: room.turn,
      forcedFrom: room.forcedFrom,
      winner: room.winner,
      version: room.version,
      lastMove: room.lastMove,
      updatedAt: room.updatedAt
    },
    playerColor: room.playerColor
  };
}

function createOnlineCheckersRoom(username) {
  const user = getOnlineCheckersActiveUser_(username);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  try {
    const sheet = getOnlineCheckersSheet_(user.ss);
    const code = generateOnlineCheckersRoomCode_(sheet);
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    const row = [
      code,
      'waiting',
      user.username,
      user.fullName,
      '',
      '',
      JSON.stringify(createOnlineCheckersInitialBoard_()),
      'red',
      '',
      '',
      '',
      1,
      'สร้างห้อง',
      now,
      now
    ];
    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();
    putOnlineCheckersRoomRowCache_(sheet, code, rowNumber);
    return onlineCheckersRoomResponse_(parseOnlineCheckersRoomRow_(row, rowNumber, user.username));
  } finally {
    lock.releaseLock();
  }
}

function joinOnlineCheckersRoom(roomCode, username) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) throw new Error('กรุณากรอกรหัสห้อง');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  try {
    const sheet = getOnlineCheckersSheet_(user.ss);
    const rowNumber = findOnlineCheckersRoomRow_(sheet, code);
    if (!rowNumber) throw new Error('ไม่พบห้องหมากฮอสนี้');
    const row = sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).getValues()[0];
    let room = parseOnlineCheckersRoomRow_(row, rowNumber, user.username);
    if (room.redUsername === user.username || room.blackUsername === user.username) {
      return onlineCheckersRoomResponse_(room);
    }
    if (room.status === 'finished') throw new Error('ห้องนี้จบเกมแล้ว กรุณาให้ผู้สร้างเริ่มเกมใหม่');
    if (room.blackUsername) throw new Error('ห้องนี้มีผู้เล่นครบแล้ว');
    row[4] = user.username;
    row[5] = user.fullName;
    row[1] = 'active';
    row[11] = (Number(row[11]) || 1) + 1;
    row[12] = user.fullName + ' เข้าร่วมห้อง';
    row[14] = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).setValues([row]);
    room = parseOnlineCheckersRoomRow_(row, rowNumber, user.username);
    return onlineCheckersRoomResponse_(room);
  } finally {
    lock.releaseLock();
  }
}

function getOnlineCheckersRoomUpdate(roomCode, username, knownVersion) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) throw new Error('ไม่พบรหัสห้อง');

  const sheet = getOnlineCheckersSheet_(user.ss);
  const rowNumber = findOnlineCheckersRoomRow_(sheet, code);
  if (!rowNumber) throw new Error('ไม่พบห้องหมากฮอสนี้');

  const summary = sheet.getRange(rowNumber, 1, 1, 12).getValues()[0];
  const redUsername = String(summary[2] || '').trim();
  const blackUsername = String(summary[4] || '').trim();
  const playerColor = user.username === redUsername
    ? 'red'
    : (user.username === blackUsername ? 'black' : '');
  if (!playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');

  const version = Number(summary[11]) || 1;
  if (Number(knownVersion) === version) {
    return {
      ok: true,
      unchanged: true,
      version: version,
      status: String(summary[1] || 'waiting').trim(),
      turn: String(summary[7] || 'red').trim() === 'black' ? 'black' : 'red',
      playerColor: playerColor
    };
  }

  const row = sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).getValues()[0];
  const response = onlineCheckersRoomResponse_(
    parseOnlineCheckersRoomRow_(row, rowNumber, user.username)
  );
  response.unchanged = false;
  return response;
}

function getOnlineCheckersRoom(roomCode, username) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) throw new Error('ไม่พบรหัสห้อง');
  const sheet = getOnlineCheckersSheet_(user.ss);
  const rowNumber = findOnlineCheckersRoomRow_(sheet, code);
  if (!rowNumber) throw new Error('ไม่พบห้องหมากฮอสนี้');
  const row = sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).getValues()[0];
  const room = parseOnlineCheckersRoomRow_(row, rowNumber, user.username);
  if (!room.playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');
  return onlineCheckersRoomResponse_(room);
}

function moveOnlineCheckersPiece(roomCode, username, moveData, expectedVersion) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  const move = moveData || {};
  const fromRow = Number(move.fromRow);
  const fromCol = Number(move.fromCol);
  const toRow = Number(move.toRow);
  const toCol = Number(move.toCol);
  if (![fromRow, fromCol, toRow, toCol].every(Number.isFinite)) throw new Error('ข้อมูลการเดินไม่ถูกต้อง');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  try {
    const sheet = getOnlineCheckersSheet_(user.ss);
    const rowNumber = findOnlineCheckersRoomRow_(sheet, code);
    if (!rowNumber) throw new Error('ไม่พบห้องหมากฮอสนี้');
    const row = sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).getValues()[0];
    let room = parseOnlineCheckersRoomRow_(row, rowNumber, user.username);
    if (!room.playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');
    if (room.status !== 'active') throw new Error(room.status === 'waiting' ? 'กำลังรอผู้เล่นอีกคน' : 'เกมนี้จบแล้ว');
    if (Number(expectedVersion) && Number(expectedVersion) !== room.version) {
      const response = onlineCheckersRoomResponse_(room);
      response.stale = true;
      response.message = 'กระดานมีการเปลี่ยนแปลง ระบบอัปเดตข้อมูลล่าสุดแล้ว';
      return response;
    }
    if (room.turn !== room.playerColor) throw new Error('ยังไม่ถึงตาของคุณ');
    if (room.forcedFrom && (room.forcedFrom.row !== fromRow || room.forcedFrom.col !== fromCol)) {
      throw new Error('ต้องเดินหมากตัวเดิมเพื่อกินต่อ');
    }
    const piece = room.board[fromRow] && room.board[fromRow][fromCol];
    if (onlineCheckersPiecePlayer_(piece) !== room.playerColor) throw new Error('กรุณาเลือกหมากของคุณ');
    const captureRequired = getOnlineCheckersAllCaptures_(room.board, room.playerColor).length > 0;
    const legalMove = getOnlineCheckersMovesFrom_(room.board, fromRow, fromCol, captureRequired)
      .find(function(candidate) { return candidate.toRow === toRow && candidate.toCol === toCol; });
    if (!legalMove) throw new Error(captureRequired ? 'มีทางกิน จึงต้องเลือกเดินแบบกินหมาก' : 'เดินหมากไปช่องนี้ไม่ได้');

    let movingPiece = room.board[fromRow][fromCol];
    const promotionEndsTurn = onlineCheckersPromotionEndsTurn_(movingPiece, toRow);
    room.board[fromRow][fromCol] = '';
    if (legalMove.capture) room.board[legalMove.capture.row][legalMove.capture.col] = '';
    movingPiece = onlineCheckersPromote_(movingPiece, toRow);
    room.board[toRow][toCol] = movingPiece;

    let keepTurn = false;
    if (legalMove.capture && !promotionEndsTurn) {
      const moreCaptures = getOnlineCheckersMovesFrom_(room.board, toRow, toCol, true);
      if (moreCaptures.length) {
        keepTurn = true;
        room.forcedFrom = { row:toRow, col:toCol };
      }
    }
    if (!keepTurn) {
      room.forcedFrom = null;
      room.turn = room.turn === 'red' ? 'black' : 'red';
      if (!getOnlineCheckersAllMoves_(room.board, room.turn).length) {
        room.status = 'finished';
        room.winner = room.turn === 'red' ? 'black' : 'red';
      }
    }

    room.version += 1;
    const moverName = room.playerColor === 'red' ? room.redName : room.blackName;
    room.lastMove = moverName + (legalMove.capture ? ' กินหมาก' : ' เดินหมาก');
    room.updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    row[1] = room.status;
    row[6] = JSON.stringify(room.board);
    row[7] = room.turn;
    row[8] = room.forcedFrom ? room.forcedFrom.row : '';
    row[9] = room.forcedFrom ? room.forcedFrom.col : '';
    row[10] = room.winner;
    row[11] = room.version;
    row[12] = room.lastMove;
    row[14] = room.updatedAt;
    sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).setValues([row]);
    return onlineCheckersRoomResponse_(parseOnlineCheckersRoomRow_(row, rowNumber, user.username));
  } finally {
    lock.releaseLock();
  }
}

function restartOnlineCheckersRoom(roomCode, username) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  try {
    const sheet = getOnlineCheckersSheet_(user.ss);
    const rowNumber = findOnlineCheckersRoomRow_(sheet, code);
    if (!rowNumber) throw new Error('ไม่พบห้องหมากฮอสนี้');
    const row = sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).getValues()[0];
    let room = parseOnlineCheckersRoomRow_(row, rowNumber, user.username);
    if (!room.playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');
    row[1] = room.blackUsername ? 'active' : 'waiting';
    row[6] = JSON.stringify(createOnlineCheckersInitialBoard_());
    row[7] = 'red';
    row[8] = '';
    row[9] = '';
    row[10] = '';
    row[11] = room.version + 1;
    row[12] = user.fullName + ' เริ่มเกมใหม่';
    row[14] = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    sheet.getRange(rowNumber, 1, 1, ONLINE_CHECKERS_HEADERS.length).setValues([row]);
    room = parseOnlineCheckersRoomRow_(row, rowNumber, user.username);
    return onlineCheckersRoomResponse_(room);
  } finally {
    lock.releaseLock();
  }
}


/* ============================================================================
 * หมากรุกไทยออนไลน์ระหว่างผู้ใช้งานคนละเครื่อง
 * - ใช้ระบบห้องตัวเลข 4 หลักและซิงก์เฉพาะเมื่อเวอร์ชันเปลี่ยน
 * - ตรวจสอบกติกาและการรุกที่ฝั่งเซิร์ฟเวอร์ทุกครั้ง
 * ========================================================================== */
const ONLINE_MAKRUK_SHEET_NAME = 'ห้องหมากรุกไทยออนไลน์';
const ONLINE_MAKRUK_HEADERS = [
  'รหัสห้อง',
  'สถานะ',
  'ผู้ใช้ฝ่ายขาว',
  'ชื่อฝ่ายขาว',
  'ผู้ใช้ฝ่ายดำ',
  'ชื่อฝ่ายดำ',
  'กระดาน JSON',
  'ตาเดิน',
  'ผู้ชนะ',
  'เวอร์ชัน',
  'การเดินล่าสุด',
  'ข้อมูลการเดิน JSON',
  'วันที่สร้าง',
  'วันที่แก้ไข'
];

function getOnlineMakrukSheet_(ss) {
  let sheet = ss.getSheetByName(ONLINE_MAKRUK_SHEET_NAME);
  let created = false;
  if (!sheet) {
    sheet = ss.insertSheet(ONLINE_MAKRUK_SHEET_NAME);
    created = true;
  }

  const cache = getOnlineCheckersCache_();
  const readyKey = 'online-makruk-sheet-ready:' + sheet.getSheetId() + ':v1';
  if (!created && cache) {
    try {
      if (cache.get(readyKey) === '1') return sheet;
    } catch (error) {}
  }

  const required = ONLINE_MAKRUK_HEADERS.length;
  const headers = sheet.getRange(1, 1, 1, required).getDisplayValues()[0]
    .map(function(value) { return String(value || '').trim(); });
  const matches = ONLINE_MAKRUK_HEADERS.every(function(header, index) {
    return headers[index] === header;
  });
  if (!matches) sheet.getRange(1, 1, 1, required).setValues([ONLINE_MAKRUK_HEADERS]);
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, required).setFontWeight('bold').setBackground('#ffedd5');
  } catch (error) {}

  if (cache) {
    try {
      cache.put(readyKey, '1', ONLINE_CHECKERS_SHEET_CACHE_SECONDS);
    } catch (error) {}
  }
  return sheet;
}

function createOnlineMakrukInitialBoard_() {
  const board = Array.from({ length:8 }, function() { return Array(8).fill(''); });
  board[0] = ['bR','bN','bS','bM','bK','bS','bN','bR'];
  board[2] = Array(8).fill('bP');
  board[5] = Array(8).fill('wP');
  board[7] = ['wR','wN','wS','wK','wM','wS','wN','wR'];
  return board;
}

function onlineMakrukPieceColor_(piece) {
  if (!piece) return '';
  return String(piece).charAt(0) === 'w' ? 'white' : 'black';
}

function onlineMakrukPieceType_(piece) {
  return piece ? String(piece).charAt(1) : '';
}

function onlineMakrukInside_(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function onlineMakrukForward_(color) {
  return color === 'white' ? -1 : 1;
}

function onlineMakrukPromotionRow_(color) {
  return color === 'white' ? 2 : 5;
}

function onlineMakrukPromote_(piece, row) {
  if (onlineMakrukPieceType_(piece) !== 'P') return piece;
  const color = onlineMakrukPieceColor_(piece);
  return row === onlineMakrukPromotionRow_(color)
    ? String(piece).charAt(0) + 'M'
    : piece;
}

function findOnlineMakrukKing_(board, color) {
  const target = color === 'white' ? 'wK' : 'bK';
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (board[row][col] === target) return { row:row, col:col };
    }
  }
  return null;
}

function getOnlineMakrukPseudoMoves_(board, row, col, attackOnly) {
  if (!board || !onlineMakrukInside_(row,col)) return [];
  const piece = board[row][col];
  if (!piece) return [];
  const color = onlineMakrukPieceColor_(piece);
  const type = onlineMakrukPieceType_(piece);
  const moves = [];

  function addStep(toRow, toCol) {
    if (!onlineMakrukInside_(toRow,toCol)) return;
    const target = board[toRow][toCol];
    if (!target) {
      moves.push({ fromRow:row, fromCol:col, toRow:toRow, toCol:toCol, capture:null });
    } else if (onlineMakrukPieceColor_(target) !== color) {
      moves.push({
        fromRow:row, fromCol:col, toRow:toRow, toCol:toCol,
        capture:{ row:toRow, col:toCol, piece:target }
      });
    }
  }

  function addSlide(dRow, dCol) {
    let toRow = row+dRow;
    let toCol = col+dCol;
    while (onlineMakrukInside_(toRow,toCol)) {
      const target = board[toRow][toCol];
      if (!target) {
        moves.push({ fromRow:row, fromCol:col, toRow:toRow, toCol:toCol, capture:null });
      } else {
        if (onlineMakrukPieceColor_(target) !== color) {
          moves.push({
            fromRow:row, fromCol:col, toRow:toRow, toCol:toCol,
            capture:{ row:toRow, col:toCol, piece:target }
          });
        }
        break;
      }
      toRow += dRow;
      toCol += dCol;
    }
  }

  if (type === 'P') {
    const forward = onlineMakrukForward_(color);
    if (attackOnly) {
      [-1,1].forEach(function(dCol) {
        const toRow = row+forward;
        const toCol = col+dCol;
        if (onlineMakrukInside_(toRow,toCol)) {
          moves.push({ fromRow:row, fromCol:col, toRow:toRow, toCol:toCol, capture:null });
        }
      });
      return moves;
    }

    const nextRow = row+forward;
    if (onlineMakrukInside_(nextRow,col) && !board[nextRow][col]) {
      moves.push({ fromRow:row, fromCol:col, toRow:nextRow, toCol:col, capture:null });
    }
    [-1,1].forEach(function(dCol) {
      const toRow = row+forward;
      const toCol = col+dCol;
      if (!onlineMakrukInside_(toRow,toCol)) return;
      const target = board[toRow][toCol];
      if (target && onlineMakrukPieceColor_(target) !== color) {
        moves.push({
          fromRow:row, fromCol:col, toRow:toRow, toCol:toCol,
          capture:{ row:toRow, col:toCol, piece:target }
        });
      }
    });
  } else if (type === 'R') {
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(function(direction) {
      addSlide(direction[0],direction[1]);
    });
  } else if (type === 'N') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
      .forEach(function(direction) { addStep(row+direction[0],col+direction[1]); });
  } else if (type === 'S') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(direction) {
      addStep(row+direction[0],col+direction[1]);
    });
    addStep(row+onlineMakrukForward_(color),col);
  } else if (type === 'M') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(direction) {
      addStep(row+direction[0],col+direction[1]);
    });
  } else if (type === 'K') {
    for (let dRow = -1; dRow <= 1; dRow += 1) {
      for (let dCol = -1; dCol <= 1; dCol += 1) {
        if (dRow || dCol) addStep(row+dRow,col+dCol);
      }
    }
  }
  return moves;
}

function applyOnlineMakrukMoveToBoard_(board, move) {
  const next = board.map(function(row) { return row.slice(); });
  let piece = next[move.fromRow][move.fromCol];
  next[move.fromRow][move.fromCol] = '';
  next[move.toRow][move.toCol] = onlineMakrukPromote_(piece,move.toRow);
  return next;
}

function isOnlineMakrukSquareAttacked_(board, row, col, byColor) {
  for (let fromRow = 0; fromRow < 8; fromRow += 1) {
    for (let fromCol = 0; fromCol < 8; fromCol += 1) {
      const piece = board[fromRow][fromCol];
      if (onlineMakrukPieceColor_(piece) !== byColor) continue;
      const moves = getOnlineMakrukPseudoMoves_(board,fromRow,fromCol,true);
      if (moves.some(function(move) {
        return move.toRow === row && move.toCol === col;
      })) return true;
    }
  }
  return false;
}

function isOnlineMakrukInCheck_(board, color) {
  const king = findOnlineMakrukKing_(board,color);
  if (!king) return true;
  const opponent = color === 'white' ? 'black' : 'white';
  return isOnlineMakrukSquareAttacked_(board,king.row,king.col,opponent);
}

function getOnlineMakrukLegalMoves_(board, color) {
  const moves = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (onlineMakrukPieceColor_(piece) !== color) continue;
      getOnlineMakrukPseudoMoves_(board,row,col,false).forEach(function(move) {
        const target = board[move.toRow][move.toCol];
        if (onlineMakrukPieceType_(target) === 'K') return;
        const next = applyOnlineMakrukMoveToBoard_(board,move);
        if (!isOnlineMakrukInCheck_(next,color)) moves.push(move);
      });
    }
  }
  return moves;
}

function parseOnlineMakrukRoomRow_(row, rowNumber, username) {
  let board;
  try {
    board = JSON.parse(String(row[6] || '[]'));
  } catch (error) {
    board = createOnlineMakrukInitialBoard_();
  }
  if (!Array.isArray(board) || board.length !== 8) board = createOnlineMakrukInitialBoard_();

  let lastMoveData = null;
  try {
    const parsed = JSON.parse(String(row[11] || 'null'));
    if (parsed && typeof parsed === 'object') lastMoveData = parsed;
  } catch (error) {}

  const whiteUsername = String(row[2] || '').trim();
  const blackUsername = String(row[4] || '').trim();
  const playerColor = username === whiteUsername
    ? 'white'
    : (username === blackUsername ? 'black' : '');

  return {
    rowNumber:rowNumber,
    code:String(row[0] || '').trim().toUpperCase(),
    status:String(row[1] || 'waiting').trim(),
    whiteUsername:whiteUsername,
    whiteName:String(row[3] || whiteUsername).trim(),
    blackUsername:blackUsername,
    blackName:String(row[5] || blackUsername).trim(),
    board:board,
    turn:String(row[7] || 'white').trim() === 'black' ? 'black' : 'white',
    winner:String(row[8] || '').trim(),
    version:Number(row[9]) || 1,
    lastMove:String(row[10] || '').trim(),
    lastMoveData:lastMoveData,
    createdAt:String(row[12] || '').trim(),
    updatedAt:String(row[13] || '').trim(),
    playerColor:playerColor
  };
}

function onlineMakrukRoomResponse_(room) {
  return {
    ok:true,
    room:{
      code:room.code,
      status:room.status,
      whiteUsername:room.whiteUsername,
      whiteName:room.whiteName,
      blackUsername:room.blackUsername,
      blackName:room.blackName,
      board:room.board,
      turn:room.turn,
      winner:room.winner,
      version:room.version,
      lastMove:room.lastMove,
      lastMoveData:room.lastMoveData,
      updatedAt:room.updatedAt
    },
    playerColor:room.playerColor
  };
}

function findOnlineMakrukRoomRow_(sheet, roomCode) {
  return findOnlineCheckersRoomRow_(sheet,roomCode);
}

function createOnlineMakrukRoom(username) {
  const user = getOnlineCheckersActiveUser_(username);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) {
    throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  }
  try {
    const sheet = getOnlineMakrukSheet_(user.ss);
    const code = generateOnlineCheckersRoomCode_(sheet);
    const now = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'Asia/Bangkok',
      'dd/MM/yyyy HH:mm:ss'
    );
    const row = [
      code,
      'waiting',
      user.username,
      user.fullName,
      '',
      '',
      JSON.stringify(createOnlineMakrukInitialBoard_()),
      'white',
      '',
      1,
      'สร้างห้อง',
      '',
      now,
      now
    ];
    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();
    putOnlineCheckersRoomRowCache_(sheet,code,rowNumber);
    return onlineMakrukRoomResponse_(
      parseOnlineMakrukRoomRow_(row,rowNumber,user.username)
    );
  } finally {
    lock.releaseLock();
  }
}

function joinOnlineMakrukRoom(roomCode, username) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) throw new Error('กรุณากรอกรหัสห้อง');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) {
    throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  }
  try {
    const sheet = getOnlineMakrukSheet_(user.ss);
    const rowNumber = findOnlineMakrukRoomRow_(sheet,code);
    if (!rowNumber) throw new Error('ไม่พบห้องหมากรุกไทยนี้');

    const row = sheet.getRange(
      rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length
    ).getValues()[0];
    let room = parseOnlineMakrukRoomRow_(row,rowNumber,user.username);
    if (room.whiteUsername === user.username || room.blackUsername === user.username) {
      return onlineMakrukRoomResponse_(room);
    }
    if (room.status === 'finished') {
      throw new Error('ห้องนี้จบเกมแล้ว กรุณาให้ผู้สร้างเริ่มเกมใหม่');
    }
    if (room.blackUsername) throw new Error('ห้องนี้มีผู้เล่นครบแล้ว');

    row[4] = user.username;
    row[5] = user.fullName;
    row[1] = 'active';
    row[9] = (Number(row[9]) || 1) + 1;
    row[10] = user.fullName + ' เข้าร่วมห้อง';
    row[13] = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'Asia/Bangkok',
      'dd/MM/yyyy HH:mm:ss'
    );
    sheet.getRange(rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length).setValues([row]);
    room = parseOnlineMakrukRoomRow_(row,rowNumber,user.username);
    return onlineMakrukRoomResponse_(room);
  } finally {
    lock.releaseLock();
  }
}

function getOnlineMakrukRoomUpdate(roomCode, username, knownVersion) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) throw new Error('ไม่พบรหัสห้อง');

  const sheet = getOnlineMakrukSheet_(user.ss);
  const rowNumber = findOnlineMakrukRoomRow_(sheet,code);
  if (!rowNumber) throw new Error('ไม่พบห้องหมากรุกไทยนี้');

  const summary = sheet.getRange(rowNumber,1,1,10).getValues()[0];
  const whiteUsername = String(summary[2] || '').trim();
  const blackUsername = String(summary[4] || '').trim();
  const playerColor = user.username === whiteUsername
    ? 'white'
    : (user.username === blackUsername ? 'black' : '');
  if (!playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');

  const version = Number(summary[9]) || 1;
  if (Number(knownVersion) === version) {
    return {
      ok:true,
      unchanged:true,
      version:version,
      status:String(summary[1] || 'waiting').trim(),
      turn:String(summary[7] || 'white').trim() === 'black' ? 'black' : 'white',
      playerColor:playerColor
    };
  }

  const row = sheet.getRange(
    rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length
  ).getValues()[0];
  const response = onlineMakrukRoomResponse_(
    parseOnlineMakrukRoomRow_(row,rowNumber,user.username)
  );
  response.unchanged = false;
  return response;
}

function getOnlineMakrukRoom(roomCode, username) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) throw new Error('ไม่พบรหัสห้อง');
  const sheet = getOnlineMakrukSheet_(user.ss);
  const rowNumber = findOnlineMakrukRoomRow_(sheet,code);
  if (!rowNumber) throw new Error('ไม่พบห้องหมากรุกไทยนี้');
  const row = sheet.getRange(
    rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length
  ).getValues()[0];
  const room = parseOnlineMakrukRoomRow_(row,rowNumber,user.username);
  if (!room.playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');
  return onlineMakrukRoomResponse_(room);
}

function moveOnlineMakrukPiece(roomCode, username, moveData, expectedVersion) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();
  const move = moveData || {};
  const fromRow = Number(move.fromRow);
  const fromCol = Number(move.fromCol);
  const toRow = Number(move.toRow);
  const toCol = Number(move.toCol);
  if (![fromRow,fromCol,toRow,toCol].every(Number.isFinite)) {
    throw new Error('ข้อมูลการเดินไม่ถูกต้อง');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) {
    throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  }
  try {
    const sheet = getOnlineMakrukSheet_(user.ss);
    const rowNumber = findOnlineMakrukRoomRow_(sheet,code);
    if (!rowNumber) throw new Error('ไม่พบห้องหมากรุกไทยนี้');

    const row = sheet.getRange(
      rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length
    ).getValues()[0];
    let room = parseOnlineMakrukRoomRow_(row,rowNumber,user.username);
    if (!room.playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');
    if (room.status !== 'active') {
      throw new Error(room.status === 'waiting' ? 'กำลังรอผู้เล่นอีกคน' : 'เกมนี้จบแล้ว');
    }
    if (Number(expectedVersion) && Number(expectedVersion) !== room.version) {
      const response = onlineMakrukRoomResponse_(room);
      response.stale = true;
      response.message = 'กระดานมีการเปลี่ยนแปลง ระบบอัปเดตข้อมูลล่าสุดแล้ว';
      return response;
    }
    if (room.turn !== room.playerColor) throw new Error('ยังไม่ถึงตาของคุณ');

    const piece = room.board[fromRow] && room.board[fromRow][fromCol];
    if (onlineMakrukPieceColor_(piece) !== room.playerColor) {
      throw new Error('กรุณาเลือกหมากของคุณ');
    }

    const legalMove = getOnlineMakrukLegalMoves_(room.board,room.playerColor)
      .find(function(candidate) {
        return candidate.fromRow === fromRow &&
          candidate.fromCol === fromCol &&
          candidate.toRow === toRow &&
          candidate.toCol === toCol;
      });
    if (!legalMove) throw new Error('เดินหมากไปช่องนี้ไม่ได้ หรือทำให้ขุนของคุณถูกรุก');

    room.board = applyOnlineMakrukMoveToBoard_(room.board,legalMove);
    const moverColor = room.playerColor;
    const nextColor = moverColor === 'white' ? 'black' : 'white';
    room.turn = nextColor;

    const nextMoves = getOnlineMakrukLegalMoves_(room.board,nextColor);
    if (!nextMoves.length) {
      room.status = 'finished';
      room.winner = isOnlineMakrukInCheck_(room.board,nextColor)
        ? moverColor
        : 'draw';
    }

    room.version += 1;
    const moverName = moverColor === 'white' ? room.whiteName : room.blackName;
    room.lastMove = moverName + (legalMove.capture ? ' กินหมาก' : ' เดินหมาก');
    room.lastMoveData = {
      fromRow:fromRow, fromCol:fromCol, toRow:toRow, toCol:toCol
    };
    room.updatedAt = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'Asia/Bangkok',
      'dd/MM/yyyy HH:mm:ss'
    );

    row[1] = room.status;
    row[6] = JSON.stringify(room.board);
    row[7] = room.turn;
    row[8] = room.winner;
    row[9] = room.version;
    row[10] = room.lastMove;
    row[11] = JSON.stringify(room.lastMoveData);
    row[13] = room.updatedAt;
    sheet.getRange(rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length).setValues([row]);

    return onlineMakrukRoomResponse_(
      parseOnlineMakrukRoomRow_(row,rowNumber,user.username)
    );
  } finally {
    lock.releaseLock();
  }
}

function restartOnlineMakrukRoom(roomCode, username) {
  const user = getOnlineCheckersActiveUser_(username);
  const code = String(roomCode || '').trim().toUpperCase();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) {
    throw new Error('ระบบกำลังบันทึกข้อมูลของผู้เล่นอีกฝ่าย กรุณาลองอีกครั้ง');
  }
  try {
    const sheet = getOnlineMakrukSheet_(user.ss);
    const rowNumber = findOnlineMakrukRoomRow_(sheet,code);
    if (!rowNumber) throw new Error('ไม่พบห้องหมากรุกไทยนี้');

    const row = sheet.getRange(
      rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length
    ).getValues()[0];
    let room = parseOnlineMakrukRoomRow_(row,rowNumber,user.username);
    if (!room.playerColor) throw new Error('บัญชีนี้ไม่ได้เป็นผู้เล่นในห้องนี้');

    row[1] = room.blackUsername ? 'active' : 'waiting';
    row[6] = JSON.stringify(createOnlineMakrukInitialBoard_());
    row[7] = 'white';
    row[8] = '';
    row[9] = room.version + 1;
    row[10] = user.fullName + ' เริ่มเกมใหม่';
    row[11] = '';
    row[13] = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'Asia/Bangkok',
      'dd/MM/yyyy HH:mm:ss'
    );
    sheet.getRange(rowNumber,1,1,ONLINE_MAKRUK_HEADERS.length).setValues([row]);
    room = parseOnlineMakrukRoomRow_(row,rowNumber,user.username);
    return onlineMakrukRoomResponse_(room);
  } finally {
    lock.releaseLock();
  }
}
