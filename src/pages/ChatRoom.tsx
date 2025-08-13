// src/pages/ChatRoom.tsx
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AppBar, Avatar, Box, CircularProgress, IconButton, Toolbar, Typography } from "@mui/material";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  avatar?: string;
  senderName?: string;
}

const ChatRoom = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;

    const otherUserId = chatId.split("-").find((id) => id !== currentUser?.uid);
    const fetchChatInfo = async () => {
      if (otherUserId) {
        const userDoc = await getDoc(doc(db, "users", otherUserId));
        if (userDoc.exists()) {
          setChatName(userDoc.data().name);
        }
      }
    };
    fetchChatInfo();

    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(fetchedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (text.trim() === "" || !currentUser) return;
    await addDoc(collection(db, "chats", chatId!, "messages"), {
      senderId: currentUser.uid,
      text,
      timestamp: serverTimestamp(),
      avatar: currentUser.photoURL,
      senderName: currentUser.displayName,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const APP_BAR_HEIGHT = 64; // Adjust for mobile if needed
  const INPUT_HEIGHT = 60; // Height of MessageInput

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "500px",
        mx: "auto",
        border: "1px solid #ccc",
        height: "100%", // Let body/html control height
      }}
    >
      {/* Fixed AppBar */}
      <AppBar
        position="fixed"
        sx={{
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "500px",
          width: "100%",
          borderBottom: "1px solid #ccc",
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
            <Avatar sx={{ mr: 1 }} />
            <Typography variant="h6">{chatName || "Chat"}</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Scrollable messages area */}
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
          "@media (max-width:600px)": {
            height: "calc(100vh - 124px)",
            p: 1,
          },
          "@media (min-width:601px)": {
            height: "calc(100vh - 200px)",
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
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === currentUser?.uid} />)
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Fixed input bar */}
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
