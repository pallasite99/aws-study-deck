# ☁️ AWS CloudPrep Pro

> **The ultimate AI-powered, syllabus-grounded practice assistant for AWS Certifications (CLF-C02 & AIF-C01). Engineered with high-fidelity adaptive scenarios, intelligent multi-model fallbacks, real-time diagnostic consoles, and a comprehensive study suite.**

---

## 🚀 Key Highlights & Architectural Layout

AWS CloudPrep Pro is built with a **full-stack Express & React architecture** designed for resilient operation even under high-demand or API congestion conditions. It features direct alignment with official AWS blueprints:
- **AWS CLF-C02**: Certified Cloud Practitioner (Domains 1-4)
- **AWS AIF-C01**: Certified AI Practitioner (Domains 1-5)

```
                       ┌──────────────────────────────────────┐
                       │           AWS CLOUDPREP PRO          │
                       │           (React 19 Frontend)        │
                       └──────────────────┬───────────────────┘
                                          │
                                   Fetch POST Requests
                                          │
                                          ▼
                       ┌──────────────────────────────────────┐
                       │          Express Server Node         │
                       └──────────────────┬───────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │ (Online: Key Available)                     │ (Offline / Outage)
                   ▼                                             ▼
┌───────────────────────────────────────┐             ┌───────────────────────────────────┐
│     Multi-Model Fallback Engine       │             │   Static Offline Grounding DB     │
│  - gemini-2.5-flash (Primary)         │             │  - Prebuilt Scenario Bank         │
│  - gemini-1.5-flash (Fallback Tier)   │             │  - Immediate local resolution     │
└───────────────────────────────────────┘             └───────────────────────────────────┘
```

---

## 🎨 Immersive Feature Suite

### 1. 📊 Interactive Practice Center
- Generates high-fidelity case studies dynamically matching targeted domains.
- Beautiful, high-contrast, responsive visual layout.
- Detailed visual feedback tags displaying the exact **AI Model** powering the current scenario generation.

### 2. 🛡️ Multi-Model Fallback Strategy (SLA Assurance)
- **Primary Model**: `gemini-2.5-flash` for rapid, highly-nuanced question synthesis.
- **Secondary Fallback**: `gemini-1.5-flash` triggered automatically on transient model congestion.
- **Offline / Outage Safeguard**: Under sustained API unavailability (or simulated developer tests), the backend resolves queries using local grounding datasets instantly.

### 3. 🎯 Exam Simulator
- A realistic, timed mock-exam engine simulating the standard 65-question format.
- Interactive question navigation, review flag controls, and historical session logs.

### 4. 🧠 AI Training Coach
- Fully interactive tutor contextually linked to any tricky questions.
- Powered by historical state feedback to answer general AWS questions, suggest study paths, and explain complex concepts.

### 5. 🎴 Terminology Flashcards & Review Center
- Master AWS service acronyms, acronym definitions, and service purposes with animated cards.
- Save difficult questions and record custom markdown notes in the Personal Review Center.

### 6. 🕹️ Dev Mode Instrumentation Console
- Toggle simulated 503 network congestion to observe resilience routines.
- Manually configure, refill, or completely bypass token quotas with built-in sliders.
- Real-time estimated round-trip-time (RTT) monitors.

---

## 🛠️ Technology Stack & Dependencies

- **Frontend**: React 19 (TypeScript), Vite 6, Tailwind CSS, Motion
- **Backend**: Node.js, Express, tsx, esbuild
- **AI Integration**: Official `@google/genai` TypeScript SDK (utilizing advanced model fallback loops)

---

## 📦 Environmental Setup & Secrets

To run the application locally or deploy to container environments:

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure your environmental secrets**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your_google_ai_studio_key"
   ```

3. **Start the development cluster**:
   ```bash
   npm run dev
   ```

4. **Compile the server and assets for production**:
   ```bash
   npm run build
   ```

---

*Engineered with love and extreme resilience to guarantee an uninterrupted AWS certification training run.*
