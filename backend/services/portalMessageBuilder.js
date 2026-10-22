/**
 * Canonical portal URL and message builder service.
 * Enforces consistent path (/project-preview/:portalKey) and usage of portalKey across all channels.
 */

export const buildPortalUrl = (
  portalKey,
  baseUrl = process.env.CLIENT_URL || process.env.DOMAIN_URL || "https://clientmark.app"
) => {
  if (!portalKey || typeof portalKey !== "string" || !portalKey.trim()) {
    throw new Error("portalKey is required and must be a non-empty string to build portal URL");
  }
  const cleanBase = (baseUrl || "https://clientmark.app").trim().replace(/\/+$/, "");
  return `${cleanBase}/project-preview/${portalKey.trim()}`;
};

export const buildPortalWhatsAppMessage = ({
  clientName,
  projectName,
  projectId,
  createdAt,
  portalKey,
  senderBrand,
  baseUrl,
}) => {
  const link = buildPortalUrl(portalKey, baseUrl);
  const registrationDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-GB")
    : "-";

  const brand = (senderBrand || process.env.PROJECT_NAME || "Clientmark").trim();
  const client = (clientName || "Client").trim();
  const proj = (projectName || "Project").trim();
  const refId = projectId || "-";

  return `Dear *${client}*,

Greetings from *${brand}*.

We are pleased to inform you that your project *${proj}* has been successfully registered.

*Project Details*
- Project Name: ${proj}
- Reference ID: ${refId}
- Registration Date: ${registrationDate}

*Project Tracking Link*
${link}

If you need any assistance, please feel free to contact our support team.

Regards,
*${brand}*`;
};
