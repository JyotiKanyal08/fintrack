import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { getFeatureEngineering } from '../api'
import Navbar from '../components/Navbar'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine
} from 'recharts'

function FeatureCard({ title, value, subtitle, color, formula, explanation }) {
    const [showInfo, setShowInfo] = useState(false)
    return (
        <div style={{
            background: 'var(--bg-card)', borderRadius: 14, padding: 20,
            border: '1px solid var(--pink-border)',
            borderLeft: `4px solid ${color || 'var(--pink-primary)'}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</div>
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    style={{
                        background: 'none', border: '1px solid var(--pink-border)',
                        borderRadius: '50%', width: 20, height: 20,
                        color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >ℹ</button>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--pink-primary)' }}>
                {value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>
            {showInfo && (
                <div style={{
                    marginTop: 12, padding: '10px 12px',
                    background: 'var(--pink-glow)', borderRadius: 8,
                    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6
                }}>
                    <div style={{ fontFamily: 'monospace', color: 'var(--pink-primary)', marginBottom: 4 }}>
                        {formula}
                    </div>
                    {explanation}
                </div>
            )}
        </div>
    )
}

function SectionTitle({ children, sub }) {
    return (
        <div style={{ marginBottom: 16, marginTop: 28 }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{children}</h3>
            {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
    )
}

export default function Insights() {
    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const token = await user.getIdToken()
                const res   = await getFeatureEngineering(token)
                setData(res.data)
                setLoading(false)
            }
        })
    }, [])

    if (loading) return (
        <>
            <Navbar />
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-primary)' }}>
                <div style={{ fontSize: 40 }}>⚙️</div>
                <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
                    Engineering your financial features...
                </p>
            </div>
        </>
    )

    if (!data || data.message) return (
        <>
            <Navbar />
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-primary)' }}>
                <p>No data yet. Add transactions first!</p>
            </div>
        </>
    )

    const { time_series, volatility, summary_features: sf } = data

    const stabilityColor = sf.income_stability_score >= 0.8
        ? 'var(--color-income)'
        : sf.income_stability_score >= 0.5
        ? 'var(--color-warning)'
        : 'var(--color-expense)'

    const stressColor = sf.financial_stress_index <= 40
        ? 'var(--color-income)'
        : sf.financial_stress_index <= 65
        ? 'var(--color-warning)'
        : 'var(--color-expense)'

    const volatilityColor = (stability) =>
        stability === 'stable' ? 'var(--color-income)' :
        stability === 'moderate' ? 'var(--color-warning)' : 'var(--color-expense)'

    return (
        <>
            <Navbar />
            <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, color: 'var(--text-primary)' }}>

                <h2 style={{ marginBottom: 4 }}>⚙️ Feature Engineering Dashboard</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
                    Derived features computed from your raw transaction data — the same features used to train the prediction model
                </p>

                {/*Summary feature cards*/}
                <SectionTitle
                    sub="Composite metrics derived from your 3-month transaction history">
                    Summary Features
                </SectionTitle>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                    <FeatureCard
                        title="Income Stability Score"
                        value={sf.income_stability_score.toFixed(3)}
                        subtitle={sf.income_stability_score >= 0.8 ? "Very stable income" : sf.income_stability_score >= 0.5 ? "Moderately stable" : "Irregular income"}
                        color={stabilityColor}
                        formula="1 - (std(income) / mean(income))"
                        explanation="Measures how consistent your income is month over month. 1.0 = perfectly stable salary. Lower values indicate irregular or variable income."
                    />
                    <FeatureCard
                        title="Financial Stress Index"
                        value={`${sf.financial_stress_index}/100`}
                        subtitle={sf.financial_stress_index <= 40 ? "Low stress — good financial health" : sf.financial_stress_index <= 65 ? "Moderate stress" : "High stress — needs attention"}
                        color={stressColor}
                        formula="(expense_ratio × 0.5) + (100 - savings_rate × 0.3) + (volatility × 0.2)"
                        explanation="A composite score combining your expense-to-income ratio, savings rate, and spending volatility. Lower is better."
                    />
                    <FeatureCard
                        title="Avg Monthly Savings Rate"
                        value={`${parseFloat(sf.avg_savings_rate).toFixed(1)}%`}
                        subtitle="Average % of income saved per month"
                        color="var(--pink-primary)"
                        formula="mean((income - expense) / income × 100)"
                        explanation="Your average savings rate across all tracked months. Financial advisors recommend at least 20%."
                    />
                    <FeatureCard
                        title="Avg Expense-to-Income Ratio"
                        value={`${parseFloat(sf.avg_expense_ratio).toFixed(1)}%`}
                        subtitle={sf.avg_expense_ratio <= 80 ? "Healthy — below 80%" : "High — above healthy 80% threshold"}
                        color={sf.avg_expense_ratio <= 80 ? 'var(--color-income)' : 'var(--color-expense)'}
                        formula="mean(expense / income × 100)"
                        explanation="What percentage of your income goes to expenses on average. Below 80% is generally considered healthy financial behavior."
                    />
                    <FeatureCard
                        title="Biggest Spending Month"
                        value={new Date(sf.biggest_spending_month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                        subtitle={`₹${sf.biggest_month_amount.toLocaleString('en-IN')} total expenses`}
                        color="var(--color-warning)"
                        formula="argmax(monthly_expense)"
                        explanation="The month with the highest total spending. Useful for identifying seasonal or one-off spending patterns."
                    />
                    <FeatureCard
                        title="Avg Spending Volatility"
                        value={`${sf.avg_monthly_volatility.toFixed(1)}%`}
                        subtitle={sf.avg_monthly_volatility < 20 ? "Low — consistent spending habits" : sf.avg_monthly_volatility < 50 ? "Moderate variation" : "High — unpredictable spending"}
                        color={sf.avg_monthly_volatility < 20 ? 'var(--color-income)' : sf.avg_monthly_volatility < 50 ? 'var(--color-warning)' : 'var(--color-expense)'}
                        formula="mean(CV per category) where CV = std/mean × 100"
                        explanation="Average coefficient of variation across all spending categories. High values mean your spending is inconsistent and hard to predict."
                    />
                </div>

                {/*Rolling average chart */}
                <SectionTitle
                    sub="Actual monthly expense vs the 3-month rolling average (smoothed trend)">
                    Feature 1 — Rolling 3-Month Average
                </SectionTitle>
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    border: '1px solid var(--pink-border)'
                }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        The rolling average smooths out one-off spikes to reveal the true underlying trend —
                        a core feature used in the expense prediction model.
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={time_series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--pink-border)" />
                            <XAxis dataKey="month_label" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip
                                formatter={v => `₹${parseFloat(v).toLocaleString('en-IN')}`}
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--pink-border)', borderRadius: 8 }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="expense" stroke="var(--color-expense)"
                                strokeWidth={2} dot={{ r: 4 }} name="Actual Expense" />
                            <Line type="monotone" dataKey="rolling_avg" stroke="var(--pink-primary)"
                                strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="3-Month Rolling Avg" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/*Savings rate + velocity chart*/}
                <SectionTitle
                    sub="Savings rate per month and how fast it's improving (velocity)">
                    Feature 2 — Savings Velocity
                </SectionTitle>
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    border: '1px solid var(--pink-border)'
                }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Velocity = month-over-month change in savings rate. Positive = improving financial health.
                        Negative = savings rate declining.
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={time_series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--pink-border)" />
                            <XAxis dataKey="month_label" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip
                                formatter={v => `${parseFloat(v).toFixed(1)}%`}
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--pink-border)', borderRadius: 8 }}
                            />
                            <Legend />
                            <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="savings_rate" stroke="var(--color-income)"
                                strokeWidth={2} dot={{ r: 4 }} name="Savings Rate %" />
                            <Line type="monotone" dataKey="savings_velocity" stroke="var(--pink-primary)"
                                strokeWidth={2} dot={{ r: 3 }} name="Velocity (Δ per month)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/*Expense ratio chart*/}
                <SectionTitle
                    sub="What percentage of income goes to expenses each month">
                    Feature 3 — Expense-to-Income Ratio
                </SectionTitle>
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    border: '1px solid var(--pink-border)'
                }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        The red reference line at 80% is the healthy threshold. Below it = good.
                        Above it = spending too much of your income.
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={time_series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--pink-border)" />
                            <XAxis dataKey="month_label" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} />
                            <Tooltip
                                formatter={v => `${parseFloat(v).toFixed(1)}%`}
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--pink-border)', borderRadius: 8 }}
                            />
                            <ReferenceLine y={80} stroke="var(--color-expense)" strokeDasharray="4 4" label={{ value: '80% threshold', fill: 'var(--color-expense)', fontSize: 11 }} />
                            <Bar dataKey="expense_ratio" fill="var(--pink-primary)" radius={[6,6,0,0]} name="Expense Ratio %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/*Volatility table*/}
                <SectionTitle
                    sub="Standard deviation and coefficient of variation per spending category">
                    Feature 4 — Spending Volatility per Category
                </SectionTitle>
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    border: '1px solid var(--pink-border)'
                }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Coefficient of Variation (CV) = std / mean × 100. Lower = more predictable spending.
                        This directly feeds into the confidence score in your expense predictor.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--pink-border)' }}>
                                    {['Category', 'Avg Spend', 'Std Dev', 'CV %', 'Stability'].map(h => (
                                        <th key={h} style={{
                                            padding: '8px 12px', textAlign: 'left',
                                            color: 'var(--text-muted)', fontWeight: 600, fontSize: 11
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(volatility)
                                    .sort((a, b) => b[1].coefficient_of_variation - a[1].coefficient_of_variation)
                                    .map(([cat, v]) => (
                                    <tr key={cat} style={{ borderBottom: '1px solid var(--pink-border)' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{cat}</td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                            ₹{v.mean.toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                            ₹{v.std.toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                            {v.coefficient_of_variation}%
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                background: volatilityColor(v.stability) + '22',
                                                color: volatilityColor(v.stability),
                                                padding: '3px 10px', borderRadius: 20,
                                                fontSize: 11, fontWeight: 600,
                                                textTransform: 'capitalize'
                                            }}>
                                                {v.stability}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/*DS explainer box*/}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: 20,
                    marginTop: 24, border: '1px solid var(--pink-border)'
                }}>
                    <h4 style={{ color: 'var(--pink-primary)', marginBottom: 10 }}>
                        🧠 Why feature engineering matters
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                        Raw transaction data (amount, date, category) is too noisy for ML models to learn from directly.
                        Feature engineering transforms this raw data into signals that models can actually use —
                        for example, a single ₹3,500 shopping expense is hard to interpret, but a
                        <strong style={{ color: 'var(--text-secondary)' }}> coefficient of variation of 87%</strong> for Shopping
                        immediately tells the model "this category is unpredictable, use low confidence."
                        Every feature on this page is used either directly or indirectly in the expense predictor model.
                    </p>
                </div>
            </div>
        </>
    )
}