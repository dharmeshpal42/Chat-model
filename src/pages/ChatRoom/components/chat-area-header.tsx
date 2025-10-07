import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
export const ChatAreaHeader = ({ chatName, chatPhotoUrl }: { chatName: string; chatPhotoUrl: string }) => {
  const navigate = useNavigate();
  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "500px",
          width: "100%",
          borderBottomLeftRadius: "10px",
          borderBottomRightRadius: "10px",
        }}
      >
        <Toolbar
          sx={{
            padding: "10px 16px",
          }}
        >
          <IconButton color="inherit" onClick={() => navigate(-1)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: { xs: 1, sm: 2 },
            }}
          >
            <Avatar
              src={chatPhotoUrl}
              alt={chatName}
              sx={{
                mr: 1,
                border: "2px solid white",
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "16px", sm: "inherit" },
              }}
            >
              {chatName || "Chat"}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
    </>
  );
};
