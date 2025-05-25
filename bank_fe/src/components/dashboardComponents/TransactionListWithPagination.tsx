import type { Transaction } from "../../types/dashboardTypes";
import { useState, useMemo } from "react";
import { 
    Card,
    Typography,
    Divider,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Box,
    Button,
} from "@mui/material";

interface Props {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: Props) {
  const ITEMS_PER_PAGE = 5;
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => [...transactions].
    sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [transactions]
  );


  const paginated = sorted.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);

    return (
        <Card
          sx={{
            mt: 4,
            px: 4,
            py: 3,
            width: "100%",
            maxWidth: 900,
            mx: "auto",
            borderRadius: 3,
            boxShadow: 4,
            backgroundColor: "background.paper",
            height: 440,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Recent Transactions
          </Typography>
    
          <Divider sx={{ mb: 2 }} />
    
          {transactions.length === 0 ? (
            <Typography color="text.secondary">No transactions found.</Typography>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <Box sx={{ height: 360, overflowY: "auto" }}>
                <Table sx={{ tableLayout: "fixed", width: "100%" }}>
                    <TableHead>
                        <TableRow
                        sx={{
                            "& > *": {
                            fontWeight: "bold",
                            fontSize: "20px",
                            width: "25%",
                            },
                        }}
                        >
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Counterparty</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
        
                  <TableBody>
                    {paginated.map((tx) => {
                      const isReceived = tx.type === "received";
                      return (
                        <TableRow
                            key={tx.id}
                            sx={{ "& > td": { fontSize: "18px" } }}
                        >
                          <TableCell>{
                                new Date(tx.date).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short"
                                })}
                            </TableCell>
                          <TableCell>{tx.type}</TableCell>
                          <TableCell>{tx.email}</TableCell>
                          <TableCell align="right" sx={{ color: isReceived ? "green" : "red" }}>
                            {isReceived ? "+" : "-"}${Math.abs(Number(tx.amount))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>

              <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", height: 56 }}>
                <Button
                  variant="outlined"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>

                <Button
                  variant="outlined"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                </Button>
              </Box>
          </Box>
        )}
      </Card>
    );
}