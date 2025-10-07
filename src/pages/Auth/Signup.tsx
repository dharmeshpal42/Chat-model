// src/pages/Signup.tsx
import React, { useState } from "react";
import { Container, Box, TextField, Button, Typography, AppBar, Toolbar, CircularProgress } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      });
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        avatar: userCredential.user.photoURL,
        lastSeen: serverTimestamp(),
      });
      navigate("/");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Sign Up
          </Typography>
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
          Create an Account
        </Typography>
        <Box component="form" onSubmit={handleSignup} sx={{ mt: 1 }}>
          <TextField margin="normal" required fullWidth label="Name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <TextField margin="normal" required fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField margin="normal" required fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Sign Up"}
          </Button>
          <Typography variant="body2" align="center">
            Already have an account? <Link to="/login">Log In</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Signup;
