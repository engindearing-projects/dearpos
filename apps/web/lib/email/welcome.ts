// Sends a welcome email to a newly provisioned merchant.
//
// Uses Resend if RESEND_API_KEY is set; falls back to console.log so the
// webhook still succeeds and J can manually email the first few merchants
// while the account is being set up.

interface WelcomeEmailParams {
  to: string;
  ownerName: string;
  businessName: string;
  businessSlug: string;
  profile: string;
  temporaryPin: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dearpos.com";
  const posUrl = `${appUrl}/pos/${params.businessSlug}`;
  const adminUrl = `${appUrl}/admin/${params.businessSlug}`;

  const subject = `Your DearPOS is ready — ${params.businessName}`;

  const html = `
<p>Hey ${params.ownerName || "there"},</p>

<p>Your DearPOS is live. Here's where to go:</p>

<table>
  <tr><td><strong>POS (ring up orders)</strong></td><td><a href="${posUrl}">${posUrl}</a></td></tr>
  <tr><td><strong>Admin (menu, staff, reports)</strong></td><td><a href="${adminUrl}">${adminUrl}</a></td></tr>
</table>

<p><strong>Temporary staff PIN: ${params.temporaryPin}</strong><br>
Change it at ${adminUrl}/staff as soon as you're in.</p>

<p>A few things to do first:</p>
<ol>
  <li>Open the admin, add your menu items under <em>Items</em></li>
  <li>Tap to Pay works immediately on any iPhone or Android — just go to the POS</li>
  <li>Add a Bluetooth card reader later if you want one (BBPOS WisePOS E, ~$349)</li>
</ol>

<p>Questions? Reply to this email or hit <a href="mailto:hi@engindearing.soy">hi@engindearing.soy</a> — we reply fast.</p>

<p>— J @ Engindearing</p>
`;

  const text = `
Hey ${params.ownerName || "there"},

Your DearPOS is live.

POS (ring up orders): ${posUrl}
Admin (menu, staff, reports): ${adminUrl}

Temporary staff PIN: ${params.temporaryPin}
Change it at ${adminUrl}/staff as soon as you're in.

Questions? hi@engindearing.soy

— J @ Engindearing
`.trim();

  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DearPOS <hi@engindearing.soy>",
        to: [params.to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[welcome-email] Resend error: ${err}`);
      // Don't throw — webhook should succeed even if email fails
    } else {
      console.log(`[welcome-email] sent to ${params.to}`);
    }
  } else {
    // Fallback: log for manual send
    console.log(`
[welcome-email] RESEND_API_KEY not set — log for manual send:
To: ${params.to}
Subject: ${subject}
POS: ${posUrl}
Admin: ${adminUrl}
PIN: ${params.temporaryPin}
`);
  }
}
