import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  HostListener,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { OpenaiService } from '../shared/openai.service';
import { VoiceRecognitionService } from '../shared/voice-recognition.service';

import { Subject, takeUntil } from 'rxjs';

import {
  ChatHistoryService,
  ChatTurn,
} from '../enviorment/chat-history-service.service';

import { AuthService } from '../shared/auth.service';

export type SystemStatus = 'STANDBY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

@Component({
  selector: 'app-home',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './home.component.html',

  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  vyasaResponse = '';

  status: SystemStatus = 'STANDBY';

  showWorkflowInfo = false;

  isInitialPrompt =
    'Hey Vyasa! The user has initiated the session. Please introduce yourself warmly as their interview helper and ask them to share their name and background to get started.';

  availableVoices: SpeechSynthesisVoice[] = [];

  selectedVoiceURI = '';

  selectedVoice: SpeechSynthesisVoice | null = null;

  private destroy$ = new Subject<void>();

  private followUpTimer: any = null;

  private sessionEndTimer: any = null;

  userEmail: string = '';

  chatHistory: ChatTurn[] = [];

  copiedIndex: number | null = null;

  isTransmissionCopied = false;

  /**
   * Prevents multiple speech results from being
   * processed at the same time.
   *
   * This is important because the browser's speech
   * recognition engine can produce multiple events.
   */
  private isProcessingVoiceInput = false;

  constructor(
    private openaiService: OpenaiService,

    private voiceRecognitionService: VoiceRecognitionService,

    private zone: NgZone,

    private chatHistoryService: ChatHistoryService,

    private authService: AuthService,
  ) {}

  /**
   * Prevent lost session state on accidental refresh
   * or window closure.
   */
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.status !== 'STANDBY' || this.chatHistory.length > 0) {
      $event.returnValue =
        'Are you sure you want to refresh? Your active session data will be lost.';
    }
  }

  /**
   * Component initialization.
   */
  async ngOnInit(): Promise<void> {
    this.userEmail = this.authService.getUserEmail() || '';

    this.initVoicesImmediately();

    await this.loadPreviousHistory();

    /**
     * Listen for completed speech recognition results.
     */
    this.voiceRecognitionService.speechResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (text: string) => {
        const cleanText = text.trim();

        /**
         * Ignore empty speech.
         */
        if (!cleanText) {
          return;
        }

        /**
         * Ignore duplicate results while another
         * answer is already being processed.
         */
        if (this.isProcessingVoiceInput) {
          console.log('Ignoring duplicate voice result:', cleanText);

          return;
        }

        /**
         * Do not accept new speech while Vyasa
         * is speaking or processing.
         */
        if (this.status === 'SPEAKING' || this.status === 'PROCESSING') {
          console.log('Ignoring voice input because status is:', this.status);

          return;
        }

        this.isProcessingVoiceInput = true;

        this.clearInactivityTimers();

        try {
          await this.sendToVyasa(cleanText);
        } finally {
          this.isProcessingVoiceInput = false;
        }
      });
  }

  /**
   * Load previous chat history.
   */
  async loadPreviousHistory(): Promise<void> {
    if (this.userEmail) {
      this.chatHistory = await this.chatHistoryService.getUserHistory(
        this.userEmail,
      );
    }
  }

  /**
   * Initialize available browser voices.
   */
  private initVoicesImmediately(): void {
    const populateVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (voices.length > 0) {
        this.availableVoices = voices.filter((v) => v.lang.startsWith('en'));

        if (!this.selectedVoice && this.availableVoices.length > 0) {
          const preferred =
            this.availableVoices.find(
              (v) => v.name.includes('Natural') || v.name.includes('Online'),
            ) ||
            this.availableVoices.find((v) =>
              v.name.includes('Google US English'),
            ) ||
            this.availableVoices[0];

          this.selectedVoice = preferred;

          this.selectedVoiceURI = preferred.voiceURI;
        }
      }
    };

    populateVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.zone.run(() => {
          populateVoices();
        });
      };
    }
  }

  /**
   * Change selected speech voice.
   */
  public onVoiceChange(voiceURI: string): void {
    const match = this.availableVoices.find((v) => v.voiceURI === voiceURI);

    if (match) {
      this.selectedVoice = match;
    }
  }

  /**
   * Start a new Vyasa session.
   */
  public async startVyasa(): Promise<void> {
    this.openaiService.resetSession();

    this.isProcessingVoiceInput = false;

    this.resetInactivityTimers();

    await this.sendToVyasa(this.isInitialPrompt);
  }

  /**
   * Stop the current Vyasa session.
   */
  public stopVyasa(): void {
    if (confirm('Are you sure you want to end this interview session?')) {
      this.clearInactivityTimers();

      window.speechSynthesis.cancel();

      this.voiceRecognitionService.stopListening();

      this.openaiService.resetSession();

      this.status = 'STANDBY';

      this.vyasaResponse = '';

      this.isProcessingVoiceInput = false;
    }
  }

  /**
   * "I don't know" shortcut.
   */
  public async dontKnowShortcut(): Promise<void> {
    if (this.status === 'STANDBY') {
      return;
    }

    await this.sendToVyasa(
      'I am not quite sure about that one, Vyasa. Could you explain it to me?',
    );
  }

  /**
   * Send text to Vyasa.
   */
  async sendToVyasa(text: string): Promise<void> {
    try {
      this.clearInactivityTimers();

      /**
       * Stop microphone BEFORE processing
       * the user's answer.
       */
      this.voiceRecognitionService.stopListening();

      this.status = 'PROCESSING';

      /**
       * Save user message.
       */
      if (this.userEmail) {
        await this.chatHistoryService.saveMessage(this.userEmail, 'user', text);

        this.chatHistory.push({
          user_email: this.userEmail,

          role: 'user',

          content: text,
        });
      }

      /**
       * Ask OpenAI.
       */
      const response = await this.openaiService.askVyasa(text);

      this.vyasaResponse = response;

      /**
       * Save assistant response.
       */
      if (this.userEmail) {
        await this.chatHistoryService.saveMessage(
          this.userEmail,
          'assistant',
          response,
        );

        this.chatHistory.push({
          user_email: this.userEmail,

          role: 'assistant',

          content: response,
        });
      }

      /**
       * Speak response.
       */
      this.speakInSentences(response);
    } catch (error) {
      console.error('Vyasa Error:', error);

      /**
       * If OpenAI fails, return to listening
       * instead of leaving the application stuck.
       */
      this.resumeListening();
    }
  }

  /**
   * Speak the response sentence by sentence.
   */
  private speakInSentences(fullText: string): void {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    /**
     * Cancel any previous speech.
     */
    window.speechSynthesis.cancel();

    /**
     * Split response into sentences.
     */
    const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];

    let index = 0;

    const speakNextChunk = () => {
      /**
       * All sentences have been spoken.
       */
      if (index >= sentences.length) {
        this.zone.run(() => {
          this.resumeListening();
        });

        return;
      }

      const chunkText = sentences[index].trim();

      /**
       * Skip empty chunks.
       */
      if (!chunkText) {
        index++;

        speakNextChunk();

        return;
      }

      const speech = new SpeechSynthesisUtterance(chunkText);

      speech.rate = 1.0;

      speech.pitch = 1.0;

      if (this.selectedVoice) {
        speech.voice = this.selectedVoice;
      }

      /**
       * Speech started.
       */
      speech.onstart = () => {
        this.zone.run(() => {
          this.status = 'SPEAKING';
        });
      };

      /**
       * Speech completed.
       */
      speech.onend = () => {
        index++;

        speakNextChunk();
      };

      /**
       * Speech engine error.
       */
      speech.onerror = (err) => {
        console.warn('Speech engine warning:', err);

        index++;

        speakNextChunk();
      };

      window.speechSynthesis.resume();

      window.speechSynthesis.speak(speech);
    };

    speakNextChunk();
  }

  /**
   * Resume microphone listening.
   */
  private resumeListening(): void {
    /**
     * Make sure the application is not
     * still processing an old voice result.
     */
    this.isProcessingVoiceInput = false;

    this.status = 'LISTENING';

    this.voiceRecognitionService.startListening();

    this.resetInactivityTimers();
  }

  /**
   * Reset inactivity timers.
   */
  private resetInactivityTimers(): void {
    this.clearInactivityTimers();

    /**
     * Follow-up timer.
     *
     * Existing behavior retained.
     */
    this.followUpTimer = setTimeout(() => {
      if (this.status === 'LISTENING') {
        this.sendToVyasa(
          'The candidate has been quiet for 15 seconds. Check in on them warmly or ask if they need a hint.',
        );
      }
    }, 20000);

    /**
     * End the session after 3 minutes.
     */
    this.sessionEndTimer = setTimeout(() => {
      this.stopVyasa();
    }, 180000);
  }

  /**
   * Clear inactivity timers.
   */
  private clearInactivityTimers(): void {
    if (this.followUpTimer) {
      clearTimeout(this.followUpTimer);

      this.followUpTimer = null;
    }

    if (this.sessionEndTimer) {
      clearTimeout(this.sessionEndTimer);

      this.sessionEndTimer = null;
    }
  }

  /**
   * Copy individual message.
   */
  copyToClipboard(text: string, index: number): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedIndex = index;

      setTimeout(() => {
        this.copiedIndex = null;
      }, 2000);
    });
  }

  /**
   * Copy current Vyasa response.
   */
  copyTransmission(): void {
    if (!this.vyasaResponse) {
      return;
    }

    navigator.clipboard.writeText(this.vyasaResponse).then(() => {
      this.isTransmissionCopied = true;

      setTimeout(() => {
        this.isTransmissionCopied = false;
      }, 2000);
    });
  }

  /**
   * Copy complete transcript.
   */
  copyEntireTranscript(): void {
    if (!this.chatHistory || this.chatHistory.length === 0) {
      if (this.vyasaResponse) {
        navigator.clipboard.writeText(this.vyasaResponse);
      }

      return;
    }

    const fullText = this.chatHistory
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n');

    navigator.clipboard.writeText(fullText).then(() => {
      this.isTransmissionCopied = true;

      setTimeout(() => {
        this.isTransmissionCopied = false;
      }, 2500);
    });
  }

  /**
   * Logout.
   */
  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.clearInactivityTimers();

      window.speechSynthesis.cancel();

      this.voiceRecognitionService.stopListening();

      this.authService.logout();
    }
  }

  /**
   * Component cleanup.
   */
  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();

    this.clearInactivityTimers();

    window.speechSynthesis.cancel();

    this.voiceRecognitionService.stopListening();

    this.isProcessingVoiceInput = false;
  }
}
