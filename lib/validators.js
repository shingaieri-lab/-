// 入力バリデーション（Zod スキーマ定義）
// バックエンドAPIで req.body を検証するために使用する。
// 未知フィールドは passthrough() で許容する（将来の拡張を壊さないため）。
const { z } = require('zod');

const dateStr  = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(''));
const timeStr  = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal(''));
const str      = (max = 500) => z.string().max(max);
const optStr   = (max = 500) => str(max).optional();

const ActionSchema = z.object({
  id:       str(),
  type:     z.enum(['call', 'email', 'sms', 'other', 'consultation']),
  date:     dateStr.optional(),
  time:     timeStr.optional(),
  result:   optStr(),
  summary:  optStr(5000),
  nextDate: dateStr.optional(),
  nextTime: timeStr.optional(),
  next:     optStr(),
}).passthrough();

const LeadSchema = z.object({
  id:                            str(),
  company:                       str(200),
  contact:                       optStr(200),
  email:                         z.string().email().or(z.literal('')).optional(),
  address:                       optStr(500),
  source:                        optStr(),
  status:                        optStr(),
  is_member:                     optStr(),
  date:                          dateStr.optional(),
  mql:                           z.enum(['MQL', '非MQL']).optional().or(z.literal('')),
  portal_site:                   optStr(),
  portal_type:                   optStr(),
  charge_applied:                z.boolean().optional(),
  meeting_date:                  dateStr.optional(),
  meeting_time:                  timeStr.optional(),
  sales_member:                  optStr(),
  zoho_url:                      optStr(),
  hp_url:                        optStr(),
  is_accuracy:                   optStr(),
  memo:                          optStr(2000),
  next_action_date:              dateStr.optional(),
  next_action_time:              timeStr.optional(),
  next_action:                   optStr(),
  google_task_registered:        z.boolean().optional(),
  zoho_lead_id:                  optStr(),
  zoho_deal_id:                  optStr(),
  zoho_contact_id:               optStr(),
  zoho_user_id:                  optStr(),
  consultation_flag:             z.boolean().optional(),
  consultation_ai_summary:       optStr(2000),
  consultation_note:             optStr(2000),
  consultation_advice:           optStr(2000),
  consultation_completed:        z.boolean().optional(),
  consultation_completed_actions: z.number().int().min(0).optional(),
  actions:                       z.array(ActionSchema).optional(),
}).passthrough();

const AccountSaveSchema = z.object({
  id:           str(100),
  name:         optStr(100),
  email:        z.string().email().or(z.literal('')).optional(),
  password:     optStr(200),
  role:         z.enum(['admin', 'member', 'outbound']),
  geminiKey:         optStr(500),
  chatworkApiToken:  optStr(500),
  zohoUserId:        optStr(),
}).passthrough();

// master_settings は構造が動的なため、オブジェクトであることのみ検証する
const MasterSettingsSchema = z.record(z.unknown()).refine(
  v => v !== null && !Array.isArray(v),
  { message: 'オブジェクトである必要があります' }
);

const EmailTplSchema = z.object({
  id:      str(),
  name:    str(200),
  subject: optStr(500),
  body:    optStr(10000),
}).passthrough();

/**
 * スキーマでバリデーションし、失敗時は res.status(400).json を返す。
 * 成功時は true を返す。
 * @param {z.ZodType} schema
 * @param {unknown}   data
 * @param {import('express').Response} res
 */
function validate(schema, data, res) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({ error: `入力データが正しくありません: ${msg}` });
    return false;
  }
  return true;
}

module.exports = {
  LeadSchema:          z.array(LeadSchema),
  AccountSaveSchema:   z.array(AccountSaveSchema),
  MasterSettingsSchema,
  EmailTplSchema:      z.array(EmailTplSchema),
  validate,
};
