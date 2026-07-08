import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { getPredictions } from '../api'
import Navbar from '../components/Navbar'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer
} from 'recharts'

export default function Predict() {
    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const token = await user.getIdToken()
                const res   = await getPredictions(token)
                setData(res.data)
                setLoading(false)
            }
        })
    }, [])

    if (loading) return (
        <>
            <Navbar />
            <div style={{ color: 'var(--text-primary)', textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 40 }}>🤖</div>
                <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
                    Running regression model on your data...
                </p>
            </div>
        </>
    )

    if (!data || data.message) return (
        <>
            <Navbar />
            <div style={{ color: 'var(--text-primary)', textAlign: 'center', padding: 60 }}>
                <p>No data yet. Add transactions first!</p>
            </div>
        </>
    )

    const { predictions, summary } = data

    // Build chart data — actual vs predicted per category
    const chartData = Object.entries(predictions).map(([cat, info]) => ({
        category:  cat,
        actual:    info.last_month_actual,
        predicted: info.predicted_amount
    }))

    const trendColor = (trend) =>
        trend === 'increasing' ? 'var(--color-expense)' :
        trend === 'decreasing' ? 'var(--color-income)' : 'var(--pink-primary)'

    const confidenceColor = (conf) =>
        conf === 'high' ? 'var(--color-income)' :
        conf === 'medium' ? 'var(--color-warning)' : 'var(--text-muted)'

    return (
        <>
            <Navbar />
            <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, color: 'var(--text-primary)' }}>

                <h2 style={{ marginBottom: 4 }}>🔮 Expense Predictor</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                    ML-powered prediction of your next month's spending per category
                </p>

                {/* Summary strip */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 14, marginBottom: 24
                }}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 12, padding: 18,
                        borderLeft: '4px solid var(--pink-primary)',
                        border: '1px solid var(--pink-border)'
                    }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Predicted Total Next Month
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--pink-primary)' }}>
                            ₹{summary.total_predicted_next_month.toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 12, padding: 18,
                        border: '1px solid var(--pink-border)'
                    }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Last Month Actual
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                            ₹{summary.total_last_month.toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 12, padding: 18,
                        border: '1px solid var(--pink-border)',
                        borderLeft: `4px solid ${summary.overall_change_pct > 0 ? 'var(--color-expense)' : 'var(--color-income)'}`
                    }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Overall Change
                        </div>
                        <div style={{
                            fontSize: 24, fontWeight: 700,
                            color: summary.overall_change_pct > 0 ? 'var(--color-expense)' : 'var(--color-income)'
                        }}>
                            {summary.overall_change_pct > 0 ? '↑' : '↓'} {Math.abs(summary.overall_change_pct)}%
                        </div>
                    </div>
                </div>

                {/* Actual vs Predicted bar chart */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    marginBottom: 16, border: '1px solid var(--pink-border)'
                }}>
                    <h3 style={{ marginBottom: 6 }}>Actual vs Predicted — by Category</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Pink = predicted next month &nbsp;·&nbsp; Purple = last month actual
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData} barGap={4}>
                            <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip
                                formatter={(v, name) => [`₹${v.toLocaleString('en-IN')}`, name]}
                                contentStyle={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--pink-border)',
                                    borderRadius: 8,
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <Bar dataKey="actual"    fill="#c084fc" radius={[4,4,0,0]} name="Last Month"/>
                            <Bar dataKey="predicted" fill="#f472b6" radius={[4,4,0,0]} name="Predicted"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Per-category prediction cards */}
                <h3 style={{ marginBottom: 14 }}>Category-wise Predictions</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                    {Object.entries(predictions).map(([cat, info]) => (
                        <div key={cat} style={{
                            background: 'var(--bg-card)',
                            borderRadius: 14, padding: 18,
                            border: '1px solid var(--pink-border)',
                            borderLeft: `4px solid ${trendColor(info.trend)}`
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'flex-start', marginBottom: 10
                            }}>
                                {/* Left: category name + model used */}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cat}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        Model: {info.model_used.replace('_', ' ')} &nbsp;·&nbsp;
                                        {info.data_points} data point{info.data_points !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                {/* Right: predicted amount */}
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--pink-primary)' }}>
                                        ₹{info.predicted_amount.toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        predicted next month
                                    </div>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div style={{
                                display: 'flex', gap: 20, marginBottom: 10,
                                borderTop: '1px solid var(--pink-border)', paddingTop: 10
                            }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last Month</div>
                                    <div style={{ fontWeight: 600 }}>
                                        ₹{info.last_month_actual.toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Change</div>
                                    <div style={{
                                        fontWeight: 600,
                                        color: info.change_pct > 0 ? 'var(--color-expense)' : 'var(--color-income)'
                                    }}>
                                        {info.change_pct > 0 ? '↑' : '↓'} {Math.abs(info.change_pct)}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trend</div>
                                    <div style={{ fontWeight: 600, color: trendColor(info.trend), textTransform: 'capitalize' }}>
                                        {info.trend}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence</div>
                                    <div style={{ fontWeight: 600, color: confidenceColor(info.confidence), textTransform: 'capitalize' }}>
                                        {info.confidence}
                                    </div>
                                </div>
                            </div>

                            {/* Plain English insight */}
                            <div style={{
                                fontSize: 13, color: 'var(--text-secondary)',
                                background: 'var(--pink-glow)', borderRadius: 8,
                                padding: '8px 12px'
                            }}>
                                💡 {info.insight}
                            </div>
                        </div>
                    ))}
                </div>

                {/* DS explainer — great for interviews */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: 20,
                    marginTop: 20, border: '1px solid var(--pink-border)'
                }}>
                    <h4 style={{ color: 'var(--pink-primary)', marginBottom: 10 }}>
                        🧠 How this prediction works
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                        Each category's spending is predicted using a regression model trained on your
                        personal transaction history. Features include: previous month spend (lag-1),
                        3-month rolling average, spending trend slope, and month number.
                        Categories with 4+ months of data use a <strong style={{ color: 'var(--text-secondary)' }}>Random Forest</strong>;
                        categories with less history use <strong style={{ color: 'var(--text-secondary)' }}>Linear Regression</strong>.
                        Confidence is based on how many data points were available to train on.
                    </p>
                </div>
            </div>
        </>
    )
}
