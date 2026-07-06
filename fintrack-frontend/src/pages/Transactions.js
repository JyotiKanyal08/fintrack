import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { getTransactions, addTransaction, parseSMS } from '../api'
import Navbar from '../components/Navbar'
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CATEGORIES = [
    'Food', 'Rent', 'Transport', 'Entertainment',
    'Shopping', 'Health', 'Bills', 'Other'
]

const COLORS = [
    'var(--pink-primary)', '#22c55e', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#64748b'
]

function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getMonthKey(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
    if (!key) return ''
    const [year, month] = key.split('-')
    const d = new Date(parseInt(year), parseInt(month) - 1, 1)
    return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

export default function Transactions() {
    const [txns, setTxns]         = useState([])
    const [token, setToken]       = useState('')
    const [amount, setAmount]     = useState('')
    const [category, setCategory] = useState('Food')
    const [type, setType]         = useState('expense')
    const [desc, setDesc]         = useState('')
    const [selectedMonth, setSelectedMonth] = useState('all')
    const [smsText, setSmsText]     = useState('')
    const [parsed, setParsed]       = useState(null)
    const [smsLoading, setSmsLoading] = useState(false)

    useEffect(() => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const t = await user.getIdToken()
                setToken(t)
                const res = await getTransactions(t)
                const sorted = [...res.data].sort(
                    (a, b) => new Date(b.date) - new Date(a.date)
                )
                setTxns(sorted)
            }
        })
    }, [])

    const handleAdd = async () => {
        if (!amount) return
        await addTransaction(token, {
            amount:      parseFloat(amount),
            category,
            type,
            description: desc
        })
        const res = await getTransactions(token)
        const sorted = [...res.data].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        )
        setTxns(sorted)
        setAmount('')
        setDesc('')
    }

    const allMonths = [...new Set(txns.map(t => getMonthKey(t.date)))]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a))  

    const filteredTxns = selectedMonth === 'all'
        ? txns
        : txns.filter(t => getMonthKey(t.date) === selectedMonth)

    const pieData = CATEGORIES.map(cat => ({
        name:  cat,
        value: filteredTxns
            .filter(t => t.category === cat && t.type === 'expense')
            .reduce((s, t) => s + t.amount, 0)
    })).filter(d => d.value > 0)

    const monthIncome  = filteredTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const monthExpense = filteredTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const handleParseSMS = async () => {
    if (!smsText.trim()) return
    setSmsLoading(true)
    setParsed(null)
    try {
        const res = await parseSMS(token, smsText)
        if (res.data.success) {
            const p = res.data.parsed
            setParsed(res.data)
            setAmount(String(p.amount))
            setCategory(p.category)
            setType(p.type)
            setDesc(p.description)
        } else {
            setParsed(res.data)
        }
    } catch (e) {
        console.error(e)
    }
    setSmsLoading(false)
}

    return (
        <>
            <Navbar />
            <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, color: 'var(--text-primary)' }}>
                <h2 style={{ marginBottom: 4 }}>Transactions</h2>

                {/* SMS Auto-Parser */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 12, padding: 20,
                    marginBottom: 16, border: '1px solid rgba(244,114,182,0.3)'
                }}>
                <h3 style={{ color: '#f9a8d4', marginBottom: 4 }}>
                    📱 Auto-fill from Bank SMS
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Paste your bank transaction SMS below — fields will auto-fill instantly
                </p>

                <textarea
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                placeholder={`Paste SMS here e.g.\n"Dear UPI user A/C X1234 debited by Rs.500 on 25-Jun-26 transfer to Swiggy Ref No 123456"`}
                rows={3}
                style={{
                    width: '100%', padding: 10, borderRadius: 8,
                    border: '1px solid rgba(244,114,182,0.3)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                    marginBottom: 10
                }}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={handleParseSMS} disabled={smsLoading} style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid #f472b6', background: 'rgba(244,114,182,0.15)',
                    color: '#f9a8d4', cursor: 'pointer'
                }}>
                    {smsLoading ? 'Parsing...' : '✨ Parse SMS'}
                </button>

                {smsText && (
                    <button onClick={() => { setSmsText(''); setParsed(null) }} style={{
                        padding: '8px 14px', borderRadius: 8, fontSize: 13,
                        border: '1px solid var(--pink-border)',
                        background: 'var(--bg-input)', color: 'var(--text-muted)', cursor: 'pointer'
                    }}>
                        Clear
                    </button>
                )}

                {parsed && (
                    <span style={{
                        fontSize: 12,
                        color: parsed.success ? '#22c55e' : '#f59e0b'
                    }}>
                        {parsed.success
                            ? `✓ Parsed (${parsed.confidence} confidence) — form filled below`
                            : `⚠ ${parsed.message}`}
                    </span>
                )}
            </div>

            {/* Show what was parsed */}
            {parsed && parsed.success && (
                <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: 'rgba(244,114,182,0.08)',
                    borderRadius: 8, fontSize: 12,
                    border: '1px solid rgba(244,114,182,0.2)'
                }}>
                    <span style={{ color: '#f9a8d4', fontWeight: 600 }}>Detected: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {parsed.parsed.type === 'income' ? '💰 Income' : '💸 Expense'} ·
                        ₹{parsed.parsed.amount?.toLocaleString('en-IN')} ·
                        {parsed.parsed.description} ·
                        {parsed.parsed.category}
                        {parsed.parsed.bank && ` · ${parsed.parsed.bank}`}
                    </span>
                </div>
            )}
        </div>

                {/* Add Transaction form */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 12,
                    padding: 20, marginBottom: 24,
                    border: '1px solid var(--pink-border)'
                }}>
                    <h3 style={{ marginBottom: 12 }}>Add Transaction</h3>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input
                            type="number"
                            placeholder="Amount ₹"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ width: 120 }}
                        />
                        <select value={category} onChange={e => setCategory(e.target.value)}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <select value={type} onChange={e => setType(e.target.value)}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                        <input
                            placeholder="Description"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            style={{ flex: 1, minWidth: 160 }}
                        />
                        <button
                            onClick={handleAdd}
                            className="btn-primary"
                            style={{ padding: '8px 20px' }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Month filter + summary strip */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexWrap: 'wrap',
                    gap: 12, marginBottom: 20
                }}>
                    {/* Month selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Showing:
                        </span>
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            style={{ fontWeight: 600, color: 'var(--pink-primary)' }}
                        >
                            <option value="all">All Months</option>
                            {allMonths.map(m => (
                                <option key={m} value={m}>{monthLabel(m)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Quick stats for selected month */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{
                            background: 'var(--bg-card)', borderRadius: 10,
                            padding: '8px 16px', border: '1px solid var(--pink-border)',
                            borderLeft: '3px solid var(--color-income)'
                        }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Income</div>
                            <div style={{ fontWeight: 700, color: 'var(--color-income)', fontSize: 15 }}>
                                ₹{monthIncome.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{
                            background: 'var(--bg-card)', borderRadius: 10,
                            padding: '8px 16px', border: '1px solid var(--pink-border)',
                            borderLeft: '3px solid var(--color-expense)'
                        }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expense</div>
                            <div style={{ fontWeight: 700, color: 'var(--color-expense)', fontSize: 15 }}>
                                ₹{monthExpense.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{
                            background: 'var(--bg-card)', borderRadius: 10,
                            padding: '8px 16px', border: '1px solid var(--pink-border)',
                            borderLeft: '3px solid var(--pink-primary)'
                        }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saved</div>
                            <div style={{ fontWeight: 700, color: 'var(--pink-primary)', fontSize: 15 }}>
                                ₹{(monthIncome - monthExpense).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pie chart */}
                {pieData.length > 0 && (
                    <div style={{
                        background: 'var(--bg-card)', padding: 20,
                        borderRadius: 12, marginBottom: 20,
                        border: '1px solid var(--pink-border)'
                    }}>
                        <h3 style={{ marginBottom: 4 }}>
                            Spending by Category
                            {selectedMonth !== 'all' && (
                                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                                    — {monthLabel(selectedMonth)}
                                </span>
                            )}
                        </h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name"
                                    outerRadius={90} label={({ name, percent }) =>
                                        `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/*Transaction list*/}
                <div style={{
                    background: 'var(--bg-card)', padding: 20,
                    borderRadius: 12, border: '1px solid var(--pink-border)'
                }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 16
                    }}>
                        <h3>
                            {selectedMonth === 'all'
                                ? 'All Transactions'
                                : `${monthLabel(selectedMonth)} Transactions`}
                        </h3>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {filteredTxns.length} entries
                        </span>
                    </div>

                    {filteredTxns.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            No transactions for this month.
                        </p>
                    ) : (
                        filteredTxns.map((t, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', padding: '12px 0',
                                borderBottom: '1px solid var(--pink-border)'
                            }}>
                                {/* Left: description + category + date */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%',
                                        background: t.type === 'income'
                                            ? 'rgba(34,197,94,0.15)'
                                            : 'rgba(244,114,182,0.15)',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: 16, flexShrink: 0
                                    }}>
                                        {t.type === 'income' ? '💰' : getCategoryIcon(t.category)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: 14 }}>
                                            {t.description || t.category}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {t.category} · {formatDate(t.date)}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: amount */}
                                <div style={{
                                    fontWeight: 700, fontSize: 15,
                                    color: t.type === 'income'
                                        ? 'var(--color-income)'
                                        : 'var(--color-expense)'
                                }}>
                                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    )
}

function getCategoryIcon(category) {
    const icons = {
        Food:          '🍔',
        Rent:          '🏠',
        Transport:     '🚗',
        Entertainment: '🎬',
        Shopping:      '🛍️',
        Health:        '💊',
        Bills:         '📱',
        Other:         '📦',
        Salary:        '💼',
        Groceries:     '🛒'
    }
    return icons[category] || '💸'
}