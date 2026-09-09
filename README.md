# VyasaAI — AI-Powered Voice Interview Assistant

[![Live Application](https://img.shields.io/badge/Live%20Demo-vyasa--ai.vercel.app-blue?style=for-the-badge&logo=vercel)](https://vyasa-ai.vercel.app/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**VyasaAI** is an interactive, voice-first AI interview platform built with Angular. It simulates real-time interview scenarios by enabling candidates to communicate naturally using speech or text. 

The application captures user input via the Web Speech API, processes conversational context securely through a Vercel Serverless proxy to OpenAI, and synthesizes natural-sounding spoken feedback in real time.

---

## 🚀 Live Demo

Experience the interview assistant live at: **[https://vyasa-ai.vercel.app/](https://vyasa-ai.vercel.app/)**

---

## 📸 Application Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/cee37ada-28b5-4656-aefc-d6b70367e1bc" alt="VyasaAI Interface Preview" width="100%" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/3791ed32-b8e6-4c2c-9f90-8706d0bebec1" alt="VyasaAI Features Overview" width="100%" />
</p>

---

## ✨ Key Features

- **🎙️ Real-Time Voice Interaction:** Dynamic speech-to-text input powered by the Web Speech API.
- **🔊 Conversational Text-to-Speech:** Real-time speech synthesis for a realistic interviewer presence.
- **🎧 Customizable Voices:** Selectable English speech voices and tone dynamics.
- **🧠 Context-Aware AI:** Retains conversation state across multi-turn technical and behavioral questions.
- **⏱️ Smart Silence Detection:** Automatically detects when you finish speaking to continue the flow seamlessly.
- **📋 Transcript Management:** Full interview history logging with single-click transcript copying.
- **🔐 Secure Architecture:** Protects your OpenAI API keys via a serverless proxy layer.
- **📱 Responsive UI:** Fully optimized across desktop, tablet, and mobile browsers.

---

## 🛠️ Tech Stack

- **Frontend:** Angular, TypeScript, HTML5 Speech API (Recognition & Synthesis), Tailwind CSS / SCSS
- **Backend / API:** Vercel Serverless Functions Node.js Environment
- **AI Model:** OpenAI GPT API (`/api/chat` route integration)
- **Deployment:** Vercel Cloud Platform

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User([Candidate / User]) -->|Voice / Text Input| AngularApp[Angular Frontend]
    AngularApp -->|Web Speech API| SpeechRec[Speech Recognition]
    SpeechRec -->|Transcribed Text| APIProxy[Vercel Serverless API /api/chat]
    APIProxy -->|Secure Request| OpenAI[OpenAI API / Assistant]
    OpenAI -->|Generated Response| APIProxy
    APIProxy -->|JSON Response| AngularApp
    AngularApp -->|Text-to-Speech| SpeechSynth[Speech Synthesis Engine]
    SpeechSynth -->|Audio Output| User
