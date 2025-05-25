import { useState } from "react";
import { Collapse, Typography, Link, Box, IconButton } from "@mui/material";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";

export const ContactUs = () => {
    const [showContact, setShowContact] = useState(false);

    return (
        <Box
            sx={{
                position: "fixed",
                top: 16,
                right: 16,
                zIndex: 2000,
                textAlign: "right",
            }}
        >
        <IconButton
            color="primary"
            onClick={() => setShowContact((prev) => !prev)}
            size="large"
            sx={{ backgroundColor: "white", boxShadow: 3 }}
        >
            <ContactSupportIcon />
        </IconButton>

        <Collapse in={showContact}>
            <Box
            sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: "white",
                boxShadow: 3,
                minWidth: 220,
            }}
            >
            <Typography fontWeight="bold" mb={1}>
                Contact Us
            </Typography>
            <Typography variant="body2">
                Email:{" "}
                <Link href="mailto:support@tunabank.com">support@tunabank.com</Link>
            </Typography>
            <Typography variant="body2">
                Phone: <Link href="tel:+1234567890">+1 (234) 567-890</Link>
            </Typography>
            </Box>
        </Collapse>
        </Box>
    );
};