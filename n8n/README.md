# NOMAAD Camp · n8n Workflows

n8n Cloud дээр ажиллаж буй 3 workflow болон тэдгээрийн ажиллахад шаардлагатай файлууд.

## Workflow файлууд

| Файл | Үүрэг |
|---|---|
| `NOMAAD Quote · 1. Capture .json` | Webhook → Quote Log Sheet + Items таб + Internal email + PDF үүсгэлт |
| `NOMAAD Quote · 2. Send.json` | Webhook → Customer Gmail Draft + PDF + Certificate hosp |
| `NOMAAD Quote · 3. Contract Confirmed.json` | Төлөв=ГЭРЭЭ trigger → Drive дотор гэрээ автомат үүсгэх |

## Хавсралт файлууд

| Файл | Хэрэглээ |
|---|---|
| `NOMAAD-Contract-Template-v2.docx` | Албан ёсны гэрээний шаблон (Google Doc болж хувирах) |
| `Чимун_ХХК_Гэрчилгээ.pdf` | Customer email-д хавсралт |
| `stamp.png` | Workflow 1-д base64-р embed (эх файл, ирээдүйд солих хэрэгтэй бол) |
| `email-preview.html` | Customer email-ийн design тест preview |

## Заавар

| Файл | Агуулга |
|---|---|
| `CONTRACT-SETUP-ЗААВАР.md` | Workflow 3 setup (шаблон Drive-руу, Doc ID, тестлэх алхамууд) |

## Архитектур

```
[nomaadcamp.com quote form]
         ↓ POST
    [Webhook]
         ↓
    Workflow 1 ─→ Quote Log Sheet + Items таб
                + Internal email (team@nomaadcamp.com)
                + PDF render
         ↓
    Sheets-д "ШИНЭ" статустайгаар орно
         ↓ ажилтан "ИЛГЭЭХ" товч даах
    Webhook → Workflow 2
                + Customer Gmail Draft
                + PDF + Certificate хавсралт
         ↓
    Sheets-д "ИЛГЭЭСЭН" статус
         ↓ ажилтан "ГЭРЭЭ" статус сонгох
    Sheets Trigger → Workflow 3
                    + Drive · Copy шаблон
                    + Docs · Replace 30 placeholder
                    + Drive хавтсанд гэрээ хадгална
                    + Staff-д email Doc URL-тэй
```

## Google Drive хавтсууд

- **NOMAAD · Гэрээ Templates** — шаблон хадгалах
- [NOMAAD · Гэрээ Үүсгэсэн](https://drive.google.com/drive/folders/1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb) — generated contracts

## Шаблон Google Doc ID

`12Ks-tTEovApXlSgfFHvi7zrtpJcNiby6WQtpeOeEFX0`

## Quote Log Sheet ID

`16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA`
