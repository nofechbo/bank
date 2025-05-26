import { Card, Typography, Box } from "@mui/material";
import type { Transaction } from "../../types/dashboardTypes";

interface Props {
  transactions: Transaction[];
}

export default function MobileTransactionList({ transactions }: Props) {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
        <Typography variant="h6" color="white" fontWeight={600} mb={1} px={1}>
            Recent Transactions:
        </Typography>

        {transactions.map((tx) => {
            const isReceived = tx.type === "received";
            const amount = `${isReceived ? "+" : "-"}$${Math.abs(Number(tx.amount))}`;

            return (
            <Card
                key={tx.id}
                sx={{
                px: 2,
                py: 2,
                backgroundColor: "background.paper",
                borderRadius: 2,
                boxShadow: 4,
                }}
            >
                <Typography
                    fontWeight="bold"
                    gutterBottom
                    sx={{ color: isReceived ? "green" : "red" }}
                >
                    {amount}
                </Typography>

                <Typography fontSize="14px" color="text.secondary">
                {new Date(tx.date).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short"
                })}
                </Typography>

                <Typography fontSize="14px" color="text.secondary">
                {tx.type} | {tx.email}
                </Typography>
            </Card>
            );
        })}
    </Box>
  );
}
