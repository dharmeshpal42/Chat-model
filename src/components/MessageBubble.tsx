// src/components/MessageBubble.tsx
import React from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  avatar?: string;
  senderName?: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => {
  const formattedTime = message.timestamp ? format(message.timestamp.toDate(), "h:mm a") : "";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        gap: 1,
      }}
    >
      {!isOwnMessage && <Avatar src={message.avatar} alt={message.senderName} sx={{ width: 30, height: 30 }} />}
      <Box
        sx={{
          maxWidth: "75%",
          p: "5px 8px",
          borderRadius: "10px",
          backgroundColor: isOwnMessage ? "secondary.main" : "#e0e0e0",
          color: isOwnMessage ? "white" : "black",
          wordBreak: "break-word",
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontSize: {
              xs: "13px", // 600px and below
              sm: "1rem", // above 600px (default)
            },
          }}
        >
          {message.text}
        </Typography>
        <Typography variant="caption" display="block" sx={{ textAlign: "right", fontSize: "9px", color: isOwnMessage ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)" }}>
          {formattedTime}
        </Typography>
      </Box>
    </Box>
  );
};

export default MessageBubble;
