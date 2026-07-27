let activeAudio = null;

export function activateAudio(audio) {
  if (activeAudio && activeAudio !== audio) {
    activeAudio.pause();
  }
  activeAudio = audio;
}

export function releaseAudio(audio) {
  if (activeAudio === audio) activeAudio = null;
}

export function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}
