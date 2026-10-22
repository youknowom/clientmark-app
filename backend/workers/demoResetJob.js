import cron from "node-cron";
import { withLock } from "../services/lockService.js";
import { resetDemoData } from "../config/seedDemoTenant.js";

/**
 * Executes demo reset under distributed lock.
 */
export const runDemoResetJob = async () => {
  return await withLock("demo_reset_job", 300, async () => {
    return await resetDemoData();
  });
};

/**
 * Initializes cron schedule for periodic demo reset.
 * Defaults to every 6 hours (0 star/6 star star star).
 */
export const initDemoResetCron = () => {
  const cronExpr = process.env.DEMO_RESET_CRON || "0 */6 * * *";
  console.log(`[DemoResetJob] Initializing demo reset cron with schedule: "${cronExpr}"`);

  cron.schedule(cronExpr, async () => {
    try {
      await runDemoResetJob();
    } catch (err) {
      console.error("[DemoResetJob] Scheduled run failed:", err.message);
    }
  });
};

export default {
  runDemoResetJob,
  initDemoResetCron,
};
