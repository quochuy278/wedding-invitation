import "server-only";

import QRCode from "qrcode";

export async function renderInvitationTicketQr(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 4,
    scale: 8,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
