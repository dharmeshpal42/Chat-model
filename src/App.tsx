// src/App.tsx
import React, { ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider, useAuth } from "./context/AuthContext";

import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import { Box, CircularProgress } from "@mui/material";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#4caf50" },
  },
});

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { currentUser } = useAuth();
  return currentUser && Object.keys(currentUser).length > 0 ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
