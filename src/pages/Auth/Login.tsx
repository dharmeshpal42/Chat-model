// src/pages/Login.tsx
import { AppBar, Box, Button, CircularProgress, Container, Stack, TextField, Toolbar, Typography, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import logo from "../../assets/images/header-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // const handleGoogleLogin = async () => {
  //   const provider = new GoogleAuthProvider();
  //   setLoading(true);
  //   try {
  //     const result = await signInWithPopup(auth, provider);
  //     const user = result.user;
  //     await setDoc(
  //       doc(db, "users", user.uid),
  //       {
  //         name: user.displayName,
  //         email: user.email,
  //         avatar: user.photoURL,
  //         lastSeen: serverTimestamp(),
  //       },
  //       { merge: true }
  //     );
  //     navigate("/");
  //   } catch (error: any) {
  //     alert(error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <Container component="main" maxWidth="xs">
      <AppBar position="static" sx={{ borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px", zIndex: 99, boxShadow: "unset" }}>
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1, justifyContent: "center" }}>
            <Stack
              alignItems={"center"}
              justifyContent={"center"}
              sx={{
                width: "40px",
                height: "40px",
                marginRight: "10px",
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "white",
              }}
            >
              <img src={logo} alt="Logo" style={{ width: "80%", height: "80%", objectFit: "cover" }} />
            </Stack>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                textTransform: "capitalize",
                fontSize: { xs: "18px", sm: "inherit" },
              }}
            >
              Chat-App
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          mt: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>
        <Box component="form" onSubmit={handleEmailLogin} sx={{ mt: 1 }}>
          <TextField margin="normal" required fullWidth label="Email Address" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="body2" align="right" sx={{ mt: 1 }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </Typography>
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Log In"}
          </Button>
          {/* <Button fullWidth variant="outlined" onClick={handleGoogleLogin} sx={{ mb: 2 }} disabled={loading}>
            Sign In with Google
          </Button> */}
          <Typography variant="body2" align="center">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
