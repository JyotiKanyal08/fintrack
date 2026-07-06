export default function HealthScore({ data }) {
    if (!data) return null

    const score = data.score
    const color = score >= 70 ? 'var(--color-income)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-expense)'
    const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Needs Work' : 'Critical'

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--pink-border)',
            borderRadius: 16,
            padding: 28,
            textAlign: 'center',
            marginBottom: 0,
            boxShadow: '0 4px 24px var(--pink-glow)'
        }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Financial Health Score
            </div>
            <div style={{ fontSize: 72, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 16, color, marginBottom: 20, marginTop: 4, fontWeight: 500 }}>{label}</div>

            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--pink-border)', paddingTop: 16 }}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Savings Rate</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.savings_rate}%</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Bills Paid</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.bill_consistency}%</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Goals</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.goal_progress}%</div>
                </div>
            </div>
        </div>
    )
}