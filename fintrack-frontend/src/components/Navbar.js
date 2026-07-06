import { Link, useLocation } from 'react-router-dom'
import { auth } from '../firebase'

export default function Navbar() {
    const location = useLocation()

    const linkStyle = (path) => ({
        color: location.pathname === path ? 'var(--pink-primary)' : 'var(--text-muted)',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: location.pathname === path ? 600 : 400,
        borderBottom: location.pathname === path ? '2px solid var(--pink-primary)' : '2px solid transparent',
        paddingBottom: 2,
        transition: 'all 0.2s'
    })

    return (
        <nav style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--pink-border)',
            padding: '14px 28px',
            display: 'flex',
            gap: 28,
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backdropFilter: 'blur(10px)'
        }}>
            {/* Logo */}
            <span style={{
                color: 'var(--pink-primary)',
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: '-0.5px',
                marginRight: 12
            }}>
                💰 FinTrack
            </span>

            <Link to="/dashboard"    style={linkStyle('/dashboard')}>Dashboard</Link>
            <Link to="/transactions" style={linkStyle('/transactions')}>Transactions</Link>
            <Link to="/bills"        style={linkStyle('/bills')}>Bills</Link>
            <Link to="/goals"        style={linkStyle('/goals')}>Goals</Link>
            <Link to="/analytics"    style={linkStyle('/analytics')}>Analytics</Link>
            <Link to="/buddy"        style={linkStyle('/buddy')}>AI Buddy</Link>
            <Link to="/predict"      style={linkStyle('/predict')}>Predictor</Link>
            <Link to="/insights"     style={linkStyle('/insights')}>Insights</Link>

            <button
                onClick={() => auth.signOut()}
                style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: '1px solid var(--pink-border)',
                    color: 'var(--text-muted)',
                    padding: '6px 16px',
                    borderRadius: 8,
                    fontSize: 13
                }}
            >
                Logout
            </button>
        </nav>
    )
}