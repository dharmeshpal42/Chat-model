import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
export const ChatAreaHeader = ({
  chatName,
  chatPhotoUrl,
  isTyping = false,
  lastSeenMs = null,
  isOnline = false,
}: {
  chatName: string;
  chatPhotoUrl: string;
  isTyping?: boolean;
  lastSeenMs?: number | null;
  isOnline?: boolean;
}) => {
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
        position="static"
        color="default"
        sx={{
          paddingTop: "env(safe-area-inset-top)",
          borderBottomLeftRadius: "10px",
          borderBottomRightRadius: "10px",
          zIndex: (theme) => theme.zIndex.appBar + 1,
          boxShadow: "unset",
          backgroundColor: (theme) => (theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff"),
        }}
      >
        <Toolbar
          sx={{
            padding: "10px 16px",
          }}
        >
          <IconButton
            color="inherit"
            onClick={() => navigate("/")}
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", ml: { xs: 1, sm: 2 } }}>
            <Box sx={{ position: "relative", mr: 1 }}>
              <Avatar
                src={chatPhotoUrl}
                alt={chatName}
                sx={{ border: "2px solid white", height: "50px", width: "50px" }}
              />
              {isOnline && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#44b700",
                    border: "2px solid white",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                  }}
                />
              )}
            </Box>
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
              ) : isOnline ? (
                <Typography
                  variant="caption"
                  sx={{ color: "#44b700", fontWeight: 600 }}
                >
                  Online
                </Typography>
              ) : (
                renderLastSeen() && (
                  <Typography
                    variant="caption"
                    sx={{ color: "black" }}
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
