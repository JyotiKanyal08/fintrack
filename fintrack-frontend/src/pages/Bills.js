import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { getBills, addBill, markBillPaid } from '../api'
import Navbar from '../components/Navbar'

const CATEGORIES = [
    'Rent', 'Electricity', 'Water', 'Internet',
    'Phone', 'Insurance', 'Subscription', 'Other'
]

export default function Bills() {
    const [bills, setBills] = useState([])
    const [token, setToken] = useState('')
    const [name, setName] = useState('')
    const [amount, setAmount] = useState('')
    const [dueDay, setDueDay] = useState('')
    const [category, setCategory] = useState('Rent')

    useEffect(() => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const t = await user.getIdToken()

                setToken(t)

                const res = await getBills(t)

                setBills(res.data)
            }
        })
    }, [])

    const handleAddBill = async () => {
        if (!name || !amount || !dueDay) return

        await addBill(token, {
            name,
            amount: parseFloat(amount),
            due_day: parseInt(dueDay),
            category
        })

        const res = await getBills(token)
        setBills(res.data)

        setName('')
        setAmount('')
        setDueDay('')
    }

    const handlePaid = async (id) => {
        await markBillPaid(token, id)

        const res = await getBills(token)

        setBills(res.data)
    }

    function formatDueDate(dueDay) {
        const today = new Date()

        let year = today.getFullYear()
        let month = today.getMonth()

        if (dueDay < today.getDate()) {
            month += 1

            if (month > 11) {
                month = 0
                year += 1
            }
        }

        const dueDate = new Date(
            year,
            month,
            dueDay
        )

        const formatted =
            dueDate.toLocaleDateString(
                'en-IN',
                {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                }
            )

        const daysLeft = Math.ceil(
            (dueDate - today) /
            (1000 * 60 * 60 * 24)
        )

        return {
            formatted,
            daysLeft
        }
    }

    return (
        <>
            <Navbar />

            <div
                style={{
                    maxWidth: 900,
                    margin: '30px auto',
                    color: 'var(--text-primary)',
                    padding: '0 24px'
                }}
            >
                <h2>Bills</h2>

                {/* Add Bill form */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 12,
                    padding: 20, marginBottom: 24,
                    border: '1px solid var(--pink-border)'
                }}>
                    <h3 style={{ marginBottom: 12 }}>Add a New Bill</h3>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input
                            placeholder="Bill name e.g. Electricity"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ flex: 1, minWidth: 180 }}
                        />
                        <input
                            type="number"
                            placeholder="Amount ₹"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ width: 120 }}
                        />
                        <input
                            type="number"
                            placeholder="Due day (1-31)"
                            min="1"
                            max="31"
                            value={dueDay}
                            onChange={e => setDueDay(e.target.value)}
                            style={{ width: 140 }}
                        />
                        <select value={category} onChange={e => setCategory(e.target.value)}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <button
                            onClick={handleAddBill}
                            className="btn-primary"
                            style={{ padding: '8px 20px' }}
                        >
                            Add Bill
                        </button>
                    </div>
                </div>

                {bills.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        No bills yet — add your first one above.
                    </p>
                )}

                {bills.map((bill) => (
                    <div
                        key={bill.id}
                        style={{
                            background: 'var(--bg-card)',
                            padding: 20,
                            marginBottom: 15,
                            borderRadius: 12
                        }}
                    >
                        <h3>{bill.name}</h3>

                        <p>
                            Amount: ₹{bill.amount}
                        </p>

                        <p>
                            {(() => {
                                const {
                                    formatted,
                                    daysLeft
                                } =
                                    formatDueDate(
                                        bill.due_day
                                    )

                                const daysText =
                                    daysLeft === 0
                                        ? 'today'
                                        : daysLeft === 1
                                        ? 'tomorrow'
                                        : `in ${daysLeft} days`

                                return `Due: ${formatted} · ${daysText}`
                            })()}
                        </p>

                        <p>
                            Status:
                            {bill.is_paid
                                ? ' ✅ Paid'
                                : ' ❌ Unpaid'}
                        </p>

                        {!bill.is_paid && (
                            <button
                                onClick={() =>
                                    handlePaid(
                                        bill.id
                                    )
                                }
                                style={{
                                    background:
                                        '#22c55e',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    padding:
                                        '8px 16px',
                                    borderRadius: 8,
                                    cursor:
                                        'pointer'
                                }}
                            >
                                Mark Paid
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </>
    )
}