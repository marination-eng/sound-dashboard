
export function drawWaveform(canvas, audioBuffer, progress = 0) {
    const ctx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);

    const middle = height / 2;

    for (let x = 0; x < width; x++) {
        let min = 1;
        let max = -1;

        for (let i = 0; i < step; i++) {
            const sample = data[x * step + i];

            if (sample === undefined) continue;

            min = Math.min(min, sample);
            max = Math.max(max, sample);
        }

        const amplitude = (max - min) * middle * 0.85;

        ctx.fillStyle =
            x / width <= progress ? "#5865f2" : "#c8cbd5";

        ctx.fillRect(
            x,
            middle - amplitude / 2,
            1,
            Math.max(2, amplitude)
        );
    }
}
