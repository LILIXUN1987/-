import fs from 'fs';
import { env } from '../config/env';
import logger from '../utils/logger';

let ocrClient: any = null;

function getClient() {
  if (!ocrClient) {
    if (!env.tencentOcr.secretId || !env.tencentOcr.secretKey) {
      throw new Error('腾讯云 OCR 未配置（TENCENT_OCR_SECRET_ID / TENCENT_OCR_SECRET_KEY）');
    }
    const { ocr } = require('tencentcloud-sdk-nodejs-ocr');
    const { Client } = ocr.v20181119;
    ocrClient = new Client({
      credential: {
        secretId: env.tencentOcr.secretId,
        secretKey: env.tencentOcr.secretKey,
      },
      region: 'ap-guangzhou',
    });
  }
  return ocrClient;
}

export function isOcrConfigured(): boolean {
  return !!(env.tencentOcr.secretId && env.tencentOcr.secretKey);
}

/**
 * 调用腾讯云名片识别（BusinessCardOCR），返回识别文本
 */
export async function recognizeImage(imagePath: string): Promise<string> {
  const client = getClient();
  const imageBase64 = fs.readFileSync(imagePath).toString('base64');

  return new Promise((resolve, reject) => {
    client.BusinessCardOCR({ ImageBase64: imageBase64 }, (err: any, response: any) => {
      if (err) {
        logger.error('腾讯云 OCR 名片识别失败:', err);
        reject(new Error('OCR 识别失败'));
        return;
      }

      // BusinessCardOCR 返回结构化的名片字段
      const lines: string[] = [];
      if (response?.BusinessCardInfos) {
        for (const info of response.BusinessCardInfos) {
          if (info.Value) lines.push(info.Value);
        }
      }

      if (lines.length === 0 && response?.TextDetections) {
        for (const t of response.TextDetections) {
          if (t.DetectedText) lines.push(t.DetectedText);
        }
      }

      resolve(lines.join('\n'));
    });
  });
}

/**
 * OCR 识别结果 → 提取名片字段
 */
export function parseCardOcr(text: string): {
  name: string; company: string; phone: string; email: string;
} {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  let name = '', company = '', phone = '', email = '';

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) email = emailMatch[0].toLowerCase();

  const phoneMatch = text.match(/(?:\+?86)?[\s-]?1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}/);
  if (phoneMatch) phone = phoneMatch[0].replace(/[\s-]/g, '');

  for (const line of lines) {
    const clean = line.replace(/[0-9a-zA-Z@._\-+()（）\s]/g, '').trim();
    if (!name && clean.length >= 2 && clean.length <= 4 && /^[一-鿿·]+$/.test(clean)) {
      if (!/公司|有限|电话|手机|邮箱|地址|传真|网址|国际物流|货运/i.test(line)) {
        name = clean;
      }
    }
    if (!company && /公司|有限|集团|股份|事务所|企业|中心|社|行/.test(line)) {
      company = line.replace(/^(?:公司名称|公司|企业)[：:]?\s*/i, '').trim();
    }
  }

  return { name, company, phone, email };
}
