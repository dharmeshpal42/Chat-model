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

export interface LastMessagePreview {
  text: string;
  senderId: string;
  timestampMs: number;
  isRead: boolean;
}

interface ChatsContextType {
  users: AppUser[];
  loading: boolean;
  unseenMessageCounts: { [key: string]: number };
  onlineUserIds: Set<string>;
  lastMessages: { [key: string]: LastMessagePreview };
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
  // Driven directly by Firestore's users/{uid}.online field, which a Cloud
  // Function keeps accurate from Realtime Database's onDisconnect() - no
  // client-side staleness timer needed, this updates the moment the server
  // notices a real disconnect.
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastMessages, setLastMessages] = useState<{ [key: string]: LastMessagePreview }>({});

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const messageUnsubscribes = new Map<string, () => void>();
    const userUnsubscribes = new Map<string, () => void>();

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

              let latest: LastMessagePreview | null = null;
              messagesSnapshot.docs.forEach((d) => {
                const md = d.data();
                const ts = md.timestamp?.toMillis?.() ?? 0;
                if (!latest || ts > latest.timestampMs) {
                  const readBy: string[] = Array.isArray(md.readBy) ? md.readBy : [];
                  latest = {
                    text: typeof md.text === "string" ? md.text : "",
                    senderId: md.senderId,
                    timestampMs: ts,
                    isRead: readBy.some((uid) => uid !== md.senderId),
                  };
                }
              });
              if (latest) {
                setLastMessages((prev) => ({ ...prev, [otherId]: latest as LastMessagePreview }));
              }

              setUnseenMessageCounts((prev) => {
                const previous = prev[otherId] ?? 0;
                // Safari's Firestore listener can briefly reconnect and replay a
                // stale/incomplete cached snapshot before the real server-confirmed
                // one arrives. Only trust a decrease once it's server-confirmed, so
                // that hiccup can't flash the badge to 0 and back.
                if (unseen < previous && messagesSnapshot.metadata.fromCache) {
                  return prev;
                }
                return { ...prev, [otherId]: unseen };
              });
            });
            messageUnsubscribes.set(chatId, unsub);

            if (!userUnsubscribes.has(otherId)) {
              const userUnsub = onSnapshot(doc(db, "users", otherId), (userSnap) => {
                const isOnline = Boolean(userSnap.data()?.online);
                setOnlineUserIds((prev) => {
                  const wasOnline = prev.has(otherId);
                  if (isOnline === wasOnline) return prev;
                  const next = new Set(prev);
                  if (isOnline) next.add(otherId);
                  else next.delete(otherId);
                  return next;
                });
              });
              userUnsubscribes.set(otherId, userUnsub);
            }
          });

          messageUnsubscribes.forEach((unsub, chatId) => {
            if (!currentChatIds.has(chatId)) {
              unsub();
              messageUnsubscribes.delete(chatId);
            }
          });

          userUnsubscribes.forEach((unsub, partnerId) => {
            if (!partnerIds.has(partnerId)) {
              unsub();
              userUnsubscribes.delete(partnerId);
              setOnlineUserIds((prev) => {
                if (!prev.has(partnerId)) return prev;
                const next = new Set(prev);
                next.delete(partnerId);
                return next;
              });
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
      userUnsubscribes.forEach((unsub) => unsub());
      userUnsubscribes.clear();
    };
  }, [currentUser?.uid]);

  return <ChatsContext.Provider value={{ users, loading, unseenMessageCounts, onlineUserIds, lastMessages }}>{children}</ChatsContext.Provider>;
};

export const useChats = () => {
  const context = useContext(ChatsContext);
  if (!context) {
    throw new Error("useChats must be used within a ChatsProvider");
  }
  return context;
};
