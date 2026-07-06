import { useState } from 'react'
import { auth } from '../firebase'
import { askBuddy } from '../api'
import Navbar from '../components/Navbar'

export default function Buddy() {
    const [question, setQuestion] = useState('')
    const [chat, setChat] = useState([])
    const [loading, setLoading] = useState(false)

    const handleAsk = async () => {
        if (!question.trim()) return

        const userMsg = question

        setChat(c => [
            ...c,
            {
                role: 'user',
                text: userMsg
            }
        ])

        setQuestion('')
        setLoading(true)

        try {
            const user = auth.currentUser
            const token = await user.getIdToken()

            const res = await askBuddy(
                token,
                userMsg
            )

            setChat(c => [
                ...c,
                {
                    role: 'buddy',
                    text: res.data.answer
                }
            ])
        } catch (error) {
            setChat(c => [
                ...c,
                {
                    role: 'buddy',
                    text: 'Unable to get response.'
                }
            ])
        }

        setLoading(false)
    }

    return (
        <>
            <Navbar />

            <div
                style={{
                    maxWidth: 700,
                    margin: '30px auto',
                    color: 'var(--text-primary)'
                }}
            >
                <h2>Ask Your Money Buddy</h2>

                <div
                    style={{
                        background: 'var(--bg-card)',
                        borderRadius: 12,
                        padding: 20,
                        minHeight: 300,
                        marginBottom: 16
                    }}
                >
                    {chat.map((m, i) => (
                        <div
                            key={i}
                            style={{
                                textAlign:
                                    m.role === 'user'
                                        ? 'right'
                                        : 'left',
                                margin: '10px 0'
                            }}
                        >
                            <span
                                style={{
                                    background:
                                        m.role === 'user'
                                            ? 'var(--pink-primary)'
                                            : 'var(--pink-border)',
                                    padding: '8px 14px',
                                    borderRadius: 12,
                                    display: 'inline-block',
                                    maxWidth: '80%'
                                }}
                            >
                                {m.text}
                            </span>
                        </div>
                    ))}

                    {loading && (
                        <div>
                            Buddy is thinking...
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: 8
                    }}
                >
                    <input
                        value={question}
                        onChange={(e) =>
                            setQuestion(e.target.value)
                        }
                        onKeyDown={(e) =>
                            e.key === 'Enter' &&
                            handleAsk()
                        }
                        placeholder="Should I buy a bike on EMI?"
                        style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 8,
                            border: '1px solid #333',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)'
                        }}
                    />

                    <button
                        onClick={handleAsk}
                        style={{
                            padding: '10px 20px',
                            background: 'var(--pink-primary)',
                            border: 'none',
                            borderRadius: 8,
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        Ask
                    </button>
                </div>
            </div>
        </>
    )
}