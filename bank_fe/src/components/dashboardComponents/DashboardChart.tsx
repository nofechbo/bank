import type { Transaction } from "../../types/dashboardTypes";
import { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
    Typography,
    Box,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
} from "@mui/material";

interface DashboardChartProps {
    transactions: Transaction[];
}

type GroupBy = "day" | "month" | "year";

export default function DashboardChart({ transactions }: DashboardChartProps) {
    const [groupBy, setGroupBy] = useState<GroupBy>("day");

    //grouped data placement

    const chartData = useMemo(() => {
        const now = new Date();

        const filtered = transactions.filter((tx) => {
            const date = new Date(tx.date);
            switch (groupBy) {
            case "year":
                return now.getFullYear() - date.getFullYear() <= 4; // keep last 5 years
            case "month":
                return now.getFullYear() === date.getFullYear(); // current year only
            case "day": {
                const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                return diffDays <= 7; // last 7 days only
            }
            default:
                return true;
            }
        });

        const grouped: Record<string, { sent: number; received: number }> = {}

        for (const tx of filtered) {
            const date = new Date(tx.date);
            let key: string;

            switch (groupBy) {
                case "month":
                    key = `${date.getFullYear()}-${(date.getMonth() + 1)
                            .toString()
                            .padStart(2, "0")}`;
                    break;
                case "year":
                    key = `${date.getFullYear()}`;
                    break;
                case "day":
                    key = `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
                            .getDate()
                            .toString()
                            .padStart(2, "0")}`;
                    break;
            }

            if (!grouped[key]) {
                grouped[key] = { sent: 0, received: 0 };
            }

            const amount = parseFloat(tx.amount);
            if (tx.type === "sent") grouped[key].sent += Math.abs(amount);
            else grouped[key].received += amount;
        }

        const labels = Object.keys(grouped).sort();
        const sentData = labels.map((label) => grouped[label].sent);
        const receivedData = labels.map((label) => grouped[label].received);

        return { labels, sentData, receivedData };
    }, [transactions, groupBy]);

    const option = {
        tooltip: { trigger: "axis" },
        legend: { data: ["Sent", "Received"] },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
            type: "category",
            data: chartData.labels,
            axisLabel: {
                interval: 0, //show all labels
                rotate: 30, //angle for crowdedness 
            }
        },
        yAxis: { type: "value" },
        series: [
            {
                name: "Sent",
                type: "bar",
                emphasis: { focus: "series" },
                itemStyle: { color: "#f44336" }, // red
                data: chartData.sentData,
                barGap: "0%",
                barCategoryGap: "30%",
            },
            {
                name: "Received",
                type: "bar",
                emphasis: { focus: "series" },
                itemStyle: { color: "#2196f3" }, // blue
                data: chartData.receivedData,
                barGap: "0%",
                barCategoryGap: "30%",
            },
        ],
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, p:2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2 }}>
            <Typography variant="h6">Transactions Comparison</Typography>
                <FormControl size="small">
                    <InputLabel id="group-by-label">Group By</InputLabel>
                    <Select
                        labelId="group-by-label"
                        value={groupBy}
                        label="Group By"
                        onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value="day">Day</MenuItem>
                        <MenuItem value="month">Month</MenuItem>
                        <MenuItem value="year">Year</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Chart (fills remaining space) */}
            <Box sx={{ width: "100%", overflowX: "auto", px: 1 }}>
                <ReactECharts
                    option={option}
                    style={{
                        width: "100%",
                        maxWidth: "100%",
                        height: 300,
                    }}
                />

            </Box>
        </Box>
    );
}
