const SHEET_NAME = 'Transactions';
const SPREADSHEET_ID = '1OFmXrxDUZpGLFxSIfKMkxwuWmRgUlDxCS5QGpGoiXKw';
const HEADERS = ['id', 'date', 'type', 'amount', 'account', 'to_account', 'category', 'note'];
const ACCOUNTS = ['MAKE', 'Dime', 'MyMo', 'Krungthai', 'Cash', 'TrueMoney'];
const TYPES = ['income', 'expense', 'transfer'];
const INCOME_CATEGORIES = ['เงินเดือน', 'ฟรีแลนซ์', 'ขายของ', 'ดอกเบี้ย', 'เงินคืน', 'รายรับอื่นๆ'];
const EXPENSE_CATEGORIES = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'ที่อยู่อาศัย', 'ลงทุน', 'อื่นๆ'];
const TRANSFER_CATEGORIES = ['โอนย้ายบัญชี'];
const CATEGORIES_BY_TYPE = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  transfer: TRANSFER_CATEGORIES,
};
const CATEGORIES = INCOME_CATEGORIES.concat(EXPENSE_CATEGORIES, TRANSFER_CATEGORIES);

function doGet(e) {
  try {
    authorize_(e && e.parameter ? e.parameter.token : '');
    setupSheet_();
    const action = e && e.parameter ? e.parameter.action : '';

    if (action === 'getTransactions') {
      return json_({ success: true, data: getTransactions_() });
    }

    return json_({ success: false, error: 'Unknown GET action' }, 400);
  } catch (error) {
    return json_({ success: false, error: error.message || String(error) }, 500);
  }
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    authorize_(payload.token);
    setupSheet_();
    const action = String(payload.action || '').toUpperCase();

    if (action === 'CREATE') {
      const created = createTransaction_(payload.data || {});
      return json_({ success: true, data: created });
    }

    if (action === 'UPDATE') {
      const updated = updateTransaction_(payload.id, payload.data || {});
      return json_({ success: true, data: updated });
    }

    if (action === 'DELETE') {
      deleteTransaction_(payload.id);
      return json_({ success: true, data: { id: payload.id } });
    }

    return json_({ success: false, error: 'Unknown POST action' }, 400);
  } catch (error) {
    return json_({ success: false, error: error.message || String(error) }, 500);
  }
}

function setupSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const isHeaderReady = HEADERS.every((header, index) => currentHeaders[index] === header);

  if (!isHeaderReady) {
    headerRange.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function getTransactions_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .filter((row) => row[0])
    .map(rowToTransaction_)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function createTransaction_(data) {
  const transaction = normalizeTransaction_(data, true);
  transaction.id = makeId_(transaction.date);

  getSheet_().appendRow(HEADERS.map((header) => transaction[header]));
  return transaction;
}

function updateTransaction_(id, patch) {
  if (!id) throw new Error('Missing transaction id');

  const sheet = getSheet_();
  const rowIndex = findRowById_(id);
  if (rowIndex < 0) throw new Error('Transaction not found');

  const current = rowToTransaction_(sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0]);
  const updated = normalizeTransaction_(Object.assign({}, current, patch, { id: current.id }), false);
  sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([HEADERS.map((header) => updated[header])]);
  return updated;
}

function deleteTransaction_(id) {
  if (!id) throw new Error('Missing transaction id');

  const rowIndex = findRowById_(id);
  if (rowIndex < 0) throw new Error('Transaction not found');
  getSheet_().deleteRow(rowIndex);
}

function normalizeTransaction_(data, isCreate) {
  const date = String(data.date || '').trim();
  const type = String(data.type || '').trim();
  const amount = Number(data.amount);
  const account = String(data.account || '').trim();
  const toAccount = data.to_account ? String(data.to_account).trim() : '';
  const category = String(data.category || defaultCategory_(type)).trim();
  const note = String(data.note || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date. Use YYYY-MM-DD');
  if (TYPES.indexOf(type) < 0) throw new Error('Invalid transaction type');
  if (!isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than 0');
  if (ACCOUNTS.indexOf(account) < 0) throw new Error('Invalid account');
  if (type === 'transfer' && ACCOUNTS.indexOf(toAccount) < 0) throw new Error('Invalid transfer destination');
  if (type === 'transfer' && account === toAccount) throw new Error('Transfer accounts must be different');
  if (CATEGORIES.indexOf(category) < 0) throw new Error('Invalid category');
  if (CATEGORIES_BY_TYPE[type].indexOf(category) < 0) throw new Error('Category does not match transaction type');

  return {
    id: isCreate ? '' : String(data.id || '').trim(),
    date: date,
    type: type,
    amount: Math.round(amount * 100) / 100,
    account: account,
    to_account: type === 'transfer' ? toAccount : '',
    category: category,
    note: note,
  };
}

function defaultCategory_(type) {
  return CATEGORIES_BY_TYPE[type] ? CATEGORIES_BY_TYPE[type][0] : 'อื่นๆ';
}

function rowToTransaction_(row) {
  return {
    id: String(row[0]),
    date: formatDate_(row[1]),
    type: String(row[2]),
    amount: Number(row[3]),
    account: String(row[4]),
    to_account: row[5] ? String(row[5]) : null,
    category: String(row[6]),
    note: row[7] ? String(row[7]) : '',
  };
}

function findRowById_(id) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === String(id)) {
      return index + 2;
    }
  }

  return -1;
}

function getSheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function makeId_(date) {
  return 'tx_' + date.replace(/-/g, '') + '_' + Utilities.getUuid().slice(0, 8);
}

function formatDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return String(value);
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing JSON payload');
  }

  return JSON.parse(e.postData.contents);
}

function authorize_(token) {
  const configuredToken = PropertiesService.getScriptProperties().getProperty('TANGGU_ACCESS_TOKEN');
  if (configuredToken && String(token || '') !== configuredToken) {
    throw new Error('Unauthorized');
  }
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
