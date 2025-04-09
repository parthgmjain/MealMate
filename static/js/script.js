document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const ingredientInput = document.getElementById('ingredientInput');
    const addButton = document.getElementById('addButton');
    const searchButton = document.getElementById('searchButton');
    const suggestionsDiv = document.getElementById('suggestions');
    const ingredientList = document.getElementById('ingredientList');
    const recipeResults = document.getElementById('recipeResults');
    const profileForm = document.getElementById('nutritionProfileForm');
    const dailyTargets = document.getElementById('dailyTargets'); // 👈 Added

    let selectedIngredients = [];

    // Conversion helpers
    const kg = lbs => lbs * 0.453592;
    const cm = inches => inches * 2.54;

    // BMR calculation
    function calculateBMR(gender, weight, height, age) {
        if (gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age + 5;
        } else if (gender === 'female') {
            return 10 * weight + 6.25 * height - 5 * age - 161;
        }
        return 0;
    }

    // Activity multiplier
    function activityMultiplier(level) {
        switch (level) {
            case 'sedentary': return 1.2;
            case 'light': return 1.375;
            case 'moderate': return 1.55;
            case 'active': return 1.725;
            case 'extra': return 1.9;
            default: return 1.2;
        }
    }

    // Goal adjustment
    function goalAdjustment(goal) {
        switch (goal) {
            case 'lose': return -500;
            case 'maintain': return 0;
            case 'gain': return 250;
            default: return 0;
        }
    }

    // Macro distribution
    function calculateMacros(calories) {
        return {
            protein: Math.round((calories * 0.3) / 4),
            fat: Math.round((calories * 0.3) / 9),
            carbs: Math.round((calories * 0.4) / 4)
        };
    }

    // Final target calculator
    function getDailyNutritionTargets(profile) {
        const weightKg = kg(profile.weight);
        const heightCm = cm(profile.height);
        const bmr = calculateBMR(profile.gender, weightKg, heightCm, profile.age);
        const calories = Math.round(bmr * activityMultiplier(profile.activity)) + goalAdjustment(profile.goal);
        const macros = calculateMacros(calories);

        return {
            calories,
            protein: macros.protein,
            fat: macros.fat,
            carbs: macros.carbs,
            sodium: 2300,
            sugar: profile.gender === 'female' ? 25 : 36,
            saturatedFat: 20
        };
    }

    function displayNutritionTargets(targets) {
        if (!dailyTargets) return;
        dailyTargets.innerHTML = `
            <h3>Your Daily Nutrition Targets</h3>
            <ul>
                <li><strong>Calories:</strong> ${targets.calories} kcal</li>
                <li><strong>Protein:</strong> ${targets.protein} g</li>
                <li><strong>Fat:</strong> ${targets.fat} g</li>
                <li><strong>Carbs:</strong> ${targets.carbs} g</li>
                <li><strong>Sodium:</strong> ${targets.sodium} mg</li>
                <li><strong>Sugar:</strong> ${targets.sugar} g</li>
                <li><strong>Saturated Fat:</strong> ${targets.saturatedFat} g</li>
            </ul>
        `;
    }

    // Form submit handler with validation
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const age = parseInt(document.getElementById('age').value);
        const weight = parseFloat(document.getElementById('weight').value);
        const height = parseFloat(document.getElementById('height').value);

        if (age < 13 || age > 120) {
            alert('Please enter a valid age between 13 and 120');
            return;
        }
        
        if (weight < 30 || weight > 1400) {
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
        
        const targets = getDailyNutritionTargets(profile);
        displayNutritionTargets(targets);
    });

    function loadProfile() {
        const savedProfile = localStorage.getItem('mealMateProfile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            
            document.getElementById('gender').value = profile.gender || '';
            document.getElementById('age').value = profile.age || '';
            document.getElementById('weight').value = profile.weight || '';
            document.getElementById('height').value = profile.height || '';
            document.getElementById('activity').value = profile.activity || '';
            document.getElementById('goal').value = profile.goal || '';

            const targets = getDailyNutritionTargets(profile);
            displayNutritionTargets(targets);
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