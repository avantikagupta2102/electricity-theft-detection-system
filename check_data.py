import pandas as pd

print("Starting...")

df = pd.read_csv("data/data set.csv", nrows=5)

print("Loaded!")

print(df.head())