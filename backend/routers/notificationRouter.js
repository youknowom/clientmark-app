import express from 'express';
import { authUser } from '../middlewares/authMiddleware.js';
import tenantMiddleware from '../middlewares/tenantMiddleware.js';
import { getNotification, markSingleRead } from '../controllers/notificationController.js';

const notificationRouter = express.Router();

// ── Protected Routes (Strictly Tenant Isolated) ──
notificationRouter.use(authUser, tenantMiddleware);

notificationRouter.get('/get-notification', getNotification);
notificationRouter.put('/mark-single-read', markSingleRead);

export default notificationRouter;