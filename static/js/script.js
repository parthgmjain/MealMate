document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const ingredientInput = document.getElementById('ingredientInput');
    const addButton = document.getElementById('addButton');
    const searchButton = document.getElementById('searchButton');
    const suggestionsDiv = document.getElementById('suggestions');
    const ingredientList = document.getElementById('ingredientList');
    const recipeResults = document.getElementById('recipeResults');
    const profileForm = document.getElementById('nutritionProfileForm');
    
    let selectedIngredients = [];

    // Form submit handler with validation
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate inputs
        const age = parseInt(document.getElementById('age').value);
        const weight = parseFloat(document.getElementById('weight').value);
        const height = parseFloat(document.getElementById('height').value);
        
        if (age < 0 || age > 120) {
            alert('Please enter a valid age between 13 and 120');
            return;
        }
        
        if (weight < 5 || weight > 1400) {
            alert('Please enter a valid weight between 30 and 1400 lbs');
            return;
        }

        if (height < 24 || height > 108) {
            alert('Please enter a valid height between 24 and 108 inches');
            return;
        }
        
        if (!document.getElementById('gender').value) {
            alert('Please select your gender');
            return;
        }

        // Save profile if validation passes
        const profile = {
            gender: document.getElementById('gender').value,
            age: age,
            weight: weight,
            height: height,
            activity: document.getElementById('activity').value,
            goal: document.getElementById('goal').value,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('mealMateProfile', JSON.stringify(profile));
        alert('Profile saved successfully!');
    });

    // Load profile on page load
    function loadProfile() {
        const savedProfile = localStorage.getItem('mealMateProfile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            
            // Fill the form with saved values
            document.getElementById('gender').value = profile.gender || '';
            document.getElementById('age').value = profile.age || '';
            document.getElementById('weight').value = profile.weight || '';
            document.getElementById('height').value = profile.height || '';
            document.getElementById('activity').value = profile.activity || '';
            document.getElementById('goal').value = profile.goal || '';
        }
    }
    
    loadProfile();

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

    // Setup click handlers for recipe cards
    function setupRecipeCards() {
        document.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                const recipeId = card.getAttribute('data-id');
                if (recipeId) {
                    window.location.href = `/recipe/${recipeId}`;
                }
            });
        });
    }
    
    // Search for recipes
    async function searchRecipes() {
        if (selectedIngredients.length === 0) {
            alert('Please add at least one ingredient');
            return;
        }
        
        try {
            recipeResults.innerHTML = '<div class="loading">Searching recipes...</div>';
            const response = await fetch('/api/recipes-with-ingredients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ingredients: selectedIngredients })
            });
            
            const recipes = await response.json();
            displayRecipes(recipes); // Fixed typo here
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
            const ingredientsList = recipe.ingredients
                .slice(0, 5)
                .map(ing => `<li>${ing}</li>`)
                .join('');
            
            html += `
                <div class="recipe-card" data-id="${recipe.id}">
                    <div class="recipe-content">
                        <div class="recipe-title">${recipe.name}</div>
                        <div class="recipe-meta">Serves: ${recipe.servings}</div>
                        <div class="recipe-info-flex">
                            <div class="recipe-section">
                                <h3>Key Ingredients</h3>
                                <ul class="ingredients-list">${ingredientsList}</ul>
                            </div>
                            <div class="nutrition-label">
                                <div class="nutrition-title">Nutrition Facts</div>
                                <div><strong>Calories:</strong> ${recipe.nutrition.calories} kcal</div>
                                <hr>
                                <div><strong>Total Fat:</strong> ${recipe.nutrition.totalFat} g</div>
                                <div class="sub-item">Saturated Fat: ${recipe.nutrition.saturatedFat} g</div>
                                <div><strong>Sodium:</strong> ${recipe.nutrition.sodium} mg</div>
                                <div><strong>Total Carbohydrate:</strong> ${recipe.nutrition.carbohydrate} g</div>
                                <div class="sub-item">Sugars: ${recipe.nutrition.sugar} g</div>
                                <div><strong>Protein:</strong> ${recipe.nutrition.protein} g</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        recipeResults.innerHTML = html;
        setupRecipeCards();
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