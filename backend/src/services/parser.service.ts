import path from 'path';
import fs from 'fs';
import { fileService } from './file.service';
import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// ── Column Mapping ──
// Keywords in Chinese and English mapped to cargo space fields
const COLUMN_KEYWORDS: Record<string, string[]> = {
  region: ['地区', '区域', 'region', '目的地', '目的港', '所在城市', '城市', '省份'],
  warehouse_name: ['仓库名称', '仓库', 'warehouse', '仓储名称', '仓库名', '仓名'],
  warehouse_address: ['仓库地址', '地址', 'address', '详细地址'],
  available_cbm: ['可用cbm', 'cbm', '体积', '立方米', 'available cbm', '可用体积', '剩余cbm'],
  available_kg: ['可用kg', '重量', 'kg', '公斤', '千克', 'available kg', '可用重量', '剩余kg', '载重'],
  price_per_cbm: ['cbm单价', '立方单价', 'price/cbm', 'cbm价格', '体积价格', '每立方价格'],
  price_per_kg: ['kg单价', '公斤单价', 'price/kg', 'kg价格', '重量价格', '每公斤价格'],
  currency: ['币种', '货币', 'currency'],
  valid_from: ['valid_from', '有效期开始', '有效起始', '开始日期', 'valid from', '起始日期', '开始时间'],
  valid_to: ['valid_to', '有效期结束', '有效截止', '截止日期', 'valid to', '到期日期', '结束日期', '截止时间'],
  cargo_type: ['货物类型', 'cargo type', '货物种类', '产品类型', '货类', '适用货物'],
  cargo_restrictions: ['限制', '限制条件', 'restrictions', '禁运品', '特殊要求'],
  contact_info: ['联系方式', '联系人', '电话', 'contact', '联系电话', '手机'],
  notes: ['备注', 'notes', '说明', 'remark', '其他'],
};

// All required fields that must be mapped
const REQUIRED_FIELDS = ['region', 'warehouse_name', 'available_cbm', 'available_kg', 'valid_from', 'valid_to'];

// Auto-detect column mapping from headers
function detectColumnMapping(headers: string[]): { mapping: Record<string, string>; unmapped: string[] } {
  const mapping: Record<string, string> = {};
  const unmappedFields: string[] = [];

  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    let found = false;
    for (const header of headers) {
      const headerLower = header.toLowerCase().trim();
      for (const keyword of keywords) {
        if (headerLower.includes(keyword.toLowerCase())) {
          mapping[field] = header;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found && REQUIRED_FIELDS.includes(field)) {
      unmappedFields.push(field);
    }
  }

  return { mapping, unmapped: unmappedFields };
}

// Parse a row value to the appropriate type
function parseRowValue(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  if (!str) return null;

  // Try numeric
  const num = Number(str);
  if (!isNaN(num)) return num;

  return str;
}

// ── Excel Parser ──
async function parseExcel(filePath: string): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (data.length === 0) {
    throw new Error('Excel 文件中没有数据');
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);
  return { headers, rows: data as Record<string, unknown>[] };
}

// ── CSV Parser ──
async function parseCSV(filePath: string): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const csvParser = require('csv-parser');
    const results: Record<string, unknown>[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row: Record<string, unknown>) => results.push(row))
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('CSV 文件中没有数据'));
          return;
        }
        const headers = Object.keys(results[0]);
        resolve({ headers, rows: results });
      })
      .on('error', reject);
  });
}

// ── PDF Parser ──
async function parsePDF(filePath: string): Promise<Record<string, unknown>[]> {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);

  const rawText: string = pdfData.text;

  if (!rawText || rawText.trim().length === 0) {
    throw new Error('PDF 文件中没有可提取的文本内容');
  }

  // Use AI to extract structured data from PDF text
  const { aiChat, isAiConfigured } = await import('./ai.service');

  if (!isAiConfigured()) {
    throw new Error('未配置 AI API Key（DEEPSEEK_API_KEY），无法解析 PDF 文件。请使用 Excel 或 CSV 格式。');
  }

  const response = await aiChat(
    `你是一个物流数据提取助手。从提供的文本中提取货舱仓位信息，返回 JSON 数组格式。

每个货舱记录应包含以下字段（如果文本中没有对应信息，用 null）：
- region: 地区/城市
- warehouse_name: 仓库名称
- warehouse_address: 仓库地址
- available_cbm: 可用体积(CBM)，数字
- available_kg: 可用重量(KG)，数字
- price_per_cbm: 每CBM价格，数字
- price_per_kg: 每KG价格，数字
- currency: 货币，默认 "CNY"
- valid_from: 有效期开始，格式 YYYY-MM-DD
- valid_to: 有效期结束，格式 YYYY-MM-DD
- cargo_type: 货物类型
- cargo_restrictions: 限制条件
- contact_info: 联系方式
- notes: 备注

只返回 JSON 数组，不要其他文字。如果没有找到任何货舱数据，返回空数组 []。`,
    `请从以下文本中提取货舱仓位信息：\n\n${rawText.substring(0, 8000)}`
  );

  // Parse JSON from AI response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('无法从 AI 响应中提取 JSON 数据');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return Array.isArray(parsed) ? parsed : [];
}

// ── Main Parse and Store Function ──
export async function parseAndStore(fileId: string): Promise<void> {
  logger.info(`Starting parse for file: ${fileId}`);

  try {
    await fileService.updateStatus(fileId, 'processing');

    const file = await fileService.getById(fileId);
    const uploadedBy = (file as any).uploaded_by || null;
    const ext = path.extname(file.original_filename).toLowerCase();

    let headers: string[] = [];
    let rows: Record<string, unknown>[] = [];

    // Parse based on file type
    if (ext === '.xlsx' || ext === '.xls') {
      ({ headers, rows } = await parseExcel(file.file_path));
    } else if (ext === '.csv') {
      ({ headers, rows } = await parseCSV(file.file_path));
    } else if (ext === '.pdf') {
      // PDF parsing returns structured rows directly
      rows = await parsePDF(file.file_path);

      // For PDF, we use Claude-extracted fields directly
      const inserted = await insertCargoRows(fileId, rows, true, uploadedBy);
      await fileService.updateStatus(fileId, 'processed', undefined, inserted);
      logger.info(`PDF parse complete for ${fileId}: ${inserted} rows`);
      return;
    } else {
      throw new Error(`不支持的文件格式: ${ext}`);
    }

    // Detect column mapping
    const { mapping, unmapped } = detectColumnMapping(headers);

    if (unmapped.length > 0) {
      await fileService.updateStatus(
        fileId,
        'pending_mapping',
        `以下字段未能自动匹配: ${unmapped.join(', ')}。请手动指定列映射。`
      );
      logger.warn(`File ${fileId} needs manual mapping for: ${unmapped.join(', ')}`);
      return;
    }

    // Transform rows using mapping
    const transformedRows = transformRows(rows, mapping);

    // Insert into cargo_spaces
    const inserted = await insertCargoRows(fileId, transformedRows, false, uploadedBy);
    await fileService.updateStatus(fileId, 'processed', undefined, inserted);

    logger.info(`Parse complete for ${fileId}: ${inserted} rows inserted`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知解析错误';
    logger.error(`Parse failed for ${fileId}: ${message}`);
    await fileService.updateStatus(fileId, 'error', message);
  }
}

// Transform rows using column mapping
function transformRows(
  rows: Record<string, unknown>[],
  mapping: Record<string, string>
): Record<string, unknown>[] {
  return rows.map((row) => {
    const transformed: Record<string, unknown> = {};
    for (const [field, columnName] of Object.entries(mapping)) {
      transformed[field] = row[columnName];
    }
    return transformed;
  });
}

// Insert cargo rows into database
async function insertCargoRows(
  fileId: string,
  rows: Record<string, unknown>[],
  isFromPdf: boolean,
  uploadedBy?: string | null
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const cargoRows = rows.map((row) => ({
    id: uuidv4(),
    uploaded_file_id: fileId,
    uploaded_by: uploadedBy || null,
    region: String(row.region || '未知'),
    warehouse_name: String(row.warehouse_name || '未知仓库'),
    warehouse_address: row.warehouse_address ? String(row.warehouse_address) : null,
    available_cbm: parseFloat(String(row.available_cbm || 0)) || 0,
    available_kg: parseFloat(String(row.available_kg || 0)) || 0,
    price_per_cbm: row.price_per_cbm ? parseFloat(String(row.price_per_cbm)) || null : null,
    price_per_kg: row.price_per_kg ? parseFloat(String(row.price_per_kg)) || null : null,
    currency: row.currency ? String(row.currency) : 'CNY',
    valid_from: row.valid_from ? String(row.valid_from) : today,
    valid_to: row.valid_to ? String(row.valid_to) : today,
    cargo_type: row.cargo_type ? String(row.cargo_type) : null,
    cargo_restrictions: row.cargo_restrictions ? String(row.cargo_restrictions) : null,
    contact_info: row.contact_info ? String(row.contact_info) : null,
    notes: row.notes ? String(row.notes) : null,
    status: 'available',
    raw_data: isFromPdf ? row : null,
  }));

  // Batch insert in chunks to avoid large queries
  const chunkSize = 100;
  for (let i = 0; i < cargoRows.length; i += chunkSize) {
    const chunk = cargoRows.slice(i, i + chunkSize);
    await db('cargo_spaces').insert(chunk);
  }

  return cargoRows.length;
}

export { detectColumnMapping };
