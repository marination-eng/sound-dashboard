
export class AudioEngine {
    constructor() {
        this.player = new Audio();
        this.player.preload = "auto";

        this.objectURL = null;
        this.audioBuffer = null;

        this.context = new AudioContext();

        // Audio processing chain
        this.source = this.context.createMediaElementSource(this.player);

        this.bassFilter = this.context.createBiquadFilter();
        this.bassFilter.type = "lowshelf";
        this.bassFilter.frequency.value = 200;

        this.midFilter = this.context.createBiquadFilter();
        this.midFilter.type = "peaking";
        this.midFilter.frequency.value = 1000;
        this.midFilter.Q.value = 1;

        this.trebleFilter = this.context.createBiquadFilter();
        this.trebleFilter.type = "highshelf";
        this.trebleFilter.frequency.value = 4000;

        this.source.connect(this.bassFilter);
        this.bassFilter.connect(this.midFilter);
        this.midFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.context.destination);
    }

    async load(file) {
        if (this.objectURL) {
            URL.revokeObjectURL(this.objectURL);
        }

        this.player.pause();

        this.objectURL = URL.createObjectURL(file);
        this.player.src = this.objectURL;

        const arrayBuffer = await file.arrayBuffer();

        this.audioBuffer = await this.context.decodeAudioData(
            arrayBuffer.slice(0)
        );

        return this.audioBuffer;
    }

    async play() {
        if (this.context.state === "suspended") {
            await this.context.resume();
        }

        return this.player.play();
    }

    pause() {
        this.player.pause();
    }

    setVolume(value) {
        this.player.volume = Math.max(0, Math.min(1, value));
    }

    setSpeed(value) {
        this.player.playbackRate = value;
    }

    seek(value) {
        this.player.currentTime = value;
    }

    setEqualizer(bass, mid, treble) {
        this.bassFilter.gain.value = bass;
        this.midFilter.gain.value = mid;
        this.trebleFilter.gain.value = treble;
    }

    resetEqualizer() {
        this.setEqualizer(0, 0, 0);
    }

    get currentTime() {
        return this.player.currentTime || 0;
    }

    get duration() {
        return this.player.duration || 0;
    }

    get isPlaying() {
        return !this.player.paused;
    }

    destroy() {
        this.player.pause();
        this.player.removeAttribute("src");
        this.player.load();

        if (this.objectURL) {
            URL.revokeObjectURL(this.objectURL);
            this.objectURL = null;
        }

        this.audioBuffer = null;
        this.resetEqualizer();
    }
}
