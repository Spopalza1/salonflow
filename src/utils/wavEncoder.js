/**
 * Encodes an AudioBuffer as a 16-bit PCM WAV blob (mono, downsampled to 22.05 kHz).
 * WAV is playable on ALL browsers including iOS Safari.
 */
export function audioBufferToWav(audioBuffer, targetSampleRate = 22050) {
  const numChannels = 1; // force mono
  const sampleRate = Math.min(targetSampleRate, audioBuffer.sampleRate);

  // Mix down to mono
  const src = audioBuffer.getChannelData(0);
  let channelData;
  if (audioBuffer.numberOfChannels > 1) {
    const right = audioBuffer.getChannelData(1);
    channelData = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) {
      channelData[i] = (src[i] + right[i]) / 2;
    }
  } else {
    channelData = src;
  }

  // Downsample
  const ratio = audioBuffer.sampleRate / sampleRate;
  const newLength = Math.round(channelData.length / ratio);
  const data = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), channelData.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += channelData[j];
    data[i] = sum / (end - start);
  }

  const bitDepth = 16;
  const blockAlign = numChannels * bitDepth / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = newLength * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < newLength; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}