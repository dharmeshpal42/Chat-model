// src/pages/ChatList.tsx
import { Box } from "@mui/material";
import { useEffect, useState } from "react";

import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";

import { ChatListBottom } from "./components/chat-list-bottom";
import { ChatListHeader } from "./components/chat-list-header";
import UsersList from "./components/user-list";

// Define a type for a user document
export interface AppUser {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  lastSeen?: {
    seconds: number;
    nanoseconds: number;
  };
}
const ChatList = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [unseenMessageCounts, setUnseenMessageCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Subscribe to chats where the current user is a member
    const chatsQuery = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
    const unsubscribeChats = onSnapshot(
      chatsQuery,
      async (chatsSnapshot) => {
        try {
          // If no chats, do not show any users
          if (chatsSnapshot.empty) {
            setUsers([]);
            setLoading(false);
            return;
          }

          // Build a unique set of partner IDs from chats
          const partnerIds = new Set<string>();
          chatsSnapshot.forEach((chatDoc) => {
            const data = chatDoc.data() as { members?: string[] };
            const otherId = (data.members || []).find((m) => m !== currentUser.uid);
            if (otherId) partnerIds.add(otherId);
          });

          // Fetch partner profiles
          const partnerFetches = Array.from(partnerIds).map(async (partnerId) => {
            const uDoc = await getDoc(doc(db, "users", partnerId));
            const u = uDoc.data() || ({} as any);
            const name = typeof u.name === "string" ? u.name : typeof u.email === "string" ? u.email : "User";
            const avatar = typeof u.avatar === "string" ? u.avatar : "";
            const email = typeof u.email === "string" ? u.email : undefined;
            const lastSeen = typeof u.lastSeen === "object" ? u.lastSeen : undefined;
            return {
              id: partnerId,
              name,
              avatar,
              email,
              lastSeen,
            } as AppUser;
          });

          const partners = (await Promise.all(partnerFetches)).filter((p): p is AppUser => !!p);
          setUsers(partners);
          setLoading(false);

          // Setup unseen message listeners per chat
          // First, clear any previous listeners
          unsubscribes.forEach((u) => u());
          unsubscribes.length = 0;

          chatsSnapshot.forEach((chatDoc) => {
            const chatId = chatDoc.id;
            const data = chatDoc.data() as { members?: string[] };
            const otherId = (data.members || []).find((m) => m !== currentUser.uid);
            if (!otherId) return;
            const messagesCol = collection(db, "chats", chatId, "messages");
            const unsub = onSnapshot(messagesCol, (messagesSnapshot) => {
              const unseen = messagesSnapshot.docs.filter((d) => {
                const md = d.data();
                return md.senderId === otherId && Array.isArray(md.readBy) && !md.readBy.includes(currentUser.uid);
              }).length;
              setUnseenMessageCounts((prev) => ({ ...prev, [otherId]: unseen }));
            });
            unsubscribes.push(unsub);
          });
        } catch (e) {
          console.error("Error building chat list:", e);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error subscribing to chats:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeChats();
      unsubscribes.forEach((u) => u());
    };
  }, [currentUser?.uid]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        // Use dynamic viewport units to handle Safari's URL bar
        height: "100dvh",
        // Fallback for older iOS Safari
        minHeight: "-webkit-fill-available",
        maxWidth: "500px",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <ChatListHeader />
      {/* Middle scrollable area */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <UsersList
          loading={loading}
          users={users}
          unseenMessageCounts={unseenMessageCounts}
        />
      </Box>
      <ChatListBottom />
    </Box>
  );
};

export default ChatList;
