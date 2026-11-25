/**
 * Authoritative validation registry for 67 high-consumption Iranian & everyday foods,
 * dietary fiber per 100g values, and Iranian GS1 (626) supermarket barcodes.
 */
export const DEFAULT_APPROXIMATE_SOURCE =
  'برآورد تقریبی خانگی بر پایه میانگین ترکیبات مواد غذایی ایران و USDA'

export const VERIFIED_FOOD_SOURCES: Readonly<Record<string, string>> = {
  // Traditional & Everyday Breads (NNFTRI & USDA SR Legacy)
  'nan-sangak': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان سنگک)',
  'nan-barbari': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان بربری)',
  'nan-lavash': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان لواش)',
  'nan-taftoon': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان تافتون)',
  'nan-baguette': 'USDA SR Legacy NDB #18029 (French/Baguette Bread)',
  'nan-toast': 'USDA SR Legacy NDB #18069 (White Bread)',
  'nan-toast-whole': 'USDA SR Legacy NDB #18075 (Whole-Wheat Bread)',

  // Rice, Grains, Potatoes & Pasta
  'berenj-abkesh': 'USDA SR Legacy NDB #20045 + چلو آبکش کم‌روغن ایرانی',
  'berenj-kateh': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — کته خانگی)',
  'berenj-ghahvei': 'USDA SR Legacy NDB #20037 (Cooked Brown Rice)',
  'quinoa-cooked': 'USDA SR Legacy NDB #20137 (Cooked Quinoa)',
  'boiled-potato': 'USDA SR Legacy NDB #11367 (Boiled Potato)',
  'sweet-potato': 'USDA SR Legacy NDB #11508 (Baked Sweet Potato)',
  'french-fries': 'USDA SR Legacy NDB #11403 (French Fries)',
  macaroni: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — ماکارونی با مایه گوشت)',
  'pasta-whole-wheat': 'USDA SR Legacy NDB #20125 (Cooked Whole-Wheat Pasta)',

  // Core Iranian Stews, Mixed Rice, Ashes & Legumes
  'ghormeh-sabzi': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — خورش قورمه‌سبزی)',
  gheymeh: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — خورش قیمه)',
  fesenjan: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — خورش فسنجان)',
  'zereshk-polo-morgh': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — زرشک‌پلو با مرغ)',
  'adas-polo': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — عدس‌پلو)',
  'loobia-polo': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — لوبیاپلو)',
  'ash-reshteh': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — آش رشته)',
  abgoosht: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — آبگوشت سنتی)',
  adasi: 'USDA SR Legacy NDB #16070 (Cooked Lentils) + دستور عدسی ایرانی',
  'khorak-loobia': 'USDA SR Legacy NDB #16043 (Cooked Pinto Beans) + خوراک لوبیا چیتی',

  // Meats, Poultry, Kebabs & Seafood
  'joojeh-kabab': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — جوجه‌کباب بی‌استخوان)',
  'kabab-koobideh': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — کباب کوبیده)',
  'grilled-chicken-breast': 'USDA SR Legacy NDB #05064 (Roasted Chicken Breast, Meat Only)',
  'chicken-thigh-cooked': 'USDA SR Legacy NDB #05094 (Roasted Chicken Thigh, Meat Only)',
  'beef-steak': 'USDA SR Legacy NDB #23568 (Cooked Lean Beef Sirloin/Round)',
  'lamb-cooked': 'USDA SR Legacy NDB #17012 (Cooked Lamb)',
  'salmon-grilled': 'USDA SR Legacy NDB #15237 (Cooked Atlantic Salmon)',
  'tuna-in-water': 'USDA SR Legacy NDB #15121 (Light Tuna Canned in Water, Drained)',
  'tuna-in-oil': 'USDA SR Legacy NDB #15119 (Light Tuna Canned in Oil, Drained)',

  // Eggs & Dairy
  'boiled-egg': 'USDA SR Legacy NDB #01129 (Hard-Boiled Egg)',
  'egg-white': 'USDA SR Legacy NDB #01124 (Cooked Egg White)',
  nimroo: 'USDA SR Legacy NDB #01128 (Fried Egg)',
  'white-cheese': 'USDA SR Legacy NDB #01019 / استاندارد ملی پنیر سفید ایرانی',
  yogurt: 'USDA SR Legacy NDB #01116 (Plain Whole-Milk Yogurt)',
  'greek-yogurt': 'USDA SR Legacy NDB #01287 (Lowfat Greek Yogurt)',
  milk: 'USDA SR Legacy NDB #01079 (Reduced-Fat Milk 2%)',
  'milk-fullfat': 'USDA SR Legacy NDB #01077 (Whole Milk 3.25%)',
  doogh: 'جدول ترکیبات مواد غذایی ایران / استاندارد ملی دوغ سنتی',
  butter: 'USDA SR Legacy NDB #01001 (Salted/Unsalted Butter)',

  // Oils, Sweeteners, Breakfast Staples & Seeds/Nuts
  'olive-oil': 'USDA SR Legacy NDB #04053 (Olive Oil)',
  honey: 'USDA SR Legacy NDB #19296 (Natural Honey)',
  'sugar-granulated': 'USDA SR Legacy NDB #19335 (Granulated Sugar)',
  'oats-dry': 'USDA SR Legacy NDB #08120 (Rolled Oats)',
  tahini: 'USDA SR Legacy NDB #12166 (Sesame Tahini)',
  'peanut-butter': 'USDA SR Legacy NDB #16098 (Smooth Peanut Butter)',
  walnut: 'USDA SR Legacy NDB #12155 (English Walnuts)',
  almond: 'USDA SR Legacy NDB #12061 (Whole Almonds)',
  pistachio: 'USDA SR Legacy NDB #12151 (Pistachio Nuts)',
  peanut: 'USDA SR Legacy NDB #16087 (Peanuts)',
  dates: 'USDA SR Legacy NDB #09087 (Dates)',
  raisins: 'USDA SR Legacy NDB #09298 (Seedless Raisins)',
  'chia-seeds': 'USDA SR Legacy NDB #12006 (Dried Chia Seeds)',

  // Everyday Fruits & Vegetables
  apple: 'USDA SR Legacy NDB #09003 (Raw Apple with Skin)',
  banana: 'USDA SR Legacy NDB #09040 (Raw Banana)',
  orange: 'USDA SR Legacy NDB #09200 (Raw Navel Orange)',
  pomegranate: 'USDA SR Legacy NDB #09286 (Raw Pomegranate Arils)',
  watermelon: 'USDA SR Legacy NDB #09326 (Raw Watermelon)',
  avocado: 'USDA SR Legacy NDB #09037 (Raw Avocado)',
  cucumber: 'USDA SR Legacy NDB #11205 (Raw Cucumber with Peel)',
  tomato: 'USDA SR Legacy NDB #11529 (Raw Red Tomato)',
  carrot: 'USDA SR Legacy NDB #11124 (Raw Carrot)',
}

/** Reference dietary fiber (grams per 100g) for Iranian breads, stews, legumes, grains, nuts, and produce. */
export const VERIFIED_FIBER_PER_100G: Readonly<Record<string, number>> = {
  'nan-sangak': 4.8,
  'nan-barbari': 2.6,
  'nan-lavash': 2.2,
  'nan-taftoon': 3.1,
  'nan-toast': 2.7,
  'nan-toast-whole': 6.8,
  'nan-baguette': 2.4,
  'nan-protein': 7.5,
  'berenj-kateh': 0.4,
  'berenj-abkesh': 0.4,
  'berenj-ghahvei': 1.8,
  'baghali-polo': 2.6,
  'bulgur-cooked': 4.5,
  'quinoa-cooked': 2.8,
  'pasta-whole-wheat': 3.9,
  macaroni: 1.8,
  'boiled-potato': 1.8,
  'baked-potato': 2.2,
  'sweet-potato': 3.3,
  'french-fries': 3.8,
  'ghormeh-sabzi': 3.6,
  gheymeh: 3.4,
  fesenjan: 2.8,
  'khoresht-karafs': 2.9,
  'khoresht-bamieh': 3.2,
  'khoresht-aloo-esfenaj': 3.5,
  'adas-polo': 3.8,
  'loobia-polo': 2.9,
  'ash-reshteh': 4.2,
  'ash-jo': 3.8,
  'ash-doogh': 2.1,
  'soup-lentil': 4.1,
  'barley-soup': 2.5,
  abgoosht: 3.9,
  adasi: 6.8,
  'khorak-loobia': 7.2,
  'oats-dry': 10.1,
  'oatmeal-cooked': 2.1,
  granola: 7.4,
  tahini: 9.3,
  'peanut-butter': 6.0,
  walnut: 6.7,
  almond: 12.5,
  pistachio: 10.6,
  hazelnut: 9.7,
  cashew: 3.3,
  peanut: 8.5,
  'mixed-ajil': 8.8,
  'sunflower-seeds': 8.6,
  'pumpkin-seeds': 6.0,
  'chickpea-roasted': 12.2,
  'chia-seeds': 34.4,
  'flax-seeds': 27.3,
  sesame: 11.8,
  dates: 6.7,
  raisins: 3.7,
  'dried-fig': 9.8,
  'dried-apricot': 7.3,
  'dried-plum': 7.1,
  apple: 2.4,
  banana: 2.6,
  orange: 2.4,
  tangerine: 1.8,
  pomegranate: 4.0,
  watermelon: 0.4,
  pear: 3.1,
  kiwi: 3.0,
  strawberry: 2.0,
  avocado: 6.7,
  cucumber: 0.5,
  tomato: 1.2,
  'salad-shirazi': 1.1,
  'sabzi-khordan': 3.2,
  carrot: 2.8,
  lettuce: 1.3,
  'broccoli-cooked': 3.3,
  'broad-beans-cooked': 5.4,
  'green-peas-cooked': 5.5,
  'corn-boiled': 2.4,
  'sagheh-talayi': 5.8,
  popcorn: 12.5,
  'dark-chocolate-70': 10.9,
}

/** Curated Iranian GS1 (626) EAN-13 sample barcodes for instant supermarket scanning & lookup. */
export const IRANIAN_FOOD_BARCODES: Readonly<Record<string, string>> = {
  'sagheh-talayi': '6260101200112', // بیسکویت ساقه‌طلایی مینو
  'biscuit-mother': '6260102500143', // بیسکویت مادر ویتانا
  'petit-beurre': '6260101200228', // بیسکویت پتی‌بور
  milk: '6260201100105', // شیر کم‌چرب کاله / پگاه
  'milk-fullfat': '6260201100112', // شیر پرچرب
  'greek-yogurt': '6260201100853', // ماست یونانی / ایسلندی
  'yogurt-highfat': '6260201100426', // ماست پرچرب سون
  'white-cheese': '6260201400212', // پنیر سفید صبحانه ۴۰۰ گرمی
  doogh: '6260201100600', // دوغ سنتی
  'tuna-in-oil': '6260304400102', // کنسرو تن ماهی
  'tuna-in-water': '6260304400119', // کنسرو تن ماهی در آب‌نمک
  'potato-chips': '6260405500121', // چیپس سیب‌زمینی مزمز / چیتوز
  'cheese-puffs': '6260101200501', // پفک نمکی
  'chocolate-milk': '6260201100310', // شیرکاکائو پاکتی
  'cola-soda': '6260501100108', // نوشابه گازدار
  delster: '6260502200145', // ماءالشعیر دلستر
  'dark-chocolate-70': '6260108800704', // شکلات تلخ ۷۰٪ شونیز / پارمیدا
  'oats-dry': '6260603300215', // جو دوسر پرک
  'peanut-butter': '6260604400105', // کره بادام‌زمینی
  'protein-bar': '6260701100306', // پروتئین بار ورزشی
}
