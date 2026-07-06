import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { getSpendingAnalytics, getTransactions } from '../api'
import Navbar from '../components/Navbar'
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, LineChart, Line,
    AreaChart, Area, CartesianGrid
} from 'recharts'

const COLORS = [
    '#f9a8d4', '#f472b6', '#ec4899', '#db2777',
    '#c084fc', '#a78bfa', '#fb7185', '#fb923c'
]

const CHART_TYPES = ['Bar', 'Line', 'Area']

// ── Custom pink tooltip ───────────────────────────────────────────────────────
function PinkTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null
    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid #f472b6',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 4px 20px rgba(244,114,182,0.2)'
        }}>
            <p style={{ color: '#f9a8d4', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || '#f472b6', fontSize: 13, fontWeight: 700 }}>
                    {p.name}: ₹{parseFloat(p.value).toLocaleString('en-IN')}
                </p>
            ))}
        </div>
    )
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }) {
    return (
        <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 20,
            borderLeft: `4px solid ${color || '#f472b6'}`,
            border: '1px solid var(--pink-border)'
        }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || '#f9a8d4' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
    )
}

// ── Toggle button ─────────────────────────────────────────────────────────────
function ToggleButton({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: active ? '1px solid #f472b6' : '1px solid var(--pink-border)',
            background: active ? 'rgba(244,114,182,0.15)' : 'var(--bg-input)',
            color: active ? '#f9a8d4' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s'
        }}>
            {label}
        </button>
    )
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportToCSV(txns, filename = 'fintrack_transactions.csv') {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount']
    const rows = txns.map(t => [
        t.date ? new Date(t.date).toLocaleDateString('en-IN') : '',
        `"${(t.description || t.category || '').replace(/"/g, '""')}"`,
        t.category,
        t.type,
        t.amount
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Analytics() {
    const [data, setData]               = useState(null)
    const [allTxns, setAllTxns]         = useState([])
    const [loading, setLoading]         = useState(true)
    const [chartType, setChartType]     = useState('Bar')
    const [selectedCat, setSelectedCat] = useState(null)
    const [typeFilter, setTypeFilter]   = useState('expense')
    const [monthRange, setMonthRange]   = useState({ from: '', to: '' })

    useEffect(() => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const token = await user.getIdToken()
                const [analyticsRes, txnRes] = await Promise.all([
                    getSpendingAnalytics(token),
                    getTransactions(token)
                ])
                setData(analyticsRes.data)
                setAllTxns(txnRes.data || [])
                setLoading(false)
            }
        })
    }, [])

    // ── All unique months from transactions ───────────────────────────────────
    const allMonths = [...new Set(
        allTxns.map(t => {
            if (!t.date) return null
            const d = new Date(t.date)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }).filter(Boolean)
    )].sort()

    // ── Filter transactions ───────────────────────────────────────────────────
    const filteredTxns = allTxns.filter(t => {
        if (!t.date) return false
        const d    = new Date(t.date)
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const inFrom = !monthRange.from || mKey >= monthRange.from
        const inTo   = !monthRange.to   || mKey <= monthRange.to
        const inType = typeFilter === 'all' || t.type === typeFilter
        return inFrom && inTo && inType
    })

    // ── Category totals from filtered data ────────────────────────────────────
    const filteredCategoryTotals = filteredTxns
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount
            return acc
        }, {})

    const categoryData = Object.entries(filteredCategoryTotals)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)

    // ── Monthly totals from filtered data ─────────────────────────────────────
    const filteredMonthlyTotals = filteredTxns.reduce((acc, t) => {
        if (!t.date) return acc
        const d      = new Date(t.date)
        const mKey   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const mLabel = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
        const existing = acc.find(a => a.month === mKey)
        if (existing) {
            if (t.type === 'income') existing.income  = (existing.income  || 0) + t.amount
            else                     existing.expense = (existing.expense || 0) + t.amount
        } else {
            acc.push({
                month:      mKey,
                month_name: mLabel,
                income:     t.type === 'income'  ? t.amount : 0,
                expense:    t.type === 'expense' ? t.amount : 0
            })
        }
        return acc
    }, []).sort((a, b) => a.month.localeCompare(b.month))

    // ── Category drill-down trend ─────────────────────────────────────────────
    const categoryTrend = selectedCat
        ? filteredMonthlyTotals.map(m => {
            const catSpend = filteredTxns
                .filter(t => {
                    if (!t.date) return false
                    const d    = new Date(t.date)
                    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    return t.category === selectedCat && mKey === m.month && t.type === 'expense'
                })
                .reduce((s, t) => s + t.amount, 0)
            return { month_name: m.month_name, amount: Math.round(catSpend) }
        })
        : []

    // ── Summary stats ─────────────────────────────────────────────────────────
    const filteredIncome  = filteredTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const filteredExpense = filteredTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const filteredSavings = filteredIncome > 0
        ? ((filteredIncome - filteredExpense) / filteredIncome * 100).toFixed(1)
        : 0

    // ── Chart renderer — Bar / Line / Area ────────────────────────────────────
    // NOTE: this function is ONLY for the monthly trend charts.
    // The Day of Week chart is rendered separately in JSX below.
    const renderMonthlyChart = (chartData, dataKey, color) => {
        const shared = {
            data: chartData,
            children: [
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--pink-border)" />,
                <XAxis key="x" dataKey="month_name" stroke="var(--text-muted)" fontSize={11} />,
                <YAxis key="y" stroke="var(--text-muted)" fontSize={11} />,
                <Tooltip key="tip"
                    formatter={v => `₹${parseFloat(v).toLocaleString('en-IN')}`}
                    contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid #f472b6',
                        borderRadius: 8,
                        color: '#f9a8d4'
                    }}
                />
            ]
        }

        if (chartType === 'Line') return (
            <LineChart {...shared}>
                {shared.children}
                <Line type="monotone" dataKey={dataKey} stroke={color}
                    strokeWidth={2} dot={{ r: 4, fill: color }} />
            </LineChart>
        )

        if (chartType === 'Area') return (
            <AreaChart {...shared}>
                {shared.children}
                <defs>
                    <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f472b6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey={dataKey}
                    stroke="#f472b6" strokeWidth={2.5}
                    fill="url(#pinkGradient)"
                    dot={{ r: 5, fill: '#f472b6', strokeWidth: 2, stroke: '#fce7f3' }} />
            </AreaChart>
        )

        // Default — Bar
        return (
            <BarChart {...shared}>
                {shared.children}
                <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
        )
    }

    // ── Loading + empty states ─────────────────────────────────────────────────
    if (loading) return (
        <>
            <Navbar />
            <div style={{ color: '#f9a8d4', textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 40 }}>📊</div>
                <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>Crunching your numbers...</p>
            </div>
        </>
    )

    if (!data || data.message) return (
        <>
            <Navbar />
            <div style={{ color: '#f9a8d4', textAlign: 'center', padding: 60 }}>
                <p>No transaction data yet. Add some transactions first!</p>
            </div>
        </>
    )

    const { summary, day_of_week, top_transactions, mom_change } = data

    // ── Day of week — compute max for color coding ────────────────────────────
    const dowMax = day_of_week.length > 0
        ? Math.max(...day_of_week.map(d => d.avg_spend))
        : 0

    return (
        <>
            <Navbar />
            <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, color: 'var(--text-primary)' }}>

                <h2 style={{ marginBottom: 4, color: '#f9a8d4' }}>📊 Spending Analytics</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                    Deep analysis of your financial patterns
                </p>

                {/* ── Interactive Controls ──────────────────────────────── */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: 18,
                    border: '1px solid rgba(244,114,182,0.3)', marginBottom: 24,
                    boxShadow: '0 2px 16px rgba(249,168,212,0.08)'
                }}>
                    <div style={{
                        fontSize: 12, color: '#f472b6', fontWeight: 600,
                        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14
                    }}>
                        🎛️ Interactive Controls
                    </div>

                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>

                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>From Month</div>
                            <select value={monthRange.from}
                                onChange={e => setMonthRange(r => ({ ...r, from: e.target.value }))}
                                style={{ fontSize: 13 }}>
                                <option value="">All time</option>
                                {allMonths.map(m => (
                                    <option key={m} value={m}>
                                        {new Date(m + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>To Month</div>
                            <select value={monthRange.to}
                                onChange={e => setMonthRange(r => ({ ...r, to: e.target.value }))}
                                style={{ fontSize: 13 }}>
                                <option value="">All time</option>
                                {allMonths.map(m => (
                                    <option key={m} value={m}>
                                        {new Date(m + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Transaction Type</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['expense', 'income', 'all'].map(t => (
                                    <ToggleButton key={t}
                                        label={t.charAt(0).toUpperCase() + t.slice(1)}
                                        active={typeFilter === t}
                                        onClick={() => { setTypeFilter(t); setSelectedCat(null) }} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Chart Style</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {CHART_TYPES.map(ct => (
                                    <ToggleButton key={ct} label={ct}
                                        active={chartType === ct}
                                        onClick={() => setChartType(ct)} />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                            <button onClick={() => {
                                setMonthRange({ from: '', to: '' })
                                setTypeFilter('expense')
                                setSelectedCat(null)
                            }} style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 13,
                                border: '1px solid var(--pink-border)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-muted)', cursor: 'pointer'
                            }}>
                                Reset
                            </button>
                            <button onClick={() => exportToCSV(filteredTxns)} style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                border: '1px solid #f472b6',
                                background: 'rgba(244,114,182,0.15)',
                                color: '#f9a8d4', cursor: 'pointer'
                            }}>
                                ↓ Export CSV
                            </button>
                        </div>
                    </div>

                    {(monthRange.from || monthRange.to || typeFilter !== 'expense' || selectedCat) && (
                        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                            Showing: <strong style={{ color: '#f9a8d4' }}>{filteredTxns.length} transactions</strong>
                            {monthRange.from && ` · from ${new Date(monthRange.from + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' })}`}
                            {monthRange.to   && ` · to ${new Date(monthRange.to + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' })}`}
                            {selectedCat && ` · category: ${selectedCat}`}
                            {` · ${typeFilter} only`}
                        </div>
                    )}
                </div>

                {/* ── Summary cards ─────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                    <SummaryCard label="Income (filtered)"
                        value={`₹${Math.round(filteredIncome).toLocaleString('en-IN')}`} color="#22c55e" />
                    <SummaryCard label="Expenses (filtered)"
                        value={`₹${Math.round(filteredExpense).toLocaleString('en-IN')}`} color="#ef4444" />
                    <SummaryCard label="Savings Rate"
                        value={`${filteredSavings}%`} sub="of filtered income saved"
                        color={parseFloat(filteredSavings) >= 20 ? '#22c55e' : '#f59e0b'} />
                    <SummaryCard label="Avg Monthly Expense"
                        value={`₹${Math.round(summary.avg_monthly_expense).toLocaleString('en-IN')}`}
                        color="#f9a8d4" />
                    <SummaryCard label="Biggest Category"
                        value={summary.biggest_category} sub="highest spending area" color="#f59e0b" />
                    <SummaryCard label="Transactions Shown"
                        value={filteredTxns.length} sub="matching current filters" color="#c084fc" />
                </div>

                {/* ── Pie chart — click to drill down ──────────────────── */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    marginBottom: 16, border: '1px solid rgba(244,114,182,0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h3 style={{ color: '#f9a8d4' }}>Spending by Category</h3>
                        {selectedCat && (
                            <button onClick={() => setSelectedCat(null)} style={{
                                background: 'none', border: '1px solid rgba(244,114,182,0.3)',
                                color: 'var(--text-muted)', borderRadius: 8,
                                padding: '4px 12px', fontSize: 12, cursor: 'pointer'
                            }}>
                                ✕ Clear drill-down
                            </button>
                        )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        💡 Click any slice to see that category's trend over months
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={categoryData} dataKey="value" nameKey="name"
                                cx="50%" cy="50%" outerRadius={95}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                onClick={entry => setSelectedCat(
                                    selectedCat === entry.name ? null : entry.name
                                )}
                                style={{ cursor: 'pointer' }}>
                                {categoryData.map((entry, i) => (
                                    <Cell key={i}
                                        fill={COLORS[i % COLORS.length]}
                                        opacity={selectedCat && selectedCat !== entry.name ? 0.3 : 1}
                                        stroke={selectedCat === entry.name ? 'white' : 'none'}
                                        strokeWidth={selectedCat === entry.name ? 2 : 0}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={v => `₹${v.toLocaleString('en-IN')}`}
                                contentStyle={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid #f472b6',
                                    borderRadius: 8, color: '#f9a8d4'
                                }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* ── Category drill-down (appears on slice click) ──────── */}
                {selectedCat && categoryTrend.length > 0 && (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                        marginBottom: 16, border: '2px solid #f472b6',
                        boxShadow: '0 0 20px rgba(244,114,182,0.15)'
                    }}>
                        <h3 style={{ marginBottom: 4, color: '#f9a8d4' }}>
                            {selectedCat} — Monthly Trend
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                                drill-down view
                            </span>
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                            How your {selectedCat} spending changed month over month
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                            {renderMonthlyChart(categoryTrend, 'amount', '#f472b6')}
                        </ResponsiveContainer>
                    </div>
                )}

                {/* ── Monthly trend with chart type toggle ─────────────── */}
                {filteredMonthlyTotals.length > 0 && (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                        marginBottom: 16, border: '1px solid rgba(244,114,182,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ color: '#f9a8d4' }}>Monthly Expense Trend</h3>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {CHART_TYPES.map(ct => (
                                    <ToggleButton key={ct} label={ct}
                                        active={chartType === ct}
                                        onClick={() => setChartType(ct)} />
                                ))}
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            {renderMonthlyChart(filteredMonthlyTotals, 'expense', '#f472b6')}
                        </ResponsiveContainer>
                    </div>
                )}

                {/* ── Day of week — color-coded bars ────────────────────── */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    marginBottom: 16, border: '1px solid rgba(244,114,182,0.3)'
                }}>
                    <h3 style={{ marginBottom: 4, color: '#f9a8d4' }}>Spending by Day of Week</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Average spend per transaction on each day — peak day highlighted
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={day_of_week}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--pink-border)" />
                            <XAxis dataKey="day_name" stroke="var(--text-muted)" fontSize={11}
                                tickFormatter={d => d.slice(0, 3)} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 'auto']} />
                            <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`}
                                contentStyle={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid #f472b6',
                                    borderRadius: 8, color: '#f9a8d4'
                                }} />
                            <Bar dataKey="avg_spend" radius={[4, 4, 0, 0]}>
                                {day_of_week.map((entry, i) => (
                                    <Cell key={i}
                                        fill={
                                            entry.avg_spend === dowMax && dowMax > 0
                                                ? '#ec4899'
                                                : entry.avg_spend > dowMax * 0.6
                                                ? '#f472b6'
                                                : '#f9a8d4'
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* ── Month over month ──────────────────────────────────── */}
                {Object.keys(mom_change).length > 0 && (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                        marginBottom: 16, border: '1px solid rgba(244,114,182,0.3)'
                    }}>
                        <h3 style={{ marginBottom: 4, color: '#f9a8d4' }}>Month-over-Month Change</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                            Click any row to drill down into that category
                        </p>
                        {Object.entries(mom_change).map(([cat, info]) => (
                            <div key={cat} onClick={() => setSelectedCat(cat === selectedCat ? null : cat)}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 8px', borderBottom: '1px solid rgba(244,114,182,0.15)',
                                    cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s',
                                    background: cat === selectedCat ? 'rgba(244,114,182,0.08)' : 'transparent'
                                }}>
                                <span style={{
                                    fontWeight: 500,
                                    color: cat === selectedCat ? '#f9a8d4' : 'var(--text-primary)'
                                }}>{cat}</span>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        color: info.direction === 'up' ? '#ef4444' : '#22c55e',
                                        fontWeight: 700, fontSize: 14
                                    }}>
                                        {info.direction === 'up' ? '↑' : '↓'} {Math.abs(info.change_pct)}%
                                    </span>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        ₹{info.prev_month.toLocaleString('en-IN')} → ₹{info.last_month.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Top 5 + export ────────────────────────────────────── */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                    border: '1px solid rgba(244,114,182,0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ color: '#f9a8d4' }}>Top 5 Largest Expenses</h3>
                        <button onClick={() => exportToCSV(filteredTxns, 'fintrack_filtered.csv')} style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: '1px solid #f472b6',
                            background: 'rgba(244,114,182,0.15)',
                            color: '#f9a8d4', cursor: 'pointer'
                        }}>
                            ↓ Export {filteredTxns.length} rows
                        </button>
                    </div>
                    {top_transactions.map((t, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '10px 0', borderBottom: '1px solid rgba(244,114,182,0.15)',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{t.description || t.category}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.category} · {t.date}</div>
                            </div>
                            <div style={{ color: '#ef4444', fontWeight: 700 }}>
                                ₹{t.amount.toLocaleString('en-IN')}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </>
    )
}