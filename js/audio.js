/**
 * js/audio.js — Motor de audio sintetizado con Web Audio API (efectos de sonido procedurales y música ambiental persa generativa).
 * Issue #9 — Audio | Rama: feature/audio
 */

const STORAGE_MUTE_KEY = 'la_mazmorra_del_tiempo_muted';
const STORAGE_VOL_KEY  = 'la_mazmorra_del_tiempo_volume';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.isMuted = this._loadMute();
    this.volume = this._loadVolume();
    this.initialized = false;

    // Control de voces simultáneas
    this.activeVoices = 0;
    this.maxVoices = 16;

    // Estado del sintetizador de música ambiental
    this.musicActive = false;
    this.musicTimer = null;
    this.droneNodes = [];
    this.currentLevelRoot = 146.83; // Nota D3
  }

  _loadMute() {
    try {
      return localStorage.getItem(STORAGE_MUTE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  _loadVolume() {
    try {
      const v = localStorage.getItem(STORAGE_VOL_KEY);
      return v !== null ? parseFloat(v) : 0.8;
    } catch {
      return 0.8;
    }
  }

  _saveMute() {
    try {
      localStorage.setItem(STORAGE_MUTE_KEY, this.isMuted ? 'true' : 'false');
    } catch {}
  }

  _saveVolume() {
    try {
      localStorage.setItem(STORAGE_VOL_KEY, this.volume.toString());
    } catch {}
  }

  /**
   * Inicializa el AudioContext tras la primera interacción del usuario.
   */
  init() {
    if (this.initialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[audio] Web Audio API no soportada en este entorno.');
      return;
    }

    try {
      this.ctx = new AudioContextClass();

      // Compresor maestro para prevenir saturación / distorsión
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Ganancia maestra
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // Bus de música
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Bus de efectos
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;

      // Iniciar música ambiental
      this.startAmbientMusic();
    } catch (e) {
      console.warn('[audio] No se pudo inicializar AudioContext:', e);
    }
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this._saveMute();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // ─── EFECTOS DE SONIDO PROCEDURALES (SFX) ──────────────────────────────────
  playSFX(name) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.activeVoices >= this.maxVoices) return;

    try {
      switch (name) {
        case 'jump':       this._sfxJump(); break;
        case 'land':       this._sfxLand(); break;
        case 'step':       this._sfxStep(); break;
        case 'grab':       this._sfxGrab(); break;
        case 'hurt':       this._sfxHurt(); break;
        case 'death':      this._sfxDeath(); break;
        case 'spike':      this._sfxSpike(); break;
        case 'collect':    this._sfxCollect(); break;
        case 'door':       this._sfxDoor(); break;
        case 'checkpoint': this._sfxCheckpoint(); break;
        case 'trap-warn':  this._sfxTrapWarn(); break;
        case 'collapse':   this._sfxCollapse(); break;
        case 'blade':      this._sfxBlade(); break;
        case 'plate':      this._sfxPlate(); break;
        case 'victory':    this._sfxVictory(); break;
        case 'gameover':   this._sfxGameOver(); break;
        default:           break;
      }
    } catch (err) {
      // Degradar silenciosamente si falla algún nodo
    }
  }

  _trackVoice(durationMs) {
    this.activeVoices++;
    setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, durationMs);
  }

  _sfxJump() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.16);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
    this._trackVoice(200);
  }

  _sfxLand() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
    this._trackVoice(160);
  }

  _sfxStep() {
    const t = this.ctx.currentTime;
    const noise = this._createNoiseBuffer(0.04);
    if (!noise) return;

    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
    this._trackVoice(50);
  }

  _sfxGrab() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
    this._trackVoice(130);
  }

  _sfxHurt() {
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, t);
    osc1.frequency.exponentialRampToValueAtTime(70, t + 0.25);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(233, t); // Disonante
    osc2.frequency.exponentialRampToValueAtTime(85, t + 0.25);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.27);
    osc2.stop(t + 0.27);
    this._trackVoice(270);
  }

  _sfxDeath() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.8);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.9);
    this._trackVoice(900);
  }

  _sfxSpike() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.17);
    this._trackVoice(170);
  }

  _sfxCollect() {
    // Arpegio brillante pentatónico en escala del desierto
    const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, idx) => {
      const delay = idx * 0.055;
      const t = this.ctx.currentTime + delay;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.26);
    });
    this._trackVoice(350);
  }

  _sfxDoor() {
    const t = this.ctx.currentTime;
    const noise = this._createNoiseBuffer(0.6);
    if (!noise) return;

    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(700, t + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.6);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
    this._trackVoice(600);
  }

  _sfxCheckpoint() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.42);
    this._trackVoice(420);
  }

  _sfxTrapWarn() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(160, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.23);
    this._trackVoice(230);
  }

  _sfxCollapse() {
    const t = this.ctx.currentTime;
    const noise = this._createNoiseBuffer(0.5);
    if (!noise) return;

    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
    this._trackVoice(500);
  }

  _sfxBlade() {
    const t = this.ctx.currentTime;
    const noise = this._createNoiseBuffer(0.25);
    if (!noise) return;

    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
    this._trackVoice(250);
  }

  _sfxPlate() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
    this._trackVoice(100);
  }

  _sfxVictory() {
    // Fanfarria persa majestuosa
    const chord = [293.66, 369.99, 440.00, 587.33]; // Re mayor
    chord.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 1.3);
    });
    this._trackVoice(1500);
  }

  _sfxGameOver() {
    const chord = [220.00, 207.65, 196.00, 146.83]; // Descenso triste
    chord.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.75);
    });
    this._trackVoice(1800);
  }

  _createNoiseBuffer(duration) {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ─── MÚSICA AMBIENTAL GENERATIVA PERSA ─────────────────────────────────────
  /**
   * Genera un dron continuo místico con arpegios y laúd sintetizados en escala frigia dominante (Maqam Hijaz).
   */
  startAmbientMusic() {
    if (this.musicActive || !this.ctx) return;
    this.musicActive = true;

    // 1. Dron grave continuo (sawtooth filtrado + onda senoidal cálida)
    const t = this.ctx.currentTime;

    const droneOsc = this.ctx.createOscillator();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.setValueAtTime(73.42, t); // D2

    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(180, t);

    const droneSub = this.ctx.createOscillator();
    droneSub.type = 'sine';
    droneSub.frequency.setValueAtTime(73.42, t);

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.18, t);

    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneSub.connect(droneGain);
    droneGain.connect(this.musicGain);

    droneOsc.start();
    droneSub.start();

    this.droneNodes = [droneOsc, droneSub, droneGain, droneFilter];

    // 2. Línea melódica y percusión generativa mediante temporizador
    const hijazScale = [
      146.83, // D3
      155.56, // Eb3 (segunda menor)
      185.00, // F#3 (tercera mayor - segunda aumentada)
      196.00, // G3
      220.00, // A3
      233.08, // Bb3
      261.63, // C4
      293.66, // D4
      311.13, // Eb4
      369.99, // F#4
      440.00, // A4
    ];

    let beat = 0;
    this.musicTimer = setInterval(() => {
      if (!this.musicActive || !this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      beat++;

      // Percusión suave tipo tombak / darbouka en cada compás
      if (beat % 2 === 0) {
        this._playDarbouka(now, beat % 4 === 0 ? 'dum' : 'tek');
      }

      // Melodía tipo laúd / santur cada 3-4 pulsos
      if (Math.random() < 0.65) {
        const note = hijazScale[Math.floor(Math.random() * hijazScale.length)];
        this._playPluck(now, note);
      }
    }, 380); // ~158 BPM pulso suave
  }

  _playDarbouka(t, type = 'dum') {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'dum') {
      // Golpe grave profundo
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
    } else {
      // Golpe seco agudo
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    }

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  _playPluck(t, freq) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.4);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  setLevelTheme(levelId) {
    // Ajuste de tono según el nivel
    if (levelId === 1) this.currentLevelRoot = 146.83; // D
    if (levelId === 2) this.currentLevelRoot = 196.00; // G
    if (levelId === 3) this.currentLevelRoot = 130.81; // C (más oscuro)
  }

  stopAmbientMusic() {
    this.musicActive = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    for (const node of this.droneNodes) {
      try {
        if (typeof node.stop === 'function') node.stop();
        node.disconnect();
      } catch {}
    }
    this.droneNodes = [];
  }
}

export const audio = new AudioManager();
