# ShopMate — AI & ML + Fintech + RAG Platform

> **Tagline:** Your AI-powered digital employee for your shop.  
> **Core Concept:** Speak → Retrieve Context (RAG) → AI Understands → Business & Khata Updated.

ShopMate is an on-device **AI & ML + Fintech + RAG** platform engineered for small and family-run retail/kirana stores across India. It combines local natural language parsing, moving-average demand forecasting, TF-IDF retrieval-augmented generation (RAG), and a digital micro-fintech credit ledger (Khata) with UPI QR terminal — completely operable via voice in **English, Telugu, and Hinglish**.

---

## 🎯 The Problem

63 Million+ small retail/kirana shops in India power an informal retail economy worth over ₹40 lakh crore ($500B+), yet 90% run on paper notebooks:
* Uncollected credit debts (khata) from paper-based tracking
* Blind inventory purchases leading to stockouts or dead inventory
* Price fluctuations managed from memory without margin safeguards
* Cash flow friction and absence of micro-fintech credit metrics

---

## 💡 The Solution

ShopMate acts as an autonomous digital store employee. The shopkeeper speaks naturally:
```text
"I bought 10 kilos of rice for ₹520"
"10 kilu biyyam ₹520 ki konnanu"  (Telugu)
"I want ₹10 profit per kilo on rice"
"Ramesh took 2 kilos of rice on khata"
"Ramesh ₹124 chellimpu chesadu"   (Telugu)
"Neti ammakalu enta?"             (Telugu daily sales report)
```

ShopMate executes the 3-stage RAG loop, enforces financial and inventory sanity guards, records atomic database transactions, and verbally confirms the action in under 500 milliseconds.

---

## 🔄 The 3-Pillar Architecture

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           VOICE INPUT                                 │
  │     English  ·  Telugu ("biyyam", "konnanu", "chellimpu")  ·  Hinglish │
  └──────────────────────────────────┬─────────────────────────────────────┘
                                     │ Web Speech API (en-IN)
                                     ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🧠 1. ON-DEVICE NLP ENGINE (LocalNLPProvider)                          │
  │    • Deterministic Intent Classifier (9 business intents, 0.98 conf)   │
  │    • Telugu & Hinglish Transliteration Normalizer                      │
  │    • Multi-turn Slot Filling for ambiguous commands                    │
  └──────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 🔍 2. LOCAL RAG ENGINE (ShopRAGEngine)                                 │
  │    • RETRIEVE: TF-IDF Cosine Similarity Search over SQLite Txn Corpus │
  │    • AUGMENT:  Inject 7d/30d Demand Forecast + Customer Risk Scores    │
  │    • GENERATE: Context-enriched verbal tips ("Stock lasts ~3 days")    │
  └──────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 💰 3. FINTECH & BUSINESS SERVICE LAYER                                │
  │    • Atomic Khata Ledger with anti-overpayment & over-credit guards    │
  │    • NPCI-compliant UPI QR Terminal & Payment Simulation               │
  │    • Demand Forecasting ML & Customer Credit Risk Profiling            │
  └──────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
                      SQLite Database via Prisma ORM
```

---

## ✨ Features

- 🎙️ **Voice-First AI Assistant:** Large microphone interface with states (`Idle`, `Listening...`, `Understanding...`, `Completed!`, `Error`) and text input fallback.
- 🇮🇳 **Trilingual Support (English + Telugu + Hinglish):** Full phonetic transliteration layer for Telugu (*"10 kilu biyyam ₹520 ki konnanu"*, *"biyyam dhara enta?"*, *"Ramesh ₹124 chellimpu chesadu"*) alongside Hinglish and English.
- 🔍 **On-Device RAG Engine:** Indexes transaction histories into a local TF-IDF vector store and retrieves relevant past transactions to contextually augment voice responses.
- 📈 **Demand Forecasting ML:** Computes 7-day and 30-day moving averages, sales velocities, predicted stockout dates, and demand intensity scores (0-100).
- 👥 **Customer Credit Risk Scoring (Fintech ML):** Dynamic credit risk profiling based on outstanding balance to total credit ratios, preventing bad debts.
- 📦 **Automated Inventory & Margin Engine:** Auto-computes unit purchase prices ($520 / 10 = ₹52/kg$) and updates selling prices based on target profit margins ($52 + 10 = ₹62/kg$).
- 📒 **Digital Khata Ledger:** Real-time customer credit balances, payment logs, and statement histories with ₹5,000+ confirmation safeguards.
- 💳 **UPI Payment & QR Terminal:** Dynamic NPCI-compliant `upi://pay` QR code generation for any customer balance and 1-click payment simulation.
- 📊 **Interactive AI Intelligence Dashboard:** Live `/intelligence` page visualizing the RAG pipeline, demand curves, and interactive RAG query explorer.
- 🚀 **Built-in Pitch Deck:** Interactive 6-slide deck built directly into `/pitch` for investor and hackathon demos.
- 📶 **Offline-Ready:** IndexedDB local persistence and synchronization queue that syncs pending transactions when connectivity is restored.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **AI / NLP** | Standalone Local NLP Engine (100% on-device, English + Telugu + Hinglish) |
| **RAG Engine** | Local TF-IDF Vector Store, Cosine Similarity, Prisma SQLite retrieval corpus |
| **Machine Learning** | Moving-average Demand Forecaster (7d/30d), Customer Credit Risk Profiling |
| **Fintech Layer** | Khata micro-credit ledger, NPCI UPI QR Generator, Payment Simulation |
| **Voice & Speech** | Web Speech API (`SpeechRecognition` + `SpeechSynthesis` with `en-IN` accent) |
| **Database & ORM** | SQLite (zero-config local run) / PostgreSQL compatible, Prisma ORM |
| **Offline Storage** | IndexedDB with automatic background sync queue |
| **Testing** | Vitest automated test suite (22 tests, 100% passing) |

---

## 🚀 Quick Setup & Running Locally

### 1. Prerequisites
- Node.js 18+ (tested on Node v20 & v26)
- npm 9+

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-repo/shopmate.git
cd shopmate
npm install
```

### 3. Initialize Database & Seed
```bash
# Push Prisma schema to SQLite
npx prisma db push

# Seed demo data (Ramesh Kirana Store)
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Account Credentials

| Attribute | Value |
|---|---|
| **Shop Name** | Ramesh Kirana Store |
| **Email** | `demo@shopmate.ai` |
| **Mobile Number** | `9876543210` |
| **Password** | `password123` |
| **Quick Access** | Click **"One-Click Demo Login"** on `/login` |

---

## 🧪 Automated Testing

ShopMate includes automated tests covering inventory purchases, sales, credit calculations, payment validations, anti-overselling guards, minimum stock notifications, and AI intent parsing variations:

```bash
npm run test
```

Expected output:
```text
✓ tests/shopmate.test.ts (22 tests passed)
```

---

## 🎬 6-Step Hackathon Demonstration Script

Follow this exact flow to demonstrate ShopMate to judges:

### Step 1 — Record Purchase
* Go to `/voice` (or click mic on mobile).
* Say or click: **"I bought 10 kilos of rice for ₹520"**
* *System response:* *"Recorded. Rice stock increased by 10 kg. Purchase price: ₹52/kg."*
* *Verification:* Check `/inventory` — Rice stock increases from 45 kg to 55 kg, purchase price updates to ₹52.

### Step 2 — Set Profit Margin
* Say or click: **"I want ₹10 profit per kilo on rice"**
* *System response:* *"Selling price set to ₹62/kg."*
* *Verification:* Rice selling price is automatically calculated and set to ₹62 ($52 + 10$).

### Step 3 — Family / Price Query
* Say or click: **"What is the selling price of rice?"**
* *System response:* *"Rice is currently ₹62 per kg."*

### Step 4 — Khata Credit Sale
* Say or click: **"Ramesh took 2 kilos of rice on khata"**
* *System response:* *"₹124 added to Ramesh's khata. Rice stock reduced by 2 kg."*
* *Verification:* Check `/customers` — Ramesh's balance increases by ₹124 (2 × ₹62), Rice stock decreases by 2 kg.

### Step 5 — Payment & UPI QR Settlement
* Open Ramesh's Khata or go to `/payments`.
* Click **"Generate Dynamic UPI QR"** for ₹124.
* Click **"Simulate Successful Payment"**.
* *System response:* *"Payment received. Ramesh's outstanding balance is now ₹0."*

### Step 6 — Low Stock Alert
* Say or click: **"Maintain minimum 10 kilos of rice"**
* Observe notifications bell in the top right: Wheat Flour (8 kg), Tea (12 pkts), and Biscuits (25 pkts) show active low-stock alerts.

---

## 🗺️ Future Roadmap

- [ ] WhatsApp & SMS payment reminders for overdue khata
- [ ] Regional languages audio input (Tamil, Telugu, Kannada, Marathi, Bengali)
- [ ] Multimodal receipt image OCR with camera capture
- [ ] Voice-enabled barcode scanning
- [ ] Automated supplier re-ordering suggestions based on sales velocity
- [ ] Multi-store franchise synchronization
