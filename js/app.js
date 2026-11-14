
import { AudioEngine } from "./audio.js";
import { drawWaveform } from "./visualizer.js";
import { formatTime } from "./tools.js";

const audio = new AudioEngine();

const $ = (id) => document.getElementById(id);

const fileInput = $("audioFile");
const uploadBox = document.querySelector(".upload-box");
const workspace = $("workspace");
const playButton = $("playButton");
const seek = $("seek");
const volume = $("volume");
const speed = $("speed");
const canvas = $("waveform");

let animationFrame;
let audioFileName = "";

function updateInterface() {
    $("currentTime").textContent = formatTime(audio.currentTime);
    $("duration").textContent = formatTime(audio.duration);

    seek.value = audio.duration
        ? (audio.currentTime / audio.duration) * 100
        : 0;

    playButton.textContent = audio.isPlaying ? "Ⅱ" : "▶";

    $("playbackStatus").textContent =
        audio.isPlaying ? "Playing" : "Ready to play";

    if (audio.audioBuffer) {
        drawWaveform(
            canvas,
            audio.audioBuffer,
            audio.duration ? audio.currentTime / audio.duration : 0
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
        audioFileName = file.name;
        await audio.load(file);

        $("fileName").textContent = audioFileName;
        workspace.classList.remove("hidden");
        uploadBox.classList.add("hidden");

        $("playbackStatus").textContent = "Ready to play";

        updateInterface();
    } catch (error) {
        console.error(error);
        alert("Could not load this audio file.");
    }
}

fileInput.addEventListener("change", (event) => {
    loadFile(event.target.files[0]);
});

uploadBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadBox.classList.add("dragging");
});

uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("dragging");
});

uploadBox.addEventListener("drop", (event) => {
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

seek.addEventListener("input", () => {
    if (!audio.duration) return;

    audio.seek((Number(seek.value) / 100) * audio.duration);
    updateInterface();
});

volume.addEventListener("input", () => {
    audio.setVolume(Number(volume.value));
    $("volumeValue").textContent = `${volume.value}%`;
});

speed.addEventListener("input", () => {
    audio.setSpeed(Number(speed.value));
    $("speedValue").textContent = `${Number(speed.value).toFixed(2)}x`;
});

$("removeFile").addEventListener("click", () => {
    cancelAnimationFrame(animationFrame);
    audio.destroy();

    workspace.classList.add("hidden");
    uploadBox.classList.remove("hidden");

    fileInput.value = "";
    $("currentTime").textContent = "00:00";
    $("duration").textContent = "00:00";
    $("playbackStatus").textContent = "Ready to play";
    seek.value = 0;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

window.addEventListener("resize", () => {
    if (audio.audioBuffer) updateInterface();
});
