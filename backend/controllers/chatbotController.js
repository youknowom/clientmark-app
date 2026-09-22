import axios from "axios";
import jwt from "jsonwebtoken";
import ChatbotConversationModel from "../models/chatbotConversationModel.js";

// CRM System Knowledge Base for Local Intelligence Fallback
const CRM_KNOWLEDGE = [
  {
    keywords: ["lead", "pipeline", "inquiry", "prospect", "contact"],
    reply:
      "To manage leads in Clientmark:\n• Go to **Leads → All Leads** in the sidebar to view your pipeline.\n• Click **+ Add Lead** to manually add prospects or import in bulk.\n• Assign leads to BDEs or Telecallers, track deal stages, and update calling status with notes.",
  },
  {
    keywords: ["whatsapp", "message", "chat", "template", "otp"],
    reply:
      "Clientmark offers integrated **WhatsApp Messaging**:\n• Send instant welcome messages and status updates directly to clients.\n• Configure message templates in **Settings → WhatsApp Settings**.\n• Track chat history and verify client phone numbers seamlessly.",
  },
  {
    keywords: ["project", "milestone", "delivery", "task"],
    reply:
      "Projects can be tracked under **Projects → All Projects**:\n• Create projects with defined stages, deadlines, and milestone budgets.\n• Assign developers and project managers.\n• Generate public status preview links for clients to track progress in real-time.",
  },
  {
    keywords: ["role", "permission", "user", "telecaller", "bde", "developer", "team"],
    reply:
      "Clientmark supports strict **Role-Based Access Control**:\n• **Admin**: Full workspace control, billing, settings, and user management.\n• **BDE**: Lead generation and conversion pipelines.\n• **Telecaller**: Dedicated dialer list and call logging.\n• **Developer**: Milestone tracking and task completion.\nConfigure permissions in **User Master → Role & Permission**.",
  },
  {
    keywords: ["price", "pricing", "plan", "cost", "subscription", "upgrade", "billing"],
    reply:
      "Clientmark offers flexible subscription tiers:\n• **Starter**: Ideal for solo founders and small agencies.\n• **Growth**: Expanded leads, automated WhatsApp, and team seats.\n• **Enterprise**: Unlimited pipelines, custom domain, and dedicated SLA.\nVisit the **Billing & Subscription** page to manage or upgrade your plan.",
  },
  {
    keywords: ["brand", "color", "theme", "logo", "favicon", "white label"],
    reply:
      "You can customize your workspace identity in **Settings → Theme Setting** & **Site Setting**:\n• Upload your custom company logo and tab favicon.\n• Set your primary brand accent color.\n• Changes reflect immediately across all team member views.",
  },
  {
    keywords: ["hello", "hi", "hey", "help", "start", "guide"],
    reply:
      "Hello! I am your **Clientmark CRM Assistant**. I can help you with:\n1. Setting up your sales pipeline and managing leads\n2. Automating WhatsApp client updates\n3. Tracking project delivery and developer tasks\n4. Configuring roles, branding, and billing\nWhat would you like assistance with today?",
  },
];

// Helper to determine intelligent local fallback answer
const getLocalFallbackReply = (query) => {
  const normalized = query.toLowerCase();
  for (const item of CRM_KNOWLEDGE) {
    if (item.keywords.some((k) => normalized.includes(k))) {
      return item.reply;
    }
  }
  return (
    "I'm here to help you get the most out of Clientmark CRM! You can ask me about creating leads, tracking project milestones, setting up WhatsApp messaging, managing team roles, or upgrading your subscription. How can I help?"
  );
};

// Helper to extract user/tenant info if token exists
const extractUserContext = (req) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return {
        userId: decoded.userId || null,
        tenantId: decoded.tenantId || null,
      };
    } catch {
      return { userId: null, tenantId: null };
    }
  }
  return { userId: null, tenantId: null };
};

// ── Send Message / AI Chat Handler ─────────────────────────────────────────
export const handleChatMessage = async (req, res) => {
  try {
    const { message, sessionId, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    const { userId, tenantId } = extractUserContext(req);
    const activeSessionId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let botReply = "";
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const systemPrompt = `You are the Clientmark CRM AI Assistant. Clientmark is a multi-tenant SaaS CRM designed for digital agencies, sales teams, and service businesses.
Key capabilities include:
- Lead management and sales pipelines with calling status tracking
- WhatsApp integration for automated follow-ups, OTPs, and notifications
- Project management with milestones, task progress, and live client preview links
- Role-based permissions: Admin, BDE, Telecaller, Developer
- Customizable workspace branding (logo, favicon, brand theme color)
- Tiered subscription plans (Starter, Growth, Enterprise) with Stripe & Razorpay billing
Keep answers clear, helpful, professional, and formatted in clean markdown.`;

        // Format conversation history for Gemini API
        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Understood. I will act as the Clientmark CRM AI Assistant, providing concise, helpful guidance on all CRM features, pipelines, WhatsApp automation, and project tracking." }] },
        ];

        // Append recent history (up to last 6 messages)
        const recentHistory = history.slice(-6);
        for (const item of recentHistory) {
          contents.push({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }],
          });
        }

        // Append current message
        contents.push({ role: "user", parts: [{ text: message }] });

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          },
          { timeout: 10000 }
        );

        botReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (geminiError) {
        console.warn("Gemini API call failed or timed out, falling back to CRM knowledge engine:", geminiError.message);
      }
    }

    if (!botReply) {
      botReply = getLocalFallbackReply(message);
    }

    // Persist conversation into additive collection
    try {
      await ChatbotConversationModel.findOneAndUpdate(
        { sessionId: activeSessionId },
        {
          $setOnInsert: {
            tenantId: tenantId || undefined,
            userId: userId || undefined,
            sessionId: activeSessionId,
          },
          $push: {
            messages: {
              $each: [
                { role: "user", content: message, timestamp: new Date() },
                { role: "assistant", content: botReply, timestamp: new Date() },
              ],
            },
          },
        },
        { upsert: true, new: true }
      );
    } catch (saveError) {
      console.warn("Could not save chatbot conversation:", saveError.message);
    }

    return res.status(200).json({
      success: true,
      reply: botReply,
      sessionId: activeSessionId,
    });
  } catch (error) {
    console.error("Error in handleChatMessage:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate reply",
      reply: "I'm having a momentary connection issue. Please feel free to ask again or check the documentation in your sidebar!",
    });
  }
};

// ── Get Chat History ───────────────────────────────────────────────────────
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID required" });
    }

    const conversation = await ChatbotConversationModel.findOne({ sessionId });
    return res.status(200).json({
      success: true,
      messages: conversation?.messages || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Clear Chat History ─────────────────────────────────────────────────────
export const clearChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      await ChatbotConversationModel.deleteOne({ sessionId });
    }
    return res.status(200).json({ success: true, message: "Chat cleared." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
