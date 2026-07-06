import { useState } from 'react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [isNew, setIsNew]       = useState(false)
    const [error, setError]       = useState('')
    const navigate = useNavigate()

    const handleAuth = async () => {
        setError('')
        try {
            if (isNew) {
                await createUserWithEmailAndPassword(auth, email, password)
            } else {
                await signInWithEmailAndPassword(auth, email, password)
            }
            navigate('/dashboard')
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--pink-border)',
                borderRadius: 20,
                padding: 40,
                width: '100%',
                maxWidth: 420,
                boxShadow: '0 8px 40px var(--pink-glow)'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 36 }}>💰</div>
                    <h1 style={{
                        color: 'var(--pink-primary)',
                        fontSize: 26,
                        fontWeight: 800,
                        marginTop: 8,
                        letterSpacing: '-0.5px'
                    }}>FinTrack</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        Your personal finance companion
                    </p>
                </div>

                <h2 style={{ color: 'var(--text-primary)', marginBottom: 20, fontSize: 18 }}>
                    {isNew ? 'Create your account' : 'Welcome back'}
                </h2>

                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                        Email
                    </label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                        Password
                    </label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAuth()}
                        style={{ width: '100%' }}
                    />
                </div>

                {error && (
                    <p style={{ color: 'var(--color-expense)', fontSize: 13, marginBottom: 14 }}>
                        {error}
                    </p>
                )}

                <button
                    onClick={handleAuth}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: 15 }}
                >
                    {isNew ? 'Sign Up' : 'Login'}
                </button>

                <p
                    onClick={() => setIsNew(!isNew)}
                    style={{
                        textAlign: 'center',
                        marginTop: 16,
                        fontSize: 13,
                        color: 'var(--pink-primary)',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    {isNew ? 'Already have an account? Login' : 'New user? Create account'}
                </p>
            </div>
        </div>
    )
}