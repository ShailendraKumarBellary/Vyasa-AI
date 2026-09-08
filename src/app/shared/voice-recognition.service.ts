import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {
  private speechResultSubject = new Subject<string>();
  private speechStartSubject = new Subject<void>();
  
  speechResult$ = this.speechResultSubject.asObservable();
  speechStart$ = this.speechStartSubject.asObservable();

  private recognition: any;
  private isListening = false;
  private silenceTimer: any = null;
  private accumulatedTranscript = '';

  constructor(private zone: NgZone) {
    this.initRecognition();
  }

  private initRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onspeechstart = () => {
      this.zone.run(() => {
        this.speechStartSubject.next();
      });
    };

    this.recognition.onresult = (event: any) => {
      // Clear silence timer on any speech activity
      clearTimeout(this.silenceTimer);

      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.accumulatedTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Wait 2.5 seconds of silence before finalizing and sending to OpenAI
      this.silenceTimer = setTimeout(() => {
        const fullSentence = (this.accumulatedTranscript + interimTranscript).trim();
        
        if (fullSentence.length > 0) {
          this.zone.run(() => {
            this.speechResultSubject.next(fullSentence);
            this.accumulatedTranscript = ''; // Reset for next turn
          });
        }
      }, 2500); 
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      clearTimeout(this.silenceTimer);
    };

    this.recognition.onend = () => {
      clearTimeout(this.silenceTimer);
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already active or restarting
        }
      }
    };
  }

  public startListening(): void {
    this.isListening = true;
    this.accumulatedTranscript = '';
    clearTimeout(this.silenceTimer);
    try {
      this.recognition.start();
    } catch (e) {
      // Already running
    }
  }

  public stopListening(): void {
    this.isListening = false;
    clearTimeout(this.silenceTimer);
    this.accumulatedTranscript = '';
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}