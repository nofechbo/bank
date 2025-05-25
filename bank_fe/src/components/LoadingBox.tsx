import { Box, CircularProgress, Typography, Paper } from "@mui/material";

interface LoadingBoxProps {
  message?: string;
}

export default function LoadingBox({ message = "Loading..." }: LoadingBoxProps) {
  return (
    <Box display="flex" justifyContent="center" mt={10}>
      <Paper
        elevation={6}
        sx={{
          px: 6,
          py: 4,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body1">{message}</Typography>
      </Paper>
    </Box>
  );
}