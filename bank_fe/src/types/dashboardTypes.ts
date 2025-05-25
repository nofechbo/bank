export interface Transaction {
    id: string
    date: Date
    type: "sent" | "received";
    amount: string
    email: string;
}

export interface DashboardData {
    name: string,
    email:string;
    phone: string;
    joinedAt: string;
    balance: string,
    transactions: Transaction[]
}