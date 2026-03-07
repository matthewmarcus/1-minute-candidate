const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing YouTube OAuth2 credentials in environment variables.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(YOUTUBE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh YouTube access token: ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access_token in YouTube token response.');
  }
  return data.access_token as string;
}

/**
 * Downloads the video from a signed Supabase Storage URL and uploads it to
 * the 1 Minute Candidate YouTube channel via the YouTube Data API v3 resumable
 * upload flow.
 *
 * @param signedUrl  - Supabase signed URL to download the video from.
 * @param title      - YouTube video title (candidate name + office sought).
 * @returns          - The YouTube video ID and full watch URL.
 */
export async function uploadVideoToYouTube(
  signedUrl: string,
  title: string,
): Promise<{ videoId: string; videoUrl: string }> {
  // 1. Get a fresh access token via the refresh token flow.
  const accessToken = await getAccessToken();

  // 2. Download the video binary from Supabase Storage.
  const videoResponse = await fetch(signedUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video from storage: ${videoResponse.statusText}`);
  }
  const videoBlob = await videoResponse.blob();
  const contentType = videoBlob.type || 'video/mp4';

  // 3. Initiate a resumable upload session with YouTube.
  const metadata = {
    snippet: {
      title,
      description: 'Submitted via 1 Minute Candidate — 1minutecandidate.com',
      categoryId: '25', // News & Politics
    },
    status: {
      privacyStatus: 'public',
    },
  };

  const initiateResponse = await fetch(
    `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(videoBlob.size),
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initiateResponse.ok) {
    const text = await initiateResponse.text();
    throw new Error(`Failed to initiate YouTube upload: ${text}`);
  }

  const uploadUrl = initiateResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('YouTube did not return an upload URL.');
  }

  // 4. Upload the video binary to the resumable upload URL.
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(videoBlob.size),
    },
    body: videoBlob,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`Failed to upload video to YouTube: ${text}`);
  }

  const result = await uploadResponse.json();
  const videoId: string = result.id;
  if (!videoId) {
    throw new Error('YouTube upload succeeded but no video ID was returned.');
  }

  return {
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
