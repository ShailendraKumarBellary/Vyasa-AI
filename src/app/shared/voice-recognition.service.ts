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
  private readonly SILENCE_TIMEOUT = 3500; // Adjusted for longer pauses during long answers

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
      // Reset timer on every incoming audio frame/chunk
      clearTimeout(this.silenceTimer); 
 
      let currentFinal = '';
      let currentInterim = ''; 
 
      for (let i = event.resultIndex; i < event.results.length; ++i) { 
        if (event.results[i].isFinal) { 
          currentFinal += event.results[i][0].transcript + ' '; 
        } else { 
          currentInterim += event.results[i][0].transcript; 
        } 
      } 

      // Safely append final results to the running buffer
      this.accumulatedTranscript += currentFinal;
 
      // Wait for prolonged silence before finalizing total output
      this.silenceTimer = setTimeout(() => { 
        const fullSentence = (this.accumulatedTranscript + currentInterim).trim(); 
         
        if (fullSentence.length > 0) { 
          this.zone.run(() => { 
            this.speechResultSubject.next(fullSentence); 
            this.accumulatedTranscript = ''; // Reset state for next turn 
          }); 
        } 
      }, this.SILENCE_TIMEOUT);  
    }; 
 
    this.recognition.onerror = (event: any) => { 
      console.error('Speech recognition error:', event.error); 

      // Prevent non-fatal browser auto-disconnects from dropping speech mid-sentence
      if (event.error === 'no-speech' || event.error === 'network') {
        return;
      }

      clearTimeout(this.silenceTimer); 
    }; 
 
    this.recognition.onend = () => { 
      clearTimeout(this.silenceTimer); 
      // Automatically restart engine if user did not explicitly stop listening
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