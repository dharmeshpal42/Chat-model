import { Fab, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import { TextField } from "@mui/material";
import CustomModal from "../../../components/CustomModals/CustomModal";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { AppUser } from "../ChatList";
import { useNavigate } from "react-router-dom";
import { db } from "../../../firebase/firebase";

export const ChatListBottom = () => {
  const navigate = useNavigate();

  const [addChatOpen, setAddChatOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const { currentUser } = useAuth();

  const openAddChat = () => {
    setInviteEmail("");
    setInviteError("");
    setAddChatOpen(true);
  };
  const closeAddChat = () => {
    if (!inviteLoading) setAddChatOpen(false);
  };
  const handleChatSelect = async (otherUser: AppUser) => {
    if (!currentUser) return;

    // Create a consistent chatId by sorting the two UIDs
    const chatID = [currentUser.uid, otherUser.id].sort().join("-");
    // Do NOT create the chat document here. It will be created on first message send in ChatRoom.
    navigate(`/chat/${chatID}`);
  };

  const isValidEmail = (email: string) => {
    return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email.toLowerCase());
  };

  const handleSubmitInvite = async () => {
    setInviteError("");
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError("Email is required");
      return;
    }
    if (!isValidEmail(email)) {
      setInviteError("Enter a valid email address");
      return;
    }
    if (!currentUser?.uid) {
      setInviteError("You must be logged in");
      return;
    }
    try {
      setInviteLoading(true);
      const qSnap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
      if (qSnap.empty) {
        setInviteError("No user found with this email");
        return;
      }
      const d = qSnap.docs[0];
      const uid = d.id;
      if (uid === currentUser.uid) {
        setInviteError("You cannot start a chat with yourself");
        return;
      }
      const u = d.data() || ({} as any);
      const name = typeof u.name === "string" ? u.name : typeof u.email === "string" ? u.email : "User";
      const avatar = typeof u.avatar === "string" ? u.avatar : "";
      const emailField = typeof u.email === "string" ? u.email : undefined;
      const otherUser: AppUser = { id: uid, name, avatar, email: emailField };
      await handleChatSelect(otherUser);
      setAddChatOpen(false);
    } catch (e) {
      console.error("Error finding user by email:", e);
      setInviteError("Something went wrong. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <>
      <Stack
        direction={"row-reverse"}
        justifyContent={"space-between"}
        alignItems={"center"}
        p={1}
        sx={{
          backgroundColor: (theme) => (theme.palette.mode === "dark" ? "#000000" : theme.palette.primary.main),
          borderRadius: "10px 10px 0 0",
        }}
      >
        {/* Floating Action Button to start a new chat by email */}
        <Fab
          size="small"
          color="primary"
          aria-label="start chat"
          onClick={openAddChat}
        >
          <AddIcon />
        </Fab>
        <Typography
          variant="caption"
          align="center"
          sx={{
            mt: 2,
            color: (theme) => (theme.palette.mode === "dark" ? theme.palette.getContrastText("#000000") : theme.palette.getContrastText(theme.palette.primary.main)),
          }}
        >
          © {new Date().getFullYear()} All rights reserved.
          <br />
          Develop by <b>Dharmesh Pal</b>
        </Typography>
      </Stack>

      <CustomModal
        open={addChatOpen}
        onClose={closeAddChat}
        title="Start a new chat"
        onCancel={closeAddChat}
        onConfirm={() => {
          // Run validation and submission; modal will close itself on success
          handleSubmitInvite();
        }}
        buttonLoading={inviteLoading}
        loadingText="Checking..."
        confirmButtonText="Start Chat"
        cancelButtonText="Cancel"
      >
        <TextField
          autoFocus
          margin="dense"
          label="User email"
          type="email"
          size="small"
          fullWidth
          value={inviteEmail}
          onChange={(e) => {
            setInviteEmail(e.target.value);
            if (inviteError) setInviteError("");
          }}
          error={!!inviteError}
          helperText={inviteError || "Enter the email of the user you want to chat with"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmitInvite();
            }
          }}
        />
      </CustomModal>
    </>
  );
};
