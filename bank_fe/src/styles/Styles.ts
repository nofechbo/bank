import { styled, Card, Box } from "@mui/material";

export const PageBox = 
{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    flex: 1,
    height: "100vh",
    backgroundColor: "#1A2038",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: "column",
    paddingTop: "0",
    overflowX: "hidden",
}

export const FlexBox = styled(Box)(() => ({
    display: "flex"
}));

export const StyledCard = styled(Card)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  borderRadius: 12,
  overflow: "hidden",
  width: "100%",
  maxWidth: 900,
  minHeight: "auto",
  margin: "1rem",

  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    width: "90%",
    margin: "12px auto 24px auto",
    marginBottom: "14px",
    maxHeight: "100vh",
    overflowY: "auto",
    alignItems: "flex-start",
  },
}));

export const ContentBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  flex: 1,
  height: "100%",
  padding: "20px 20px",
  background: "rgba(0, 0, 0, 0.01)",
  minHeight: 400,

  [theme.breakpoints.down("sm")]: {
    minHeight: "auto",
    padding: "12px 16px",
    justifyContent: "flex-start",
  },

  "&.image-container": {
    [theme.breakpoints.down("sm")]: {
      justifyContent: "center",
      alignItems: "center",
      width: "90%",
    },
  },
}));

export const ShrinkBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px 20px",
  background: "rgba(0, 0, 0, 0.01)",
  flex: 1,

  [theme.breakpoints.down("sm")]: {
    flex: "0 0 auto", 
    padding: "12px 16px",
    justifyContent: "flex-start",
    alignItems: "center",
  },
}));

export const GrowBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px 20px",
  background: "rgba(0, 0, 0, 0.01)",
  flex: 1,
  height: "100%",
  justifyContent: "flex-start",
  overflowY: "auto",

  [theme.breakpoints.down("sm")]: {
    padding: "12px 16px",
  },
}));
