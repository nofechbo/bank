import { Box, } from "@mui/material";

export const LogoHeader = () => {
    return (
        <Box
            mt={{ xs: -4, sm: -6, md: -8 }}
            mb={{ xs: -4, sm: -6, md: -8 }}
        >
            <Box
                component="img"
                src="/assets/images/logos/white_cat_transparent.png"
                alt="Tuna Bank Logo"
                sx={{
                    width: {
                    xs: "180px",
                    sm: "240px",
                    md: "300px",
                    lg: "400px",
                    },
                    height: "auto",
                }}
                />
        </Box>
)};