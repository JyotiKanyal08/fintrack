import { useEffect, useState } from "react";
import { auth } from "../firebase";
import {
    getHealthScore,
    getTransactions,
    getBudgetRecommendation
} from "../api";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
    ResponsiveContainer
} from "recharts";

import HealthScore from "../components/HealthScore";
import StatCard from "../components/StatCard";
import Navbar from "../components/Navbar";

function Sparkline({ data, color }) {
    if (!data || data.length < 2) return null
    return (
        <ResponsiveContainer width="100%" height={40}>
            <LineChart data={data}>
                <Line type="monotone" dataKey="value"
                    stroke={color} strokeWidth={1.5}
                    dot={false} />
            </LineChart>
        </ResponsiveContainer>
    )
}

export default function Dashboard() {

    const [score, setScore] = useState(null);
    const [txns, setTxns] = useState([]);
    const [recommendation, setRecommendation] = useState(null);

    useEffect(() => {
        fetch('https://fintrack-ad7s.onrender.com/')
        .catch(() => {}) 
        
        const unsubscribe = auth.onAuthStateChanged(async (user) => {

            if (!user) return;

            const token = await user.getIdToken();

            try {

                const healthRes = await getHealthScore(token);
                console.log("Health Score:", healthRes.data);
                setScore(healthRes.data);

                const txnRes = await getTransactions(token);
                console.log("Transactions:", txnRes.data);
                setTxns(txnRes.data);

                const budgetRes = await getBudgetRecommendation(token);
                console.log("Recommendation:", budgetRes.data);

                setRecommendation(budgetRes.data.recommendation);

            } catch (err) {
                console.error(err);
            }

        });

        return () => unsubscribe();

    }, []);

    if (!score) {
        return <h2>Loading Dashboard...</h2>;
    }

    const chartData = txns.reduce((acc, t) => {

        const month = new Date(t.date).toLocaleString("default", {
            month: "short"
        });

        const existing = acc.find((item) => item.month === month);

        if (existing) {

            if (t.type === "income")
                existing.income += t.amount;
            else
                existing.expense += t.amount;

        } else {

            acc.push({

                month,

                income: t.type === "income"
                    ? t.amount
                    : 0,

                expense: t.type === "expense"
                    ? t.amount
                    : 0

            });

        }

        return acc;

    }, []);
    const sparklineIncome = chartData.map(d => ({ value: d.income }))
    const sparklineExpense = chartData.map(d => ({ value: d.expense }))

    return (

        <>
            <Navbar />

            <div
                style={{
                    maxWidth: 900,
                    margin: "0 auto",
                    padding: 24
                }}
            >

                <h1
                    style={{
                        marginBottom: 24
                    }}
                >
                    My Financial Dashboard
                </h1>

                <HealthScore data={score} />

                <div
                
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                        margin: "24px 0"
                    }}
                >

                    <div>
                        <StatCard
                            label="Monthly Income"
                            value={score.income}
                            color="#22c55e"
                            icon="💰"
                        />
                        
                        <Sparkline
                            data={sparklineIncome}
                            color="#22c55e"
                        />
                    </div>

                    <div>
                        <StatCard
                            label="Monthly Expense"
                            value={score.expense}
                            color="#ef4444"
                            icon="💸"
                        />

                        <Sparkline
                            data={sparklineExpense}
                            color="#ef4444"
                        />
                    </div>
                </div>

                {recommendation && (

                    <div
                        style={{
                            background: "'var(--bg-card)'",
                            color: "white",
                            padding: 24,
                            borderRadius: 16,
                            marginBottom: 24
                        }}
                    >

                        <h3
                            style={{
                                marginBottom: 20
                            }}
                        >
                            🤖 AI Budget Recommendation
                        </h3>

                        {Object.entries(recommendation).map(
                            ([category, data]) => (

                                <div
                                    key={category}
                                    style={{
                                        marginBottom: 18,
                                        paddingBottom: 14,
                                        borderBottom: "1px solid var(--pink-border)"
                                    }}
                                >

                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}
                                    >

                                        <strong>
                                            {category.charAt(0).toUpperCase() +
                                                category.slice(1)}
                                        </strong>

                                        <span>
                                            {data.percentage}% &nbsp; • &nbsp;
                                            ₹{data.amount.toLocaleString("en-IN")}
                                        </span>

                                    </div>

                                    <div
                                        style={{
                                            fontSize: 13,
                                            opacity: 0.7,
                                            marginTop: 6
                                        }}
                                    >
                                        {data.tip}
                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

                <div
                    style={{
                        background: "var(--bg-card)",
                        color: "white",
                        padding: 24,
                        borderRadius: 16
                    }}
                >

                    <h3>Income vs Expense</h3>

                    <ResponsiveContainer
                        width="100%"
                        height={220}
                    >

                        <BarChart data={chartData}>

                            <XAxis
                                dataKey="month"
                                stroke="var(--text-muted)"
                            />

                            <YAxis stroke="var(--text-muted)" />

                            <Tooltip />

                            <Bar
                                dataKey="income"
                                fill="#22c55e"
                            />

                            <Bar
                                dataKey="expense"
                                fill="#ef4444"
                            />

                        </BarChart>

                    </ResponsiveContainer>

                </div>

            </div>

        </>

    );

}