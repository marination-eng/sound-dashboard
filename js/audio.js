export class AudioEngine {
    constructor() {
        this.player = new Audio();
        this.objectURL = null;
        this.audioBuffer = null;
        this.context = new AudioContext();
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

    play() {
        return this.player.play();
    }

    pause() {
        this.player.pause();
    }

    setVolume(value) {
        this.player.volume = value / 100;
    }

    setSpeed(value) {
        this.player.playbackRate = value;
    }

    seek(value) {
        this.player.currentTime = value;
    }

    get currentTime() {
        return this.player.currentTime;
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
    }
}
