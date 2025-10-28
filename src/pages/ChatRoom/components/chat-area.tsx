import { Box, CircularProgress, Divider, Typography } from "@mui/material";
import { format, isToday, isYesterday } from "date-fns";
import React, { useEffect, useRef } from "react";
import MessageBubble from "../../../components/MessageBubble";
import { useAuth } from "../../../context/AuthContext";
import { Message } from "../ChatRoom";
const APP_BAR_HEIGHT = 64;
const INPUT_HEIGHT = 60;

export interface ChatAreaProps {
  loading: boolean;
  messages: Message[];
  onRequestEdit?: (msg: Message) => void;
}
export const ChatArea = ({ loading, messages, onRequestEdit }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useAuth();
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy"); // e.g. August 18, 2025
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
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
          height: "calc(100vh - 125px)",
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
        <Typography align="center" color="text.secondary" sx={{ mt: 2 }}>
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
                <Typography variant="caption" color="text.secondary">
                  {dateLabel}
                </Typography>
              </Divider>

              {/* Messages for this date */}
              {msgs.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.senderId === currentUser?.uid}
                  onRequestEdit={onRequestEdit}
                />
              ))}
            </React.Fragment>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};
