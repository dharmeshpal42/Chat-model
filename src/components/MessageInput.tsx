// src/components/MessageInput.tsx
import React, { useImperativeHandle, useRef, useState } from "react";
import { Box, TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  value?: string;
  onChange?: (text: string) => void;
  editing?: boolean;
  onCancelEdit?: () => void;
}

const MessageInput = React.forwardRef<HTMLInputElement, MessageInputProps>(({ onSendMessage, onTypingChange, value, onChange, editing, onCancelEdit }, ref) => {
  const [internalMessage, setInternalMessage] = useState("");
  const typingTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const handleSend = () => {
    const text = (value ?? internalMessage).trim();
    if (text) {
      onSendMessage(text);
      if (onChange) onChange("");
      else setInternalMessage("");
      // stop typing after send
      if (onTypingChange) onTypingChange(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onChange) onChange(val);
    else setInternalMessage(val);
    if (onTypingChange) {
      // Immediate signal: typing started if not empty
      onTypingChange(Boolean(val.trim()));
      // Debounce stop typing after inactivity
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        onTypingChange(false);
      }, 1500);
    }
  };

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        backgroundColor: "background.paper",
        p: 1,
        display: "flex",
        alignItems: "center",
      }}
    >
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Type a message..."
        value={value ?? internalMessage}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        size="small"
        sx={{ mr: 1, "& .MuiOutlinedInput-root": { borderRadius: "25px" } }}
        onBlur={() => onTypingChange?.(false)}
        inputRef={inputRef}
      />
      <IconButton
        color="primary"
        onClick={handleSend}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
});

export default MessageInput;
