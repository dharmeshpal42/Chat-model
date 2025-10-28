// src/pages/ChatRoom.tsx
import { Box } from "@mui/material";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import MessageInput from "../../components/MessageInput";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import { ChatArea } from "./components/chat-area";
import { ChatAreaHeader } from "./components/chat-area-header";

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  avatar?: string;
  senderName?: string;
  readBy: string[]; // Add a readBy field
  edited?: boolean;
  updatedAt?: Timestamp;
}

const ChatRoom = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { currentUser, showOldChats } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState("");
  const [chatPhotoUrl, setChatPhotoUrl] = useState("");
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserLastSeenMs, setOtherUserLastSeenMs] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) return;

    let unsubscribeMessages: (() => void) | undefined;
    let unsubscribeUser: (() => void) | undefined;

    const fetchChatInfo = async () => {
      const otherUserId = chatId.split("-").find((id) => id !== currentUser?.uid);
      if (otherUserId) {
        // live subscribe to other user's profile to get name, avatar, lastSeen updates
        const userRef = doc(db, "users", otherUserId);
        unsubscribeUser = onSnapshot(userRef, (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data() as any;
            setChatName(data.name);
            setChatPhotoUrl(data.avatar);
            const ls = data.lastSeen;
            if (ls && typeof ls.toDate === "function") {
              setOtherUserLastSeenMs(ls.toDate().getTime());
            } else {
              setOtherUserLastSeenMs(null);
            }
          }
        });
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
          edited: Boolean(data.edited),
          updatedAt: data.updatedAt,
        };
      });

      // Conditionally filter by last 24 hours based on preference from context
      if (showOldChats) {
        setMessages(allMessages);
      } else {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const filtered = allMessages.filter((msg) => msg.timestamp?.toDate() > twentyFourHoursAgo);
        setMessages(filtered);
      }
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
      if (showOldChats) return; // No filtering when showing old chats
      setMessages((prev) => prev.filter((msg) => msg.timestamp?.toDate() > new Date(Date.now() - 24 * 60 * 60 * 1000)));
    }, 60 * 1000);

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeUser) unsubscribeUser();
      clearInterval(interval);
    };
  }, [chatId, currentUser?.uid, showOldChats]);

  // Listen to other user's typing status for this chat
  useEffect(() => {
    if (!chatId || !currentUser?.uid) return;
    const otherUserId = chatId.split("-").find((id) => id !== currentUser.uid);
    if (!otherUserId) return;

    const typingDocRef = doc(db, "chats", chatId, "typing", otherUserId);
    const unsub = onSnapshot(typingDocRef, (snap) => {
      const data = snap.data() as { isTyping?: boolean } | undefined;
      setOtherUserTyping(Boolean(data?.isTyping));
    });
    return () => unsub();
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

    if (editingMessage) {
      // Update existing message
      const msgRef = doc(db, "chats", chatId!, "messages", editingMessage.id);
      await updateDoc(msgRef, {
        text,
        edited: true,
        updatedAt: serverTimestamp(),
      });
      setEditingMessage(null);
    } else {
      // Add a new message
      await addDoc(collection(db, "chats", chatId!, "messages"), {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        avatar: currentUser.photoURL,
        senderName: currentUser.displayName,
        readBy: [currentUser.uid],
      });
    }

    // clear input
    setInputText("");

    // Update sender's lastSeen on send
    const meRef = doc(db, "users", currentUser.uid);
    await setDoc(meRef, { lastSeen: serverTimestamp() }, { merge: true }).catch(() => undefined);
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
      <ChatAreaHeader
        chatName={chatName}
        chatPhotoUrl={chatPhotoUrl}
        isTyping={otherUserTyping}
        lastSeenMs={otherUserLastSeenMs}
      />
      <ChatArea
        loading={loading}
        messages={messages}
        onRequestEdit={(msg) => {
          // only allow editing own message (defensive; also enforced in MessageBubble)
          if (msg.senderId !== currentUser?.uid) return;
          setEditingMessage(msg);
          setInputText(msg.text);
          // focus input after state updates microtask
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }}
      />
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "500px",
          width: "100%",
          backgroundColor: "#fff",
        }}
      >
        <MessageInput
          ref={inputRef}
          value={inputText}
          onChange={setInputText}
          onSendMessage={handleSendMessage}
          onTypingChange={async (isTyping) => {
            if (!chatId || !currentUser?.uid) return;
            try {
              const typingDocRef = doc(db, "chats", chatId, "typing", currentUser.uid);
              await setDoc(typingDocRef, { isTyping, updatedAt: serverTimestamp() }, { merge: true });
              // also nudge current user's lastSeen
              const meRef = doc(db, "users", currentUser.uid);
              await setDoc(meRef, { lastSeen: serverTimestamp() }, { merge: true });
            } catch (e) {
              // non-blocking
              console.warn("Failed to update typing state", e);
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default ChatRoom;
