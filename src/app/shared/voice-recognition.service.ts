import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
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

    // Keep listening while the user is speaking.
    this.recognition.continuous = true;

    // We need interim results so the browser can recognize speech
    // while the user is still speaking.
    this.recognition.interimResults = true;

    this.recognition.maxAlternatives = 1;

    /**
     * Speech started
     */
    this.recognition.onspeechstart = () => {
      console.log('Speech started');

      // User is speaking again, so cancel the pending silence timer.
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;

      this.zone.run(() => {
        this.speechStartSubject.next();
      });
    };

    /**
     * Speech result
     */
    this.recognition.onresult = (event: any) => {
      console.log('Speech result event');

      // New speech has arrived, so reset the silence timer.
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;

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

        /**
         * IMPORTANT:
         *
         * Only store FINAL results.
         *
         * Interim results repeatedly change:
         *
         * "5"
         * "5 4"
         * "5 4 years"
         * "5 4 years experience"
         *
         * Therefore we must NOT append interim results.
         */
        if (result.isFinal) {
          newFinalText += transcript + ' ';
        }
      }

      /**
       * Add only newly finalized speech to our buffer.
       */
      if (newFinalText.trim()) {
        this.accumulatedTranscript += newFinalText;

        console.log(
          'Accumulated:',
          this.accumulatedTranscript
        );
      }

      /**
       * Wait until the user has been silent for 3.5 seconds.
       *
       * If another result arrives before 3.5 seconds,
       * the timer above is cleared and restarted.
       */
      this.silenceTimer = setTimeout(() => {
        this.finalizeSpeech();
      }, this.SILENCE_TIMEOUT);
    };

    /**
     * Recognition error
     */
    this.recognition.onerror = (event: any) => {
      console.warn(
        'Speech recognition error:',
        event.error
      );

      /**
       * These errors are usually recoverable.
       *
       * We don't want to destroy the current listening session
       * just because Chrome temporarily stopped recognition.
       */
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

      /**
       * For other errors, stop the pending silence timer.
       */
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    };

    /**
     * Recognition ended
     *
     * Chrome can automatically end a SpeechRecognition session
     * even when continuous=true.
     *
     * Therefore, if the application still wants to listen,
     * restart recognition.
     */
    this.recognition.onend = () => {
      console.log(
        'Speech recognition ended.'
      );

      /**
       * IMPORTANT:
       *
       * Do NOT clear silenceTimer here.
       *
       * There may still be finalized speech waiting to be
       * submitted after the silence period.
       */

      if (!this.isListening) {
        return;
      }

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
          /**
           * Chrome throws an exception if start() is called
           * while recognition is already running.
           *
           * This is harmless.
           */
          console.log(
            'Recognition restart skipped:',
            error
          );
        }
      }, 300);
    };
  }

  /**
   * Finalize the current speech.
   */
  private finalizeSpeech(): void {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;

    const text =
      this.accumulatedTranscript.trim();

    if (!text) {
      return;
    }

    console.log(
      'Final speech:',
      text
    );

    /**
     * IMPORTANT:
     *
     * Clear the buffer BEFORE notifying subscribers.
     *
     * This prevents recursive calls from seeing the same
     * transcript again.
     */
    this.accumulatedTranscript = '';

    this.zone.run(() => {
      this.speechResultSubject.next(text);
    });
  }

  /**
   * Start listening.
   */
  public startListening(): void {
    if (!this.recognition) {
      console.error(
        'Speech recognition is not initialized.'
      );
      return;
    }

    this.isListening = true;

    /**
     * A new user response starts with a clean buffer.
     */
    this.accumulatedTranscript = '';

    clearTimeout(this.silenceTimer);
    clearTimeout(this.restartTimer);

    this.silenceTimer = null;
    this.restartTimer = null;

    try {
      this.recognition.start();

      console.log(
        'Voice recognition started'
      );
    } catch (error) {
      /**
       * Recognition may already be running.
       */
      console.log(
        'Recognition already running'
      );
    }
  }

  /**
   * Stop listening.
   *
   * IMPORTANT:
   * Do NOT call finalizeSpeech() here.
   *
   * The speech result should already have been finalized
   * by the silence timer.
   */
  public stopListening(): void {
    this.isListening = false;

    clearTimeout(this.silenceTimer);
    clearTimeout(this.restartTimer);

    this.silenceTimer = null;
    this.restartTimer = null;

    /**
     * Discard anything unfinished.
     */
    this.accumulatedTranscript = '';

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