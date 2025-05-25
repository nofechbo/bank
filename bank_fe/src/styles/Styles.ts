import { styled, Card, Box } from "@mui/material";

export const PageBox = 
{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#1A2038",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: "column",
    paddingTop: "0",
}

export const FlexBox = styled(Box)(() => ({
    display: "flex"
}));

export const StyledCard = styled(Card)(() => ({
    display: "flex",
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    maxWidth: 900,
    minHeight: "auto",
    margin: "1rem",
  }));

  export const ContentBox = styled(Box)(() => ({
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    height: "100%",
    padding: "20px 20px",
    background: "rgba(0, 0, 0, 0.01)",
    minHeight: 400
  }));