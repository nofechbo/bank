import { useState } from "react";
import {
  Card,
  Typography,
  Box,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
} from "@mui/material";
import { AccountCircle, Person } from "@mui/icons-material";

interface WelcomeCardProps {
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  balance: string;
}

export default function WelcomeCard({ name, email, phone,joinedAt, balance }: WelcomeCardProps) {
  const [open, setOpen] = useState(false);


  return (
    <Card
      elevation={6}
      sx={{
        p: 4,
        position: "relative",
        bgcolor: "background.paper",
        borderRadius: 3,
        boxShadow: 4,
      }}
    >
      <Grid container spacing={3} alignItems="center">
        {/* Left: Icon */}
        <Box>
          <AccountCircle sx={{ fontSize: 70, color: "primary.main" }} />
        </Box>

        {/* Right: Text */}
        <Box>
          <Typography
            variant="h1"
            fontWeight={600}
            fontSize={{ xs: "24px", sm: "30px", md: "45px" }}
            gutterBottom
          >
            Welcome back, {name}!
          </Typography>
          <Typography variant="body1" fontSize={{ xs: "18px", sm: "22px", md: "30px" }}>
            Your current balance is:
          </Typography>
          <Typography
              variant="h4"
              fontWeight={700}
              fontSize={{ xs: "24px", sm: "28px", md: "35px" }}
              color="primary"
            >
            ${balance}
          </Typography>
        </Box>
      </Grid>

      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <Button 
          onClick={() => setOpen(true)} 
          size="small" 
          variant="outlined" 
          color="primary"
        >
          My Info
        </Button>
      </Box>

      {/*my info card*/}
      <Dialog open={open} onClose={() => setOpen(false)} >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Person color="primary" />
          User Information:
        </Box>
      </DialogTitle>
        <Divider />
        <DialogContent>
          <DialogContentText>
            <strong>Name:</strong> {name}
          </DialogContentText>
          <DialogContentText>
            <strong>Email:</strong> {email}
          </DialogContentText>
          <DialogContentText>
            <strong>Phone:</strong> {phone}
          </DialogContentText>
          <DialogContentText>
            <strong>Member Since:</strong> {new Date(joinedAt).toLocaleDateString()}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="primary" >
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Card>
  );
}
