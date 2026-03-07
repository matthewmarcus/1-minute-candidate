import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'noreply@1minutecandidate.com';

const STATUS_MESSAGES: Record<string, { subject: string; body: string }> = {
  submitted: {
    subject: 'Your video has been submitted for review — 1 Minute Candidate',
    body: (name: string) =>
      `Hi ${name},\n\nThank you for submitting your 1 Minute Candidate video! Our editorial team will review it shortly.\n\nOnce approved, your video will be uploaded to the 1 Minute Candidate YouTube channel and your candidate profile will go live on the platform.\n\nWe'll notify you when your video has been approved.\n\n— The 1 Minute Candidate Team\n1minutecandidate.com`,
  },
  approved: {
    subject: 'Your video has been approved — 1 Minute Candidate',
    body: (name: string) =>
      `Hi ${name},\n\nGreat news! Your 1 Minute Candidate video has been approved and is now live on the platform.\n\nVoters in your district can now watch your video and learn about your campaign.\n\n— The 1 Minute Candidate Team\n1minutecandidate.com`,
  },
  rejected: {
    subject: 'Update on your video submission — 1 Minute Candidate',
    body: (name: string) =>
      `Hi ${name},\n\nUnfortunately, your submitted video did not meet our review guidelines and could not be approved at this time.\n\nPlease log in to the app to review any notes from our editorial team and re-record your video.\n\n— The 1 Minute Candidate Team\n1minutecandidate.com`,
  },
};

// Build the email body string (STATUS_MESSAGES values are functions when status is looked up)
function buildBody(status: string, name: string): string {
  const template = STATUS_MESSAGES[status];
  if (!template) return `Hi ${name},\n\nYour video status has been updated to: ${status}.\n\n— The 1 Minute Candidate Team`;
  // body is stored as a function above; cast through unknown for type safety at runtime
  return (template.body as unknown as (n: string) => string)(name);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let candidate_email: string;
  let candidate_name: string;
  let status: string;

  try {
    const body = await req.json();
    candidate_email = body.candidate_email;
    candidate_name = body.candidate_name;
    status = body.status;

    if (!candidate_email) throw new Error('candidate_email is required');
    if (!candidate_name) throw new Error('candidate_name is required');
    if (!status) throw new Error('status is required');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('[notify-candidate] RESEND_API_KEY is not set');
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const template = STATUS_MESSAGES[status];
  const subject = template?.subject ?? `Your video status update — 1 Minute Candidate`;
  const text = buildBody(status, candidate_name);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: candidate_email,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[notify-candidate] Failed to send email:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
