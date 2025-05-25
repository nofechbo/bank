import type { Transaction } from "../../types/dashboardTypes";
import { 
    Card,
    Typography,
    Divider,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Box
} from "@mui/material";

interface Props {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: Props) {
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
            flex: 1,
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
            <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
              <Table 
                sx={{ 
                  tableLayout: "fixed", 
                  width: "100%", 
                  "& thead": 
                    { 
                      position: "sticky", 
                      top: 0, 
                      backgroundColor: "background.paper", 
                      zIndex: 1 
                    } 
                }}
              >
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
                  {transactions.map((tx) => {
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
          )}
        </Card>
      );
    }