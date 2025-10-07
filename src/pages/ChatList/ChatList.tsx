// src/pages/ChatList.tsx
import AddIcon from "@mui/icons-material/Add";
import { AppBar, Avatar, Badge, Box, CircularProgress, Fab, IconButton, List, ListItem, ListItemAvatar, ListItemText, Menu, MenuItem, Stack, TextField, Toolbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../firebase/firebase";

import CustomModal from "../../components/CustomModals/CustomModal";
import logo from "../../assets/images/header-logo.png"; // Adjust the path as necessary

// Define a type for a user document
interface AppUser {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  lastSeen?: {
    seconds: number;
    nanoseconds: number;
  };
}
const ChatList = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unseenMessageCounts, setUnseenMessageCounts] = useState<{ [key: string]: number }>({});
  const [addChatOpen, setAddChatOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Subscribe to chats where the current user is a member
    const chatsQuery = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
    const unsubscribeChats = onSnapshot(
      chatsQuery,
      async (chatsSnapshot) => {
        try {
          // If no chats, do not show any users
          if (chatsSnapshot.empty) {
            setUsers([]);
            setLoading(false);
            return;
          }

          // Build a unique set of partner IDs from chats
          const partnerIds = new Set<string>();
          chatsSnapshot.forEach((chatDoc) => {
            const data = chatDoc.data() as { members?: string[] };
            const otherId = (data.members || []).find((m) => m !== currentUser.uid);
            if (otherId) partnerIds.add(otherId);
          });

          // Fetch partner profiles
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
          console.log("🚀  ~ ChatList  ~ partners:", partners);
          setUsers(partners);
          setLoading(false);

          // Setup unseen message listeners per chat
          // First, clear any previous listeners
          unsubscribes.forEach((u) => u());
          unsubscribes.length = 0;

          chatsSnapshot.forEach((chatDoc) => {
            const chatId = chatDoc.id;
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
            unsubscribes.push(unsub);
          });
        } catch (e) {
          console.error("Error building chat list:", e);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error subscribing to chats:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeChats();
      unsubscribes.forEach((u) => u());
    };
  }, [currentUser?.uid]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };
  const openAddChat = () => {
    setInviteEmail("");
    setInviteError("");
    setAddChatOpen(true);
  };
  const closeAddChat = () => {
    if (!inviteLoading) setAddChatOpen(false);
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
  const handleChatSelect = async (otherUser: AppUser) => {
    if (!currentUser) return;

    // Create a consistent chatId by sorting the two UIDs
    const chatID = [currentUser.uid, otherUser.id].sort().join("-");
    // Do NOT create the chat document here. It will be created on first message send in ChatRoom.
    navigate(`/chat/${chatID}`);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", margin: "0 auto", height: "100vh", maxWidth: "500px", width: "100%" }}>
      <AppBar position="static" sx={{ borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px", zIndex: 99, boxShadow: "unset" }}>
        <Toolbar
          sx={{
            padding: "10px 16px",
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <Stack
              alignItems={"center"}
              justifyContent={"center"}
              sx={{
                width: "40px",
                height: "40px",
                marginRight: "10px",
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "white",
              }}
            >
              <img src={logo} alt="Logo" style={{ width: "80%", height: "80%", objectFit: "cover" }} />
            </Stack>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                textTransform: "capitalize",
                fontSize: { xs: "18px", sm: "inherit" },
              }}
            >
              {currentUser?.displayName ? `${currentUser.displayName}` : ""}
            </Typography>
          </Box>
          {/* Profile Avatar with Menu */}
          <Box>
            <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} size="large" sx={{ p: 0 }}>
              <Avatar
                src={currentUser?.photoURL || ""}
                alt={currentUser?.displayName || ""}
                title={currentUser?.displayName || ""}
                sx={{
                  border: "2px solid white",
                }}
              />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  setConfirmOpen(true);
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4, height: "90vh", backgroundColor: "aliceblue" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ overflowY: "auto", width: "100%", maxWidth: "500px", mx: "auto", pt: 3, height: "90vh", backgroundColor: "aliceblue", marginTop: "-15px" }}>
          <List
            sx={{
              padding: { xs: "0 15px", sm: "0 40px" },
            }}
          >
            {users.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
                No other users found.
              </Typography>
            ) : (
              users.map((user) => (
                <ListItem
                  component={"button"}
                  key={user.id}
                  onClick={() => handleChatSelect(user)}
                  sx={{
                    marginTop: 1,
                    cursor: "pointer",
                    padding: "10px 15px",
                    borderRadius: "10px",
                    border: "2px solid #00000064",

                    "&:hover": {
                      backgroundColor: "#f0f0f0",
                    },
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Badge
                    badgeContent={unseenMessageCounts[user.id]}
                    color="primary"
                    invisible={unseenMessageCounts[user.id] <= 0}
                    anchorOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                    sx={{
                      "& .MuiBadge-badge": {
                        top: "3px",
                        right: "20px",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={user.avatar}
                        alt={user.name}
                        sx={{
                          border: "2px solid #00000064",
                        }}
                      />
                    </ListItemAvatar>
                  </Badge>
                  <ListItemText primary={user.name} title={user.email} sx={{ ml: 2 }} />
                </ListItem>
              ))
            )}
          </List>
        </Box>
      )}

      <Stack
        direction={"row-reverse"}
        justifyContent={"space-between"}
        alignItems={"center"}
        p={1}
        sx={{
          backgroundColor: "#1976d2",
          borderRadius: "10px 10px 0 0",
        }}
      >
        {/* Floating Action Button to start a new chat by email */}
        <Fab
          color="primary"
          aria-label="start chat"
          onClick={openAddChat}
          sx={{
            background: "#00000064",
          }}
        >
          <AddIcon />
        </Fab>
        <Typography variant="caption" color="white" align="center" sx={{ mt: 2 }}>
          © {new Date().getFullYear()} All rights reserved.
          <br />
          Develop by <b>Dharmesh Pal</b>
        </Typography>
      </Stack>

      {/* Confirmation Dialog */}

      <CustomModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Logout"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          handleLogout();
        }}
        buttonLoading={loading}
        loadingText="Logging out..."
        confirmButtonText="Logout"
        cancelButtonText="Cancel"
      >
        <Typography>Are you sure you want to logout?</Typography>
      </CustomModal>

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
    </Box>
  );
};

export default ChatList;
