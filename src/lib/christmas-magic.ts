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

export class ChristmasSound {
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;

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

  laugh() {
    if (!this.context || this.context.state !== "running" || !("speechSynthesis" in window)) return;
    if (window.speechSynthesis.speaking) return;
    const voice = new SpeechSynthesisUtterance("Ho, ho, ho!");
    voice.lang = "en-US"; voice.pitch = 0.65; voice.rate = 0.8; voice.volume = 0.65;
    const available = window.speechSynthesis.getVoices();
    voice.voice = available.find(v => /david|george|daniel|male/i.test(v.name)) ?? available.find(v => v.lang.startsWith("en")) ?? null;
    window.speechSynthesis.speak(voice);
  }

  stop() {
    this.generation++;
    clearTimeout(this.timer);
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }
}