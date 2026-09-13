import express from 'express';
import {authUser} from '../middlewares/authMiddleware.js';
import {getNotification,markSingleRead} from '../controllers/notificationController.js';

const notificationRouter = express.Router();

notificationRouter.get('/get-notification',authUser,getNotification);//get notification

notificationRouter.put('/mark-single-read',authUser,markSingleRead);//mark notification as read

export default notificationRouter;