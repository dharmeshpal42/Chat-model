// src/App.tsx
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ReactNode } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import ChatList from "./pages/ChatList/ChatList";
import ChatRoom from "./pages/ChatRoom/ChatRoom";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";

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
