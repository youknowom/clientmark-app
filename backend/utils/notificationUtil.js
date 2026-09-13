import NotificationModel from "../models/notificationModel.js";

//create one notification
const createOneNotification = async (
  userId,
  notificationType,
  title,
  message,
  redirectUrl,
) => {
  try {
    const newNotification = new NotificationModel({
      userId,
      notificationType,
      title,
      message,
      redirectUrl,
      isRead: false,
    });

    await newNotification.save();
    return;
  } catch (error) { }
};

//create bulk notification
const createBulkNotification = async (notifications) => {
  try {
    if (!notifications || notifications.length === 0) return;
    await NotificationModel.insertMany(notifications)
  } catch (error) {
    console.error("[createBulkNotification] Error:", error.message);
  }
}

export { createOneNotification, createBulkNotification }
