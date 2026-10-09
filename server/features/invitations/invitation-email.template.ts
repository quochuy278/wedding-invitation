import "server-only";

import messages from "@/messages/vi.json";
import type { CreatedInvitationDto } from "@/shared/contracts/invitation";

export type InvitationEmailContent = {
  subject: string;
  htmlContent: string;
  textContent: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function invitationEmailContent(
  invitation: CreatedInvitationDto,
  invitationUrl: string,
): InvitationEmailContent {
  const copy = messages.Email.invitation;
  const timeZone = invitation.address.eventTimeZone ?? "Asia/Ho_Chi_Minh";
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeZone });
  const timeFormatter = new Intl.DateTimeFormat("vi-VN", { timeStyle: "short", timeZone });
  const deadlineFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  });
  const eventAt = new Date(invitation.address.eventAt);
  const eventDate = dateFormatter.format(eventAt);
  const eventTime = timeFormatter.format(eventAt);
  const expiresAt = new Date(invitation.expiresAt);
  const deadline = `${timeFormatter.format(expiresAt)} · ${deadlineFormatter.format(expiresAt)}`;
  const greeting = copy.greeting.replace("{name}", () => invitation.guestName);
  const floor = invitation.address.floor
    ? copy.floor.replace("{value}", () => invitation.address.floor ?? "")
    : "";
  const entrance = invitation.address.entrance
    ? copy.entrance.replace("{value}", () => invitation.address.entrance ?? "")
    : "";
  const deadlineText = copy.deadline.replace("{value}", deadline);
  const addressText = invitation.address.addressText
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean)
    .join(", ");
  const venueDetails = [
    invitation.address.addressLine2,
    floor,
    entrance,
    invitation.address.instructions,
  ].filter((value): value is string => Boolean(value));
  const venueHtml = venueDetails
    .map(
      (value) =>
        `<p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#75665f">${escapeHtml(value).replaceAll("\n", "<br>")}</p>`,
    )
    .join("");
  const personalMessage = invitation.personalMessage
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0"><tr><td style="padding:4px 0 4px 16px;border-left:3px solid #c6a67a"><p style="margin:0;font-family:Georgia,serif;font-size:17px;font-style:italic;line-height:1.7;color:#80563e">${escapeHtml(invitation.personalMessage).replaceAll("\n", "<br>")}</p></td></tr></table>`
    : "";
  const htmlContent = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;padding:24px 12px;background:#f5f0e9;color:#382d2a;font-family:Arial,sans-serif;-webkit-text-size-adjust:100%">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e9dfd3;border-radius:16px">
            <tr>
              <td align="center" style="padding:32px 24px 28px;background:#fcf9f5;border-top:4px solid #722f37;border-radius:16px 16px 0 0">
                <p style="margin:0 0 14px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9a7853">${escapeHtml(copy.label)}</p>
                <h1 style="margin:0;font-family:Georgia,serif;color:#722f37;font-size:40px;font-weight:normal;line-height:1.2">${escapeHtml(copy.couple)}</h1>
                <p aria-hidden="true" style="margin:16px 0 0;font-size:14px;letter-spacing:8px;color:#c6a67a">— &hearts; —</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 32px">
                <p style="margin:0 0 12px;font-size:16px;font-weight:bold;line-height:1.6">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#6d5d55">${escapeHtml(copy.intro)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fcf9f5;border:1px solid #eee4d8;border-radius:12px">
                  <tr>
                    <td align="center" style="padding:20px 18px;border-bottom:1px solid #eee4d8">
                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a7853">${escapeHtml(copy.eventTime)}</p>
                      <p style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1.2;color:#722f37">${escapeHtml(eventTime)}</p>
                      <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#6d5d55">${escapeHtml(eventDate)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 18px">
                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a7853">${escapeHtml(copy.venue)}</p>
                      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:22px;line-height:1.4;color:#382d2a">${escapeHtml(invitation.address.name)}</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#6d5d55"><strong>${escapeHtml(copy.address)}</strong> ${escapeHtml(addressText)}</p>
                      ${venueHtml}
                    </td>
                  </tr>
                </table>
                ${personalMessage}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0">
                  <tr><td align="center"><a href="${escapeHtml(invitationUrl)}" style="display:inline-block;padding:16px 30px;background:#722f37;border:1px solid #722f37;color:#ffffff;font-size:15px;font-weight:bold;line-height:1.2;text-decoration:none;border-radius:8px">${escapeHtml(copy.viewInvitation)}</a></td></tr>
                </table>
                <p style="margin:16px 0 0;text-align:center;font-size:13px;line-height:1.7;color:#75665f">${escapeHtml(deadlineText)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-top:1px solid #eee4d8">
                  <tr><td style="padding:20px 0 0;text-align:center">
                    <p style="margin:0;font-size:12px;line-height:1.7;color:#8b7b71">${escapeHtml(copy.fallbackLink)}<br><a href="${escapeHtml(invitationUrl)}" style="color:#722f37;text-decoration:underline;overflow-wrap:anywhere;word-break:break-all">${escapeHtml(invitationUrl)}</a></p>
                    <p style="margin:18px 0 0;font-family:Georgia,serif;font-size:14px;font-style:italic;line-height:1.7;color:#9a7853">${escapeHtml(copy.closing)}</p>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const textContent = [
    copy.couple,
    greeting,
    copy.intro,
    `${copy.eventTime} ${eventTime} · ${eventDate}`,
    invitation.address.name,
    `${copy.address} ${addressText}`,
    ...venueDetails,
    invitation.personalMessage,
    `${copy.viewInvitation}: ${invitationUrl}`,
    deadlineText,
    copy.closing,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject: copy.subject, htmlContent, textContent };
}
