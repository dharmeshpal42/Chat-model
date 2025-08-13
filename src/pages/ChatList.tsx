// src/pages/ChatList.tsx
import { AppBar, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemAvatar, ListItemText, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase/firebase";

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
  console.log("🚀  ~ ChatList  ~ currentUser:", currentUser?.photoURL);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
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
        console.log("🚀  ~ fetchUsers  ~ usersData:", usersData);
        setUsers(usersData);
      } catch (error) {
        setLoading(false);
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 150px)", margin: "0 auto", maxWidth: "500px", width: "100%" }}>
      <AppBar position="static" sx={{ border: "1px solid #ccc" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            New Chat {currentUser?.displayName ? `- ${currentUser.displayName}` : ""}
          </Typography>
          {/* Profile Avatar with Menu */}
          <Box>
            <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} size="large" sx={{ p: 0 }}>
              <Avatar src={currentUser?.photoURL || ""} alt={currentUser?.displayName || ""} />
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
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: "auto", width: "100%", maxWidth: "500px", mx: "auto", p: 0, border: "1px solid #ccc" }}>
          <List
            sx={{
              padding: "0 40px",
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
                    <Avatar src={user.avatar} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={user.email} // Using email as a placeholder
                  />
                </ListItem>
              ))
            )}
          </List>
        </Box>
      )}

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
