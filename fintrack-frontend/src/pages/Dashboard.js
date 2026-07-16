import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { getHealthScore, getTransactions, getBudgetRecommendation} from "../api";
import {BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer} from "recharts";
import HealthScore from "../components/HealthScore";
import StatCard from "../components/StatCard";
import Navbar from "../components/Navbar";
import axios from "axios";

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
    const [isNewUser, setIsNewUser] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(1);
    const [incomeInput, setIncomeInput] = useState('');


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

                if (txnRes.data.length === 0) {
                    setIsNewUser(true);
                }

                const budgetRes = await getBudgetRecommendation(token);
                console.log("Recommendation:", budgetRes.data);

                setRecommendation(budgetRes.data.recommendation);

            } catch (err) {
                console.error(err);
            }

        });

        return () => unsubscribe();

    }, []);

    const handleSaveIncome = async () => {
        const token = await auth.currentUser.getIdToken();
        await axios.put(
            `https://fintrack-ad7s.onrender.com/users/income`,
            null,
            {
                params: { income: parseFloat(incomeInput) },
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        setOnboardingStep(2);
    };

    if (isNewUser) return (
    <>
        <Navbar />
        <div style={{
            maxWidth: 500, margin: '60px auto',
            padding: 32, color: 'var(--text-primary)',
            textAlign: 'center'
        }}>
            {onboardingStep === 1 && (
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 20,
                    padding: 32, border: '1px solid rgba(244,114,182,0.3)'
                }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                    <h2 style={{ color: '#f9a8d4', marginBottom: 8 }}>
                        Welcome to FinTrack!
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                        Let's set up your financial profile. First — what's your monthly income?
                    </p>
                    <input
                        type="number"
                        placeholder="e.g. 35000"
                        value={incomeInput}
                        onChange={e => setIncomeInput(e.target.value)}
                        style={{ width: '100%', padding: 12, marginBottom: 16,
                                fontSize: 18, textAlign: 'center' }}
                    />
                    <button onClick={handleSaveIncome} className="btn-primary"
                        style={{ width: '100%', padding: 14, fontSize: 15 }}>
                        Continue →
                    </button>
                </div>
            )}

            {onboardingStep === 2 && (
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 20,
                    padding: 32, border: '1px solid rgba(244,114,182,0.3)'
                }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
                    <h2 style={{ color: '#f9a8d4', marginBottom: 8 }}>
                        Here's what FinTrack does for you
                    </h2>
                    <div style={{ textAlign: 'left', marginBottom: 24 }}>
                        {[
                            ['📊', 'Tracks every expense and income automatically'],
                            ['🔮', 'Predicts next month\'s spending using ML'],
                            ['🤖', 'AI buddy answers your money questions'],
                            ['⚙️', 'Shows your spending patterns and insights'],
                            ['🎯', 'Helps you hit savings goals'],
                        ].map(([icon, text], i) => (
                            <div key={i} style={{
                                display: 'flex', gap: 12, alignItems: 'center',
                                padding: '10px 0',
                                borderBottom: '1px solid rgba(244,114,182,0.1)'
                            }}>
                                <span style={{ fontSize: 20 }}>{icon}</span>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsNewUser(false)}
                        className="btn-primary"
                        style={{ width: '100%', padding: 14, fontSize: 15 }}
                    >
                        Start tracking my finances 🚀
                    </button>
                </div>
            )}
        </div>
    </>)
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
                            background: 'var(--bg-card)',
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