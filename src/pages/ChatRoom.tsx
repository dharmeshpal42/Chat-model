// src/pages/ChatRoom.tsx
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AppBar, Avatar, Box, CircularProgress, IconButton, Toolbar, Typography } from "@mui/material";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";

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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        maxWidth: "500px",
        mx: "auto",
        border: "1px solid #ccc",
      }}
    >
      <AppBar
        position="static"
        sx={{
          border: "1px solid #ccc",
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
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
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
      <MessageInput onSendMessage={handleSendMessage} />
    </Box>
  );
};

export default ChatRoom;
