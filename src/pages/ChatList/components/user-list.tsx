import { Box, CircularProgress, ListItemButton, ListItemAvatar, ListItemText, List, Typography } from "@mui/material";
import { Avatar } from "@mui/material";
import { Badge } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { AppUser } from "../ChatList";
import { LastMessagePreview } from "../../../context/ChatsContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

interface UsersListProps {
  loading: boolean;
  users: any[];
  unseenMessageCounts: any;
  onlineUserIds?: Set<string>;
  lastMessages?: { [key: string]: LastMessagePreview };
}

const UsersList = ({ loading, users, unseenMessageCounts, onlineUserIds, lastMessages }: UsersListProps) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleChatSelect = async (otherUser: AppUser) => {
    if (!currentUser) return;

    // Create a consistent chatId by sorting the two UIDs
    const chatID = [currentUser.uid, otherUser.id].sort().join("-");
    // Do NOT create the chat document here. It will be created on first message send in ChatRoom.
    navigate(`/chat/${chatID}`);
  };
  return (
    <>
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 4,
            height: "100%",
            backgroundColor: (theme) => (theme.palette.mode === "dark" ? theme.palette.background.default : "aliceblue"),
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            overflowY: "auto",
            width: "100%",
            maxWidth: "500px",
            mx: "auto",
            pt: 3,
            height: "100%",
            backgroundColor: (theme) => (theme.palette.mode === "dark" ? theme.palette.background.default : "aliceblue"),
          }}
        >
          <List
            sx={{
              padding: { xs: "0 15px", sm: "0 40px" },
              color: (theme) => (theme.palette.mode === "dark" ? theme.palette.common.white : "inherit"),
              backgroundColor: (theme) => (theme.palette.mode === "dark" ? theme.palette.background.paper : "transparent"),
              borderRadius: 2,
            }}
          >
            {users.length === 0 ? (
              <Typography
                align="center"
                color="inherit"
                sx={{ mt: 4 }}
              >
                No other users found.
              </Typography>
            ) : (
              users.map((user) => (
                <ListItemButton
                  key={user.id}
                  onClick={() => handleChatSelect(user)}
                  sx={{
                    marginTop: 1,
                    cursor: "pointer",
                    padding: "10px 15px",
                    borderRadius: "10px",
                    border: (theme) => `2px solid ${theme.palette.divider}`,
                    backgroundColor: (theme) => (theme.palette.mode === "dark" ? theme.palette.background.paper : "transparent"),
                    // Ensure button text isn't blue in dark mode; inherit from parent List color
                    color: (theme) => (theme.palette.mode === "dark" ? theme.palette.common.white : "inherit"),

                    "&:hover": {
                      backgroundColor: (theme) => theme.palette.action.hover,
                    },
                    display: "flex",
                    alignItems: "center",
                    "@media (max-width: 600px)": {
                      padding: "5px 15px",
                    },
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
                      <Box
                        sx={{
                          position: "relative",
                          width: 40,
                          height: 40,
                          "@media (max-width: 600px)": {
                            width: 35,
                            height: 35,
                          },
                        }}
                      >
                        <Avatar
                          src={user.avatar}
                          alt={user.name}
                          sx={{
                            width: "100%",
                            height: "100%",
                            border: (theme) => `2px solid ${theme.palette.divider}`,
                          }}
                        />
                        {onlineUserIds?.has(user.id) && (
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              right: 0,
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: "#44b700",
                              border: (theme) => `2px solid ${theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff"}`,
                              boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                            }}
                          />
                        )}
                      </Box>
                    </ListItemAvatar>
                  </Badge>
                  <ListItemText
                    primary={user.name}
                    secondary={
                      lastMessages?.[user.id] ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          {lastMessages[user.id].senderId === currentUser?.uid &&
                            (lastMessages[user.id].isRead ? (
                              <DoneAllIcon sx={{ fontSize: 14, color: "#4fc3f7", flexShrink: 0 }} />
                            ) : onlineUserIds?.has(user.id) ? (
                              <DoneAllIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
                            ) : (
                              <DoneIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
                            ))}
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ color: "text.secondary" }}
                          >
                            {lastMessages[user.id].text}
                          </Typography>
                        </Box>
                      ) : undefined
                    }
                    title={user.email}
                    sx={{ ml: 2, color: "inherit", "@media (max-width: 600px)": { ml: 0 } }}
                    primaryTypographyProps={{ color: "inherit" }}
                    secondaryTypographyProps={{ color: "inherit", component: "div" }}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Box>
      )}
    </>
  );
};

export default UsersList;
