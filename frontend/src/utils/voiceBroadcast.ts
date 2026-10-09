// Speech synthesis utility for automated institutional PA system announcements
// Supports both English and Hindi audio broadcasting

class VoiceBroadcastService {
  private isSpeaking = false;

  public speak(text: string, lang: 'en-IN' | 'hi-IN' = 'en-IN', onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this environment');
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95; // Slightly measured, authoritative PA pace
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    // Prefer Indian English or Hindi voice if available
    const preferredVoice = voices.find(v => v.lang.includes(lang.split('-')[0]) || v.lang.includes('IN'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.isSpeaking = true;

    utterance.onend = () => {
      this.isSpeaking = false;
      onEnd?.();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const voiceBroadcast = new VoiceBroadcastService();
