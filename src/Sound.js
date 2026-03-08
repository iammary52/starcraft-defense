/**
 * Sound.js – Web Audio API 기반 사운드 시스템
 * 외부 오디오 파일 없이 프로그래밍 방식으로 효과음과 배경음악을 생성합니다.
 */
export class SoundSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.musicEnabled = true;
        this.sfxEnabled = true;
        this._musicTimeout = null;

        // 발사음 스로틀링 (타입별 마지막 재생 시각)
        this._lastShootTime = {};
        this._shootCooldown = 120; // ms
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.28;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.55;
            this.sfxGain.connect(this.masterGain);

            return true;
        } catch (e) {
            console.warn('Web Audio API를 지원하지 않습니다.');
            return false;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /* ─── 기본 오실레이터 헬퍼 ─── */
    _osc(freq, type, startTime, duration, gain, target = 'sfx') {
        if (!this.ctx) return;
        const gainNode = target === 'sfx' ? this.sfxGain : this.musicGain;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g);
        g.connect(gainNode);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        g.gain.setValueAtTime(gain, startTime);
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    /* 화이트노이즈 버퍼 헬퍼 */
    _noise(duration, filterFreq, filterType, gain, startDelay = 0, target = 'sfx') {
        if (!this.ctx) return;
        const sampleRate = this.ctx.sampleRate;
        const bufSize = Math.ceil(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.4));
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterFreq;
        const g = this.ctx.createGain();
        g.gain.value = gain;
        src.connect(filter);
        filter.connect(g);
        const dest = target === 'sfx' ? this.sfxGain : this.musicGain;
        g.connect(dest);
        src.start(this.ctx.currentTime + startDelay);
    }

    /* ─── 스로틀 발사음 ─── */
    _shootThrottle(type) {
        const now = Date.now();
        if (this._lastShootTime[type] && now - this._lastShootTime[type] < this._shootCooldown) {
            return false;
        }
        this._lastShootTime[type] = now;
        return true;
    }

    /* ─── 효과음 ─── */

    // 마린 – 빠른 총성
    playMarineShoot() {
        if (!this.ctx || !this.sfxEnabled || !this._shootThrottle('marine')) return;
        const t = this.ctx.currentTime;
        this._osc(900, 'square', t, 0.06, 0.35);
        this._osc(650, 'square', t + 0.03, 0.05, 0.2);
    }

    // 파이어뱃 – 화염 분사음
    playFirebatShoot() {
        if (!this.ctx || !this.sfxEnabled || !this._shootThrottle('firebat')) return;
        this._noise(0.18, 500, 'bandpass', 0.5);
        const t = this.ctx.currentTime;
        this._osc(120, 'sawtooth', t, 0.18, 0.25);
    }

    // 고스트 – 저격 크랙
    playGhostShoot() {
        if (!this.ctx || !this.sfxEnabled || !this._shootThrottle('ghost')) return;
        const t = this.ctx.currentTime;
        this._osc(1400, 'sawtooth', t, 0.04, 0.5);
        this._osc(350, 'sawtooth', t + 0.02, 0.08, 0.3);
    }

    // 탱크 – 대포 폭발
    playTankShoot() {
        if (!this.ctx || !this.sfxEnabled || !this._shootThrottle('tank')) return;
        this._noise(0.55, 80, 'lowpass', 1.0);
        const t = this.ctx.currentTime;
        this._osc(60, 'sine', t, 0.4, 0.8);
        this._osc(40, 'sine', t + 0.05, 0.35, 0.6);
    }

    // 미사일 터렛 – 미사일 발사
    playTurretShoot() {
        if (!this.ctx || !this.sfxEnabled || !this._shootThrottle('turret')) return;
        const t = this.ctx.currentTime;
        this._osc(950, 'sawtooth', t, 0.07, 0.4);
        this._osc(700, 'sawtooth', t + 0.04, 0.09, 0.3);
        this._noise(0.1, 1200, 'highpass', 0.3, 0.01);
    }

    // 적 사망
    playEnemyDeath() {
        if (!this.ctx || !this.sfxEnabled) return;
        this._noise(0.22, 900, 'bandpass', 0.4);
        const t = this.ctx.currentTime;
        this._osc(200, 'sawtooth', t, 0.15, 0.3);
    }

    // 적 탈출 – 경고음
    playAlert() {
        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        this._osc(880, 'square', t, 0.1, 0.6);
        this._osc(660, 'square', t + 0.13, 0.1, 0.5);
        this._osc(880, 'square', t + 0.26, 0.14, 0.6);
    }

    // 웨이브 시작 – 군용 팡파르
    playWaveStart() {
        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        this._osc(330, 'sawtooth', t, 0.14, 0.4);
        this._osc(440, 'sawtooth', t + 0.15, 0.14, 0.45);
        this._osc(550, 'sawtooth', t + 0.30, 0.18, 0.5);
    }

    // 웨이브 클리어 – 승리 팡파르
    playWaveComplete() {
        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        [523, 659, 784, 1047].forEach((f, i) => {
            this._osc(f, 'sine', t + i * 0.15, 0.2, 0.55);
        });
    }

    // 타워 건설
    playBuild() {
        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        this._osc(440, 'square', t, 0.07, 0.3);
        this._osc(550, 'square', t + 0.08, 0.07, 0.3);
        this._osc(660, 'square', t + 0.16, 0.1, 0.4);
    }

    // 업그레이드 – 상승 아르페지오
    playUpgrade() {
        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        [440, 660, 880, 1320].forEach((f, i) => {
            this._osc(f, 'sine', t + i * 0.09, 0.12, 0.5);
        });
    }

    // 판매 – 하강음
    playSell() {
        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        this._osc(660, 'square', t, 0.09, 0.35);
        this._osc(440, 'square', t + 0.1, 0.12, 0.35);
    }

    // 게임 오버 – 비장한 하강
    playGameOver() {
        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        [440, 330, 220, 110].forEach((f, i) => {
            this._osc(f, 'sawtooth', t + i * 0.32, 0.4, 0.6);
        });
        this._noise(1.5, 150, 'lowpass', 0.4, 0.1);
    }

    /* ─── 배경 음악 (군용 전자 비트) ─── */
    startMusic() {
        if (!this.ctx || !this.musicEnabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this._scheduleMusicLoop();
    }

    stopMusic() {
        if (this._musicTimeout) {
            clearTimeout(this._musicTimeout);
            this._musicTimeout = null;
        }
    }

    _scheduleMusicLoop() {
        if (!this.ctx || !this.musicEnabled) return;

        const bpm = 128;
        const beat = 60 / bpm;
        const bars = 8;
        const loopDur = beat * 4 * bars; // 8 bars

        this._playMusicLoop(beat);

        this._musicTimeout = setTimeout(() => {
            this._scheduleMusicLoop();
        }, (loopDur - 0.05) * 1000);
    }

    _playMusicLoop(beat) {
        if (!this.ctx) return;

        // ─ 베이스라인 (E2 계열 군용 느낌) ─
        const bassSeq = [
            82, 82, 0, 82, 98, 0, 82, 0,
            82, 82, 0, 110, 98, 0, 82, 0,
            82, 82, 0, 82, 98, 0, 82, 0,
            82, 82, 0, 110, 123, 0, 98, 0,
        ];
        bassSeq.forEach((f, i) => {
            if (f === 0) return;
            this._oscMusic(f * 0.5, 'sawtooth', beat * i * 0.5, beat * 0.42, 0.22, [80, 'lowpass']);
        });

        // ─ 리드 멜로디 (군용 팡파르 느낌) ─
        const melody = [
            659, 0, 784, 0, 659, 523, 0, 659,
            784, 0, 1047, 0, 784, 0, 659, 523,
            659, 0, 784, 0, 880, 784, 0, 659,
            784, 0, 659, 523, 659, 0, 784, 0,
        ];
        melody.forEach((f, i) => {
            if (f === 0) return;
            this._oscMusic(f, 'square', beat * i * 0.5, beat * 0.28, 0.12, [2000, 'lowpass']);
        });

        // ─ 패드 화음 ─
        const chords = [
            [164, 196, 247], [164, 196, 247], [174, 220, 261], [174, 220, 261],
            [164, 196, 247], [164, 196, 247], [196, 247, 294], [164, 196, 247],
        ];
        chords.forEach((chord, bar) => {
            chord.forEach(f => {
                this._oscMusic(f, 'sine', beat * bar * 4, beat * 3.8, 0.08, [500, 'lowpass']);
            });
        });

        // ─ 드럼 ─
        for (let i = 0; i < 32; i++) {
            const t = this.ctx.currentTime + beat * i * 0.5;
            if (i % 8 === 0) this._drumBeat(t, 60, 0.18, 0.25);       // kick
            if (i % 8 === 4) this._drumBeat(t, 200, 0.08, 0.12);      // snare
            if (i % 2 === 1) this._drumBeat(t, 8000, 0.025, 0.06);    // hihat
        }
    }

    _oscMusic(freq, type, delayS, dur, gain, [filterFreq, filterType] = []) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + delayS;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        let lastNode = osc;
        if (filterFreq) {
            const f = this.ctx.createBiquadFilter();
            f.type = filterType;
            f.frequency.value = filterFreq;
            osc.connect(f);
            lastNode = f;
        } else {
            osc.connect(g);
        }
        if (filterFreq) lastNode.connect(g);
        g.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + dur + 0.01);
    }

    _drumBeat(startTime, filterFreq, gain, duration) {
        if (!this.ctx) return;
        const sampleRate = this.ctx.sampleRate;
        const bufSize = Math.ceil(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufSize, sampleRate);
        const data = buffer.getChannelData(0);
        const tau = bufSize * (filterFreq < 500 ? 0.3 : 0.07);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / tau);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterFreq < 500 ? 'lowpass' : 'highpass';
        filter.frequency.value = filterFreq;
        const g = this.ctx.createGain();
        g.gain.value = gain;
        src.connect(filter);
        filter.connect(g);
        g.connect(this.musicGain);
        src.start(startTime);
    }

    /* ─── 토글 ─── */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
        return this.musicEnabled;
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }
}

export const Sound = new SoundSystem();
