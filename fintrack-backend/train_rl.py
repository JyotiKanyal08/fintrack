from stable_baselines3 import PPO
from rl_optimizer import BudgetEnv

env = BudgetEnv(
    income=35000,
    savings_target_pct=20
)

model = PPO(
    "MlpPolicy",
    env,
    verbose=1
)

model.learn(
    total_timesteps=100000
)

model.save("budget_optimizer_model")

print("Model trained successfully!")