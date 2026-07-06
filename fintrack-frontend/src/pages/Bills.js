import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { getBills, markBillPaid } from '../api'
import Navbar from '../components/Navbar'

export default function Bills() {
    const [bills, setBills] = useState([])
    const [token, setToken] = useState('')

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
                    color: 'var(--text-primary)'
                }}
            >
                <h2>Bills</h2>

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