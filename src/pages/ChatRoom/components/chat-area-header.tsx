import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
export const ChatAreaHeader = ({ chatName, chatPhotoUrl, isTyping = false, lastSeenMs = null }: { chatName: string; chatPhotoUrl: string; isTyping?: boolean; lastSeenMs?: number | null }) => {
  const navigate = useNavigate();
  const renderLastSeen = () => {
    if (!lastSeenMs) return null;
    const d = new Date(lastSeenMs);
    if (isToday(d)) return `Last seen today at ${format(d, "p")}`;
    if (isYesterday(d)) return `Last seen yesterday at ${format(d, "p")}`;
    return `Last seen ${format(d, "MMM d, yyyy p")}`;
  };
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
          <IconButton
            color="inherit"
            onClick={() => navigate(-1)}
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", ml: { xs: 1, sm: 2 } }}>
            <Avatar
              src={chatPhotoUrl}
              alt={chatName}
              sx={{ mr: 1, border: "2px solid white" }}
            />
            <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: "16px", sm: "inherit" }, lineHeight: 1.1 }}
              >
                {chatName || "Chat"}
              </Typography>
              {isTyping ? (
                <Typography
                  variant="caption"
                  sx={{ color: "#e0f2f1" }}
                >
                  typing...
                </Typography>
              ) : (
                renderLastSeen() && (
                  <Typography
                    variant="caption"
                    sx={{ color: "#ffffff99" }}
                  >
                    {renderLastSeen()}
                  </Typography>
                )
              )}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
    </>
  );
};
