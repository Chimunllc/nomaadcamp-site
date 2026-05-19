# NOMAAD Camp · n8n Workflows

n8n Cloud (`chimunllc.app.n8n.cloud`) дээр ажиллаж буй 3 workflow ба тэдгээрийн ажиллахад шаардлагатай файлууд.

## Workflow файлууд

| Файл | Trigger | Үүрэг |
|---|---|---|
| `NOMAAD Quote · 1. Capture .json` | Webhook `/nomaad-quote` (POST) | nomaadcamp.com form → Quote Log + Quote Items + Internal email + PDF |
| `NOMAAD Quote · 2. Send.json` | Webhook `/nomaad-quote-send` (POST) | Apps Script ажиллуулна → Customer Gmail draft + PDF + Certificate |
| `NOMAAD Quote · 3. Contract Confirmed.json` | Webhook `/nomaad-contract-trigger` (POST) | Apps Script ажиллуулна → Drive дотор гэрээний Doc автомат үүсгэх |

## Хавсралт файлууд

| Файл | Хэрэглээ |
|---|---|
| `NOMAAD-Contract-Template-v3.docx` | Гэрээний шаблон v3 (дугаарлалт цэвэр, Хавсралт №1 динамик) |
| `Чимун_ХХК_Гэрчилгээ.pdf` | Customer email-д хавсралт (одоо Drive-аас татна) |
| `stamp.png` | Workflow 1-д base64-р embed |
| `email-preview.html` | Customer email-ийн design тест preview |
| `apps-script-onEdit.gs` | Quote Log Sheet-д наах onEdit trigger — Төлөв сольсон үед webhook руу POST хийдэг |

## Архитектур

```
[nomaadcamp.com quote form]
         ↓ POST /nomaad-quote
    Workflow 1 ─→ Quote Log Sheet ("ШИНЭ" статус)
                + Quote Items таб (бүх line items)
                + Internal email (hello@nomaadcamp.com)
                + PDF render
         ↓
    Sheets-д "ШИНЭ" статустайгаар орно
         ↓ нярав Төлөв = "ИЛГЭЭХ" сонгох
    Apps Script onEdit → POST /nomaad-quote-send
         ↓
    Workflow 2 (Webhook trigger — instant)
                + Customer Gmail Draft (hello@nomaadcamp.com Drafts-д)
                + PDF + Certificate хавсралт
                + Status → "ИЛГЭЭСЭН"
         ↓ нярав Drafts-аас илгээх
    Зочин гэрээ зөвшөөрсний дараа
         ↓ нярав Төлөв = "ГЭРЭЭ" сонгох
    Apps Script onEdit → POST /nomaad-contract-trigger
         ↓
    Workflow 3 (Webhook trigger — instant)
                + Quote Items уншиж бүгдийг нэгтгэнэ
                + Drive дотор шаблон хувилна
                + Docs-д 35 placeholder сольно
                + Staff email (team@nomaadcamp.com)
                + Status → "ГЭРЭЭ БАТЛАГДСАН"
```

## Чухал тэмдэглэл

- **Apps Script ашигладаг учир**: Sheets Trigger polling-аас сэргийлэх (API quota хадгалах + instant trigger)
- **Эцсийн гэрээний дүн**: Quote Items таб дахь "Дүн ₮" баганаас автомат нийлбэрлэнэ. Manual "Эцсийн гэрээний дүн" багана ашигладаггүй.
- **Дүнгийн засвар**: Гэрээний нөхцөл өөрчлөх бол **Quote Items** таб дотор мөр нэмэх/хасах эсвэл тоо/үнэ өөрчилнө.
- **Apps Script onEdit**: Зөвхөн `Төлөв` багана өөрчлөгдөх үед л webhook дуудна. Бусад баганад засвар хийхэд WF2/WF3 тригерлэхгүй.

## Google Drive хавтсууд

- **NOMAAD · Гэрээ Templates** — шаблон хадгалах
- [NOMAAD · Гэрээ Үүсгэсэн](https://drive.google.com/drive/folders/1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb) — generated contracts
- Чимун ХХК гэрчилгээ PDF: `143R-5HRTQLqwE8lvMzcbReiAvEMONUEi`

## ID-ууд

| Нэр | ID |
|---|---|
| Quote Log Sheet | `16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA` |
| Шаблон Google Doc v3 | `107mUlM2bWTXAYQufxmQSIcBgTYtyvSaSiaDNBoB7vS8` |
| NOMAAD · Гэрээ Үүсгэсэн folder | `1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb` |
| Cert PDF (Drive) | `143R-5HRTQLqwE8lvMzcbReiAvEMONUEi` |

## Credentials (n8n Cloud дотор үүсгэх)

| Credential | Хаана хэрэглэдэг |
|---|---|
| Google Sheets OAuth2 API | WF1, WF2, WF3 sheet nodes |
| Google Drive OAuth2 API | WF3 `Drive · Copy template`, WF2 `Drive · Download Certificate` |
| Google Docs OAuth2 API | WF3 `Docs · Replace placeholders` |
| Gmail OAuth2 API | WF1, WF2, WF3 (hello@nomaadcamp.com-р нэвтрүүлсэн) |

⚠️ Sheets Trigger ашиглахгүй болсон тул "Google Sheets Trigger account" credential шаардлагагүй.
