document.addEventListener('DOMContentLoaded', () => {
    const ingredientInput = document.getElementById('ingredientInput');
    const addButton = document.getElementById('addButton');
    const searchButton = document.getElementById('searchButton');
    const suggestionsDiv = document.getElementById('suggestions');
    const ingredientList = document.getElementById('ingredientList');
    const recipeResults = document.getElementById('recipeResults');
    
    let selectedIngredients = [];
    
    // Debounce function
    function debounce(func, delay) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), delay);
        };
    }
    
    // Fetch autocomplete suggestions
    async function fetchSuggestions(query) {
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            showSuggestions(suggestions);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    }
    
    // Display suggestions
    function showSuggestions(suggestions) {
        suggestionsDiv.innerHTML = '';
        
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        suggestions.forEach(ingredient => {
            const suggestion = document.createElement('div');
            suggestion.textContent = ingredient;
            suggestion.addEventListener('click', () => {
                addIngredient(ingredient);
                ingredientInput.value = '';
                suggestionsDiv.style.display = 'none';
            });
            suggestionsDiv.appendChild(suggestion);
        });
        
        suggestionsDiv.style.display = 'block';
    }
    
    // Add ingredient to list
    function addIngredient(ingredient) {
        const normalized = ingredient.toLowerCase();
        if (selectedIngredients.includes(normalized)) return;
        
        selectedIngredients.push(normalized);
        
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${ingredient}</span>
            <button class="delete-btn">Remove</button>
        `;
        
        li.querySelector('.delete-btn').addEventListener('click', () => {
            const index = selectedIngredients.indexOf(normalized);
            if (index > -1) selectedIngredients.splice(index, 1);
            ingredientList.removeChild(li);
        });
        
        ingredientList.appendChild(li);
        ingredientInput.value = '';
    }
    
    // Search for recipes
    async function searchRecipes() {
        if (selectedIngredients.length === 0) {
            alert('Please add at least one ingredient');
            return;
        }
        
        try {
            const response = await fetch('/api/recipes-with-ingredients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ingredients: selectedIngredients })
            });
            
            const recipes = await response.json();
            displayRecipes(recipes);
        } catch (error) {
            console.error('Error searching recipes:', error);
            recipeResults.innerHTML = '<p class="error">Error loading recipes. Please try again.</p>';
        }
    }
    
    // Display recipe results
    function displayRecipes(recipes) {
        if (recipes.length === 0) {
            recipeResults.innerHTML = '<p>No recipes found with these ingredients.</p>';
            return;
        }
        
        let html = '<h2>Found Recipes</h2>';
        recipes.forEach(recipe => {
            let ingredients = [];
            try {
                ingredients = JSON.parse(recipe.ingredients.replace(/'/g, '"'));
            } catch (e) {
                ingredients = recipe.ingredients;
            }
            
            html += `
                <div class="recipe-card">
                    <div class="recipe-title">${recipe.name || 'Untitled Recipe'}</div>
                    <div class="recipe-ingredients">
                        <strong>Ingredients:</strong> ${Array.isArray(ingredients) ? ingredients.join(', ') : ingredients}
                    </div>
                </div>
            `;
        });
        
        recipeResults.innerHTML = html;
    }
    
    // Event listeners
    ingredientInput.addEventListener('input', debounce(() => {
        fetchSuggestions(ingredientInput.value.trim());
    }, 300));
    
    ingredientInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = ingredientInput.value.trim();
            if (value) addIngredient(value);
        }
    });
    
    addButton.addEventListener('click', () => {
        const value = ingredientInput.value.trim();
        if (value) addIngredient(value);
    });
    
    searchButton.addEventListener('click', searchRecipes);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#ingredientInput') && !e.target.closest('#suggestions')) {
            suggestionsDiv.style.display = 'none';
        }
    });
});