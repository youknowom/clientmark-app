import NotificationModel from "../models/notificationModel.js";

//get notification
const getNotification = async (req, res) => {
  try {
    const loginUserId = req.user._id;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    // Auto-cleanup: Delete old motivational and reminder notifications from DB
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    await NotificationModel.deleteMany({
      userId: loginUserId,
      notificationType: { $in: ["motivational", "reminder"] },
      createdAt: { $lt: startOfToday },
    });

    //get notification
    const notifications = await NotificationModel.find({ userId: loginUserId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    //get coutn
    const count = await NotificationModel.countDocuments({
      userId: loginUserId,
      isRead: false,
    });

    return res.status(200).json({
      message: "Successfully get notification details.",
      data: {
        notifications: notifications || [],
        count: count || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//marked single notification as read
const markSingleRead = async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res
        .status(400)
        .json({ message: "Notification id is missing.", success: false });
    }

    const isUpdate = await NotificationModel.updateOne(
      { _id: notificationId },
      {
        $set: {
          isRead: true,
        },
      },
    );

    if (isUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to mark as read", success: false });
    }

    return res
      .status(200)
      .json({ message: "Successfully mark as read.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

export { getNotification, markSingleRead };
