from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search')
def search():
    query = request.args.get('query')
    return f"<h2>Search results for: {query}</h2>"

if __name__ == '__main__':
    app.run(debug=True)