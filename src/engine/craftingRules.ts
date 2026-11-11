import { GRADES, type Grade } from '../data/gameConfig';
import { RECIPES, type DessertId, type MaterialId, type Recipe } from '../data/recipes';

export type ResolvedIngredient =
  | { kind: 'material'; id: MaterialId; qty: number }
  | { kind: 'dessert'; id: DessertId; qty: number };

export interface ResolvedRecipe extends Omit<Recipe, 'ingredients'> {
  ingredients: ResolvedIngredient[];
}

export const tier2Need = (grade: Grade): number => GRADES[grade].tier2Need;

export function resolveRecipe(recipe: Recipe, grade: Grade): ResolvedRecipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      qty: ing.qty === 'tier2Need' ? tier2Need(grade) : ing.qty,
    })) as ResolvedIngredient[],
  };
}

export function recipesForGrade(grade: Grade): ResolvedRecipe[] {
  return RECIPES.map((r) => resolveRecipe(r, grade));
}

/** Rules shown on screen and checked by tests so UI text never contradicts the model. */
export const RECIPE_RULES = {
  unlimitedUse: true,
  consumedOnUse: false,
  halfRecipes: false,
  tradeable: true,
  physicalCardRequired: true,
  legendaryRequiredForTier: 3,
} as const;
