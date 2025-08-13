// // src/pages/ChatList.tsx
// import React from "react";
// import { Container, AppBar, Toolbar, Typography, IconButton, Box, Fab, List, ListItem, ListItemAvatar, Avatar, ListItemText } from "@mui/material";
// import AddIcon from "@mui/icons-material/Add";
// import ExitToAppIcon from "@mui/icons-material/ExitToApp";
// import { useNavigate } from "react-router-dom";

// import { signOut } from "firebase/auth";
// import { auth } from "../firebase/firebase";

// interface Chat {
//   id: string;
//   name: string;
//   lastMessage: string;
//   time: string;
//   avatar: string;
// }

// const ChatList = () => {
//   const navigate = useNavigate();

//   const handleLogout = async () => {
//     await signOut(auth);
//     navigate("/login");
//   };

//   // Placeholder for chat list
//   const chats: Chat[] = [
//     {
//       id: "chat-1",
//       name: "John Doe",
//       lastMessage: "Hey, how's it going?",
//       time: "10:45 AM",
//       avatar: "https://mui.com/static/images/avatar/1.jpg",
//     },
//     {
//       id: "chat-2",
//       name: "Jane Smith",
//       lastMessage: "See you later!",
//       time: "9:30 AM",
//       avatar: "https://mui.com/static/images/avatar/2.jpg",
//     },
//   ];

//   return (
//     <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
//       <AppBar position="static">
//         <Toolbar>
//           <Typography variant="h6" sx={{ flexGrow: 1 }}>
//             Chats
//           </Typography>
//           <IconButton color="inherit" onClick={handleLogout}>
//             <ExitToAppIcon />
//           </IconButton>
//         </Toolbar>
//       </AppBar>
//       <Container sx={{ flexGrow: 1, overflowY: "auto", p: 0, width: "100%", maxWidth: "430px" }}>
//         <List>
//           {chats.map((chat) => (
//             <ListItem component="button" key={chat.id} onClick={() => navigate(`/chat/${chat.id}`)}>
//               <ListItemAvatar>
//                 <Avatar src={chat.avatar} />
//               </ListItemAvatar>
//               <ListItemText
//                 primary={chat.name}
//                 secondary={
//                   <React.Fragment>
//                     <Typography component="span" variant="body2" color="text.primary">
//                       {chat.lastMessage}
//                     </Typography>
//                     {" - "}
//                     {chat.time}
//                   </React.Fragment>
//                 }
//               />
//             </ListItem>
//           ))}
//         </List>
//         <Fab
//           color="secondary"
//           aria-label="add"
//           sx={{
//             position: "fixed",
//             bottom: 16,
//             right: 16,
//           }}
//         >
//           <AddIcon />
//         </Fab>
//       </Container>
//     </Box>
//   );
// };

// export default ChatList;

// src/pages/ChatList.tsx
import React, { useState, useEffect } from "react";
import { AppBar, Toolbar, Typography, IconButton, Box, List, ListItem, ListItemAvatar, Avatar, ListItemText, CircularProgress } from "@mui/material";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
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
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

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
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", margin: "0 auto", maxWidth: "500px", width: "100%" }}>
      <AppBar position="static" sx={{ border: "1px solid #ccc" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            New Chat {currentUser?.displayName ? `- ${currentUser.displayName}` : ""}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <ExitToAppIcon />
          </IconButton>
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
    </Box>
  );
};

export default ChatList;
