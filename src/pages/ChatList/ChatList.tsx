// src/pages/ChatList.tsx
import { Box } from "@mui/material";

import { useChats } from "../../context/ChatsContext";

import { ChatListBottom } from "./components/chat-list-bottom";
import { ChatListHeader } from "./components/chat-list-header";
import UsersList from "./components/user-list";

export type { AppUser } from "../../context/ChatsContext";

const ChatList = () => {
  const { users, loading, unseenMessageCounts } = useChats();

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
