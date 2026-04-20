# 🚀 Pulse – AI Healthcare Platform

> An NLP-powered healthcare system that transforms unstructured patient data into structured, actionable insights.

---

## 🧠 Overview

Pulse is a full-stack healthcare platform that integrates **Natural Language Processing (NLP)** to improve patient understanding and assist clinical decision-making.

It combines:
- conversational patient intake  
- medical report analysis  
- interactive Q&A  
- scenario-based health simulation  

All built around a **unified patient profile**.

---

## ✨ Key Features

### 💬 Conversational Intake
- Chat-based pre-consultation system  
- Collects symptoms, history, and patient details  
- Generates structured doctor briefs  

---

### 📄 Medical Report Analysis
- Processes uploaded medical reports  
- Extracts key lab values  
- Identifies abnormal parameters  
- Provides simple, human-readable explanations  

---

### ❓ Report Q&A System
- Ask questions about your reports  
- Context-aware responses using report data  
- Keeps answers concise and relevant  

---

### 🧬 Health Twin (Scenario Simulation)
- Simulate lifestyle or medication changes  
- Predict risk score changes  
- Provides causal explanations for health outcomes  

---

### 👨‍⚕️ Doctor Dashboard
- View patient summaries  
- Access AI-generated briefs  
- Prioritize patients based on risk  

---

## 🧠 NLP in Pulse

Pulse leverages NLP across multiple components:

- **Dialogue System** → Conversational intake  
- **Information Extraction** → Medical report analysis  
- **Question Answering** → Report-based Q&A  
- **Natural Language Generation** → Explanations & summaries  
- **Reasoning** → Scenario-based health predictions  

---

## 🏗️ System Architecture

The system follows a modular architecture:

- **Frontend (React)** → User interfaces  
- **Backend (Node.js + Express)** → API & logic  
- **AI Service Layer** → LLM-powered processing  
- **Database (MongoDB)** → Unified patient profile  

---

## 🔄 Data Flow

1. User provides input (chat or report)  
2. Data is processed using NLP (LLM)  
3. Converted into structured JSON  
4. Stored in MongoDB  
5. Used for insights, Q&A, and simulations  

---

## 🗄️ Data Handling

- **Unstructured:** chat inputs, report text  
- **Semi-structured:** extracted lab values  
- **Structured:** risk scores, scenarios, health metrics  

---

## 🛠️ Tech Stack

- **Frontend:** React, Tailwind CSS  
- **Backend:** Node.js, Express  
- **Database:** MongoDB  
- **AI/NLP:** LLM APIs (Claude / GPT / Groq)  
- **Charts:** Recharts  

---

## 🚧 Limitations

- Relies on AI-generated interpretations  
- No integration with real clinical datasets  
- Limited medical validation (prototype-level)  

---

## 🚀 Future Work

- Integration with real-world healthcare datasets  
- Advanced medical NLP models  
- Wearable device integration  
- Personalized health recommendations  

---

## 🧩 Getting Started

```bash
# Clone the repo
git clone https://github.com/Mahek2710/Pulse

# Install dependencies
cd backend
npm install

cd ../frontend
npm install

# Run backend
cd ../backend
npm run dev

# Run frontend
cd ../frontend
npm run dev
