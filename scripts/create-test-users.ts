import db from '../backend/src/config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const pwdHash = bcrypt.hashSync('test1234', 10);

  const tests = [
    { username: 'lilixun2', display_name: '李立训2', company: '广州路佳皇邮物流供应链有限公司', role: 'forwarder' },
    { username: 'lfq2', display_name: '李福清2', company: '广州福清国际货运代理有限公司', role: 'forwarder' },
    { username: 'lfq3', display_name: '李福清3', company: '广州福清国际货运代理有限公司', role: 'forwarder' },
    { username: 'wanzhongjiang2', display_name: '万中江2', company: '深圳中集国际货运代理有限公司', role: 'forwarder' },
    { username: 'wanzhongjiang3', display_name: '万中江3', company: '深圳中集国际货运代理有限公司', role: 'forwarder' },
    { username: 'wangjl2', display_name: '王经理2', company: '上海锦海捷亚国际货运有限公司', role: 'forwarder' },
    { username: 'wangjl3', display_name: '王经理3', company: '上海锦海捷亚国际货运有限公司', role: 'forwarder' },
    { username: 'lawyer01bj2', display_name: '张律师2', company: '北京市中伦律师事务所', role: 'lawyer' },
    { username: 'lawyer01bj3', display_name: '张律师3', company: '北京市中伦律师事务所', role: 'lawyer' },
    { username: 'lawyer02sh2', display_name: '李律师2', company: '上海锦天城律师事务所', role: 'lawyer' },
    { username: 'lawyer02sh3', display_name: '李律师3', company: '上海锦天城律师事务所', role: 'lawyer' },
    { username: 'inspector2', display_name: '检测认证2', company: '测试检测认证有限公司', role: 'inspector' },
    { username: 'inspector3', display_name: '检测认证3', company: '测试检测认证有限公司', role: 'inspector' },
    { username: 'insurer2', display_name: '运输保险2', company: '测试运输保险有限公司', role: 'insurer' },
    { username: 'insurer3', display_name: '运输保险3', company: '测试运输保险有限公司', role: 'insurer' },
  ];

  let count = 0;
  for (const t of tests) {
    const existing = await db('users').where({ username: t.username }).first();
    if (existing) {
      console.log('⏭️', t.username, '已存在');
      continue;
    }
    await db('users').insert({
      id: uuidv4(),
      username: t.username,
      password_hash: pwdHash,
      display_name: t.display_name,
      company_name: t.company,
      role: t.role,
      email: t.username + '@test.com',
      email_verified: true,
      status: 'approved',
      trial_end: '2026-12-31',
      is_newbie: true,
    });
    console.log('✅', t.username);
    count++;
  }

  console.log(`\n共创建 ${count} 个账号`);
  await db.destroy();
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
