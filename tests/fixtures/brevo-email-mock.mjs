const originalFetch = globalThis.fetch;
const attempts = new Set();

globalThis.fetch = async (url, options) => {
  if (String(url) !== "https://api.brevo.com/v3/smtp/email") {
    return originalFetch(url, options);
  }

  const body = JSON.parse(options.body);
  const recipient = body.to[0].email;
  if (!recipient.endsWith("@example.invalid")) {
    throw new Error("The Brevo test double only accepts fixture recipients.");
  }
  const attempt = body.headers["X-Mailin-custom"];
  if (recipient.startsWith("create-email-e2e-") && !attempts.has(recipient)) {
    attempts.add(recipient);
    return new Response(null, { status: 429 });
  }
  if (recipient.startsWith("create-email-ambiguous-")) {
    throw new DOMException("Test timeout", "TimeoutError");
  }
  return Response.json({ messageId: `<${attempt}@example.invalid>` }, { status: 201 });
};
