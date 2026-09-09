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
  private restartTimer: any = null;

  private accumulatedTranscript = '';

  private readonly SILENCE_TIMEOUT = 3500;

  constructor(private zone: NgZone) {
    this.initRecognition();
  }

  private initRecognition(): void {

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error(
        'Speech recognition is not supported in this browser.'
      );
      return;
    }

    this.recognition = new SpeechRecognition();

    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    // -----------------------------------------
    // SPEECH START
    // -----------------------------------------

    this.recognition.onspeechstart = () => {

      console.log('Speech started');

      clearTimeout(this.silenceTimer);

      this.zone.run(() => {
        this.speechStartSubject.next();
      });
    };

    // -----------------------------------------
    // SPEECH RESULT
    // -----------------------------------------

    this.recognition.onresult = (event: any) => {

      console.log('Speech result event');

      clearTimeout(this.silenceTimer);

      let newFinalText = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        const result = event.results[i];

        const transcript =
          result[0]?.transcript || '';

        console.log(
          'Transcript:',
          transcript,
          'Final:',
          result.isFinal
        );

        if (result.isFinal) {
          newFinalText += transcript + ' ';
        }
      }

      // Only store FINAL speech.
      // Do not depend on interim speech for final submission.

      if (newFinalText.trim()) {

        this.accumulatedTranscript += newFinalText;

        console.log(
          'Accumulated:',
          this.accumulatedTranscript
        );
      }

      // Wait until user has stopped speaking.

      this.silenceTimer = setTimeout(() => {

        this.finalizeSpeech();

      }, this.SILENCE_TIMEOUT);
    };

    // -----------------------------------------
    // ERROR
    // -----------------------------------------

    this.recognition.onerror = (event: any) => {

      console.warn(
        'Speech recognition error:',
        event.error
      );

      if (event.error === 'no-speech') {

        console.log(
          'No speech detected. Recognition will restart.'
        );

        return;
      }

      if (event.error === 'network') {

        console.log(
          'Speech recognition network interruption.'
        );

        return;
      }

      if (event.error === 'aborted') {

        console.log(
          'Speech recognition aborted.'
        );

        return;
      }

      clearTimeout(this.silenceTimer);
    };

    // -----------------------------------------
    // RECOGNITION END
    // -----------------------------------------

    this.recognition.onend = () => {

      console.log(
        'Speech recognition ended.'
      );

      // IMPORTANT:
      // Do NOT clear silenceTimer here.
      // There may still be speech waiting to be finalized.

      if (this.isListening) {

        clearTimeout(this.restartTimer);

        this.restartTimer = setTimeout(() => {

          if (!this.isListening) {
            return;
          }

          try {

            this.recognition.start();

            console.log(
              'Speech recognition restarted.'
            );

          } catch (error) {

            console.log(
              'Recognition restart skipped:',
              error
            );
          }

        }, 300);
      }
    };
  }

  // -----------------------------------------
  // FINALIZE SPEECH
  // -----------------------------------------

  private finalizeSpeech(): void {

    clearTimeout(this.silenceTimer);

    const text =
      this.accumulatedTranscript.trim();

    if (!text) {
      return;
    }

    console.log(
      'Final speech:',
      text
    );

    this.zone.run(() => {

      this.speechResultSubject.next(text);

    });

    this.accumulatedTranscript = '';
  }

  // -----------------------------------------
  // START LISTENING
  // -----------------------------------------

  public startListening(): void {

    if (!this.recognition) {
      return;
    }

    this.isListening = true;

    this.accumulatedTranscript = '';

    clearTimeout(this.silenceTimer);
    clearTimeout(this.restartTimer);

    try {

      this.recognition.start();

      console.log(
        'Voice recognition started'
      );

    } catch (error) {

      console.log(
        'Recognition already running'
      );
    }
  }

  // -----------------------------------------
  // STOP LISTENING
  // -----------------------------------------

  public stopListening(): void {

    this.isListening = false;

    clearTimeout(this.silenceTimer);
    clearTimeout(this.restartTimer);

    // Send any already captured final speech
    // before stopping recognition.

    this.finalizeSpeech();

    if (this.recognition) {

      try {

        this.recognition.stop();

      } catch (error) {

        console.log(
          'Recognition already stopped'
        );
      }
    }
  }
}