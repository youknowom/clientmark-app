import cron from "node-cron";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import NotificationModel from "../models/notificationModel.js";

// ── Motivational Quotes Pool ──────────────────────────────────────────────────
const MOTIVATIONAL_QUOTES = [
    "Great code is written one line at a time. Keep going! 🚀",
    "Every bug you fix makes you a better developer. Keep pushing! 💪",
    "The best developers never stop learning. What will you learn today? 📚",
    "Small progress is still progress. Every commit counts! ✅",
    "Your code today will be someone's foundation tomorrow. Build it well! 🏗️",
    "The secret to getting ahead is getting started. Open that IDE! 💻",
    "Every expert was once a beginner. You're growing every day! 🌱",
    "Code is like humor. When you have to explain it, it's bad. Write clean code! ✨",
    "First, solve the problem. Then, write the code. Think before you type! 🧠",
    "Your talent is wasted unless you maintain consistency. Keep showing up! 🔥",
    "One feature at a time. One bug at a time. One commit at a time. You've got this! 🎯",
    "The difference between a good developer and a great one is attention to detail. 🔍",
    "Don't just build software. Build something that makes a difference! 🌍",
    "Believe in your skills. You were hired because you're capable! 💡",
    "It's not about writing perfect code — it's about writing better code than yesterday! 📈",
    "Every complex system was built by someone who started with a simple idea. Start! 🌟",
    "Challenge yourself every day. Growth happens outside the comfort zone! 🏋️",
    "Hard work beats talent when talent doesn't have work ethic. Stay dedicated! 🎖️",
    "Your best work is ahead of you, not behind you. Focus forward! ➡️",
    "The code you write today is your legacy. Make it count! 🏆",
    "Success is not final, failure is not fatal: it's the courage to continue that counts. Keep coding! 💎",
    "You are capable of far more than you think. Trust the process! 🔑",
    "A ship in harbor is safe, but that's not what ships are built for. Deploy with confidence! 🚢",
    "Dream big, code bigger! Today is your day to ship something amazing. 🌈",
];

// ── Reminder Messages Pool ────────────────────────────────────────────────────
const REMINDER_MESSAGES = [
    "📌 Don't forget! Please upload today's project progress before you log off.",
    "⏰ Daily Reminder: Have you updated your project timeline today? Keep it up to date!",
    "🔔 Hey! Your project update is due. Please add your progress post before the day ends.",
    "📊 Reminder: Make sure to document today's work on your assigned projects. Your team needs it!",
    "✅ End-of-day check: Did you push your updates and log your project progress today?",
    "📌 Don't forget to upload your latest source update to our portal: https://project.bighostindia.in/",
];

// ── Helper: pick random item ──────────────────────────────────────────────────
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Helper: get all active Developer user IDs ─────────────────────────────────
const getDeveloperUserIds = async () => {
    try {
        const role = await RoleModel.findOne({ roleName: "Developer" }).select("_id").lean();
        if (!role) return [];

        const developers = await UserModel.find({ status: "Active", roleId: role._id })
            .select("_id")
            .lean();
        return developers.map((u) => u._id.toString());
    } catch (err) {
        console.error("[Notification] Failed to fetch developers:", err.message);
        return [];
    }
};

// ── Helper: send bulk notifications to all active developers ──────────────────
export const sendBulkToDevs = async (title, message, notificationType, redirectUrl = "/dashboard") => {
    try {
        const devIds = await getDeveloperUserIds();
        if (devIds.length === 0) return;
        const notifications = devIds.map((userId) => ({
            userId,
            notificationType,
            title,
            message,
            redirectUrl,
            isRead: false,
        }));
        await NotificationModel.insertMany(notifications);
    } catch (err) {
        console.error("[Notification] Failed to send bulk:", err.message);
    }
};

const PRODUCT_NAME = process.env.PRODUCT_NAME || "CRM System";

// ── Initialize all Scheduled Cron Jobs ───────────────────────────────────────
const initScheduledNotifications = (io) => {

    // 10:00 AM — Morning Motivational Quote
    cron.schedule(
        "0 10 * * *",
        async () => {
            await sendBulkToDevs(
                `${PRODUCT_NAME} ✅`,
                `Good Morning! ${pickRandom(MOTIVATIONAL_QUOTES)}`,
                "motivational",
                "/dashboard"
            );
            if (io) io.emit("get-project");
        },
        { timezone: "Asia/Kolkata" }
    );

    // 3:00 PM — Afternoon Motivational Quote
    cron.schedule(
        "0 15 * * *",
        async () => {
            await sendBulkToDevs(
                `${PRODUCT_NAME} ✅`,
                `☀️ Good Afternoon! ${pickRandom(MOTIVATIONAL_QUOTES)}`,
                "motivational",
                "/dashboard"
            );
            if (io) io.emit("get-project");
        },
        { timezone: "Asia/Kolkata" }
    );

    // 5:00 PM — End-of-Day Project Upload Reminder
    cron.schedule(
        "0 17 * * *",
        async () => {
            await sendBulkToDevs(
                `${PRODUCT_NAME} ✅`,
                pickRandom(REMINDER_MESSAGES),
                "reminder",
                "/all-project"
            );
            if (io) io.emit("get-project");
        },
        { timezone: "Asia/Kolkata" }
    );

    // 11:59 PM — Auto-cleanup: Delete all motivational & reminder notifications from DB
    cron.schedule(
        "59 23 * * *",
        async () => {
            try {
                await NotificationModel.deleteMany({
                    notificationType: { $in: ["motivational", "reminder"] },
                });
            } catch (err) {
                console.error("[Notification] Cleanup failed:", err.message);
            }
        },
        { timezone: "Asia/Kolkata" }
    );
};

export default initScheduledNotifications;
