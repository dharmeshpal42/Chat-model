// src/pages/ChatRoom.tsx
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AppBar, Avatar, Box, CircularProgress, Divider, IconButton, Toolbar, Typography } from "@mui/material";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, writeBatch } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { format, isToday, isYesterday } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  avatar?: string;
  senderName?: string;
  readBy: string[]; // Add a readBy field
}

const ChatRoom = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState("");
  const [chatPhotoUrl, setChatPhotoUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) return;

    let unsubscribeMessages: (() => void) | undefined;

    const fetchChatInfo = async () => {
      const otherUserId = chatId.split("-").find((id) => id !== currentUser?.uid);
      if (otherUserId) {
        const userDoc = await getDoc(doc(db, "users", otherUserId));
        if (userDoc.exists()) {
          setChatName(userDoc.data().name);
          setChatPhotoUrl(userDoc.data().avatar);
        }
      }
    };

    fetchChatInfo();

    // Set up a real-time listener for messages in the chat
    const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));

    unsubscribeMessages = onSnapshot(messagesQuery, async (snapshot) => {
      const allMessages: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp,
          avatar: data.avatar,
          senderName: data.senderName,
          readBy: data.readBy || [],
        };
      });

      // Filter messages to show only the ones from the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const filtered = allMessages.filter((msg) => msg.timestamp?.toDate() > twentyFourHoursAgo);
      setMessages(filtered);
      setLoading(false);

      // --- NEW LOGIC TO MARK MESSAGES AS READ ---
      const unreadMessages = allMessages.filter((msg) => msg.senderId !== currentUser.uid && !msg?.readBy.includes(currentUser.uid));

      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach((msg) => {
          const messageRef = doc(db, "chats", chatId, "messages", msg.id);
          batch.update(messageRef, {
            readBy: [...msg.readBy, currentUser.uid],
          });
        });
        await batch.commit().catch((error) => {
          console.error("Failed to update message read status:", error);
        });
      }
      // --- END OF NEW LOGIC ---
    });

    // Re-apply 24h filter every 1 minute
    const interval = setInterval(() => {
      setMessages((prev) => prev.filter((msg) => msg.timestamp?.toDate() > new Date(Date.now() - 24 * 60 * 60 * 1000)));
    }, 60 * 1000);

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      clearInterval(interval);
    };
  }, [chatId, currentUser?.uid]);

  const handleSendMessage = async (text: string) => {
    if (text.trim() === "" || !currentUser) return;
    // Ensure a chat document exists and update metadata
    const otherUserId = chatId!.split("-").find((id) => id !== currentUser.uid);
    const chatRef = doc(db, "chats", chatId!);
    await setDoc(
      chatRef,
      {
        members: [currentUser.uid, otherUserId].filter(Boolean),
        updatedAt: serverTimestamp(),
        lastMessage: {
          text: text.slice(0, 200),
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
        },
      },
      { merge: true }
    );

    // Add the message
    await addDoc(collection(db, "chats", chatId!, "messages"), {
      senderId: currentUser.uid,
      text,
      timestamp: serverTimestamp(),
      avatar: currentUser.photoURL,
      senderName: currentUser.displayName,
      readBy: [currentUser.uid],
    });
  };

  const APP_BAR_HEIGHT = 64;
  const INPUT_HEIGHT = 60;
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy"); // e.g. August 18, 2025
  };
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "500px",
        mx: "auto",
        border: "1px solid #ccc",
        height: "100%",
      }}
    >
      <AppBar
        position="fixed"
        sx={{
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "500px",
          width: "100%",
          borderBottomLeftRadius: "10px",
          borderBottomRightRadius: "10px",
        }}
      >
        <Toolbar
          sx={{
            padding: "10px 16px",
          }}
        >
          <IconButton color="inherit" onClick={() => navigate(-1)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: { xs: 1, sm: 2 },
            }}
          >
            <Avatar
              src={chatPhotoUrl}
              alt={chatName}
              sx={{
                mr: 1,
                border: "2px solid white",
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "16px", sm: "inherit" },
              }}
            >
              {chatName || "Chat"}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          position: "absolute",
          top: APP_BAR_HEIGHT,
          bottom: INPUT_HEIGHT,
          left: 0,
          right: 0,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          height: "calc(100vh - 124px)",
          backgroundColor: "aliceblue",
          scrollbarWidth: "none",
          "@media (max-width:600px)": {
            height: "calc(100vh - 195px)",
            p: 1,
          },
          "@media (min-width:601px)": {
            height: "calc(100vh - 125px)",
            p: 2,
          },
        }}
      >
        {loading ? (
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ mt: 2 }}>
            Start a new conversation!
          </Typography>
        ) : (
          Object.entries(
            messages.reduce((groups, msg) => {
              const date = msg.timestamp?.toDate();
              const dateKey = date ? format(date, "yyyy-MM-dd") : "unknown";
              if (!groups[dateKey]) groups[dateKey] = [];
              groups[dateKey].push(msg);
              return groups;
            }, {} as Record<string, Message[]>)
          ).map(([dateKey, msgs]) => {
            const dateLabel = getDateLabel(new Date(dateKey));
            return (
              <React.Fragment key={dateKey}>
                {/* Date Divider */}
                <Divider>
                  <Typography variant="caption" color="text.secondary">
                    {dateLabel}
                  </Typography>
                </Divider>

                {/* Messages for this date */}
                {msgs.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === currentUser?.uid} />
                ))}
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "500px",
          width: "100%",
          borderTop: "1px solid #ccc",
          backgroundColor: "#fff",
        }}
      >
        <MessageInput onSendMessage={handleSendMessage} />
      </Box>
    </Box>
  );
};

export default ChatRoom;
