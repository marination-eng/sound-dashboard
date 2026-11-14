
export function drawWaveform(canvas, audioBuffer, progress = 0) {
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(data.length / width));
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

        const amplitude = (max - min) * middle * 0.9;

        ctx.fillStyle =
            x / width <= progress ? "#8b7cff" : "#414b60";

        ctx.fillRect(
            x,
            middle - amplitude / 2,
            Math.max(1, width / canvas.width),
            Math.max(2, amplitude)
        );
    }
}

// Fast Fourier Transform
function fft(real, imag) {
    const n = real.length;

    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;

        for (; j & bit; bit >>= 1) {
            j ^= bit;
        }

        j ^= bit;

        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    for (let size = 2; size <= n; size *= 2) {
        const half = size / 2;
        const angle = -2 * Math.PI / size;

        for (let start = 0; start < n; start += size) {
            for (let j = 0; j < half; j++) {
                const wr = Math.cos(angle * j);
                const wi = Math.sin(angle * j);

                const even = start + j;
                const odd = even + half;

                const tr = wr * real[odd] - wi * imag[odd];
                const ti = wr * imag[odd] + wi * real[odd];

                real[odd] = real[even] - tr;
                imag[odd] = imag[even] - ti;

                real[even] += tr;
                imag[even] += ti;
            }
        }
    }
}

export function drawSpectrogram(canvas, audioBuffer) {
    const fftSize = 1024;
    const hopSize = 256;
    const bins = fftSize / 2;

    const samples = audioBuffer.getChannelData(0);

    const totalFrames = Math.max(
        1,
        Math.floor((samples.length - fftSize) / hopSize) + 1
    );

    const width = Math.min(totalFrames, 1400);
    const height = bins;

    const image = new ImageData(width, height);

    for (let x = 0; x < width; x++) {
        const frame = Math.floor(x * totalFrames / width);
        const offset = frame * hopSize;

        const real = new Float64Array(fftSize);
        const imag = new Float64Array(fftSize);

        for (let i = 0; i < fftSize; i++) {
            const sample = samples[offset + i] || 0;
            const window = 0.5 - 0.5 * Math.cos(
                2 * Math.PI * i / (fftSize - 1)
            );

            real[i] = sample * window;
        }

        fft(real, imag);

        for (let y = 0; y < height; y++) {
            const bin = height - 1 - y;

            const magnitude = Math.sqrt(
                real[bin] ** 2 + imag[bin] ** 2
            ) / fftSize;

            const db = 20 * Math.log10(magnitude + 0.000001);
            const intensity = Math.max(
                0,
                Math.min(1, (db + 85) / 65)
            );

            const hue = 260 - intensity * 230;
            const lightness = 8 + intensity * 55;

            const color = hslToRgb(hue, 95, lightness);
            const index = (y * width + x) * 4;

            image.data[index] = color[0];
            image.data[index + 1] = color[1];
            image.data[index + 2] = color[2];
            image.data[index + 3] = 255;
        }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.putImageData(image, 0, 0);
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);

    const f = n =>
        l - a * Math.max(
            -1,
            Math.min(k(n) - 3, 9 - k(n), 1)
        );

    return [
        Math.round(f(0) * 255),
        Math.round(f(8) * 255),
        Math.round(f(4) * 255)
    ];
}
