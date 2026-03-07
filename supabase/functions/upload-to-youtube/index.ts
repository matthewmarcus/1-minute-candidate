import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let storage_path: string;
  let candidate_name: string;
  let office_sought: string;

  try {
    const body = await req.json();
    storage_path = body.storage_path;
    candidate_name = body.candidate_name;
    office_sought = body.office_sought ?? '';

    if (!storage_path) throw new Error('storage_path is required');
    if (!candidate_name) throw new Error('candidate_name is required');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Initialize Supabase admin client using built-in service role credentials.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Download the video from Supabase Storage.
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('candidate-videos')
      .download(storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(
        `Failed to download video from storage: ${downloadError?.message ?? 'unknown error'}`,
      );
    }

    const contentType = fileBlob.type || 'video/mp4';

    // 3. Get a fresh YouTube access token via the refresh token flow.
    const clientId = Deno.env.get('YOUTUBE_CLIENT_ID');
    const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
    const refreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing YouTube OAuth2 credentials — set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN in Supabase secrets.');
    }

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const tokenResponse = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Failed to refresh YouTube access token: ${text}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('No access_token in YouTube token response.');
    }
    const accessToken: string = tokenData.access_token;

    // 4. Build metadata and initiate a resumable upload session with YouTube.
    const youtubeTitle = office_sought
      ? `${candidate_name} — ${office_sought}`
      : candidate_name;

    const metadata = {
      snippet: {
        title: youtubeTitle,
        description: 'Submitted via 1 Minute Candidate — 1minutecandidate.com',
        categoryId: '25', // News & Politics
      },
      status: {
        privacyStatus: 'unlisted',
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
          'X-Upload-Content-Length': String(fileBlob.size),
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
      throw new Error('YouTube did not return a resumable upload URL.');
    }

    // 5. Upload the video binary to the resumable upload URL.
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBlob.size),
      },
      body: fileBlob,
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

    return new Response(
      JSON.stringify({
        youtube_video_id: videoId,
        youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
