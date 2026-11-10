// Jingle Bells' public-domain melody, synthesized locally: no recordings or customer uploads.
const MELODY: [number, number][] = [
  [76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],
  [77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[76,1],[74,1],[74,1],[76,1],[74,2],[79,2],
  [76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],
  [77,1],[77,1],[77,1],[77,1],[77,1],[76,1],[76,1],[76,.5],[76,.5],[79,1],[79,1],[77,1],[74,1],[72,4],
];

export function magicFlight(random = Math.random) {
  const reverse = random() > 0.5;
  return {
    fromX: reverse ? 120 : -45,
    toX: reverse ? -45 : 120,
    fromY: 12 + random() * 65,
    toY: 12 + random() * 65,
    reverse,
    duration: 2600 + random() * 900,
  };
}

export const SANTA_GREETINGS = [
  "Merry Christmas!",
  "Hohohoho!",
  "MERRY CHRISTMAS and a Happy new year!",
] as const;

const GREETING_PARTS = [
  ["Merry", "Christmas!"],
  ["Ho", "ho", "ho", "ho!"],
  ["Merry", "Christmas", "and a", "Happy", "new year!"],
];

export function santaGreeting(random = Math.random) {
  const index = Math.min(2, Math.max(0, Math.floor(random() * 3)));
  return { text: SANTA_GREETINGS[index], parts: GREETING_PARTS[index] ?? [] };
}

export function createSantaGreetingShuffle(random = Math.random) {
  let remaining: number[] = [];
  let previous: number | undefined;
  return () => {
    if (remaining.length === 0) remaining = [0, 1, 2];
    const candidates = remaining.filter(index => index !== previous);
    const pick = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
    const index = candidates[pick] ?? remaining[0] ?? 0;
    remaining = remaining.filter(value => value !== index);
    previous = index;
    return { text: SANTA_GREETINGS[index], parts: GREETING_PARTS[index] ?? [] };
  };
}

// Approach the screen's center, then recede; never exceed device volume.
export function santaVolume(progress: number) {
  const proximity = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
  return 0.25 + 0.75 * proximity * proximity;
}

export class ChristmasSound {
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private greetingTimer: ReturnType<typeof setTimeout> | undefined;
  private nextGreeting = createSantaGreetingShuffle();

  async start() {
    this.stop();
    const generation = this.generation;
    const context = new AudioContext();
    this.context = context;
    await context.resume();
    if (this.generation !== generation || context.state !== "running") { this.stop(); return false; }
    const phrase = () => {
      if (this.generation !== generation || context.state !== "running") return;
      let time = context.currentTime + 0.04;
      for (const [note, beats] of MELODY) {
        const duration = beats * 0.21;
        for (const harmonic of [1, 2.76]) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 440 * Math.pow(2, (note - 69) / 12) * harmonic;
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(harmonic === 1 ? 0.045 : 0.012, time + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(duration, 0.3));
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(time); oscillator.stop(time + Math.max(duration, 0.3) + 0.05);
        }
        time += duration;
      }
      this.timer = setTimeout(phrase, (time - context.currentTime) * 1000);
    };
    phrase();
    return true;
  }

  greet(duration: number) {
    if (!this.context || this.context.state !== "running" || !("speechSynthesis" in window)) return;
    clearTimeout(this.greetingTimer);
    window.speechSynthesis.cancel();
    const generation = this.generation;
    const greeting = this.nextGreeting();
    const started = performance.now();
    const available = window.speechSynthesis.getVoices();
    const selected = available.find(v => /david|george|daniel|male/i.test(v.name)) ?? available.find(v => v.lang.startsWith("en")) ?? null;
    // Engines ignore volume changes during an utterance. Short connected phrases
    // let each spoken part use Santa's current distance without restarting speech.
    const speakPart = (index: number) => {
      const text = greeting.parts[index];
      if (!text || generation !== this.generation || document.hidden || this.context?.state !== "running") return;
      const voice = new SpeechSynthesisUtterance(text);
      voice.lang = "en-US"; voice.pitch = 0.65; voice.rate = 1.25;
      voice.volume = santaVolume((performance.now() - started) / duration);
      voice.voice = selected;
      voice.onend = () => speakPart(index + 1);
      window.speechSynthesis.speak(voice);
    };
    this.greetingTimer = setTimeout(() => speakPart(0), duration * 0.12);
  }

  stop() {
    this.generation++;
    clearTimeout(this.timer);
    clearTimeout(this.greetingTimer);
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }
}