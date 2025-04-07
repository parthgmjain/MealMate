from flask import Flask, jsonify
import pandas as pd

app = Flask(__name__)

# Load your dataset
try:
    df = pd.read_csv("recipes.csv") 
except FileNotFoundError:
    print("CSV file not found. Make sure it's in the same directory as app.py.")
    df = pd.DataFrame()

@app.route('/')
def index():
    # Return a few sample rows as JSON
    sample = df.head(5).to_dict(orient='records')
    return jsonify(sample)

if __name__ == '__main__':
    app.run(debug=True)
