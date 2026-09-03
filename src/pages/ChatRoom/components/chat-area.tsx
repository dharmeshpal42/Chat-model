import { Box, CircularProgress, Divider, Typography } from "@mui/material";
import { format, isToday, isYesterday } from "date-fns";
import React, { useEffect, useRef } from "react";
import MessageBubble from "../../../components/MessageBubble";
import { useAuth } from "../../../context/AuthContext";
import { Message } from "../ChatRoom";


export interface ChatAreaProps {
  loading: boolean;
  messages: Message[];
  firstUnreadMessageId?: string | null;
  isRecipientOnline?: boolean;
  onRequestEdit?: (msg: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}
export const ChatArea = ({ loading, messages, firstUnreadMessageId, isRecipientOnline, onRequestEdit, onReact }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const { currentUser } = useAuth();
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy"); // e.g. August 18, 2025
  };

  // Only auto-scroll when a new message actually arrives at the end of the
  // list - not on every update to the array (a reaction or edit on any
  // existing message also produces a new `messages` reference, and jumping
  // the view to the bottom for those is jarring, especially if you're
  // scrolled up reading history).
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastMessage.id;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        minHeight: 0, // critical for flex scrolling
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        backgroundColor: (theme) => (theme.palette.mode === "dark" ? theme.palette.background.default : "aliceblue"),
        scrollbarWidth: "none",
        overscrollBehavior: "contain",
        "@media (max-width:600px)": {
          p: 1,
        },
        "@media (min-width:601px)": {
          p: 2,
        },
      }}
    >
      {loading ? (
        <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : messages.length === 0 ? (
        <Typography
          align="center"
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          Start a new conversation!
        </Typography>
      ) : (
        Object.entries(
          messages.reduce((groups, msg) => {
            // Robustly derive a Date for grouping; fall back to now to avoid a temporary "unknown" section
            let d: Date | null = null;
            try {
              const raw = (msg as any)?.timestamp;
              d = raw && typeof raw.toDate === "function" ? raw.toDate() : null;
            } catch {
              d = null;
            }
            const date = d && !isNaN(d.getTime()) ? d : new Date();
            const dateKey = format(date, "yyyy-MM-dd");
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {dateLabel}
                </Typography>
              </Divider>

              {/* Messages for this date */}
              {msgs.map((msg) => (
                <React.Fragment key={msg.id}>
                  {msg.id === firstUnreadMessageId && (
                    <Divider sx={{ "&::before, &::after": { borderColor: "primary.main" } }}>
                      <Typography
                        variant="caption"
                        sx={{ color: "primary.main", fontWeight: 600 }}
                      >
                        Unread Messages
                      </Typography>
                    </Divider>
                  )}
                  <MessageBubble
                    message={msg}
                    isOwnMessage={msg.senderId === currentUser?.uid}
                    onRequestEdit={onRequestEdit}
                    currentUserId={currentUser?.uid}
                    onReact={onReact}
                    isRecipientOnline={isRecipientOnline}
                  />
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};
