import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import {
    getGoals,
    addGoalSavings
} from '../api'
import Navbar from '../components/Navbar'

export default function Goals() {
    const [goals, setGoals] = useState([])
    const [token, setToken] = useState('')

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
                    color: 'var(--text-primary)'
                }}
            >
                <h2>Goals</h2>

                {goals.map(goal => {
                    const progress =
                        (
                            goal.saved_amount /
                            goal.target_amount
                        ) * 100

                    const daysLeft =
                        Math.ceil(
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
                        )

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

                            <p>
                                {daysLeft}{' '}
                                days remaining
                            </p>

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