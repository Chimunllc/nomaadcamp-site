# NOMAAD Camp · n8n Quote Workflow — Setup Guide

End-to-end setup for the website → n8n → PDF → Email pipeline.
Allow ~45 minutes for the first-time setup.

---

## Architecture

```
[Website Quote Form]
        │
        ▼  POST /webhook/nomaad-quote (urlencoded)
┌────────────────────┐
│ 1. Webhook         │  triggers the workflow
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 2. Sheets · read   │  read latest counter from "Quote Log"
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 3. Set "template"  │  loads quote-template.html (paste HTML body)
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 4. Code            │  runs quote-pdf-renderer.js → returns html + meta
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 5. HTTP Request    │  POST html to Browserless /pdf → binary PDF
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 6. Sheets · append │  log the quote (Quote Log sheet)
└─────────┬──────────┘
          ▼
   ┌──────┴──────┐
   ▼             ▼
[Gmail]       [Gmail]
customer      internal
```

---

## Prerequisites

1. **n8n cloud** account (you already have `chimun.app.n8n.cloud`).
2. **Browserless.io** account — sign up at https://www.browserless.io/.
   - Free plan: 1,000 PDFs/month (plenty for a quote pipeline).
   - Note your API token from `https://account.browserless.io/account/api-keys`.
3. **Google Sheet** named **"NOMAAD Quote Log"** with these columns in row 1:

   ```
   A: timestamp
   B: quote_number
   C: company
   D: customer_tax_id
   E: contact_name
   F: phone
   G: email
   H: camp
   I: tier
   J: guests
   K: start_datetime
   L: end_datetime
   M: grand_total
   N: deposit_30
   O: pdf_filename
   P: notes
   Q: counter
   ```

   Initialize one row at the bottom with `counter = 0` so the read step works.

4. **Gmail account** for sending (`hello@nomaadglobal.com` recommended).
   Connect it as a Gmail credential in n8n.

---

## Workflow nodes — step by step

### 1. Webhook (already exists)

- URL: `https://chimun.app.n8n.cloud/webhook/nomaad-quote`
- Method: **POST**
- Response Mode: "Immediately" (we don't wait for PDF)

### 2. Google Sheets — Read counter

- Resource: **Sheet Within Document**
- Operation: **Read Rows**
- Document: **NOMAAD Quote Log**
- Range: `Q:Q` (the counter column)
- Set "Output as": **JSON**
- After this node, the latest counter is `$json.counter`. Pass it forward.

> Tip: Use a "Set" node right after to extract `next_counter = max(counter) + 1`
> if reading multiple rows. Or simpler: read just the last row.

### 3. Set node — load HTML template

- Add a node: **Set**
- Name it: **Quote Template**
- Add a string field `template` with **paste the entire contents
  of `quote-template.html`** (from this folder).
- Disable "Keep Only Set" so the previous data passes through.

### 4. Code node — quote-pdf-renderer.js

- Add a node: **Code** (JavaScript, run once for each item).
- Paste the entire contents of `quote-pdf-renderer.js` into the editor.
- The script references `$('Quote Template').first().json.template` —
  make sure the Set node above is named exactly `Quote Template`.
- Outputs:
  - `$json.html` — full populated HTML
  - `$json.quote_number` — `NC-2026-0142`
  - `$json.pdf_filename` — `NC-2026-0142_Tavan-Bogd-Finance.pdf`
  - `$json.summary_for_email` — customer email body
  - `$json.internal_summary` — internal Slack/email body

### 5. HTTP Request — Browserless PDF

- Method: **POST**
- URL: `https://chrome.browserless.io/pdf?token=YOUR_BROWSERLESS_TOKEN`
- Authentication: **None** (token in URL)
- Send Body: **JSON**
- Body:
  ```json
  {
    "html": "={{ $json.html }}",
    "options": {
      "format": "A4",
      "printBackground": true,
      "margin": {"top": "12mm", "right": "14mm", "bottom": "12mm", "left": "14mm"},
      "preferCSSPageSize": true
    }
  }
  ```
- Response Format: **File** (binary)
- Put Output In Field: **data**

After this node, the binary PDF is at `$binary.data`.

### 6. Google Sheets — Append row

- Resource: **Sheet Within Document**
- Operation: **Append**
- Document: **NOMAAD Quote Log**
- Map the columns:
  ```
  timestamp        = {{ $now }}
  quote_number     = {{ $json.quote_number }}
  company          = {{ $json.company }}
  customer_tax_id  = {{ $json.customer_tax_id }}
  contact_name     = {{ $json.contact_name }}
  phone            = {{ $json.phone }}
  email            = {{ $json.email }}
  camp             = {{ $json.camp_name }}
  tier             = {{ $json.package_tier }}
  guests           = {{ $json.guest_count }}
  start_datetime   = {{ $json.start_datetime }}
  end_datetime     = {{ $json.end_datetime }}
  grand_total      = {{ $json.grand_total }}
  deposit_30       = {{ $json.deposit_30 }}
  pdf_filename     = {{ $json.pdf_filename }}
  notes            = {{ $json.notes }}
  counter          = {{ $json.next_counter_value }}
  ```

### 7. Gmail — Customer email

- To: `={{ $json.email }}`
- (Skip this branch if `email` is empty: add an IF node before it
  — `$json.email !== ""`.)
- Subject: `NOMAAD Camp · Үнийн санал {{ $json.quote_number }}`
- HTML body: paste the contents of `email-customer.html`
- Attachments:
  - Property name: `data` (matches the Browserless output)
  - Filename: `={{ $json.pdf_filename }}`

### 8. Gmail — Internal notification

- To: `gmunkhuchral@gmail.com`
- BCC: Б.Дэлгэрбат, Н.Анужин email addresses
- Reply-To: `={{ $json.email }}`  (so reply goes back to customer)
- Subject: `🆕 Шинэ үнийн санал {{ $json.quote_number }} · {{ $json.company }} · {{ $json.grand_total }}₮`
- Body: `={{ $json.internal_summary }}`
- Attachment: same PDF as above (optional but helpful).

---

## Testing the pipeline

1. **Submit a real quote on nomaadcamp.com** with your own email.
2. Open n8n executions → check each node:
   - Webhook should show all `tier_subtotal`, `addons_subtotal`, etc.
   - Code node output should have `html`, `quote_number`, etc.
   - HTTP Request returned a binary file? Check its size > 50 KB.
3. Check your inbox — both customer + internal emails should arrive.
4. Open the PDF — verify:
   - Quote number matches
   - Pricing matches the on-site estimate
   - Customer details correct
   - Bank info correct
5. Check the Google Sheet — new row appended with `counter` incremented.

---

## Common issues

- **PDF is blank** → HTML template has unclosed tags. Re-paste from
  `quote-template.html`. Browserless logs are at
  https://account.browserless.io/account/usage.
- **Mongolian characters look like boxes** → HTML must declare
  `charset=UTF-8` (already in the template). Browserless renders with
  Chrome's bundled fonts which include Cyrillic.
- **Counter doesn't increment** → The Sheets append step must use
  `next_counter_value` from the Code node, not `counter`.
- **Gmail rejects the message** → Re-authenticate the Gmail credential
  in n8n. The `From` address must match the connected account.
- **Webhook hits CORS** → already handled in `main.js` via `mode: 'no-cors'`
  and `URLSearchParams` body. Don't add CORS headers in n8n.

---

## Next iteration ideas

- Replace the placeholder `N` brand mark with the real NOMAAD logo
  (after user drops `nomaad-logo-black.png` into `/assets/`).
- Replace the dashed "ТАМГА + ГАРЫН ҮСЭГ" box with the actual
  stamp + signature PNGs once provided.
- Add a "validity reminder" cron — send a follow-up 3 days before the
  quote expires.
- Switch quote numbering from sheet-based to DB-based if you outgrow
  Sheets (n8n + Postgres).
