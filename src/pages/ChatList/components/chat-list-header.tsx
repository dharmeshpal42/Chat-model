import { AppBar, Toolbar, Box, Stack, Typography, IconButton, Avatar, Menu, MenuItem, Drawer, Switch, FormControlLabel, Divider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import logo from "../../../assets/images/header-logo.png";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import CustomModal from "../../../components/CustomModals/CustomModal";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase/firebase";
import { useNavigate } from "react-router-dom";

export const ChatListHeader = () => {
  const navigate = useNavigate();
  const { currentUser, showOldChats, setShowOldChatsRemote, themeMode, setThemeModeRemote } = useAuth();
  console.log("🚀  ~ currentUser:", currentUser);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <AppBar
      position="static"
      sx={{ borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px", zIndex: 99, boxShadow: "unset" }}
    >
      <Toolbar
        sx={{
          padding: "10px 16px",
          justifyContent: "space-between",
        }}
      >
        {/* Logo and Title */}

        <Stack
          alignItems={"start"}
          justifyContent={"start"}
          sx={{
            width: "50%",
            height: "50px",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "left" }}
          />
        </Stack>
        {/* Profile Avatar with Menu */}
        <Box>
          <IconButton
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            size="large"
            sx={{ p: 0 }}
          >
            <Avatar
              src={currentUser?.photoURL || logo}
              alt={currentUser?.displayName || ""}
              title={currentUser?.displayName || ""}
              sx={{
                border: "2px solid white",
              }}
            />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
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
            pb: 2,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header with close button */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6">Profile</Typography>
            <IconButton
              aria-label="Close profile"
              onClick={() => setProfileOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* User info */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar
              src={currentUser?.photoURL || ""}
              alt={currentUser?.displayName || ""}
              sx={{ width: 64, height: 64 }}
            />
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                {currentUser?.displayName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {currentUser?.email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Preferences */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 1 }}
            >
              Preferences
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={showOldChats}
                  onChange={(e) => setShowOldChatsRemote(e.target.checked)}
                />
              }
              label="Show old chats"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={themeMode === "dark"}
                  onChange={(e) => setThemeModeRemote(e.target.checked ? "dark" : "light")}
                />
              }
              label="Dark mode"
            />
            <Typography
              variant="caption"
              color="text.secondary"
            >
              When enabled, chats will show all messages. When disabled, messages older than 24 hours are hidden.
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
};
