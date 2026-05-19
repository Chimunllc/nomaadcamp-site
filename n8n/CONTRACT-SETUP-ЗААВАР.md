# Гэрээ Auto-fill Setup заавар (v2 — албан ёсны шаблон)

Хэрэглэгчийн Quote Log Sheet дотор Төлөв "ИЛГЭЭСЭН" → **"ГЭРЭЭ"** болж сольсоны дараа n8n автоматаар:
1. Албан ёсны гэрээний шаблоныг **Google Drive дотор хувилж**
2. Бүх placeholder-ыг **Quote Log-ийн өгөгдлөөр** солиж
3. Шинэ Doc-ыг **NOMAAD · Гэрээ Үүсгэсэн** хавтаст хадгалж
4. Staff-д Doc линктэй email явуулна

---

## Алхам 1 — Шаблон Google Doc болгож upload хийх

1. Google Drive нээх → **NOMAAD · Гэрээ Templates** нэртэй хавтас үүсгэх
2. `n8n/NOMAAD-Contract-Template-v2.docx` файлыг тэр хавтас руу drag-drop
3. Upload хийгдсэний дараа файлыг **2 удаа** дарж нээгээд → **File → Save as Google Docs**
4. Үүссэн Google Doc-ийн URL-аас **Doc ID** хуулж авах:
   - URL: `https://docs.google.com/document/d/XXXXXXXXX/edit`
   - **Doc ID** = `XXXXXXXXX` (`/d/` болон `/edit` хооронд)

⚠️ Upload хийсний дараа placeholder `{{...}}` хэлбэрээр Doc дотор хадгалагдсан байх ёстой. Хэрэв нэг placeholder run-уудад хуваагдсан бол гар бөглөнө.

---

## Алхам 2 — Гэрээ хадгалах хавтасны Folder ID

`NOMAAD · Гэрээ Үүсгэсэн` хавтас:
```
https://drive.google.com/drive/folders/1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb
```
Folder ID = `1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb` (workflow дотор урьдчилан тохируулсан).

---

## Алхам 3 — Workflow 3 импорт + node config

### 3.1. Импорт
n8n → Workflows → ... → Import from File → `NOMAAD Quote · 3. Contract Confirmed.json` → **Replace existing**.

### 3.2. Drive · Copy template
- 2 удаа дарж нээх
- **Credential:** Google Drive OAuth2 холбох
- **File ID** талбарт **Алхам 1-д авсан шаблон Doc ID** оруулах (REPLACE_WITH_TEMPLATE_DOC_ID-ийн оронд)

### 3.3. Docs · Replace placeholders
- **Credential:** Google Docs OAuth2 холбох
- 30 placeholder автоматаар бөглөгдсөн байна

### 3.4. Sheets · Update quote status
- Quote Log Sheet толгойд **`Гэрээ Doc URL`** багана нэмэх (хүсвэл)

---

## Алхам 4 — Туршилт

1. Quote Log дотор аль нэг quote-ын Төлөв-ыг **ИЛГЭЭСЭН → ГЭРЭЭ** солих
2. 1-2 минут хүлээх
3. Шалгах:
   - ✓ `NOMAAD · Гэрээ Үүсгэсэн` хавтаст шинэ Doc гарсан
   - ✓ Doc дотор placeholder бүгд бөглөгдсөн
   - ✓ Staff email ирсэн (Doc URL-тэй)

---

## Гэрээний Placeholder-ууд (30 ширхэг)

### Гарчиг + БАТЛАВ блок
- `{{contract_year}}` / `{{contract_month}}` / `{{contract_day}}` — гэрээ үүсгэсэн огноо

### 1.1 — Захиалагч
- `{{customer_tax_id}}` — РД
- `{{company_name}}` — компанийн нэр
- `{{contact_position}}` — албан тушаал (default "Гүйцэтгэх захирал")
- `{{contact_name}}` — холбоо барих хүн

### 2.1 — Хугацаа
- `{{start_year}}` / `{{start_month}}` / `{{start_day}}` / `{{start_time}}`
- `{{end_year}}` / `{{end_month}}` / `{{end_day}}` / `{{end_time}}`

### 2.2 — Үнэ
- `{{guest_count}}` — хүний тоо
- `{{camp_short_name}}` — Grove/Aurora гэх мэт
- `{{tier}}` — багц
- `{{per_person_price}}` + `{{per_person_price_words}}` — нэг хүний үнэ
- `{{addons_subtotal}}` + `{{addons_subtotal_words}}` — нэмэлт төлбөр
- `{{grand_total}}` + `{{grand_total_words}}` — нийт үнэ

### 2.3 — 2.4 Төлбөр
- `{{deposit_30}}` + `{{deposit_30_words}}` — 30% урьдчилгаа
- `{{balance_70}}` + `{{balance_70_words}}` — 70% үлдэгдэл

### 4.4 — Сунгах төлбөр (default 300,000₮)
- `{{hourly_extension_fee}}` + `{{hourly_extension_fee_words}}`

---

## Хязгаарлалт

- **Хавсралт №1** (хоолны цэс, тоног төхөөрөмж) — placeholder болгоогүй. Ажилтан гар бөглөнө.
- **БАТЛАВ блок гарын үсэг + цаг** — placeholder болгоогүй.
- **Тоог үг рүү хувиргах** үндсэн bigram функцэд тулгуурласан.

---

## Дараагийн алхам

1. Doc нээж шалгах
2. Хавсралт №1 хоолны цэс гар бөглөх
3. File → Download → **PDF**
4. Зочин руу email
5. Гарын үсэг авсаны дараа Quote Log-ийн `Гэрээ зурсан огноо` багана бөглөх
