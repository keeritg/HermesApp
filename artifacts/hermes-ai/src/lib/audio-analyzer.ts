export type VocalizationLabel =
  | "Short meow (attention)"
  | "Long meow (demanding)"
  | "Yowl (distress or mating)"
  | "Purr (contentment)"
  | "Chirp / Chatter (prey-focused)"
  | "Trill (greeting)"
  | "Hiss (defensive)"
  | "Silent / No vocalization";

export interface AudioFeatures {
  durationSeconds: number;
  dominantFrequencyHz: number;
  rmsAmplitude: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
}

export interface AudioClassification {
  label: VocalizationLabel;
  confidence: number;
  features: AudioFeatures;
}

function computeRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function computeZeroCrossingRate(buffer: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < buffer.length; i++) {
    if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / buffer.length;
}

function computeDominantFrequency(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number
): number {
  let maxMag = -Infinity;
  let maxBin = 0;
  const binCount = magnitudes.length;
  for (let i = 1; i < binCount; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      maxBin = i;
    }
  }
  return (maxBin * sampleRate) / fftSize;
}

function computeSpectralCentroid(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number
): number {
  let weightedSum = 0;
  let magnitudeSum = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    const freq = (i * sampleRate) / fftSize;
    const mag = Math.pow(10, magnitudes[i] / 20);
    weightedSum += freq * mag;
    magnitudeSum += mag;
  }
  return magnitudeSum === 0 ? 0 : weightedSum / magnitudeSum;
}

function classifyVocalization(f: AudioFeatures): AudioClassification {
  const { durationSeconds, dominantFrequencyHz, rmsAmplitude, zeroCrossingRate, spectralCentroid } = f;

  if (rmsAmplitude < 0.025) {
    return { label: "Silent / No vocalization", confidence: 0.88, features: f };
  }

  const scores: Record<VocalizationLabel, number> = {
    "Short meow (attention)": 0,
    "Long meow (demanding)": 0,
    "Yowl (distress or mating)": 0,
    "Purr (contentment)": 0,
    "Chirp / Chatter (prey-focused)": 0,
    "Trill (greeting)": 0,
    "Hiss (defensive)": 0,
    "Silent / No vocalization": 0,
  };

  // Purr: very low dominant freq (25–150 Hz), low ZCR, rhythmic, needs meaningful amplitude
  if (dominantFrequencyHz >= 20 && dominantFrequencyHz <= 200 && rmsAmplitude > 0.04) {
    scores["Purr (contentment)"] += 3;
  }
  if (zeroCrossingRate < 0.05 && rmsAmplitude > 0.04) {
    scores["Purr (contentment)"] += 2;
  }
  if (durationSeconds > 1.5 && rmsAmplitude > 0.04) {
    scores["Purr (contentment)"] += 1;
  }

  // Hiss: broad-spectrum noise, high ZCR, high spectral centroid
  if (zeroCrossingRate > 0.3) {
    scores["Hiss (defensive)"] += 3;
  }
  if (spectralCentroid > 4000) {
    scores["Hiss (defensive)"] += 2;
  }

  // Chirp / Chatter: short, high frequency bursts, high ZCR
  if (durationSeconds < 0.5 && dominantFrequencyHz > 1500) {
    scores["Chirp / Chatter (prey-focused)"] += 3;
  }
  if (zeroCrossingRate > 0.15 && dominantFrequencyHz > 1000) {
    scores["Chirp / Chatter (prey-focused)"] += 2;
  }

  // Trill: rolling/modulated mid frequency, short-medium duration
  if (dominantFrequencyHz >= 500 && dominantFrequencyHz <= 1500 && durationSeconds < 1.5) {
    scores["Trill (greeting)"] += 2;
  }
  if (zeroCrossingRate > 0.08 && zeroCrossingRate < 0.2 && durationSeconds < 1.5) {
    scores["Trill (greeting)"] += 2;
  }

  // Yowl: low-mid frequency, long duration, high amplitude
  if (durationSeconds > 2.5 && dominantFrequencyHz >= 200 && dominantFrequencyHz <= 900) {
    scores["Yowl (distress or mating)"] += 3;
  }
  if (rmsAmplitude > 0.15 && durationSeconds > 2) {
    scores["Yowl (distress or mating)"] += 2;
  }

  // Long meow: mid frequency, 1–3s duration, moderate amplitude
  if (durationSeconds > 1 && durationSeconds <= 3 && dominantFrequencyHz >= 300 && dominantFrequencyHz <= 1200) {
    scores["Long meow (demanding)"] += 3;
  }
  if (rmsAmplitude > 0.08) {
    scores["Long meow (demanding)"] += 1;
  }

  // Short meow: mid frequency, short duration, moderate amplitude
  if (durationSeconds <= 1 && dominantFrequencyHz >= 300 && dominantFrequencyHz <= 1500) {
    scores["Short meow (attention)"] += 3;
  }
  if (rmsAmplitude >= 0.03 && rmsAmplitude <= 0.2) {
    scores["Short meow (attention)"] += 1;
  }

  const entries = Object.entries(scores) as [VocalizationLabel, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [topLabel, topScore] = entries[0];
  const totalScore = entries.reduce((sum, [, s]) => sum + s, 0);

  const rawConfidence = totalScore > 0 ? topScore / totalScore : 0;
  const confidence = Math.min(0.97, Math.max(0.55, 0.55 + rawConfidence * 0.42));

  return { label: topLabel, confidence, features: f };
}

export async function analyzeAudioBlob(blob: Blob): Promise<AudioClassification> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  const channelData = audioBuffer.getChannelData(0);
  const durationSeconds = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;

  const rmsAmplitude = computeRMS(channelData);
  const zeroCrossingRate = computeZeroCrossingRate(channelData);

  const fftSize = 2048;
  const offlineCtx = new OfflineAudioContext(1, channelData.length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const analyserNode = offlineCtx.createAnalyser();
  analyserNode.fftSize = fftSize;
  source.connect(analyserNode);
  analyserNode.connect(offlineCtx.destination);
  source.start();

  await offlineCtx.startRendering();

  const magnitudes = new Float32Array(analyserNode.frequencyBinCount);
  analyserNode.getFloatFrequencyData(magnitudes);

  const dominantFrequencyHz = computeDominantFrequency(magnitudes, sampleRate, fftSize);
  const spectralCentroid = computeSpectralCentroid(magnitudes, sampleRate, fftSize);

  const features: AudioFeatures = {
    durationSeconds,
    dominantFrequencyHz,
    rmsAmplitude,
    zeroCrossingRate,
    spectralCentroid,
  };

  return classifyVocalization(features);
}

export interface RecordingHandle {
  stop: () => void;
  stream: MediaStream;
}

export function startRecording(onComplete: (blob: Blob) => void): Promise<RecordingHandle> {
  return new Promise(async (resolve, reject) => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      reject(err);
      return;
    }

    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      stream.getTracks().forEach((t) => t.stop());
      onComplete(blob);
    };

    recorder.start();

    resolve({
      stream,
      stop: () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      },
    });
  });
}
