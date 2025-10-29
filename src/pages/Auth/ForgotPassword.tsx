// src/pages/Auth/ForgotPassword.tsx
import React, { useState } from "react";
import { AppBar, Box, Button, CircularProgress, Container, Stack, TextField, Toolbar, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import logo from "../../assets/images/header-logo.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent("Password reset email sent. Check your inbox in the Primary or Updates tab.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      component="main"
      maxWidth="xs"
    >
      <AppBar
        position="static"
        sx={{ borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px", zIndex: 99, boxShadow: "unset" }}
      >
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1, justifyContent: "center" }}>
            <Stack
              alignItems={"center"}
              justifyContent={"center"}
              sx={{
                width: "100%",
                height: "80px",
                marginRight: "10px",
                borderRadius: "10px",
                overflow: "hidden",
                padding: "10px",
              }}
            >
              <img
                src={logo}
                alt=""
                aria-hidden="true"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </Stack>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography
          component="h1"
          variant="h5"
        >
          Reset your password
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, textAlign: "center" }}
        >
          Enter your account email and we'll send you a link to reset your password.
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ mt: 2, width: "100%" }}
        >
          <TextField
            margin="normal"
            required
            fullWidth
            size="small"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Send reset link"}
          </Button>

          {sent && (
            <Typography
              variant="body2"
              color="success.main"
              sx={{ mb: 1 }}
            >
              {sent}
            </Typography>
          )}
          {error && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mb: 1 }}
            >
              {error}
            </Typography>
          )}

          <Typography
            variant="body2"
            align="center"
          >
            Remembered your password? <Link to="/login">Back to Log In</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
