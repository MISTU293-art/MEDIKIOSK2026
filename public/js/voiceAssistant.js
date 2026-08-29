/**
 * MediKiosk Voice Assistant (Push-to-Talk & Multilingual Audio Prompts)
 */
class VoiceAssistant {
  constructor(options = {}) {
    this.lang = options.lang || 'en';
    this.onResult = options.onResult || null;
    this.recognition = null;
    this.isListening = false;
    this.synth = window.speechSynthesis || null;

    this.langCodes = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'bn': 'bn-IN'
    };

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser. Voice input fallback mode active.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = this.langCodes[this.lang] || 'en-IN';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStateChange) this.onStateChange(true);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      if (this.onResult) {
        this.onResult(transcript, confidence);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (this.onStateChange) this.onStateChange(false);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStateChange) this.onStateChange(false);
    };
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.lang = this.langCodes[this.lang] || 'en-IN';
        this.recognition.start();
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  speak(text) {
    if (!this.synth) return;
    this.synth.cancel(); // stop previous utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.langCodes[this.lang] || 'en-IN';
    utterance.rate = 0.95; // clear tempo for elderly/low-literacy patients
    this.synth.speak(utterance);
  }
}

window.VoiceAssistant = VoiceAssistant;
