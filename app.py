from flask import Flask, render_template, request, jsonify
import pandas as pd
import ast
import re
from collections import defaultdict, Counter
import heapq
from dataclasses import dataclass
import time

app = Flask(__name__)

# Configuration
MAX_SUGGESTIONS = 10
MIN_SEARCH_LENGTH = 2
TOP_POPULAR = 50

@dataclass
class IngredientInfo:
    name: str
    count: int

class SearchEngine:
    def __init__(self):
        self.ingredients = []
        self.name_to_info = {}
        self.prefix_index = defaultdict(list)
        self.token_index = defaultdict(set)
    
    def preprocess_name(self, name):
        """Normalize ingredient names"""
        name = re.sub(r'\d+[/\d\s]*(tbsp|tsp|cup|oz|g|ml|l|lb|kg)s?', '', name.lower())
        return re.sub(r'[^\w\s]', '', name).strip()
    
    def add_ingredient(self, raw_name, count):
        name = self.preprocess_name(raw_name)
        if not name or len(name) < 2:
            return
        
        if name in self.name_to_info:
            self.name_to_info[name].count += count
            return
        
        info = IngredientInfo(name=name, count=count)
        self.name_to_info[name] = info
        self.ingredients.append(info)
        
        # Index by prefixes
        for i in range(min(3, len(name)), len(name)+1):
            heapq.heappush(self.prefix_index[name[:i]], (-count, name))
        
        # Index by tokens
        for token in name.split():
            if len(token) >= 2:
                self.token_index[token].add(name)
    
    def build_from_dataframe(self, df):
        print("Building search index...")
        start = time.time()
        
        counts = Counter()
        for ingredients_str in df['RecipeIngredientParts']:
            try:
                # Clean and parse the ingredients string
                ingredients_str = ingredients_str.replace('c("', '["').replace('")', '"]')
                ingredients = ast.literal_eval(ingredients_str.lower())
                counts.update(self.preprocess_name(ing) for ing in ingredients)
            except Exception as e:
                print(f"Error parsing ingredients: {e}")
                continue
        
        for name, count in counts.items():
            self.add_ingredient(name, count)
        
        print(f"Index built in {time.time()-start:.2f}s")
        print(f"Total ingredients: {len(self.ingredients)}")
    
    def autocomplete(self, query):
        query = self.preprocess_name(query)
        if len(query) < MIN_SEARCH_LENGTH:
            return []
        
        if query in self.prefix_index:
            return [name for (_, name) in heapq.nsmallest(MAX_SUGGESTIONS, self.prefix_index[query])]
        
        tokens = query.split()
        if not tokens:
            return []
        
        candidates = None
        for token in tokens:
            if token in self.token_index:
                candidates = self.token_index[token] if candidates is None else candidates & self.token_index[token]
        
        if not candidates:
            return []
        
        scored = [(-self.name_to_info[name].count, name) for name in candidates]
        heapq.heapify(scored)
        return [name for (_, name) in heapq.nsmallest(MAX_SUGGESTIONS, scored)]

search_engine = SearchEngine()

def load_data():
    print("Loading data...")
    start = time.time()
    
    # Load only necessary columns
    df = pd.read_csv('recipes.csv', 
                    usecols=['RecipeIngredientParts', 'Name', 'RecipeInstructions'],
                    dtype={'RecipeIngredientParts': 'string', 'Name': 'string'},
                    engine='c')
    
    df = df.dropna(subset=['RecipeIngredientParts'])
    search_engine.build_from_dataframe(df)
    print(f"Data loaded in {time.time()-start:.2f}s")

load_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/autocomplete')
def autocomplete():
    query = request.args.get('q', '').strip()
    return jsonify(search_engine.autocomplete(query)[:MAX_SUGGESTIONS])

@app.route('/api/popular-ingredients')
def popular_ingredients():
    popular = sorted(search_engine.ingredients, key=lambda x: -x.count)[:TOP_POPULAR]
    return jsonify([ing.name for ing in popular])

@app.route('/api/recipes-with-ingredients', methods=['POST'])
def recipes_with_ingredients():
    ingredients = request.json.get('ingredients', [])
    ingredients = [search_engine.preprocess_name(ing) for ing in ingredients]
    
    def score_recipe(row):
        try:
            # Clean and parse ingredients
            ingredients_str = row['RecipeIngredientParts'].replace('c("', '["').replace('")', '"]')
            recipe_ings = ast.literal_eval(ingredients_str.lower())
            recipe_ings = [search_engine.preprocess_name(ing) for ing in recipe_ings]
            return len(set(ingredients) & set(recipe_ings))
        except Exception as e:
            print(f"Error scoring recipe: {e}")
            return 0
    
    df = pd.read_csv('recipes.csv', 
                    usecols=['Name', 'RecipeIngredientParts', 'RecipeInstructions'],
                    dtype={'RecipeIngredientParts': 'string', 'Name': 'string'},
                    engine='c')
    
    df['score'] = df.apply(score_recipe, axis=1)
    matches = df[df['score'] > 0].sort_values('score', ascending=False).head(10)
    
    results = []
    for _, row in matches.iterrows():
        try:
            results.append({
                'name': row['Name'],
                'ingredients': ast.literal_eval(row['RecipeIngredientParts'].replace('c("', '["').replace('")', '"]')),
                'instructions': row['RecipeInstructions']
            })
        except:
            continue
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)