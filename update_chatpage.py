with open('frontend/src/pages/public/ChatPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add lucide icons
c = c.replace(
    "Sparkles, Bot, Globe } from 'lucide-react';",
    "Sparkles, Bot, Globe, Building2, CheckCircle } from 'lucide-react';"
)

# 2. Update hero subtitle
c = c.replace(
    "{t('国际物流行业内部 · 货代 · 外贸公司 · 工厂<br />免费沟通与舱位查询平台', 'Logistics · Forwarders · Traders · Factories<br />Free communication & cargo platform')}",
    "{t('货代 · 外贸 · 报关行 · 海外代理 · 律师 · 检测认证 · 运输保险<br />一站式免费沟通与业务对接平台', 'Forwarders · Traders · Brokers · Overseas Agents · Lawyers · Inspection · Insurance<br />All-in-one free communication & business platform')}"
)

# 3. Replace hero banners
old_hero = '''          {/* Role-specific banners */}
          <div className="max-w-lg mx-auto mb-8 space-y-2">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 flex items-center gap-3">
              <Rocket className="w-5 h-5 text-yellow-300 flex-shrink-0" />
              <p className="text-sm text-white/90 text-left">
                <span className="font-bold text-yellow-300">{t('货代新手？', 'New forwarder?')}</span> {t('免费发布第一条货源信息，AI帮你写，3秒搞定！', 'Post your first cargo free. AI writes it in 3 seconds!')}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 flex items-center gap-3">
              <Globe className="w-5 h-5 text-purple-300 flex-shrink-0" />
              <p className="text-sm text-white/90 text-left">
                <span className="font-bold text-purple-300">{t('海外代理？', 'Overseas agent?')}</span> {t('免费接收中国货代的DDP询价，$0起拓展中国市场！', 'Free DDP inquiries from China forwarders. From $0!')}
              </p>
            </div>
          </div>'''

new_hero = '''          {/* All roles */}
          <div className="max-w-2xl mx-auto mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <p className="text-xs text-white/90 text-left leading-tight">
                <span className="font-bold text-yellow-300">{t('货代', 'Forwarder')}</span> {t('发布舱位·AI解析·获客', 'Post cargo · AI parse · Get leads')}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <p className="text-xs text-white/90 text-left leading-tight">
                <span className="font-bold text-emerald-300">{t('外贸', 'Trader')}</span> {t('查舱位·发询价·收券', 'Search · Inquire · Coupons')}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-300 flex-shrink-0" />
              <p className="text-xs text-white/90 text-left leading-tight">
                <span className="font-bold text-teal-300">{t('报关行', 'Broker')}</span> {t('投放券·曝光·获客', 'Launch · Exposure · Clients')}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-300 flex-shrink-0" />
              <p className="text-xs text-white/90 text-left leading-tight">
                <span className="font-bold text-purple-300">{t('海外代理', 'Overseas')}</span> {t('收DDP询价·拓市场', 'DDP inquiries · Expand')}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <p className="text-xs text-white/90 text-left leading-tight">
                <span className="font-bold text-amber-300">{t('律师', 'Lawyer')}</span> {t('纠纷·合同·案源', 'Disputes · Contracts')}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-300 flex-shrink-0" />
              <p className="text-xs text-white/90 text-left leading-tight">
                <span className="font-bold text-rose-300">{t('检测·保险', 'Insp·Insure')}</span> {t('验货·投保·理赔', 'Inspect · Insure · Claim')}
              </p>
            </div>
          </div>'''

c = c.replace(old_hero, new_hero, 1)

# 4. Insert role sections before "Why Choose Us"
old_why = '''      {/* Why choose us */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-800">{t('\U0001f31f 货代新手为什么选择我们？', '\U0001f31f Why Choose Us?')}</h2>'''

new_sections = '''      {/* ── 外贸专属价值 ── */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-800">{t('\U0001f3ed 外贸 · 查舱位发询价，收货代赠送的报关券', '\U0001f3ed Traders · Search, inquire, get free coupons')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '\U0001f50d', title: t('秒查全球舱位', 'Instant Search'), desc: t('输入港口代码，秒查所有货代发布的舱位和价格。', 'Enter port codes, find all forwarders\' cargo and prices instantly.') },
              { icon: '\U0001f4e9', title: t('发询价等报价', 'Post Inquiries'), desc: t('输入货物需求，系统推送给相关货代，对比报价选最优。', 'Enter cargo details, get quotes from forwarders, pick the best.') },
              { icon: '\U0001f3ab', title: t('收报关券抵扣', 'Get Coupons'), desc: t('货代赠送的\U00a550报关券可用于抵扣报关费，降低出口成本。', 'Use \U00a550 coupons from forwarders to save on customs clearance.') },
              { icon: '\U0001f6e1\U0000fe0f', title: t('合作前查口碑', 'Check Reputation'), desc: t('在避雷针搜索货代公司名，查看是否有被投诉记录。', 'Search forwarder names to check for complaints before cooperating.') },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-white/70 rounded-lg p-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 报关行专属价值 ── */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-gray-800">{t('\U0001f3db\U0000fe0f 报关行 · 投放券获客，零成本拓展业务', '\U0001f3db\U0000fe0f Brokers · Launch coupons, get clients free')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: '\U0001f3af', title: t('投放券获客', 'Launch & Attract'), desc: t('投放20/30/50元报关券到社区券池，付费货代领取后找您报关。', 'Launch \U00a520/30/50 coupons. Paying members claim and come to you.') },
              { icon: '\U0001f4ca', title: t('投放排行', 'Ranking'), desc: t('投放越多的报关行在黄页排名越靠前，获得更多曝光。', 'Higher launches = higher ranking = more exposure.') },
              { icon: '\U0001f441\U0000fe0f', title: t('效果统计', 'Analytics'), desc: t('实时查看券领取数、核销数、曝光次数，投放效果一目了然。', 'Track claims, redemptions, views. See your ROI instantly.') },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-white/70 rounded-lg p-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 律师 · 检测 · 保险专属价值 ── */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-teal-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-gray-800">{t('\U00002696\U0000fe0f\U0001f52c\U0001f6e1\U0000fe0f 律师 · 检测认证 · 运输保险 · 入驻即获精准客源', '\U00002696\U0000fe0f\U0001f52c\U0001f6e1\U0000fe0f Lawyers · Inspectors · Insurers · Get targeted leads')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: '\U00002696\U0000fe0f', title: t('律师', 'Lawyer'), color: 'text-amber-600', bg: 'bg-amber-50',
                items: [t('货代纠纷·合同审查·货损索赔', 'Disputes · Contracts · Claims'), t('用户一键发起法律咨询，直推律师邮箱', 'Users send inquiries directly to your email'), t('每日轮替置顶，公平曝光', 'Daily rotation for fair exposure')] },
              { icon: '\U0001f52c', title: t('检测认证', 'Inspector'), color: 'text-teal-600', bg: 'bg-teal-50',
                items: [t('验货·质检·合规认证', 'Inspection · QC · Compliance'), t('货代和外贸在线发起验货委托', 'Online inspection requests'), t('检测报告线上交付可追溯', 'Digital reports, traceable')] },
              { icon: '\U0001f6e1\U0000fe0f', title: t('运输保险', 'Insurer'), color: 'text-rose-600', bg: 'bg-rose-50',
                items: [t('货运险·责任险·仓储险', 'Cargo · Liability · Warehouse'), t('用户一键投保咨询精准匹配', 'Matched insurance inquiries'), t('在线比价直接联系', 'Compare quotes, contact directly')] },
            ].map((role, i) => (
              <div key={i} className={'rounded-xl p-4 ' + role.bg + ' border border-transparent'}>
                <h4 className={'text-sm font-bold ' + role.color + ' mb-2'}>{role.icon} {role.title}</h4>
                <ul className="space-y-1.5">
                  {role.items.map((item, j) => (
                    <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-md">
              <UserPlus className="w-4 h-4" />
              {t('免费注册，选择您的角色', 'Register Free — Choose Your Role')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Why choose us */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-800">{t('\U0001f31f 货代新手为什么选择我们？', '\U0001f31f Why Choose Us?')}</h2>'''

c = c.replace(old_why, new_sections, 1)

with open('frontend/src/pages/public/ChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('All done!')
