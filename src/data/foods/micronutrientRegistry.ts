import type { FoodCategory, MicronutrientValues } from '../../types/nutrition'

/**
 * Compact 10-element tuple per 100g:
 * [ironMg, calciumMg, potassiumMg, magnesiumMg, zincMg, sodiumMg, vitaminCMg, vitaminDMcg, vitaminB12Mcg, vitaminAMcg]
 * Reference benchmarks compiled from USDA FoodData Central (SR Legacy) & Iranian Food Composition Table (NNFTRI).
 */
type MicroTuple = readonly [
  ironMg: number,
  calciumMg: number,
  potassiumMg: number,
  magnesiumMg: number,
  zincMg: number,
  sodiumMg: number,
  vitaminCMg: number,
  vitaminDMcg: number,
  vitaminB12Mcg: number,
  vitaminAMcg: number,
]

const CURATED_MICRONUTRIENTS_PER_100G: Readonly<Record<string, MicroTuple>> = {
  // Breads & Grains
  'nan-sangak': [2.9, 65, 210, 68, 1.8, 430, 0, 0, 0, 0],
  'nan-barbari': [2.2, 42, 130, 34, 1.0, 510, 0, 0, 0, 0],
  'nan-lavash': [2.0, 38, 120, 28, 0.9, 540, 0, 0, 0, 0],
  'nan-taftoon': [2.4, 50, 155, 42, 1.2, 480, 0, 0, 0, 0],
  'nan-baguette': [1.8, 35, 115, 25, 0.8, 560, 0, 0, 0, 0],
  'nan-toast': [2.1, 95, 125, 26, 0.8, 490, 0, 0, 0, 0],
  'nan-toast-whole': [2.8, 105, 250, 75, 1.8, 450, 0, 0, 0, 0],
  'berenj-kateh': [0.3, 10, 35, 12, 0.5, 190, 0, 0, 0, 0],
  'berenj-abkesh': [0.2, 9, 28, 10, 0.4, 160, 0, 0, 0, 0],
  'berenj-ghahvei': [0.6, 12, 86, 44, 0.7, 140, 0, 0, 0, 0],
  'quinoa-cooked': [1.5, 17, 172, 64, 1.1, 70, 0, 0, 0, 0],
  'oats-dry': [4.3, 52, 362, 138, 3.6, 6, 0, 0, 0, 0],
  'oatmeal-cooked': [0.9, 18, 70, 27, 0.7, 95, 0, 0, 0, 0],
  macaroni: [1.4, 24, 165, 28, 1.2, 320, 3, 0, 0.3, 35],
  'pasta-whole-wheat': [1.5, 18, 85, 42, 0.9, 120, 0, 0, 0, 0],
  'boiled-potato': [0.3, 8, 379, 22, 0.3, 120, 13, 0, 0, 0],
  'sweet-potato': [0.7, 38, 475, 27, 0.3, 55, 19, 0, 0, 960],
  'french-fries': [0.8, 18, 540, 35, 0.5, 380, 5, 0, 0, 0],

  // Core Iranian Stews, Polos, Ashes & Legumes
  'ghormeh-sabzi': [2.6, 78, 340, 38, 1.7, 360, 8, 0, 0.6, 165],
  gheymeh: [2.1, 32, 310, 30, 1.6, 370, 6, 0, 0.6, 42],
  fesenjan: [2.3, 48, 280, 62, 1.5, 310, 4, 0, 0.4, 18],
  'khoresht-karafs': [1.9, 55, 295, 28, 1.4, 340, 7, 0, 0.5, 95],
  'khoresht-bamieh': [1.7, 52, 280, 32, 1.3, 330, 11, 0, 0.5, 55],
  'khoresht-aloo-esfenaj': [2.8, 85, 390, 52, 1.4, 330, 10, 0, 0.5, 260],
  'zereshk-polo-morgh': [1.1, 22, 185, 24, 1.1, 310, 4, 0.1, 0.3, 38],
  'adas-polo': [2.1, 24, 220, 32, 1.0, 280, 2, 0, 0.2, 12],
  'loobia-polo': [1.6, 28, 210, 26, 1.1, 320, 5, 0, 0.4, 35],
  'baghali-polo': [1.4, 26, 195, 28, 0.8, 270, 6, 0, 0, 48],
  'ash-reshteh': [2.2, 62, 310, 40, 1.1, 410, 7, 0, 0.1, 130],
  abgoosht: [2.4, 38, 380, 32, 2.1, 420, 6, 0, 0.9, 32],
  adasi: [3.3, 22, 365, 36, 1.3, 290, 3, 0, 0, 15],
  'khorak-loobia': [2.6, 46, 410, 44, 1.1, 310, 4, 0, 0, 18],

  // Kebabs, Poultry, Meats & Seafood
  'kabab-koobideh': [2.7, 22, 310, 24, 4.2, 480, 1, 0.1, 2.2, 12],
  'joojeh-kabab': [1.1, 16, 275, 28, 1.5, 420, 2, 0.2, 0.4, 28],
  'grilled-chicken-breast': [1.0, 15, 256, 29, 1.0, 220, 0, 0.1, 0.3, 6],
  'chicken-thigh-cooked': [1.3, 13, 240, 25, 2.1, 240, 0, 0.2, 0.5, 18],
  'beef-steak': [2.8, 18, 340, 25, 5.4, 210, 0, 0.1, 2.6, 4],
  'lamb-cooked': [2.3, 17, 310, 24, 4.5, 230, 0, 0.1, 2.5, 4],
  'salmon-grilled': [0.8, 15, 490, 32, 0.6, 180, 0, 13.1, 3.2, 68],
  'tuna-in-water': [1.5, 14, 237, 27, 0.8, 338, 0, 1.9, 2.9, 16],
  'tuna-in-oil': [1.4, 13, 207, 31, 0.9, 396, 0, 6.7, 2.2, 23],

  // Eggs & Dairy
  'boiled-egg': [1.2, 50, 126, 10, 1.0, 124, 0, 2.2, 1.1, 149],
  'egg-white': [0.1, 7, 163, 11, 0.1, 166, 0, 0, 0.1, 0],
  nimroo: [1.8, 59, 147, 12, 1.3, 210, 0, 2.4, 1.0, 198],
  'white-cheese': [0.5, 490, 85, 24, 2.4, 920, 0, 0.4, 1.4, 135],
  yogurt: [0.1, 121, 155, 12, 0.6, 46, 1, 0.1, 0.4, 27],
  'yogurt-highfat': [0.1, 115, 145, 11, 0.6, 52, 1, 0.2, 0.4, 52],
  'greek-yogurt': [0.1, 110, 141, 11, 0.6, 36, 0, 0.1, 0.7, 18],
  milk: [0.1, 122, 150, 11, 0.4, 47, 0, 1.1, 0.5, 55],
  'milk-fullfat': [0.1, 119, 143, 11, 0.4, 43, 0, 1.2, 0.5, 46],
  doogh: [0.1, 68, 90, 8, 0.3, 340, 0, 0, 0.2, 12],
  butter: [0, 24, 24, 2, 0.1, 110, 0, 1.5, 0.2, 684],

  // Nuts, Seeds, Spreads & Dried Fruits
  walnut: [2.9, 98, 441, 158, 3.1, 2, 1, 0, 0, 1],
  almond: [3.7, 269, 733, 270, 3.1, 1, 0, 0, 0, 0],
  pistachio: [3.9, 105, 1025, 121, 2.2, 120, 5, 0, 0, 26],
  hazelnut: [4.7, 114, 680, 163, 2.5, 0, 6, 0, 0, 1],
  cashew: [6.7, 37, 660, 292, 5.8, 12, 0, 0, 0, 0],
  peanut: [4.6, 92, 705, 168, 3.3, 18, 0, 0, 0, 0],
  'mixed-ajil': [4.1, 130, 740, 185, 3.2, 95, 2, 0, 0, 6],
  tahini: [8.9, 426, 414, 95, 4.6, 35, 0, 0, 0, 3],
  'peanut-butter': [1.9, 49, 558, 168, 2.5, 420, 0, 0, 0, 0],
  'sunflower-seeds': [5.2, 78, 645, 325, 5.0, 90, 1, 0, 0, 3],
  'pumpkin-seeds': [8.8, 46, 809, 592, 7.8, 90, 2, 0, 0, 1],
  'chia-seeds': [7.7, 631, 407, 335, 4.6, 16, 2, 0, 0, 3],
  dates: [1.0, 64, 656, 54, 0.4, 2, 0, 0, 0, 7],
  raisins: [1.9, 50, 749, 32, 0.2, 11, 2, 0, 0, 0],
  'dried-fig': [2.0, 162, 680, 68, 0.5, 10, 1, 0, 0, 0],

  // Fresh Fruits & Vegetables
  apple: [0.1, 6, 107, 5, 0, 1, 5, 0, 0, 3],
  banana: [0.3, 5, 358, 27, 0.2, 1, 9, 0, 0, 3],
  orange: [0.1, 40, 181, 10, 0.1, 0, 53, 0, 0, 11],
  tangerine: [0.2, 37, 166, 12, 0.1, 2, 27, 0, 0, 34],
  kiwi: [0.3, 34, 312, 17, 0.1, 3, 93, 0, 0, 4],
  strawberry: [0.4, 16, 153, 13, 0.1, 1, 59, 0, 0, 1],
  pomegranate: [0.3, 10, 236, 12, 0.4, 3, 10, 0, 0, 0],
  watermelon: [0.2, 7, 112, 10, 0.1, 1, 8, 0, 0, 28],
  avocado: [0.6, 12, 485, 29, 0.6, 7, 10, 0, 0, 7],
  cucumber: [0.3, 16, 147, 13, 0.2, 2, 3, 0, 0, 5],
  tomato: [0.3, 10, 237, 11, 0.2, 5, 14, 0, 0, 42],
  carrot: [0.3, 33, 320, 12, 0.2, 69, 6, 0, 0, 835],
  'salad-shirazi': [0.3, 14, 195, 12, 0.2, 120, 11, 0, 0, 24],
  'sabzi-khordan': [2.7, 135, 390, 45, 0.5, 42, 38, 0, 0, 380],
  'broccoli-cooked': [0.7, 40, 293, 21, 0.4, 41, 65, 0, 0, 77],

  // Packaged, Snacks & Fast Food
  'sagheh-talayi': [2.4, 45, 190, 48, 1.3, 310, 0, 0, 0, 0],
  'dark-chocolate-70': [11.9, 73, 715, 228, 3.3, 20, 0, 0, 0, 2],
  'potato-chips': [1.6, 24, 1190, 65, 1.1, 525, 18, 0, 0, 0],
  'cheese-puffs': [1.2, 65, 140, 20, 0.6, 890, 0, 0, 0.1, 25],
}

function tupleToMicronutrients(t: MicroTuple): MicronutrientValues {
  return {
    ironMg: t[0],
    calciumMg: t[1],
    potassiumMg: t[2],
    magnesiumMg: t[3],
    zincMg: t[4],
    sodiumMg: t[5],
    vitaminCMg: t[6],
    vitaminDMcg: t[7],
    vitaminB12Mcg: t[8],
    vitaminAMcg: t[9],
  }
}

/**
 * Estimates realistic per-100g micronutrients for regional Iranian dishes, fast foods,
 * dairy variants, sweets, and drinks when an item is not explicitly in CURATED_MICRONUTRIENTS_PER_100G.
 */
function estimateFallbackMicronutrients(
  id: string,
  name: string,
  category: FoodCategory,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
): MicronutrientValues {
  if (kcal <= 3) {
    return {
      ironMg: 0,
      calciumMg: 2,
      potassiumMg: 12,
      magnesiumMg: 2,
      zincMg: 0,
      sodiumMg: 3,
      vitaminCMg: 0,
      vitaminDMcg: 0,
      vitaminB12Mcg: 0,
      vitaminAMcg: 0,
    }
  }

  // Pure oils & sugars
  if (id.includes('oil') || name.includes('روغن')) {
    return {
      ironMg: 0,
      calciumMg: 0,
      potassiumMg: 0,
      magnesiumMg: 0,
      zincMg: 0,
      sodiumMg: 0,
      vitaminCMg: 0,
      vitaminDMcg: 0,
      vitaminB12Mcg: 0,
      vitaminAMcg: 0,
    }
  }

  if (name.includes('کشک')) {
    return {
      ironMg: 0.6,
      calciumMg: 380,
      potassiumMg: 180,
      magnesiumMg: 26,
      zincMg: 1.8,
      sodiumMg: 780,
      vitaminCMg: 0,
      vitaminDMcg: 0.2,
      vitaminB12Mcg: 1.1,
      vitaminAMcg: 45,
    }
  }

  if (name.includes('جگر')) {
    return {
      ironMg: 6.5,
      calciumMg: 11,
      potassiumMg: 350,
      magnesiumMg: 21,
      zincMg: 5.2,
      sodiumMg: 210,
      vitaminCMg: 2,
      vitaminDMcg: 1.2,
      vitaminB12Mcg: 59,
      vitaminAMcg: 4900,
    }
  }

  if (name.includes('ماهی') || name.includes('میگو') || name.includes('ساردین')) {
    return {
      ironMg: 1.3,
      calciumMg: 48,
      potassiumMg: 340,
      magnesiumMg: 33,
      zincMg: 1.1,
      sodiumMg: 290,
      vitaminCMg: 0,
      vitaminDMcg: 5.4,
      vitaminB12Mcg: 2.8,
      vitaminAMcg: 42,
    }
  }

  if (
    name.includes('پیتزا') ||
    name.includes('برگر') ||
    name.includes('سوسیس') ||
    name.includes('کالباس') ||
    name.includes('ساندویچ') ||
    name.includes('فلافل') ||
    name.includes('سمبوسه')
  ) {
    return {
      ironMg: 1.9,
      calciumMg: name.includes('پیتزا') ? 165 : 55,
      potassiumMg: 210,
      magnesiumMg: 26,
      zincMg: 1.6,
      sodiumMg: 640,
      vitaminCMg: 3,
      vitaminDMcg: 0.2,
      vitaminB12Mcg: name.includes('فلافل') ? 0 : 0.8,
      vitaminAMcg: 55,
    }
  }

  if (category === 'breakfast_dairy') {
    const isDairyOrCheese =
      name.includes('پنیر') ||
      name.includes('ماست') ||
      name.includes('شیر') ||
      name.includes('خامه') ||
      name.includes('بستنی')
    if (isDairyOrCheese) {
      return {
        ironMg: 0.2,
        calciumMg: name.includes('پنیر') ? 380 : 120,
        potassiumMg: 145,
        magnesiumMg: 14,
        zincMg: name.includes('پنیر') ? 1.8 : 0.6,
        sodiumMg: name.includes('پنیر') ? 680 : 55,
        vitaminCMg: 0,
        vitaminDMcg: 0.5,
        vitaminB12Mcg: 0.6,
        vitaminAMcg: fat > 8 ? 110 : 35,
      }
    }
    if (fat > 25 && protein > 10) {
      // Nuts / seeds / nut butters
      return {
        ironMg: 3.6,
        calciumMg: 95,
        potassiumMg: 620,
        magnesiumMg: 175,
        zincMg: 2.9,
        sodiumMg: 45,
        vitaminCMg: 1,
        vitaminDMcg: 0,
        vitaminB12Mcg: 0,
        vitaminAMcg: 4,
      }
    }
    return {
      ironMg: 1.1,
      calciumMg: 35,
      potassiumMg: 120,
      magnesiumMg: 18,
      zincMg: 0.6,
      sodiumMg: 150,
      vitaminCMg: 1,
      vitaminDMcg: 0.2,
      vitaminB12Mcg: 0.2,
      vitaminAMcg: 25,
    }
  }

  if (category === 'stews_mains') {
    const highMeat = protein >= 15
    return {
      ironMg: highMeat ? 2.1 : 1.6,
      calciumMg: 38,
      potassiumMg: 290,
      magnesiumMg: 30,
      zincMg: highMeat ? 2.6 : 1.2,
      sodiumMg: 350,
      vitaminCMg: 6,
      vitaminDMcg: 0.2,
      vitaminB12Mcg: highMeat ? 1.1 : 0.4,
      vitaminAMcg: 65,
    }
  }

  if (category === 'rice_breads') {
    const isBread = name.includes('نان') || carbs > 42
    return {
      ironMg: isBread ? 2.1 : 0.9,
      calciumMg: isBread ? 45 : 18,
      potassiumMg: isBread ? 145 : 110,
      magnesiumMg: isBread ? 35 : 22,
      zincMg: isBread ? 1.0 : 0.7,
      sodiumMg: isBread ? 460 : 250,
      vitaminCMg: 1,
      vitaminDMcg: 0,
      vitaminB12Mcg: 0.1,
      vitaminAMcg: 12,
    }
  }

  // drinks_snacks (fruits, vegetables, salads, drinks, sweets)
  const isProduce = kcal < 95 && fat < 2 && carbs <= 22
  if (isProduce) {
    return {
      ironMg: 0.5,
      calciumMg: 26,
      potassiumMg: 230,
      magnesiumMg: 16,
      zincMg: 0.2,
      sodiumMg: name.includes('شور') || name.includes('ترشی') ? 820 : 12,
      vitaminCMg: 22,
      vitaminDMcg: 0,
      vitaminB12Mcg: 0,
      vitaminAMcg: 85,
    }
  }

  return {
    ironMg: 0.8,
    calciumMg: 28,
    potassiumMg: 130,
    magnesiumMg: 18,
    zincMg: 0.5,
    sodiumMg: 180,
    vitaminCMg: 2,
    vitaminDMcg: 0,
    vitaminB12Mcg: 0.1,
    vitaminAMcg: 15,
  }
}

export function resolveFoodMicronutrients(
  id: string,
  name: string,
  category: FoodCategory,
  per100g: readonly [kcal: number, protein: number, carbs: number, fat: number],
): MicronutrientValues {
  const curated = CURATED_MICRONUTRIENTS_PER_100G[id]
  if (curated) {
    return tupleToMicronutrients(curated)
  }
  return estimateFallbackMicronutrients(
    id,
    name,
    category,
    per100g[0],
    per100g[1],
    per100g[2],
    per100g[3],
  )
}
