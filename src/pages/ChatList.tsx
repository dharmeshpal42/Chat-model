// src/pages/ChatList.tsx
import { AppBar, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemAvatar, ListItemText, Menu, MenuItem, Stack, Toolbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase/firebase";

import logo from "../assets/images/header-logo.png"; // Adjust the path as necessary

// Define a type for a user document
interface AppUser {
  id: string;
  name: string;
  avatar: string;
  email: string;
  lastSeen: {
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

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            // Ensure all required fields are present
            if (typeof data.name === "string" && typeof data.avatar === "string" && typeof data.email === "string" && typeof data.lastSeen === "object") {
              return {
                id: doc.id,
                name: data.name,
                avatar: data.avatar,
                email: data.email,
                lastSeen: data.lastSeen,
                uid: data.uid, // If you need uid elsewhere
              } as AppUser & { uid?: string };
            }
            return null;
          })
          .filter((user): user is AppUser => user?.id !== currentUser.uid);
        setLoading(false);
        setUsers(usersData);
      } catch (error) {
        setLoading(false);
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();

    // Listen for messages from all users to the current user
    const unsubscribes: (() => void)[] = [];
    const usersCollectionRef = collection(db, "users");
    const usersUnsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          if (change.doc.id !== currentUser.uid) {
            // Create a consistent chatId
            const chatID = [currentUser.uid, change.doc.id].sort().join("-");
            const messagesCollectionRef = collection(db, "chats", chatID, "messages");
            // Listen for all messages in each chat and filter unread ones in code
            const messagesUnsubscribe = onSnapshot(messagesCollectionRef, (messagesSnapshot) => {
              const unseenCount = messagesSnapshot.docs.filter((doc) => {
                const messageData = doc.data();
                // Ensure the message is sent by the other user and not yet read by the current user
                return messageData.senderId === change.doc.id && Array.isArray(messageData.readBy) && !messageData.readBy.includes(currentUser.uid);
              }).length;

              setUnseenMessageCounts((prevCounts) => ({
                ...prevCounts,
                [change.doc.id]: unseenCount,
              }));
            });
            unsubscribes.push(messagesUnsubscribe);
          }
        }
      });
    });
    unsubscribes.push(usersUnsubscribe);

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleChatSelect = async (otherUser: AppUser) => {
    if (!currentUser) return;

    // Create a consistent chatId by sorting the two UIDs
    const chatID = [currentUser.uid, otherUser.id].sort().join("-");
    navigate(`/chat/${chatID}`);
    // Removed unused setAnchorEl function
    // throw new Error("Function not implemented.");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", margin: "0 auto", height: "calc(100vh - 20px)", maxWidth: "500px", width: "100%" }}>
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
        <Box sx={{ display: "flex", justifyContent: "center", p: 4, height: "90vh" }}>
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
                    padding: "5px 10px",
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={user.avatar}
                      alt={user.name}
                      sx={{
                        border: "2px solid black",
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText primary={user.name} title={user.email} />
                  <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
                    {unseenMessageCounts[user.id] > 0 && (
                      <Box
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                        }}
                      >
                        {unseenMessageCounts[user.id]}
                      </Box>
                    )}
                  </Box>
                </ListItem>
              ))
            )}
          </List>
        </Box>
      )}

      <Stack
        justifyContent={"end"}
        alignItems={"end"}
        pr={1}
        sx={{
          backgroundColor: "aliceblue",
        }}
      >
        <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
          © {new Date().getFullYear()} All rights reserved.
          <br />
          Develop by <b>Dharmesh Pal</b>
        </Typography>
      </Stack>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to logout?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              handleLogout();
            }}
            color="error"
            variant="contained"
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatList;
