import { describe, test, expect } from "@jest/globals";
import {
  buildPortalUrl,
  buildPortalWhatsAppMessage,
} from "../services/portalMessageBuilder.js";

describe("Portal Message & URL Builder Tests", () => {
  describe("buildPortalUrl", () => {
    test("builds canonical portal URL using default base URL", () => {
      const portalKey = "pk_test_unique_key_12345";
      const url = buildPortalUrl(portalKey);
      expect(url).toContain(`/project-preview/${portalKey}`);
      expect(url.startsWith("http")).toBe(true);
    });

    test("builds canonical portal URL using custom baseUrl and strips trailing slashes", () => {
      const portalKey = "pk_custom_67890";
      const customBase = "https://preview.customdomain.io///";
      const url = buildPortalUrl(portalKey, customBase);
      expect(url).toBe("https://preview.customdomain.io/project-preview/pk_custom_67890");
    });

    test("throws an error if portalKey is missing, null, or empty string", () => {
      expect(() => buildPortalUrl("")).toThrow("portalKey is required");
      expect(() => buildPortalUrl(null)).toThrow("portalKey is required");
      expect(() => buildPortalUrl(undefined)).toThrow("portalKey is required");
      expect(() => buildPortalUrl("   ")).toThrow("portalKey is required");
    });
  });

  describe("buildPortalWhatsAppMessage", () => {
    test("generates expected WhatsApp message template containing canonical portalKey URL", () => {
      const msg = buildPortalWhatsAppMessage({
        clientName: "Acme Enterprises",
        projectName: "Mobile App Redesign",
        projectId: "PRJ-2026-99",
        createdAt: new Date("2026-03-15T10:00:00Z"),
        portalKey: "pk_acme_redesign_key",
        senderBrand: "DesignStudio",
        baseUrl: "https://portal.designstudio.com",
      });

      expect(msg).toContain("Dear *Acme Enterprises*");
      expect(msg).toContain("Greetings from *DesignStudio*");
      expect(msg).toContain("project *Mobile App Redesign* has been successfully registered");
      expect(msg).toContain("- Project Name: Mobile App Redesign");
      expect(msg).toContain("- Reference ID: PRJ-2026-99");
      expect(msg).toContain("- Registration Date: 15/03/2026");
      expect(msg).toContain("*Project Tracking Link*");
      expect(msg).toContain("https://portal.designstudio.com/project-preview/pk_acme_redesign_key");
      expect(msg).toContain("Regards,\n*DesignStudio*");
    });

    test("falls back to default brand, client, and project names when omitted", () => {
      const msg = buildPortalWhatsAppMessage({
        portalKey: "pk_minimal_key",
        baseUrl: "https://clientmark.app",
      });

      expect(msg).toContain("Dear *Client*");
      expect(msg).toContain("Greetings from *Clientmark*");
      expect(msg).toContain("https://clientmark.app/project-preview/pk_minimal_key");
    });

    test("throws if portalKey is missing in buildPortalWhatsAppMessage", () => {
      expect(() =>
        buildPortalWhatsAppMessage({
          clientName: "Jane Doe",
          projectName: "Website",
        })
      ).toThrow("portalKey is required");
    });
  });
});
