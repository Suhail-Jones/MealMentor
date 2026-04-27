-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  servings INT DEFAULT 1,
  prep_time INT,
  cook_time INT,
  instructions TEXT NOT NULL,
  tags VARCHAR(255),
  protein_g DECIMAL(8, 2),
  carbs_g DECIMAL(8, 2),
  fat_g DECIMAL(8, 2),
  calories DECIMAL(8, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100),
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipe_ingredients junction table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INT REFERENCES ingredients(id),
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cached_prices table for performance
CREATE TABLE IF NOT EXISTS cached_prices (
  id SERIAL PRIMARY KEY,
  ingredient_id INT REFERENCES ingredients(id),
  store VARCHAR(100),
  price DECIMAL(10, 2),
  availability BOOLEAN DEFAULT true,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(to_tsvector('english', tags));
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cached_prices_ingredient ON cached_prices(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_cached_prices_store ON cached_prices(store);
