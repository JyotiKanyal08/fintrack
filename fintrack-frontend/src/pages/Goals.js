import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import {
    getGoals,
    addGoal,
    addGoalSavings
} from '../api'
import Navbar from '../components/Navbar'

export default function Goals() {
    const [goals, setGoals] = useState([])
    const [token, setToken] = useState('')
    const [name, setName] = useState('')
    const [targetAmount, setTargetAmount] = useState('')
    const [deadline, setDeadline] = useState('')

    useEffect(() => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const t =
                    await user.getIdToken()

                setToken(t)

                const res =
                    await getGoals(t)

                setGoals(res.data)
            }
        })
    }, [])

    const handleAddGoal = async () => {
        if (!name || !targetAmount) return

        await addGoal(token, {
            name,
            target_amount: parseFloat(targetAmount),
            saved_amount: 0,
            deadline: deadline ? new Date(deadline).toISOString() : null
        })

        const res = await getGoals(token)
        setGoals(res.data)

        setName('')
        setTargetAmount('')
        setDeadline('')
    }

    const handleSave = async (id) => {
        const amount = prompt(
            'Enter amount to save'
        )

        if (!amount) return

        await addGoalSavings(
            token,
            id,
            parseFloat(amount)
        )

        const res =
            await getGoals(token)

        setGoals(res.data)
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
                <h2>Goals</h2>

                {/* Add Goal form */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 12,
                    padding: 20, marginBottom: 24,
                    border: '1px solid var(--pink-border)'
                }}>
                    <h3 style={{ marginBottom: 12 }}>Add a New Goal</h3>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input
                            placeholder="Goal name e.g. Emergency Fund"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ flex: 1, minWidth: 180 }}
                        />
                        <input
                            type="number"
                            placeholder="Target ₹"
                            value={targetAmount}
                            onChange={e => setTargetAmount(e.target.value)}
                            style={{ width: 140 }}
                        />
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                        />
                        <button
                            onClick={handleAddGoal}
                            className="btn-primary"
                            style={{ padding: '8px 20px' }}
                        >
                            Add Goal
                        </button>
                    </div>
                </div>

                {goals.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        No goals yet — add your first one above.
                    </p>
                )}

                {goals.map(goal => {
                    const progress =
                        (
                            goal.saved_amount /
                            goal.target_amount
                        ) * 100

                    const daysLeft = goal.deadline ? Math.ceil(
                            (
                                new Date(
                                    goal.deadline
                                ) -
                                new Date()
                            ) /
                            (
                                1000 *
                                60 *
                                60 *
                                24
                            )
                        ) : null

                    return (
                        <div
                            key={goal.id}
                            style={{
                                background:
                                    'var(--bg-card)',
                                padding: 20,
                                borderRadius: 12,
                                marginBottom: 20
                            }}
                        >
                            <h3>
                                {goal.name}
                            </h3>

                            <p>
                                ₹
                                {
                                    goal.saved_amount
                                }
                                {' / '}
                                ₹
                                {
                                    goal.target_amount
                                }
                            </p>

                            <div
                                style={{
                                    width:
                                        '100%',
                                    height:
                                        20,
                                    background:
                                        '#333',
                                    borderRadius:
                                        10,
                                    overflow:
                                        'hidden'
                                }}
                            >
                                <div
                                    style={{
                                        width:
                                            `${Math.min(progress,100)}%`,
                                        height:
                                            '100%',
                                        background:
                                            '#22c55e'
                                    }}
                                />
                            </div>

                            <p>
                                {progress.toFixed(
                                    1
                                )}
                                % completed
                            </p>

                            {daysLeft !== null && (
                                <p>
                                    {daysLeft}{' '}
                                    days remaining
                                </p>
                            )}

                            <button
                                onClick={() =>
                                    handleSave(
                                        goal.id
                                    )
                                }
                                style={{
                                    background:
                                        'var(--pink-primary)',
                                    color:
                                        'white',
                                    border:
                                        'none',
                                    padding:
                                        '8px 16px',
                                    borderRadius:
                                        8,
                                    cursor:
                                        'pointer'
                                }}
                            >
                                Add Savings
                            </button>
                        </div>
                    )
                })}
            </div>
        </>
    )
}