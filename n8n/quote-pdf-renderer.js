// =====================================================================
// NOMAAD Camp · n8n Code node — Quote PDF Renderer
// ---------------------------------------------------------------------
// Drop this entire file into an n8n "Code" node (Run Once for Each Item).
// It receives the webhook payload from the website and produces:
//   $json.quote_number      — sequential quote number (NC-YYYY-NNNN)
//   $json.html              — fully populated HTML string
//   $json.pdf_filename      — suggested filename
//   $json.summary_for_email — short text used in customer email body
//   $json.internal_summary  — text used in internal Slack/Gmail notify
//
// Wire-up sequence in the n8n workflow (see SETUP.md for screenshots):
//   Webhook  →  Sheets "read counter"  →  THIS Code node
//            →  HTTP Request (Browserless /pdf)
//            →  Sheets "append row"  →  Gmail (customer)
//            →  Gmail (internal)
//
// All amount math was already done client-side in main.js, so this node
// just formats and templates. If you ever need to recompute, the inputs
// are: tier_subtotal, addons_subtotal, shuttle_subtotal, grand_total,
// vat_included, deposit_30, balance_70.
// =====================================================================

// ---------- 1. Pull the webhook input. ----------
// The website posts urlencoded form data; n8n exposes it as $json.
// Numeric fields arrive as strings — coerce as needed.
const p = $input.item.json;

const num = (v, d = 0) => {
  if (v === undefined || v === null || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const str = (v, d = '') => (v === undefined || v === null) ? d : String(v).trim();

const guests           = num(p.guest_count);
const tierBasePrice    = num(p.tier_base_price);
const tierSubtotal     = num(p.tier_subtotal);
const addonsSubtotal   = num(p.addons_subtotal);
const shuttleSubtotal  = num(p.shuttle_subtotal);
const shuttleUnit      = num(p.shuttle_unit_price);
const busCount         = num(p.bus_count, 1);
const grandTotal       = num(p.grand_total);
const vatIncluded      = num(p.vat_included);
const deposit30        = num(p.deposit_30);
const balance70        = num(p.balance_70);

const company          = str(p.company);
const customerTaxId    = str(p.customer_tax_id) || '—';
const contactName      = str(p.contact_name);
const phone            = str(p.phone);
const email            = str(p.email);

const camp             = str(p.camp_name) || str(p.camp);
const tier             = str(p.package_tier) || str(p.tier);
const visualFeature    = str(p.visual_feature);
const startDt          = str(p.start_datetime);
const endDt            = str(p.end_datetime);
const durationLabel    = str(p.duration_label) || '—';

const shuttleLabel     = str(p.shuttle_service);
const tierInclusions   = (() => {
  try { return JSON.parse(str(p.tier_inclusions_json) || '[]'); }
  catch (_) { return []; }
})();
const addons = (() => {
  try { return JSON.parse(str(p.addons_json) || '[]'); }
  catch (_) { return []; }
})();
const valueAnchor = (() => {
  try { return JSON.parse(str(p.value_anchor_json) || 'null'); }
  catch (_) { return null; }
})();

// ---------- 2. Formatting helpers. ----------
const fmt = n => Number(n).toLocaleString('en-US');

const monthsShort = ['1-р','2-р','3-р','4-р','5-р','6-р','7-р','8-р','9-р','10-р','11-р','12-р'];
function fmtDateTime(s) {
  if (!s) return '—';
  // Input arrives as "2026-06-12T09:00" (no timezone) — parse manually.
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return s;
  const [, y, mo, d, hh, mm] = m;
  const time = (hh && mm) ? ' · ' + hh + ':' + mm : '';
  return `${y}.${mo}.${d}${time}`;
}
function fmtDateOnly(s) {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

// ---------- 3. Quote number. ----------
// Reads the "next counter" value provided by an upstream Sheets node.
// Falls back to a timestamp suffix so the workflow never breaks if the
// counter is missing during testing.
let counter = num(p.next_counter, 0);
if (counter <= 0) {
  // Fallback during dev/testing — uses minutes-of-year so collisions are rare.
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  counter = Math.floor((now - start) / 60000) % 10000;
}
const year = new Date().getFullYear();
const quoteNumber = `NC-${year}-${String(counter).padStart(4, '0')}`;

// ---------- 4. Dates: issue + validity. ----------
const today = new Date();
const issueDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
const validUntilDate = new Date(today);
validUntilDate.setDate(validUntilDate.getDate() + 14);
const validUntil = `${validUntilDate.getFullYear()}.${String(validUntilDate.getMonth() + 1).padStart(2, '0')}.${String(validUntilDate.getDate()).padStart(2, '0')}`;

// ---------- 5. Build the inclusions checklist HTML. ----------
function inclusionsHtml(labels, drinkChoice) {
  if (!labels || !labels.length) {
    return '<span class="check">✓</span> Майхан кемп · Өглөөний цай · Өдөр болон оройн хоол<br>' +
           '<span class="check">✓</span> Тайз, хөгжмийн үндсэн тохижилт · Үндсэн гэрэлтүүлэг';
  }
  // Insert chosen Welcome drink flavor inline if the user picked one.
  const augmented = labels.map(l => {
    if (l === 'Welcome drink' && drinkChoice) {
      const choice = ({
        lemon_basil: 'Lemon Basil',
        iced_tea:    'Iced Tea',
        berry:       'Berry',
        sparkling:   'Sparkling'
      })[drinkChoice] || drinkChoice;
      return `Welcome drink (${choice})`;
    }
    return l;
  });
  // Always show base inclusions first.
  const baseLine =
    '<span class="check">✓</span> Майхан кемп · Өглөөний цай · Өдөр болон оройн хоол<br>' +
    '<span class="check">✓</span> Тайз, хөгжмийн үндсэн тохижилт · Үндсэн гэрэлтүүлэг<br>';
  // Group the rest into 2-3 per row for compactness.
  const rows = [];
  for (let i = 0; i < augmented.length; i += 3) {
    rows.push(augmented.slice(i, i + 3).join(' · '));
  }
  return baseLine + rows.map(r => `<span class="check">✓</span> ${r}`).join('<br>');
}

// ---------- 6. Build add-on table rows. ----------
const ADDON_LABEL = {
  welcome_drink:     ['Welcome drink',                'Угтах ундаа'],
  amenity_kit:       ['Зочдын ариун цэврийн багц',   'Сойз, ОО, саван, шампунь'],
  sleeping_bag:      ['Sleeping bag',                  'Хувийн зориулалт'],
  coffee_corner:     ['Кофе/цайны цэг',               '07:30–09:00'],
  lunch_upgrade:     ['Өдрийн буфет (сайжруулсан)',  ''],
  dinner_upgrade:    ['Оройн буфет (сайжруулсан)',   ''],
  late_snacks:       ['Оройн зууш',                    '22:00–24:00'],
  dj_service:        ['DJ үйлчилгээ',                  ''],
  bartender_service: ['Bartender үйлчилгээ',          ''],
  moonbeam_lounge:   ['Moonbeam Lounge',               'Гэрэлтэй коктейль бар'],
  led_screen_18m2:   ['LED дэлгэц 18м²',              '6м × 3м тайзны дэвсгэр'],
  photo_4h:          ['Гэрэл зургийн үйлчилгээ',      '4 цаг']
};

function addonRowsHtml(items) {
  // Only show add-ons that are NOT included in the tier (paid extras).
  const paid = items.filter(a => !a.tier_included && (a.price || a.unit_price));
  if (!paid.length) return '';

  let html = '<tr class="section"><td colspan="4">НЭМЭЛТ ҮЙЛЧИЛГЭЭ</td></tr>';
  paid.forEach(a => {
    const meta = ADDON_LABEL[a.code] || [a.name || a.code, ''];
    const name = meta[0];
    let desc = meta[1] || '';

    let qty = a.quantity || 1;
    let unit = a.unit_price || 0;
    let total = a.price || 0;

    if (a.code === 'dj_service') {
      desc = `${a.start_time || ''}–${a.end_time || ''} · ${a.duration || ''} цаг`;
      qty = 1; unit = total;
    }
    if (a.code === 'bartender_service') {
      desc = `3 цаг · ${a.bartender_count || 1} ажилтан`;
      qty = a.bartender_count || 1;
      unit = 500000;
    }
    if (!unit && qty) unit = total / qty;

    html += `
      <tr class="line">
        <td>
          <div class="name">${name}</div>
          ${desc ? `<div class="desc">${desc}</div>` : ''}
        </td>
        <td class="qty">${fmt(qty)}</td>
        <td class="unit">${fmt(Math.round(unit))}</td>
        <td class="amt">${fmt(total)}</td>
      </tr>`;
  });
  return html;
}

function shuttleRowsHtml(label, unit, count, subtotal) {
  if (subtotal <= 0) return '';
  // The site stores labels like "Хоног / 2 талдаа — 1,200,000₮"; strip the
  // price suffix so the PDF stays clean.
  const cleanLabel = label.replace(/\s—.*$/, '').replace(/\s-.*$/, '');
  return `
    <tr class="section"><td colspan="4">ТЭЭВРИЙН ҮЙЛЧИЛГЭЭ</td></tr>
    <tr class="line">
      <td>
        <div class="name">${cleanLabel}</div>
        <div class="desc">45 хүний автобус · УБ ↔ NOMAAD кемп</div>
      </td>
      <td class="qty">${count}</td>
      <td class="unit">${fmt(unit)}</td>
      <td class="amt">${fmt(subtotal)}</td>
    </tr>`;
}

// ---------- 7. Value-anchor block (shown only for Стандарт/Премиум). ----------
function valueAnchorHtml(va) {
  if (!va || !va.lines || va.savings <= 0) return '';
  const rows = va.lines.map(l =>
    `<tr><td class="lbl">${l.label}</td><td class="v">${fmt(l.amount)}</td></tr>`
  ).join('');
  return `
    <div class="anchor">
      <div class="anchor__head">
        <div class="anchor__title">★ ҮНЭ ЦЭНИЙН ХАРЬЦУУЛАЛТ</div>
        <div class="anchor__sub">${tier} багцын давуу тал</div>
      </div>
      <table>
        ${rows}
        <tr class="standalone"><td class="lbl">Тус тусдаа авбал нийт</td><td class="v">${fmt(va.standalone_total)} ₮</td></tr>
        <tr class="package"><td class="lbl">${tier} багцаар авбал</td><td class="v">${fmt(va.package_total)} ₮</td></tr>
        <tr class="savings"><td class="lbl">★ Хэмнэлт</td><td class="v">−${fmt(va.savings)} ₮ · ${va.savings_pct}%</td></tr>
      </table>
    </div>`;
}

// ---------- 8. Summary clauses. ----------
const paidAddonCount = addons.filter(a => !a.tier_included && (a.price || a.unit_price)).length;
const addonsClause = paidAddonCount > 0
  ? `, ${paidAddonCount} нэмэлт үйлчилгээ`
  : '';
const shuttleClause = shuttleSubtotal > 0
  ? ` болон ${busCount} автобусны тээврийн үйлчилгээтэй`
  : '';

// ---------- 9. Build the final HTML. ----------
// The HTML template lives at the workflow level — paste the contents of
// quote-template.html into a "Set" or "HTML" node above this one, and
// expose it as $('TemplateNode').first().json.template. Or fall back to
// the inline copy below (kept in sync with quote-template.html).
let template;
try {
  template = $('Quote Template').first().json.template;
} catch (_) {
  template = TEMPLATE_FALLBACK; // defined at bottom of this file
}

const variables = {
  '{{quote_number}}':         quoteNumber,
  '{{issue_date}}':           issueDate,
  '{{valid_until}}':          validUntil,
  '{{company}}':              company,
  '{{customer_tax_id}}':      customerTaxId,
  '{{contact_name}}':         contactName,
  '{{phone}}':                phone,
  '{{email}}':                email || '—',
  '{{camp}}':                 camp,
  '{{tier}}':                 tier,
  '{{guests}}':               String(guests),
  '{{start_display}}':        fmtDateTime(startDt),
  '{{end_display}}':          fmtDateTime(endDt),
  '{{duration_label}}':       durationLabel,
  '{{tier_base_price_fmt}}':  fmt(tierBasePrice),
  '{{tier_subtotal_fmt}}':    fmt(tierSubtotal),
  '{{addons_subtotal_fmt}}':  fmt(addonsSubtotal),
  '{{shuttle_subtotal_fmt}}': fmt(shuttleSubtotal),
  '{{vat_included_fmt}}':     fmt(vatIncluded),
  '{{grand_total_fmt}}':      fmt(grandTotal),
  '{{deposit_30_fmt}}':       fmt(deposit30),
  '{{balance_70_fmt}}':       fmt(balance70),
  '{{inclusions_html}}':      inclusionsHtml(tierInclusions, visualFeature.toLowerCase().replace(/\s/g, '_')),
  '{{addon_section_html}}':   addonRowsHtml(addons),
  '{{shuttle_section_html}}': shuttleRowsHtml(shuttleLabel, shuttleUnit, busCount, shuttleSubtotal),
  '{{value_anchor_html}}':    valueAnchorHtml(valueAnchor),
  '{{addons_summary_clause}}': addonsClause,
  '{{shuttle_summary_clause}}': shuttleClause
};

let html = template;
Object.keys(variables).forEach(k => {
  html = html.split(k).join(variables[k] == null ? '' : variables[k]);
});

// ---------- 10. Customer + internal text. ----------
const summaryForEmail =
  `Сайн байна уу ${contactName},\n\n` +
  `Та бүхэнд хүсэлт авсан үнийн санлыг хавсаргалаа.\n\n` +
  `· Кемп: ${camp}\n` +
  `· Багц: ${tier} (${guests} хүн)\n` +
  `· Хугацаа: ${durationLabel}\n` +
  `· Нийт: ${fmt(grandTotal)}₮ (НӨАТ багтсан)\n` +
  `· Урьдчилгаа: 30% · ${fmt(deposit30)}₮\n` +
  `· Үнийн саналын дугаар: ${quoteNumber}\n` +
  `· Хүчинтэй: ${validUntil} хүртэл\n\n` +
  `Асуух зүйл байвал 7700-6790 утсаар холбогдоно уу.\n\n` +
  `NOMAAD Camp · Чимун ХХК`;

const internalSummary =
  `🆕 Шинэ үнийн санал ${quoteNumber}\n` +
  `Компани: ${company}${customerTaxId !== '—' ? ' (РД ' + customerTaxId + ')' : ''}\n` +
  `Холбоо: ${contactName} · ${phone} · ${email || '—'}\n` +
  `Кемп: ${camp} · ${tier} · ${guests} хүн · ${durationLabel}\n` +
  `Огноо: ${fmtDateOnly(startDt)} → ${fmtDateOnly(endDt)}\n` +
  `Багц: ${fmt(tierSubtotal)}₮\n` +
  `Нэмэлт: ${fmt(addonsSubtotal)}₮ (${paidAddonCount} төрөл)\n` +
  `Тээвэр: ${fmt(shuttleSubtotal)}₮${busCount > 1 ? ' (' + busCount + ' автобус)' : ''}\n` +
  `НИЙТ: ${fmt(grandTotal)}₮\n` +
  `Урьдчилгаа 30%: ${fmt(deposit30)}₮\n` +
  (str(p.notes) ? `\nТэмдэглэл: ${str(p.notes)}\n` : '');

// ---------- 11. Return everything for the next nodes. ----------
return {
  json: {
    ...p,
    quote_number:        quoteNumber,
    issue_date:          issueDate,
    valid_until:         validUntil,
    html:                html,
    pdf_filename:        `${quoteNumber}_${company.replace(/\s+/g, '-')}.pdf`,
    summary_for_email:   summaryForEmail,
    internal_summary:    internalSummary,
    next_counter_value:  counter + 1   // for the Sheets append step
  }
};
