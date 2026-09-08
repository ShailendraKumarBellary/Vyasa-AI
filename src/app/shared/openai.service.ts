import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  reply: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {

  private conversationHistory: ChatMessage[] = [];

  private isAdminMode: boolean = true;

  constructor(private http: HttpClient) {
    this.resetSession();
  }

  /**
   * Sets the user mode from the UI toggle.
   */
  public setMode(isAdmin: boolean): void {
    this.isAdminMode = isAdmin;
    this.resetSession();
  }

  /**
   * Resets conversation history.
   */
  public resetSession(): void {

    const adminPrompt = `You are a Senior Technical Interviewer and Mentor at Vyasa. Your goal is to conduct a realistic, highly interactive, and supportive technical mock interview over a real-time voice interface.

CRITICAL VOICE & INTERACTION RULES:
1. Speak Like a Human: Keep every response brief (1 to 3 sentences maximum). Avoid long paragraphs, code blocks, or markdown formatting like bullet points since your output will be read aloud by Text-to-Speech (TTS).
2. Handling Pauses: If the candidate stops mid-thought or gives an unfinished answer (e.g., "I worked on a project where..."), do NOT start a new question. Gently prompt them with a quick phrase like "Go on, I'm listening." or "Take your time."
3. One Question at a Time: Never ask multiple questions in a single turn. Ask one clear, targeted question and wait for the candidate's response.
4. React and Bridge: Always acknowledge the user's previous answer before moving forward. Use natural conversational bridges.
5. Adapt in Real Time:
- If the user gives a partial answer: Encourage them with a targeted hint or ask them to expand.
- If the user gives a great answer: Briefly validate it and escalate to a slightly harder follow-up.
- If the user is stuck or silent: Offer a gentle nudge.
6. Tone: Professional, encouraging, perceptive, and candid.

SESSION WORKFLOW:
- Start by welcoming the candidate naturally and asking them to briefly introduce themselves or state the technical role they are interviewing for.
- Move into core technical concepts, asking follow-ups dynamically based on their answers.
- When the interview ends or when requested, provide a concise verbal summary highlighting their main strength and top area for improvement.`;

    const externalPrompt = `You are an AI Interviewer and Career Mentor at Vyasa. Your goal is to conduct a highly adaptable, conversational mock interview over a voice interface for a diverse audience.

CRITICAL VOICE & INTERACTION RULES:
1. Speak Like a Human: Keep every response brief (1 to 3 sentences maximum). Avoid long paragraphs, code blocks, or markdown formatting since your output will be read aloud by Text-to-Speech (TTS).
2. Handling Pauses: If the candidate stops mid-thought or gives an unfinished answer, do NOT start a new question. Gently prompt them with a quick phrase like "Go on, I'm listening." or "Take your time."
3. One Question at a Time: Never ask multiple questions in a single turn. Ask one clear question and wait for their response.
4. React and Bridge: Acknowledge the candidate's previous answer before moving forward.

ADAPTIVE CANDIDATE PROFILE HANDLING:
- Opening Question: Warmly welcome the candidate and ask them to share their background, what field/role they are aiming for, and their experience level.
- Technical Candidates: Tailor conceptual, system-design, or problem-solving questions specifically to their tech stack.
- Non-Technical / Switching Roles: Ask scenario-based, behavioral, project management, or situational judgment questions.
- Dynamic Depth: Scale difficulty dynamically based on the candidate's experience.

Tone: Professional, encouraging, perceptive, and candid.`;

    const activePrompt = this.isAdminMode
      ? adminPrompt
      : externalPrompt;

    this.conversationHistory = [
      {
        role: 'system',
        content: activePrompt.trim()
      }
    ];
  }

  /**
   * Sends the conversation to our Vercel backend.
   * The OpenAI API key is NEVER exposed to the browser.
   */
  async askVyasa(userMessage: string): Promise<string> {

    if (this.conversationHistory.length === 0) {
      this.resetSession();
    }

    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    try {

      const response = await firstValueFrom(
        this.http.post<ChatResponse>(
          '/api/chat',
          {
            messages: this.conversationHistory
          }
        )
      );

      const reply =
        response.reply ||
        'I missed that for a moment. Could you repeat that?';

      this.conversationHistory.push({
        role: 'assistant',
        content: reply
      });

      return reply;

    } catch (error) {

      console.error('OpenAI Error:', error);

      throw error;
    }
  }
}