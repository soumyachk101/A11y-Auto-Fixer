/**
 * Screen-reader simulation voice (Docs/03 §6): Web Speech API with word-boundary
 * callbacks so captions can highlight word-by-word as they're announced.
 * Audio is an enhancement — captions always render as text.
 */

export interface SpeakHandle {
  cancel: () => void;
}

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(
  text: string,
  callbacks: {
    onWord?: (charIndex: number) => void;
    onEnd?: () => void;
  },
): SpeakHandle {
  if (!speechAvailable()) {
    callbacks.onEnd?.();
    return { cancel: () => {} };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1;

  utterance.onboundary = (event) => {
    if (event.name === "word") callbacks.onWord?.(event.charIndex);
  };
  utterance.onend = () => callbacks.onEnd?.();
  utterance.onerror = () => callbacks.onEnd?.();

  window.speechSynthesis.speak(utterance);

  return {
    cancel: () => {
      window.speechSynthesis.cancel();
      callbacks.onEnd?.();
    },
  };
}
