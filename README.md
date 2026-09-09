# VyasaAI

## AI-Powered Voice Interview Assistant

VyasaAI is an AI-powered interview assistant built with Angular. It provides an interactive interview experience where candidates can communicate with an AI interviewer using their **voice or text**.

The application listens to the candidate's response, converts speech into text using the browser's Speech Recognition API, sends the conversation securely to an AI backend, and responds using voice synthesis.

---

## 🚀 Live Application

**VyasaAI:**  
https://vyasa-ai.vercel.app/

---

## 📸 Application Preview

### Login

The application provides a simple authentication flow before starting an interview session.

### AI Interview Interface

Candidates can interact with Vyasa using voice and receive spoken AI responses.

---

## ✨ Features

- 🤖 AI-powered interview assistant
- 🎙️ Voice-based interview interaction
- 📝 Speech-to-text using browser Speech Recognition
- 🔊 Text-to-speech AI responses
- 💬 Conversational interview flow
- 🧠 Maintains conversation context during an interview
- 🔄 Automatically continues listening after AI responses
- ⏱️ Intelligent silence detection
- 🗣️ Supports longer candidate responses
- 🎧 Selectable English speech voices
- 💾 Interview conversation history
- 📋 Copy complete interview transcript
- 🔐 Authentication
- 📱 Responsive user interface
- ☁️ Deployed on Vercel
- 🔒 OpenAI API key protected on the server

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Candidate      │
                    │                     │
                    │  Voice / Text Input │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Angular Frontend  │
                    │                     │
                    │  VyasaAI Interface  │
                    └──────────┬──────────┘
                               │
                  Speech Recognition
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Voice Service     │
                    │                     │
                    │ Browser Speech API  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    /api/chat        │
                    │                     │
                    │ Vercel Serverless   │
                    │      Function       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      OpenAI API     │
                    │                     │
                    │   AI Interviewer    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   AI Response       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Speech Synthesis    │
                    │                     │
                    │  AI Voice Response  │
                    └─────────────────────┘
