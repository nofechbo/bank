import { useTheme, useMediaQuery } from "@mui/material";
import DesktopTransactionTable from "./DesktopTransactionTable";
import MobileTransactionList from "./MobileTransactionList";
import type { Transaction } from "../../types/dashboardTypes";

interface Props {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return isMobile ? (
    <MobileTransactionList transactions={transactions} />
  ) : (
    <DesktopTransactionTable transactions={transactions} />
  );
}
