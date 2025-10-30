// src/App.tsx
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ReactNode, useMemo } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import ChatList from "./pages/ChatList/ChatList";
import ChatRoom from "./pages/ChatRoom/ChatRoom";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import ForgotPassword from "./pages/Auth/ForgotPassword";

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { currentUser } = useAuth();
  return currentUser && Object.keys(currentUser).length > 0 ? <>{children}</> : <Navigate to="/login" />;
};

const AppThemed = () => {
  const { themeMode } = useAuth();
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
    [themeMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppThemed />
      </AuthProvider>
    </Router>
  );
};

export default App;
