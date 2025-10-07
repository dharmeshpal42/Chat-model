import { Box, CircularProgress, ListItem, ListItemAvatar, ListItemText, List, Typography } from "@mui/material";
import { Avatar } from "@mui/material";
import { Badge } from "@mui/material";
import { AppUser } from "../ChatList";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

interface UsersListProps {
  loading: boolean;
  users: any[];
  unseenMessageCounts: any;
}

const UsersList = ({ loading, users, unseenMessageCounts }: UsersListProps) => {
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
    </>
  );
};

export default UsersList;
