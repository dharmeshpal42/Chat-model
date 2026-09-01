const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

// Fires automatically whenever a new chat message document is created.
// Sends a real FCM push to the recipient's device, which is what actually
// wakes a notification while the app is backgrounded/closed/locked - the
// client alone cannot do this, it has no way to run code once its page
// or service worker isn't active.
exports.sendMessageNotification = onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const message = snapshot.data();
  const { chatId } = event.params;

  const chatSnap = await admin.firestore().doc(`chats/${chatId}`).get();
  const members = chatSnap.data()?.members || [];
  const recipientId = members.find((id) => id !== message.senderId);
  if (!recipientId) return;

  const recipientSnap = await admin.firestore().doc(`users/${recipientId}`).get();
  const token = recipientSnap.data()?.fcmToken;
  if (!token) return;

  const title = message.senderName || "New Message";
  const body = typeof message.text === "string" ? message.text.slice(0, 120) : "You have a new message";

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: { link: `/chat/${chatId}` },
    });
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
});
