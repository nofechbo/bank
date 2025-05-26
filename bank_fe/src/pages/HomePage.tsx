import { Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ContactUs } from "../components/ContactUs";

export default function HomePage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Cleanup function to restore original styles when component unmounts
    return () => {
      document.body.style.overflow = originalStyle;
      document.documentElement.style.overflow = '';
    };
  }, []);
  
  return (
    <Box
      sx={{
        position: "fixed", // Add fixed positioning to prevent scrollbar
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,

        backgroundImage: { 
          xs: 'url("/assets/images/homepage/tunabank_homepage_mobile.png")', 
          md: 'url("/assets/images/homepage/tunabank_homepage.png")' 
        },
        backgroundSize: { xs: "cover", md: "contain" },
        backgroundPosition: { xs: "center", md: "center" },
        backgroundRepeat: "no-repeat",
        backgroundColor: "#3a5875", 
        // Layout for buttons at bottom
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >

    <ContactUs />
      <Box
        display="flex"
        gap={2}
        flexDirection={{ xs: "column", sm: "row" }}
        flexWrap="wrap"
        justifyContent="center"
        sx={{
          width: { xs: "80%", sm: "100%" },
          maxWidth: "700px",
          px: 2,
          mb: { xs: 22, md: 4 },
        }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/signup")}
          sx={{
            backgroundColor: "#f0c14b",
            color: "#333",
            fontWeight: "bold",
            fontSize: { xs: "14px", sm: "18px" },
            padding: { xs: "8px 16px", sm: "10px 20px" },
            borderRadius: "25px",
            '&:hover': {
              borderColor: "#ddb347",
              backgroundColor: "rgba(240, 193, 75, 0.1)",
            },
            minWidth: { xs: "50px", sm: "300px" },
          }}
        >
          Open a New Pawcount
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/login")}
          sx={{
            backgroundColor: "#f0c14b",
            color: "#333",
            fontWeight: "bold",
            fontSize: { xs: "14px", sm: "18px" },
            padding: { xs: "8px 16px", sm: "10px 20px" },
            borderRadius: "25px",
            '&:hover': {
              borderColor: "#ddb347",
              backgroundColor: "rgba(240, 193, 75, 0.1)",
            },
            minWidth: { xs: "50px", sm: "200px" },
          }}
        >
          Already a Member? Paw In
        </Button>
      </Box>
    </Box>
  );
}