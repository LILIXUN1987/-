const fs = require('fs');
let c = fs.readFileSync('src/components/admin/PortServicesBrowser.tsx', 'utf8');

// Replace the search examples + search bar + quick buttons section
const oldStart = `        {/* 搜索示例 */
        <div className="flex flex-wrap gap-1 mb-3">`;

const oldEnd = `          </div>
          <div className="flex gap-2">`;

const startIdx = c.indexOf(oldStart);
const endIdx = c.indexOf(oldEnd, startIdx);

if (startIdx < 0 || endIdx < 0) {
  console.log('Could not find markers');
  process.exit(1);
}

const newSection = `        {/* 城市选择 + 服务类型选择 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{lang === 'en' ? 'City / Port *' : '选择城市/口岸 *'}</label>
            <select className="input-field w-full text-sm"
              value={selectedCity}
              onChange={e => {
                setSelectedCity(e.target.value);
                setCode(e.target.value + (selectedService ? ' ' + selectedService : ''));
              }}>
              <option value="">{lang === 'en' ? '-- Select city or port --' : '-- 请选择城市或口岸 --'}</option>
              <optgroup label={lang === 'en' ? '-- China Ports --' : '-- 国内口岸 --'}>
              {popularCities.filter(c => c.value !== 'LAX' && c.value !== 'ICN').map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
              </optgroup>
              <optgroup label={lang === 'en' ? '-- International --' : '-- 国际口岸 --'}>
              {popularCities.filter(c => c.value === 'LAX' || c.value === 'ICN').map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
              </optgroup>
            </select>
          </div>
          <div className="sm:w-48">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{lang === 'en' ? 'Service Type (optional)' : '服务类型（可选）'}</label>
            <select className="input-field w-full text-sm"
              value={selectedService}
              onChange={e => {
                setSelectedService(e.target.value);
                setCode((selectedCity || '') + (e.target.value ? ' ' + e.target.value : ''));
              }}>
              <option value="">{lang === 'en' ? '-- All services --' : '-- 全部服务 --'}</option>
              <option value="报关行">{'\u{1F4CB}'} {lang === 'en' ? 'Customs Broker' : '报关行'}</option>
              <option value="车队">{'\u{1F69B}'} {lang === 'en' ? 'Trucking' : '进出口车队'}</option>
              <option value="运输保险">{'\u{1F6E1}'}️ {lang === 'en' ? 'Transport Insurance' : '运输保险'}</option>
              <option value="检测认证">{'\u{1F52C}'} {lang === 'en' ? 'Inspection & Certification' : '检测认证'}</option>
              <option value="律师">{'⚖}️'} {lang === 'en' ? 'Port Lawyer' : '口岸律师'}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary text-sm px-6 py-2.5 flex items-center gap-1.5" onClick={handleSearch} disabled={loading || !selectedCity}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{lang === 'en' ? 'Search' : '查询'}</span>
            </button>
          </div>
        </div>

        {/* 快捷城市按钮 */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {popularCities.slice(0, 10).map(p => (
              <button key={p.value}
                className={'text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono font-bold ' + (selectedCity === p.value ? 'bg-teal-100 border-teal-300 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50')}
                onClick={() => { setSelectedCity(p.value); setCode(p.value + (selectedService ? ' ' + selectedService : '')); setTimeout(() => handleSearch(), 100); }}>
                {p.short}
              </button>
            ))}
          </div>
          <div className="flex gap-2">`;

c = c.substring(0, startIdx) + newSection + c.substring(endIdx);

fs.writeFileSync('src/components/admin/PortServicesBrowser.tsx', c);
console.log('Done');
