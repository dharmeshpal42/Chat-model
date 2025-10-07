import { AppBar, Toolbar, Box, Stack, Typography, IconButton, Avatar, Menu, MenuItem, Drawer, Switch, FormControlLabel, Divider } from "@mui/material";
import logo from "../../../assets/images/header-logo.png";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import CustomModal from "../../../components/CustomModals/CustomModal";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase/firebase";
import { useNavigate } from "react-router-dom";

export const ChatListHeader = () => {
  const navigate = useNavigate();
  const { currentUser, showOldChats, setShowOldChatsRemote } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
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
                setProfileOpen(true);
              }}
            >
              Profile
            </MenuItem>
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
        loadingText="Logging out..."
        confirmButtonText="Logout"
        cancelButtonText="Cancel"
      >
        <Typography>Are you sure you want to logout?</Typography>
      </CustomModal>

      {/* Profile Bottom Drawer */}
      <Drawer
        anchor="bottom"
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            maxWidth: 500,
            width: "100%",
            margin: "0 auto",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar src={currentUser?.photoURL || ""} alt={currentUser?.displayName || ""} sx={{ width: 56, height: 56 }} />
            <Box>
              <Typography variant="subtitle1">{currentUser?.displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <FormControlLabel control={<Switch checked={showOldChats} onChange={(e) => setShowOldChatsRemote(e.target.checked)} />} label="Show old chats" />

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            When enabled, chats will show all messages. When disabled, messages older than 24 hours are hidden.
          </Typography>

          <Box sx={{ mt: 2, textAlign: "right" }}>
            <IconButton onClick={() => setProfileOpen(false)} color="primary">
              <Typography>Close</Typography>
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
};
