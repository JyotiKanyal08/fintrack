import gymnasium as gym
from gymnasium import spaces
import numpy as np

class BudgetEnv(gym.Env):
    def __init__(self, income=35000, savings_target_pct=20):
        super().__init__()
        self.income = income
        self.savings_target_pct = savings_target_pct

        # Action: 5 allocation percentages (we normalize so they sum to 1)
        self.action_space = spaces.Box(low=0, high=1, shape=(5,), dtype=np.float32)

        # State: income, food_spend, entertainment_spend, savings_rate, month
        self.observation_space = spaces.Box(
            low=0, high=100000, shape=(5,), dtype=np.float32
        )

        self.month = 0
        self.state = None

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.month = 0
        self.state = np.array([self.income, 5000, 1500, 10, 0], dtype=np.float32)
        return self.state, {}

    def step(self, action):
        # Normalize so the 5 allocations sum to 1 (i.e. 100%)
        action = np.clip(action, 0, None)
        action = action / (np.sum(action) + 1e-8)

        savings_pct, food_pct, entertainment_pct, transport_pct, misc_pct = action

        actual_savings_rate = savings_pct * 100

        # --- Base reward: how close are we to the savings target? ---
        target_diff = abs(actual_savings_rate - self.savings_target_pct)
        reward = max(0, 10 - target_diff)

        # --- Penalty: discourage unrealistic extremes in any spending category ---
        # A real household rarely spends <5% or >40% of income in a single category.
        for pct in [food_pct, entertainment_pct, transport_pct, misc_pct]:
            if pct < 0.05 or pct > 0.40:
                reward -= 3

        # --- Penalty: discourage savings being unrealistically extreme too ---
        if savings_pct < 0.05 or savings_pct > 0.50:
            reward -= 3

        # --- Bonus: healthy entertainment allocation (not zero, not excessive) ---
        # Encourages a sustainable budget rather than one that starves every
        # non-essential category, which real people don't stick to long-term.
        if 0.05 <= entertainment_pct <= 0.15:
            reward += 2

        # --- Bonus: reasonable food allocation ---
        if 0.10 <= food_pct <= 0.30:
            reward += 1

        # --- Bonus: reasonable transport allocation ---
        if 0.05 <= transport_pct <= 0.20:
            reward += 1

        self.month += 1
        self.state = np.array([
            self.income,
            self.income * food_pct,
            self.income * entertainment_pct,
            actual_savings_rate,
            self.month
        ], dtype=np.float32)

        terminated = self.month >= 12  # simulate one year per episode
        truncated = False

        return self.state, reward, terminated, truncated, {}