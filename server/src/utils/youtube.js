const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/i,
  /(?:youtube\.com\/embed\/)([\w-]{11})/i,
  /(?:youtu\.be\/)([\w-]{11})/i
];

export function extractYoutubeVideoId(input) {
  if (!input || typeof input !== "string") {
    return null;
  }

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  if (/^[\w-]{11}$/.test(input)) {
    return input;
  }

  return null;
}

export function assertYoutubeUrl(input) {
  const videoId = extractYoutubeVideoId(input);
  if (!videoId) {
    return null;
  }

  return {
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`
  };
}

