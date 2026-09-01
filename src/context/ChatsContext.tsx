// src/context/ChatsContext.tsx
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";

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

interface ChatsContextType {
  users: AppUser[];
  loading: boolean;
  unseenMessageCounts: { [key: string]: number };
}

const ChatsContext = createContext<ChatsContextType | null>(null);

// Lives above the routes (mounted once per session in App.tsx) so navigating
// away from and back to the chat list doesn't re-subscribe/re-fetch and
// flash a loading state — it only reloads on an actual page refresh.
export const ChatsProvider = ({ children }: { children: ReactNode }) => {
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
    const messageUnsubscribes = new Map<string, () => void>();

    const chatsQuery = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
    const unsubscribeChats = onSnapshot(
      chatsQuery,
      async (chatsSnapshot) => {
        try {
          if (chatsSnapshot.empty) {
            setUsers([]);
            setLoading(false);
            return;
          }

          const partnerIds = new Set<string>();
          chatsSnapshot.forEach((chatDoc) => {
            const data = chatDoc.data() as { members?: string[] };
            const otherId = (data.members || []).find((m) => m !== currentUser.uid);
            if (otherId) partnerIds.add(otherId);
          });

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

          const currentChatIds = new Set<string>();
          chatsSnapshot.forEach((chatDoc) => {
            const chatId = chatDoc.id;
            currentChatIds.add(chatId);
            if (messageUnsubscribes.has(chatId)) return;

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
            messageUnsubscribes.set(chatId, unsub);
          });

          messageUnsubscribes.forEach((unsub, chatId) => {
            if (!currentChatIds.has(chatId)) {
              unsub();
              messageUnsubscribes.delete(chatId);
            }
          });
        } catch (e) {
          console.error("Error building chat list:", e);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error subscribing to chats:", err);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeChats();
      messageUnsubscribes.forEach((unsub) => unsub());
      messageUnsubscribes.clear();
    };
  }, [currentUser?.uid]);

  return <ChatsContext.Provider value={{ users, loading, unseenMessageCounts }}>{children}</ChatsContext.Provider>;
};

export const useChats = () => {
  const context = useContext(ChatsContext);
  if (!context) {
    throw new Error("useChats must be used within a ChatsProvider");
  }
  return context;
};
