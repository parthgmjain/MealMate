document.addEventListener('DOMContentLoaded', () => {
    // Format instructions if they're in array format
    const instructionsElement = document.querySelector('.instructions p');
    if (instructionsElement) {
        try {
            const instructions = JSON.parse(instructionsElement.textContent.replace(/'/g, '"'));
            if (Array.isArray(instructions)) {
                let formattedInstructions = '<ol>';
                instructions.forEach(step => {
                    formattedInstructions += `<li>${step}</li>`;
                });
                formattedInstructions += '</ol>';
                instructionsElement.innerHTML = formattedInstructions;
            }
        } catch (e) {
            console.log('Instructions not in array format');
        }
    }
    
    // Make ingredients list items more readable
    const ingredientsList = document.querySelector('.ingredients-list ul');
    if (ingredientsList) {
        const items = ingredientsList.querySelectorAll('li');
        items.forEach(item => {
            const text = item.textContent.trim();
            // Add bullet point and clean up formatting
            item.innerHTML = `• ${text.charAt(0).toUpperCase() + text.slice(1)}`;
        });
    }
});