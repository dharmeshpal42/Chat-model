// src/App.tsx
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { SnackbarProvider, useSnackbar } from "notistack";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatsProvider } from "./context/ChatsContext";

import ForgotPassword from "./pages/Auth/ForgotPassword";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import ChatList from "./pages/ChatList/ChatList";
import ChatRoom from "./pages/ChatRoom/ChatRoom";
import { db, requestNotificationPermission } from "./firebase/firebase";

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { currentUser } = useAuth();
  return currentUser && Object.keys(currentUser).length > 0 ? <>{children}</> : <Navigate to="/login" />;
};

const AppThemed = () => {
  const { themeMode, currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Attempt immediate permission request
    requestNotificationPermission();

    // Fallback: Trigger on first click if permission is still 'default'
    // (some browsers require a user gesture before prompting)
    const handleFirstClick = () => {
      if ("Notification" in window && Notification.permission === "default") {
        requestNotificationPermission();
      }
      window.removeEventListener("click", handleFirstClick);
    };
    window.addEventListener("click", handleFirstClick);
    return () => window.removeEventListener("click", handleFirstClick);
  }, [currentUser]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: { main: "#1976d2" },
          secondary: { main: "#4caf50" },
        },
        shape: { borderRadius: 10 },
        components: {
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                ...(themeMode === "dark"
                  ? {
                      color: "#fff",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#fff",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#fff",
                        borderWidth: 2,
                      },
                      "& .MuiInputBase-input": {
                        color: "#fff",
                        "&::placeholder": {
                          color: "#fff",
                          opacity: 0.7,
                        },
                      },
                    }
                  : {}),
              },
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                ...(themeMode === "dark"
                  ? {
                      color: "#fff",
                      "&.Mui-focused": {
                        color: "#fff",
                      },
                    }
                  : {}),
              },
            },
          },
          MuiFormLabel: {
            styleOverrides: {
              root: {
                ...(themeMode === "dark"
                  ? {
                      color: "#fff",
                      "&.Mui-focused": {
                        color: "#fff",
                      },
                    }
                  : {}),
              },
            },
          },
        },
      }),
    [themeMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={3000}
      >
        <NotificationListener />
        <Routes>
          <Route
            path="/login"
            element={<Login />}
          />
          <Route
            path="/signup"
            element={<Signup />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ChatList />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              <PrivateRoute>
                <ChatRoom />
              </PrivateRoute>
            }
          />
        </Routes>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

interface LastMessage {
  text: string;
  senderId: string;
  senderName?: string;
  timestamp?: Timestamp;
}

// Watches the current user's chats in Firestore and raises an in-app toast
// plus a browser Notification when a new message arrives in a chat the
// user isn't currently looking at. Only fires while the app tab is open.
const NotificationListener = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const lastSeenRef = useRef<Record<string, number>>({});
  const isFirstSnapshotRef = useRef(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    lastSeenRef.current = {};
    isFirstSnapshotRef.current = true;

    const chatsQuery = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const isFirstSnapshot = isFirstSnapshotRef.current;
      isFirstSnapshotRef.current = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") return;

        const chatId = change.doc.id;
        const lastMessage = change.doc.data().lastMessage as LastMessage | undefined;
        if (!lastMessage) return;

        const timestampMs = lastMessage.timestamp?.toMillis() ?? 0;
        const previousTimestampMs = lastSeenRef.current[chatId];
        lastSeenRef.current[chatId] = timestampMs;

        // Skip the initial snapshot (existing chats) and stale/duplicate updates
        if (isFirstSnapshot || (previousTimestampMs !== undefined && timestampMs <= previousTimestampMs)) return;
        if (lastMessage.senderId === currentUser.uid) return;

        const isViewingThisChat = window.location.pathname === `/chat/${chatId}` && document.visibilityState === "visible";
        if (isViewingThisChat) return;

        const title = lastMessage.senderName || "New Message";
        enqueueSnackbar(`${title}: ${lastMessage.text}`, { variant: "info" });

        if ("Notification" in window && Notification.permission === "granted") {
          const notificationUrl = `${window.location.origin}/chat/${chatId}`;

          // Prefer the service-worker path: it's what iOS Safari (PWA, 16.4+)
          // requires, and it's more reliable across browsers generally.
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(title, {
                body: lastMessage.text,
                data: { url: notificationUrl },
              });
            });
          } else {
            const notification = new Notification(title, { body: lastMessage.text });
            notification.onclick = () => {
              window.focus();
              navigate(`/chat/${chatId}`);
              notification.close();
            };
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser?.uid, enqueueSnackbar, navigate]);

  return null;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ChatsProvider>
          <AppThemed />
        </ChatsProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
