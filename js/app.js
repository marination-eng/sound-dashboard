
import { AudioEngine } from "./audio.js";
import {
    drawWaveform,
    drawSpectrogram
} from "./visualizer.js";
import { formatTime } from "./tools.js";
import { initAudioConverter } from "./converter.js";

const audio = new AudioEngine();

const $ = id => document.getElementById(id);

const fileInput = $("audioUpload");
const uploadBox = $("uploadBox");
const workspace = $("audioWorkspace");
const playButton = $("playButton");
const timeline = $("timeline");
const volume = $("volume");
const speed = $("speed");
const waveform = $("waveform");
const spectrogram = $("spectrogram");

let animationFrame = null;

function updateInterface() {
    $("currentTime").textContent = formatTime(audio.currentTime);
    $("duration").textContent = formatTime(audio.duration);

    timeline.value = audio.duration
        ? (audio.currentTime / audio.duration) * 100
        : 0;

    playButton.textContent = audio.isPlaying ? "Ⅱ Pause" : "▶ Play";

    $("playbackStatus").textContent =
        audio.isPlaying ? "Playing" : "Ready to play";

    if (audio.audioBuffer) {
        drawWaveform(
            waveform,
            audio.audioBuffer,
            audio.duration
                ? audio.currentTime / audio.duration
                : 0
        );
    }

    if (audio.isPlaying) {
        animationFrame = requestAnimationFrame(updateInterface);
    }
}

async function loadFile(file) {
    if (!file || !file.type.startsWith("audio/")) {
        alert("Please select a valid audio file.");
        return;
    }

    try {
        cancelAnimationFrame(animationFrame);

        $("playbackStatus").textContent = "Analyzing audio...";

        await audio.load(file);

        $("fileName").textContent = file.name;

        uploadBox.hidden = true;
        workspace.hidden = false;

        drawWaveform(waveform, audio.audioBuffer);
        drawSpectrogram(spectrogram, audio.audioBuffer);

        updateInterface();

    } catch (error) {
        console.error(error);
        $("playbackStatus").textContent = "Could not load audio";
        alert("Could not load this audio file. Try another format.");
    }
}

fileInput.addEventListener("change", event => {
    loadFile(event.target.files[0]);
});

uploadBox.addEventListener("dragover", event => {
    event.preventDefault();
    uploadBox.classList.add("dragging");
});

uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("dragging");
});

uploadBox.addEventListener("drop", event => {
    event.preventDefault();
    uploadBox.classList.remove("dragging");

    loadFile(event.dataTransfer.files[0]);
});

playButton.addEventListener("click", async () => {
    if (!audio.audioBuffer) return;

    try {
        if (audio.isPlaying) {
            audio.pause();
            cancelAnimationFrame(animationFrame);
            updateInterface();
        } else {
            if (audio.currentTime >= audio.duration) {
                audio.seek(0);
            }

            await audio.play();
            updateInterface();
        }
    } catch (error) {
        console.error(error);
        $("playbackStatus").textContent = "Playback failed";
    }
});

audio.player.addEventListener("ended", () => {
    cancelAnimationFrame(animationFrame);
    updateInterface();
});

timeline.addEventListener("input", () => {
    if (!audio.duration) return;

    audio.seek(
        Number(timeline.value) / 100 * audio.duration
    );

    updateInterface();
});

volume.addEventListener("input", () => {
    audio.setVolume(Number(volume.value));

    $("volumeValue").textContent =
        `${Math.round(Number(volume.value) * 100)}%`;
});

speed.addEventListener("change", () => {
    audio.setSpeed(Number(speed.value));
});

function updateEqualizer() {
    const bass = Number($("bass").value);
    const mid = Number($("mid").value);
    const treble = Number($("treble").value);

    audio.setEqualizer(bass, mid, treble);

    $("bassValue").textContent = `${bass} dB`;
    $("midValue").textContent = `${mid} dB`;
    $("trebleValue").textContent = `${treble} dB`;
}

["bass", "mid", "treble"].forEach(id => {
    $(id).addEventListener("input", updateEqualizer);
});

$("resetEqualizer").addEventListener("click", () => {
    $("bass").value = 0;
    $("mid").value = 0;
    $("treble").value = 0;

    updateEqualizer();
});

$("removeAudio").addEventListener("click", () => {
    cancelAnimationFrame(animationFrame);

    audio.destroy();

    workspace.hidden = true;
    uploadBox.hidden = false;

    fileInput.value = "";

    timeline.value = 0;
    $("currentTime").textContent = "00:00";
    $("duration").textContent = "00:00";
    $("playbackStatus").textContent = "Ready to play";

    waveform.getContext("2d").clearRect(
        0, 0, waveform.width, waveform.height
    );

    spectrogram.getContext("2d").clearRect(
        0, 0, spectrogram.width, spectrogram.height
    );

    $("bass").value = 0;
    $("mid").value = 0;
    $("treble").value = 0;

    updateEqualizer();
});

window.addEventListener("resize", () => {
    if (audio.audioBuffer) {
        drawWaveform(
            waveform,
            audio.audioBuffer,
            audio.duration
                ? audio.currentTime / audio.duration
                : 0
        );
    }
});
