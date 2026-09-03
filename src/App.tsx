// src/App.tsx
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { ReactNode, useEffect, useMemo } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatsProvider } from "./context/ChatsContext";

import ForgotPassword from "./pages/Auth/ForgotPassword";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import ChatList from "./pages/ChatList/ChatList";
import ChatRoom from "./pages/ChatRoom/ChatRoom";
import { generateToken } from "./firebase/firebase";

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
    const triggerPermission = () => {
      if (currentUser?.uid) {
        generateToken(currentUser.uid).catch((err) => console.error("Error generating token:", err));
      }
    };

    if (currentUser?.uid) {
      // Attempt immediate call
      triggerPermission();

      // Fallback: Trigger on first click if permission is still 'default'
      // (some browsers require a user gesture before prompting)
      const handleFirstClick = () => {
        if ("Notification" in window && Notification.permission === "default") {
          triggerPermission();
        }
        window.removeEventListener("click", handleFirstClick);
      };
      window.addEventListener("click", handleFirstClick);
      return () => window.removeEventListener("click", handleFirstClick);
    }
  }, [currentUser]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: { main: "#1976d2" },
          secondary: { main: "#1565c0" },
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
