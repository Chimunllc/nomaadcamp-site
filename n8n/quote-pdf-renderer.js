// =====================================================================
// NOMAAD Camp · n8n Code node, Quote PDF Renderer
// ---------------------------------------------------------------------
// Drop this entire file into an n8n "Code" node (Run Once for Each Item).
// It receives the webhook payload from the website and produces:
//   $json.quote_number     , sequential quote number (NC-YYYY-NNNN)
//   $json.html             , fully populated HTML string
//   $json.pdf_filename     , suggested filename
//   $json.summary_for_email, short text used in customer email body
//   $json.internal_summary , text used in internal Slack/Gmail notify
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
// Numeric fields arrive as strings, coerce as needed.
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
const customerTaxId    = str(p.customer_tax_id) || '';
const contactName      = str(p.contact_name);
const phone            = str(p.phone);
const email            = str(p.email);

const camp             = str(p.camp_name) || str(p.camp);
const tier             = str(p.package_tier) || str(p.tier);
const visualFeature    = str(p.visual_feature);
const startDt          = str(p.start_datetime);
const endDt            = str(p.end_datetime);
const durationLabel    = str(p.duration_label) || '';

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
  if (!s) return '';
  // Input arrives as "2026-06-12T09:00" (no timezone), parse manually.
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
  // Fallback during dev/testing, uses minutes-of-year so collisions are rare.
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  counter = Math.floor((now - start) / 60000) % 10000;
}
const year = new Date().getFullYear();
const quoteNumber = `NC-${year}-${String(counter).padStart(4, '0')}`;

// ---------- 4. Dates: issue + validity. ----------
// Validity = 30 days (corporate decision cycle is 3-4 weeks).
const today = new Date();
const issueDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
const validUntilDate = new Date(today);
validUntilDate.setDate(validUntilDate.getDate() + 30);
const validUntil = `${validUntilDate.getFullYear()}.${String(validUntilDate.getMonth() + 1).padStart(2, '0')}.${String(validUntilDate.getDate()).padStart(2, '0')}`;

// ---------- 4b. Ex-VAT math (procurement-friendly). ----------
// Site sends VAT-INCLUSIVE prices. Convert to ex-VAT for the totals breakdown.
const subtotalExclVat = grandTotal - vatIncluded;
const tierExclVat     = Math.round(tierSubtotal / 1.1);
const addonsExclVat   = Math.round(addonsSubtotal / 1.1);
const shuttleExclVat  = Math.round(shuttleSubtotal / 1.1);

// ---------- 4c. Camp/Tier technical spec lookup (kept for future contract auto-fill). ----------
const CAMP_SPECS = {
  'NOMAAD Summit': { stage: '8м × 4м (32м²)', sound: '16,000W', wc: 8, dining: '540м²' },
  'NOMAAD Meadow': { stage: '6м × 4м (24м²)', sound: '5,000W',  wc: 6, dining: '300м²' },
  'NOMAAD Grove':  { stage: '4м × 3м (12м²)', sound: '5,000W',  wc: 4, dining: '200м²' }
};
const campSpec = CAMP_SPECS[camp] || CAMP_SPECS['NOMAAD Meadow'];
const tentCount = Math.ceil(guests / 6);

// Spec sheet kept disabled for QUOTE; tech specs belong in the CONTRACT instead.
const specSheetHtml = '';
/* OLD spec sheet HTML removed — was overkill for a quote. Reinstate only if
   needed for very large enterprise quotes ($30K+):
const _DISABLED_SPEC_HTML = `
  <div class="page-break"></div>
  <div class="strip"><div class="strip__accent"></div></div>
  <div class="appendix">
    <div class="appendix__head">
      <div class="appendix__label">ХАВСРАЛТ А</div>
      <div class="appendix__title">ТЕХНИКИЙН ТОДОРХОЙЛОЛТ</div>
      <div class="appendix__sub">${quoteNumber} · ${camp} · ${tier} багц · ${guests} хүн</div>
    </div>

    <table class="spec">
      <tr class="spec__cat"><td colspan="2">БАЙРЛАХ ОРЧИН</td></tr>
      <tr><td class="k">Майхан</td><td class="v">${tentCount} ширхэг · 5м диаметр · 6 хүний багтаамж</td></tr>
      <tr><td class="k">Майхны дотор</td><td class="v">6 ор, бүтээлэг (Стандарт/Премиумд sleeping bag багтсан)</td></tr>

      <tr class="spec__cat"><td colspan="2">ТАЙЗ · ХӨГЖИМ</td></tr>
      <tr><td class="k">Тайзны хэмжээ</td><td class="v">${campSpec.stage.size}, өндөр ${campSpec.stage.height}, ${campSpec.stage.frame}</td></tr>
      <tr><td class="k">Хөгжмийн чадал</td><td class="v">${campSpec.sound.power} · 3–5W/хүн стандартад нийцсэн</td></tr>
      <tr><td class="k">Тоног төхөөрөмж</td><td class="v">${campSpec.sound.mics}, шаардлагатай цахилгаан хангамж бүрэн</td></tr>

      <tr class="spec__cat"><td colspan="2">ХООЛ · ХҮЛЭЭН АВАЛТ</td></tr>
      <tr><td class="k">Хоолны асар</td><td class="v">${campSpec.dining.area}${campSpec.dining.expandable ? ' (' + campSpec.dining.expandable + ')' : ''}</td></tr>
      <tr><td class="k">Хоолны үйлчилгээ</td><td class="v">Үндсэн сервис (порц) · Буфет хэлбэрт шилжүүлэх боломжтой</td></tr>

      <tr class="spec__cat"><td colspan="2">АРИУН ЦЭВЭР · ҮЙЛЧИЛГЭЭ</td></tr>
      <tr><td class="k">Бие засах байр</td><td class="v">${campSpec.wc.count} өрөө · ${campSpec.wc.type}</td></tr>
      <tr><td class="k">Цэвэрлэгээ</td><td class="v">Тогтмол үйлчилгээ · 600+ хүний үед 24 цагийн цэвэрлэгээний баг</td></tr>

      <tr class="spec__cat"><td colspan="2">УУЛЗАЛТ · АЮУЛГҮЙ БАЙДАЛ</td></tr>
      <tr><td class="k">Сүлжээ</td><td class="v">Unitel, Mobicom үүрэн сүлжээ холбогдсон</td></tr>
      <tr><td class="k">Эмнэлэг (Премиум)</td><td class="v">${guests <= 300 ? '1 эмч + 1 сувилагч' : guests <= 500 ? '1 эмч + 2 сувилагч' : 'Өргөтгөсөн эмнэлгийн баг + standby тээвэр'}</td></tr>
      <tr><td class="k">Хамгаалалт (Премиум)</td><td class="v">Тайван арга хэмжээнд 100 зочин/1 ажилтан, оройн хөтөлбөртэй үед 30–50 зочин/1 ажилтан</td></tr>
    </table>

    <div class="not-included">
      <div class="not-included__title">★ БАГТААГҮЙ ЗҮЙЛС</div>
      <ul>
        <li>Согтууруулах ундаа (захиалагч өөрөө бэлтгэн авч ирнэ; Bartender үйлчилгээ зөвхөн labor)</li>
        <li>Live stream / video production (нэмэлтээр захиалбал М EVENT-р зохион байгуулах боломжтой)</li>
        <li>Захиалагчийн зочдын тусдаа тээвэр (45 хүний автобуснаас гадуурх хувийн машин)</li>
        <li>Гэрэл зураг, видео материалын commercial usage rights</li>
        <li>Захиалагчийн брэндийн тусгай хэвлэл, тохижилт, декор</li>
        <li>Insurance / даатгалын зардал (өөрсдөө хариуцна)</li>
      </ul>
    </div>

    <div class="timing">
      <div class="timing__title">ХУГАЦААНЫ ЗОХИОН БАЙГУУЛАЛТ</div>
      <table class="timing__table">
        <tr><td class="k">NOMAAD баг ирэх</td><td class="v">Арга хэмжээнээс 4 цагийн өмнө (бэлтгэл, тоног төхөөрөмжийн суурилуулалт)</td></tr>
        <tr><td class="k">Зочид буух</td><td class="v">${fmtDateTime(startDt)}</td></tr>
        <tr><td class="k">Зочид зайлах</td><td class="v">${fmtDateTime(endDt)}</td></tr>
        <tr><td class="k">NOMAAD баг гарах</td><td class="v">Арга хэмжээний дараа 3 цагийн дотор (буулгалт, цэвэрлэгээ)</td></tr>
        <tr><td class="k">Урт хугацаагаар захиалга</td><td class="v">Дээрх цагийн хязгаараас гадуур ашиглавал нэмэлт төлбөр харилцан тохиролцоно</td></tr>
      </table>
    </div>
  </div>`;
*/

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
  // The site stores labels like "Хоног / 2 талдаа, 1,200,000₮"; strip the
  // price suffix so the PDF stays clean.
  const cleanLabel = label.replace(/\s.*$/, '').replace(/\s-.*$/, '');
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
// The HTML template lives at the workflow level, paste the contents of
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
  '{{email}}':                email || '',
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
  '{{tier_excl_vat_fmt}}':    fmt(tierExclVat),
  '{{addons_excl_vat_fmt}}':  fmt(addonsExclVat),
  '{{shuttle_excl_vat_fmt}}': fmt(shuttleExclVat),
  '{{subtotal_excl_vat_fmt}}': fmt(subtotalExclVat),
  '{{vat_amount_fmt}}':       fmt(vatIncluded),
  '{{spec_sheet_html}}':      specSheetHtml,
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
  `Компани: ${company}${customerTaxId !== '' ? ' (РД ' + customerTaxId + ')' : ''}\n` +
  `Холбоо: ${contactName} · ${phone} · ${email || ''}\n` +
  `Кемп: ${camp} · ${tier} · ${guests} хүн · ${durationLabel}\n` +
  `Огноо: ${fmtDateOnly(startDt)} → ${fmtDateOnly(endDt)}\n` +
  `Багц: ${fmt(tierSubtotal)}₮\n` +
  `Нэмэлт: ${fmt(addonsSubtotal)}₮ (${paidAddonCount} төрөл)\n` +
  `Тээвэр: ${fmt(shuttleSubtotal)}₮${busCount > 1 ? ' (' + busCount + ' автобус)' : ''}\n` +
  `НИЙТ: ${fmt(grandTotal)}₮\n` +
  `Урьдчилгаа 30%: ${fmt(deposit30)}₮\n` +
  (str(p.notes) ? `\nТэмдэглэл: ${str(p.notes)}\n` : '');

// ---------- 10b. Email subjects + HTML body (Gmail node references). ----------
const emailSubjectCustomer = `NOMAAD Camp · Үнийн санал ${quoteNumber}`;
const emailSubjectInternal = `🆕 ${quoteNumber} · ${company} · ${fmt(grandTotal)}₮`;

// Customer HTML email (premium B2B feel)
const customerEmailHtml = `
<!DOCTYPE html>
<html lang="mn">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F1E8;font-family:'Helvetica Neue',Arial,sans-serif;color:#1F2A23;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1E8;padding:24px 12px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;padding:32px 28px;max-width:600px;">
      <tr><td style="border-top:3px solid #2E3A28;padding-top:8px;">
        <p style="font-size:11px;color:#C8A878;letter-spacing:2px;margin:0 0 4px;">NOMAAD CAMP</p>
        <h1 style="font-size:18px;color:#1F2A23;margin:0 0 24px;letter-spacing:1px;">ҮНИЙН САНАЛ</h1>
      </td></tr>
      <tr><td>
        <p style="font-size:14px;line-height:1.6;color:#1F2A23;margin:0 0 16px;">Сайн байна уу <strong>${contactName}</strong>,</p>
        <p style="font-size:14px;line-height:1.6;color:#1F2A23;margin:0 0 20px;">Хүсэлтийг чинь хүлээж авлаа. Танай <strong>${company}</strong>-ийн арга хэмжээнд зориулсан дэлгэрэнгүй үнийн саналыг хавсаргасан PDF-р илгээж байна.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1E8;border-radius:6px;border-left:3px solid #C8A878;padding:14px 16px;margin:0 0 20px;">
          <tr><td style="font-size:13px;line-height:1.7;color:#1F2A23;">
            <strong>Кемп:</strong> ${camp}<br>
            <strong>Багц:</strong> ${tier} · ${guests} хүн<br>
            <strong>Хугацаа:</strong> ${durationLabel}<br>
            <strong>Нийт:</strong> ${fmt(grandTotal)}₮ <span style="color:#888780;">(НӨАТ багтсан)</span><br>
            <strong>Урьдчилгаа:</strong> 30% · ${fmt(deposit30)}₮<br>
            <strong>Дугаар:</strong> ${quoteNumber}<br>
            <strong>Хүчинтэй:</strong> ${validUntil} хүртэл
          </td></tr>
        </table>
        <p style="font-size:13px;line-height:1.6;color:#5F5E5A;margin:0 0 8px;">Асуух зүйл байвал утсаар холбогдоорой:</p>
        <p style="font-size:13px;line-height:1.7;color:#1F2A23;margin:0 0 20px;">
          <strong>7700-6790</strong> · Захиалга<br>
          <strong>9917-9417</strong> · Б. Дэлгэрбат, Менежер<br>
          <strong>8802-8216</strong> · Н. Анужин, Менежер
        </p>
        <p style="font-size:13px;color:#5F5E5A;line-height:1.6;margin:24px 0 0;border-top:1px solid #E8E2D2;padding-top:16px;">
          Хүндэтгэсэн,<br>
          <strong style="color:#1F2A23;">NOMAAD Camp</strong> · Чимун ХХК<br>
          <a href="https://nomaadcamp.com" style="color:#C8A878;text-decoration:none;">nomaadcamp.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

// ---------- 11. Return everything for the next nodes. ----------
return {
  json: {
    ...p,
    quote_number:            quoteNumber,
    issue_date:              issueDate,
    valid_until:             validUntil,
    html:                    html,
    pdf_filename:            `${quoteNumber}_${company.replace(/\s+/g, '-')}.pdf`,
    summary_for_email:       summaryForEmail,
    internal_summary:        internalSummary,
    email_subject_customer:  emailSubjectCustomer,
    email_subject_internal:  emailSubjectInternal,
    customer_email_html:     customerEmailHtml,
    next_counter_value:      counter + 1   // for the Sheets append step
  }
};
