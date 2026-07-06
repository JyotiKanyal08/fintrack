export default function StatCard({ label, value, color, icon }) {
    return (
        <div
            style={{
                background: "var(--bg-card)",
                borderRadius: 12,
                padding: 20,
                borderLeft: `4px solid ${color}`,
                border: "1px solid var(--pink-border)"
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 8
                }}
            >
                {icon} {label}
            </div>

            <div
                style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: color
                }}
            >
                {typeof value === "number"
                    ? `₹${value.toLocaleString("en-IN")}`
                    : value}
            </div>
        </div>
    );
}