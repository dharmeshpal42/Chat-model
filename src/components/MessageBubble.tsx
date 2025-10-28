import React from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { format } from "date-fns";
import type { Message } from "../pages/ChatRoom/ChatRoom";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onRequestEdit?: (msg: Message) => void;
}

const MessageBubble = ({ message, isOwnMessage, onRequestEdit }: MessageBubbleProps) => {

  // Defensive time formatting to avoid "Invalid time value" errors
  const tsToDate = () => {
    try {
      // Firestore Timestamp has toDate(); guard for placeholders/nulls
      const d = (message as any)?.timestamp && typeof (message as any).timestamp.toDate === "function"
        ? (message as any).timestamp.toDate()
        : null;
      return d && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  };
  const safeDate = tsToDate();
  // Use local time as a temporary fallback to avoid layout shift while server timestamp resolves
  const formattedTime = format((safeDate ?? new Date()), "h:mm a");

  const handleDoubleClick = () => {
    if (!isOwnMessage) return;
    onRequestEdit?.(message);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        gap: 1,
      }}
    >
      {!isOwnMessage && (
        <Avatar
          src={message.avatar}
          alt={message.senderName}
          sx={{ width: 30, height: 30, border: "2px solid white" }}
        />
      )}
      <Box
        sx={{
          maxWidth: "75%",
          p: "5px 8px",
          borderRadius: "10px",
          backgroundColor: isOwnMessage ? "secondary.main" : "#e0e0e0",
          color: isOwnMessage ? "white" : "black",
          wordBreak: "break-word",
          position: "relative",
        }}
        onDoubleClick={handleDoubleClick}
      >
        <Typography
          variant="body1"
          sx={{
            fontSize: {
              xs: "13px",
              sm: "1rem",
            },
          }}
        >
          {message.text}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: "9px",
              color: isOwnMessage ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
              display: 'block',
              lineHeight: 1.2,
              minHeight: 12,
            }}
          >
            {formattedTime}
            <Box component="span" sx={{ visibility: Boolean((message as any).edited) ? 'visible' : 'hidden' }}>
              {" "}· edited
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default MessageBubble;
