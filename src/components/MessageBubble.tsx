import React, { useRef, useState } from "react";
import { Box, Typography, Avatar, Popover } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { format } from "date-fns";
import type { Message } from "../pages/ChatRoom/ChatRoom";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const TRIPLE_CLICK_WINDOW_MS = 500;

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  currentUserId?: string;
  isRecipientOnline?: boolean;
  onRequestEdit?: (msg: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const MessageBubble = ({ message, isOwnMessage, currentUserId, isRecipientOnline, onRequestEdit, onReact }: MessageBubbleProps) => {
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);

  // Triple-click/triple-tap opens the reaction picker. Double-click is
  // already used to edit your own message, so reactions need a gesture that
  // doesn't collide with it - and unlike long-press, a plain click sequence
  // never triggers the mobile browser's native text-selection highlight.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    clickCountRef.current += 1;
    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setPickerAnchor(target);
      return;
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, TRIPLE_CLICK_WINDOW_MS);
  };

  const handlePickReaction = (emoji: string) => {
    onReact?.(message.id, emoji);
    setPickerAnchor(null);
  };

  const reactionCounts = Object.values(message.reactions || {}).reduce<Record<string, number>>((acc, emoji) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});
  const myReaction = currentUserId ? message.reactions?.[currentUserId] : undefined;

  // Read receipt, own messages only: read (someone other than the sender is
  // in readBy) beats online (assumed delivered, since a connected recipient
  // would already have synced it via the live listener) beats sent-only.
  const isReadByRecipient = message.readBy.some((uid) => uid !== message.senderId);

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
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setPickerAnchor(e.currentTarget);
        }}
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
          {isOwnMessage &&
            (isReadByRecipient ? (
              <DoneAllIcon sx={{ fontSize: 14, color: "#80d8ff", flexShrink: 0 }} />
            ) : isRecipientOnline ? (
              <DoneAllIcon sx={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)", flexShrink: 0 }} />
            ) : (
              <DoneIcon sx={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)", flexShrink: 0 }} />
            ))}
        </Box>
        {Object.keys(reactionCounts).length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "3px",
              position: "absolute",
              bottom: "-8px",
              [isOwnMessage ? "left" : "right"]: "-8px",
            }}
          >
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <Box
                key={emoji}
                onClick={() => handlePickReaction(emoji)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  fontSize: "10px",
                  lineHeight: 1,
                  minWidth: 22,
                  height: 22,
                  px: count > 1 ? "6px" : 0,
                  borderRadius: "999px",
                  cursor: "pointer",
                  backgroundColor: "background.paper",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  border: (theme) => (myReaction === emoji ? `1.5px solid ${theme.palette.primary.main}` : "none"),
                  color: "text.primary",
                }}
              >
                <span>{emoji}</span>
                {count > 1 && (
                  <Typography
                    component="span"
                    sx={{ fontSize: "10px", fontWeight: 600 }}
                  >
                    {count}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Popover
        open={Boolean(pickerAnchor)}
        anchorEl={pickerAnchor}
        onClose={() => setPickerAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Box sx={{ display: "flex", gap: 0.5, p: 0.5 }}>
          {QUICK_REACTIONS.map((emoji) => (
            <Box
              key={emoji}
              onClick={() => handlePickReaction(emoji)}
              sx={{
                fontSize: "22px",
                lineHeight: 1,
                p: 0.5,
                borderRadius: "50%",
                cursor: "pointer",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              {emoji}
            </Box>
          ))}
        </Box>
      </Popover>
    </Box>
  );
};

export default MessageBubble;
