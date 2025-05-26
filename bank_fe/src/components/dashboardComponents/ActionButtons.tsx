import { Box, Button, useTheme, useMediaQuery  } from "@mui/material";

interface ActionButtonProps {
    onTransfer: () => void;
    onLogout: () => void;
}

export const ActionButtons = ({ onTransfer, onLogout }: ActionButtonProps) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: isDesktop ? "row" : "column",
                alignItems: "center",
                justifyContent: isDesktop ? "space-between" : "center",
                gap: 2,
                mb: 3,
            }}
        >
            <Button
                variant="contained"
                color="primary"
                onClick={onTransfer}
                sx={{
                    flex: isDesktop ? "1 1 auto" : undefined,
                    width: isDesktop ? "auto" : "100%",
                    px: 3,         // horizontal padding
                    py: 1.5,       // vertical padding
                    fontSize: "15px",
                    fontWeight: 600,
                    borderRadius: 2,
                }}
            >
                Transfer Funds
            </Button>

            <Button
                variant="contained"
                color="error"
                onClick={onLogout}
                sx={{
                    flex: isDesktop ? "1 1 auto" : undefined,
                    width: isDesktop ? "auto" : "100%",
                    ml: isDesktop ? "auto" : 0,
                    px: 3,
                    py: 1.5,
                    fontSize: "15px",
                    fontWeight: 600,
                    borderRadius: 2,
                }}
            >
                Log Out
            </Button>
        </Box>
    )
}