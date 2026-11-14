
let ffmpegInstance = null;
let ffmpegLoading = null;
let downloadUrl = null;

const CDN = "https://cdn.jsdelivr.net/npm";

async function toBlobURL(url, mimeType) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not download FFmpeg.");
    }

    const blob = await response.blob();
    return URL.createObjectURL(
        new Blob([blob], { type: mimeType })
    );
}

async function loadFFmpeg(onProgress) {
    if (ffmpegInstance) return ffmpegInstance;

    if (ffmpegLoading) return ffmpegLoading;

    ffmpegLoading = (async () => {
        const { FFmpeg } = await import(
            `${CDN}/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js`
        );

        const ffmpeg = new FFmpeg();

        ffmpeg.on("progress", ({ progress }) => {
            if (onProgress) {
                onProgress(Math.min(100, Math.round(progress * 100)));
            }
        });

        const base = `${CDN}/@ffmpeg/core@0.12.10/dist/umd`;

        const coreURL = await toBlobURL(
            `${base}/ffmpeg-core.js`,
            "text/javascript"
        );

        const wasmURL = await toBlobURL(
            `${base}/ffmpeg-core.wasm`,
            "application/wasm"
        );

        await ffmpeg.load({
            coreURL,
            wasmURL
        });

        ffmpegInstance = ffmpeg;
        return ffmpeg;
    })();

    try {
        return await ffmpegLoading;
    } catch (error) {
        ffmpegLoading = null;
        throw error;
    }
}

export function initAudioConverter() {
    const fileInput = document.getElementById("converterFile");
    const formatSelect = document.getElementById("converterFormat");
    const bitrateSelect = document.getElementById("converterBitrate");
    const convertButton = document.getElementById("convertButton");
    const downloadLink = document.getElementById("downloadConverted");
    const fileName = document.getElementById("converterFileName");
    const status = document.getElementById("converterStatus");
    const progressBar = document.getElementById("converterProgress");
    const progressText = document.getElementById("converterProgressText");

    let selectedFile = null;

    const mimeTypes = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        aac: "audio/aac",
        m4a: "audio/mp4",
        flac: "audio/flac"
    };

    fileInput.addEventListener("change", () => {
        selectedFile = fileInput.files[0];

        downloadLink.hidden = true;

        if (!selectedFile) {
            fileName.textContent = "No file selected";
            convertButton.disabled = true;
            return;
        }

        fileName.textContent = selectedFile.name;
        convertButton.disabled = false;
        status.textContent = "Ready to convert.";
        progressBar.value = 0;
        progressText.textContent = "0%";
    });

    convertButton.addEventListener("click", async () => {
        if (!selectedFile) return;

        convertButton.disabled = true;
        downloadLink.hidden = true;
        progressBar.value = 0;
        progressText.textContent = "0%";
        status.textContent = "Preparing converter...";

        let inputPath = "";
        let outputPath = "";

        try {
            const ffmpeg = await loadFFmpeg(progress => {
                progressBar.value = progress;
                progressText.textContent = `${progress}%`;
                status.textContent = "Converting audio...";
            });

            const outputFormat = formatSelect.value;
            const bitrate = bitrateSelect.value;

            const inputExtension =
                selectedFile.name.split(".").pop().toLowerCase();

            inputPath = `input.${inputExtension}`;
            outputPath = `converted.${outputFormat}`;

            status.textContent = "Reading audio file...";

            await ffmpeg.writeFile(
                inputPath,
                new Uint8Array(await selectedFile.arrayBuffer())
            );

            let argumentsList = [
                "-y",
                "-i", inputPath,
                "-vn"
            ];

            if (outputFormat === "mp3") {
                argumentsList.push(
                    "-c:a", "libmp3lame",
                    "-b:a", `${bitrate}k`
                );
            } else if (outputFormat === "wav") {
                argumentsList.push(
                    "-c:a", "pcm_s16le"
                );
            } else if (outputFormat === "ogg") {
                argumentsList.push(
                    "-c:a", "libvorbis",
                    "-q:a", "5"
                );
            } else if (outputFormat === "aac") {
                argumentsList.push(
                    "-c:a", "aac",
                    "-b:a", `${bitrate}k`
                );
            } else if (outputFormat === "m4a") {
                argumentsList.push(
                    "-c:a", "aac",
                    "-b:a", `${bitrate}k`
                );
            } else if (outputFormat === "flac") {
                argumentsList.push(
                    "-c:a", "flac"
                );
            }

            argumentsList.push(outputPath);

            status.textContent = "Converting audio...";

            await ffmpeg.exec(argumentsList);

            const convertedData = await ffmpeg.readFile(outputPath);

            const blob = new Blob(
                [convertedData],
                { type: mimeTypes[outputFormat] }
            );

            if (downloadUrl) {
                URL.revokeObjectURL(downloadUrl);
            }

            downloadUrl = URL.createObjectURL(blob);

            downloadLink.href = downloadUrl;
            downloadLink.download =
                `${selectedFile.name.replace(/\.[^/.]+$/, "")}.${outputFormat}`;

            downloadLink.hidden = false;

            progressBar.value = 100;
            progressText.textContent = "100%";
            status.textContent = "Conversion completed successfully!";

            await ffmpeg.deleteFile(inputPath);
            await ffmpeg.deleteFile(outputPath);

        } catch (error) {
            console.error("Converter error:", error);

            status.textContent =
                "Conversion failed. Please try another audio file.";

            progressText.textContent = "Error";

            try {
                if (ffmpegInstance && inputPath) {
                    await ffmpegInstance.deleteFile(inputPath);
                }
                if (ffmpegInstance && outputPath) {
                    await ffmpegInstance.deleteFile(outputPath);
                }
            } catch (_) {
                // Temporary files may not exist.
            }
        } finally {
            convertButton.disabled = false;
        }
    });
}
