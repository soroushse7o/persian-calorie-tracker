import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { parsePersianFoodInput } from './persianFoodParser'

interface GoldenCase {
  sentence: string
  expectedFoodIds: string[]
  expectedFirstQty?: number
  expectedFirstUnit?: string
  expectAmbiguousFirst?: boolean
}

/**
 * 210 real-world everyday Persian food logging sentences spanning:
 * Iranian stews, regional dishes, kebabs, breads, fast foods, breakfasts,
 * dairy, traditional sweets, nuts, seasonal fruits, drinks, packaged foods,
 * Persian/Arabic/English digits, fractions, ZWNJ variations, typos, and multi-item meals.
 */
const GOLDEN_SENTENCES: GoldenCase[] = [
  // --- Stews & Classic Lunches (1-35) ---
  { sentence: 'دو کفگیر قورمه‌سبزی', expectedFoodIds: ['ghormeh-sabzi'], expectedFirstQty: 2, expectedFirstUnit: 'کفگیر' },
  { sentence: 'دو کفگیر قورمهسبزی و یک کف دست سنگک', expectedFoodIds: ['ghormeh-sabzi', 'nan-sangak'], expectedFirstQty: 2 },
  { sentence: 'دو کفگیر قورمهسبزی و یک کف دست سنگک و نصف لیوان دوغ', expectedFoodIds: ['ghormeh-sabzi', 'nan-sangak', 'doogh'] },
  { sentence: '۱.۵ کفگیر قیمه و دو کفگیر برنج کته', expectedFoodIds: ['gheymeh', 'berenj-kateh'], expectedFirstQty: 1.5 },
  { sentence: 'یک کفگیر خورش فسنجان و دو کفگیر برنج آبکش', expectedFoodIds: ['fesenjan', 'berenj-abkesh'] },
  { sentence: 'دو کفگیر قیمه بادمجان و یک پیاله سالاد شیرازی', expectedFoodIds: ['gheymeh-bademjan', 'salad-shirazi'] },
  { sentence: 'دو کفگیر خورش کرفس', expectedFoodIds: ['khoresht-karafs'], expectedFirstQty: 2 },
  { sentence: 'یک کاسه خورش بامیه', expectedFoodIds: ['khoresht-bamieh'], expectedFirstUnit: 'کاسه' },
  { sentence: 'یک کفگیر خورش آلو اسفناج و دو کفگیر برنج کته', expectedFoodIds: ['khoresht-aloo-esfenaj', 'berenj-kateh'] },
  { sentence: 'یک پرس قیمه نثار', expectedFoodIds: ['khoresht-gheymeh-nesar'], expectedFirstUnit: 'پرس' },
  { sentence: 'یک کفگیر خورش کدو حلوایی', expectedFoodIds: ['khoresht-kadoo'] },
  { sentence: 'یک کفگیر خورش به آلو', expectedFoodIds: ['khoresht-beh'] },
  { sentence: 'یک کفگیر خورش ریواس', expectedFoodIds: ['khoresht-rivas'] },
  { sentence: 'دو کفگیر مرغ ترش و دو کفگیر برنج کته', expectedFoodIds: ['khoresht-morghe-torsh', 'berenj-kateh'] },
  { sentence: 'دو کفگیر باقالی قاتق و یک کفگیر کته', expectedFoodIds: ['baghali-ghatogh', 'berenj-kateh'] },
  { sentence: 'یک کفگیر اناربیج', expectedFoodIds: ['anarbij'] },
  { sentence: 'دو کفگیر خورش خلال بادام', expectedFoodIds: ['khoresht-khalal'] },
  { sentence: 'یک پیاله خورش ماست اصفهان', expectedFoodIds: ['khoresht-masto-esfahan'] },
  { sentence: 'یک کاسه تاس کباب و یک کف دست بربری', expectedFoodIds: ['tass-kabab', 'nan-barbari'] },
  { sentence: 'دو کفگیر قلیه ماهی و دو کفگیر برنج آبکش', expectedFoodIds: ['ghalieh-mahi', 'berenj-abkesh'] },
  { sentence: 'یک کفگیر قلیه میگو', expectedFoodIds: ['ghalieh-meygoo'] },
  { sentence: 'یک پرس زرشک‌پلو با مرغ', expectedFoodIds: ['zereshk-polo-morgh'] },
  { sentence: 'دو کفگیر عدس‌پلو و یک پیاله ماست', expectedFoodIds: ['adas-polo', 'yogurt'] },
  { sentence: 'دو و نیم کفگیر لوبیاپلو', expectedFoodIds: ['loobia-polo'], expectedFirstQty: 2.5 },
  { sentence: 'یک پرس سبزی‌پلو با ماهی', expectedFoodIds: ['sabzi-polo-mahi'] },
  { sentence: 'یک پرس باقالی‌پلو با ماهیچه', expectedFoodIds: ['baghali-polo-mahicheh'] },
  { sentence: 'یک تکه ته‌چین مرغ', expectedFoodIds: ['tahchin-morgh'] },
  { sentence: 'دو کفگیر کلم‌پلو شیرازی', expectedFoodIds: ['kalam-polo'] },
  { sentence: 'دو کفگیر آلبالوپلو', expectedFoodIds: ['albaloo-polo'] },
  { sentence: 'دو کفگیر هویج‌پلو', expectedFoodIds: ['havij-polo'] },
  { sentence: 'یک کفگیر مرصع پلو', expectedFoodIds: ['shirin-polo'] },
  { sentence: 'دو کفگیر رشته‌پلو', expectedFoodIds: ['reshteh-polo'] },
  { sentence: 'دو کفگیر ماش‌پلو', expectedFoodIds: ['mash-polo'] },
  { sentence: 'دو کفگیر دمپختک', expectedFoodIds: ['dampokhtak'] },
  { sentence: 'یک پرس اکبرجوجه', expectedFoodIds: ['akbar-joojeh'] },

  // --- Kebabs, Grills, Seafood & Mains (36-65) ---
  { sentence: 'یک سیخ جوجه کباب و یک گوجه کبابی', expectedFoodIds: ['joojeh-kabab', 'tomato'] },
  { sentence: 'دو سیخ کباب کوبیده و دو کفگیر برنج آبکش', expectedFoodIds: ['kabab-koobideh', 'berenj-abkesh'] },
  { sentence: 'یک سیخ کباب برگ', expectedFoodIds: ['kabab-barg'] },
  { sentence: 'یک سیخ چنجه', expectedFoodIds: ['kabab-chenjeh'] },
  { sentence: 'یک سیخ کباب بختیاری و یک لیوان دوغ', expectedFoodIds: ['kabab-bakhtiari', 'doogh'] },
  { sentence: 'یک پرس شیشلیک', expectedFoodIds: ['kabab-shishlik'] },
  { sentence: 'یک سیخ کباب ترش', expectedFoodIds: ['kabab-torsh'] },
  { sentence: 'یک سیخ جوجه ترش', expectedFoodIds: ['joojeh-torsh'] },
  { sentence: 'دو تکه کباب تابه‌ای و یک کف دست سنگک', expectedFoodIds: ['kabab-tabei', 'nan-sangak'] },
  { sentence: 'سه سیخ جگر کبابی و یک برگ لواش', expectedFoodIds: ['jigar-kababi', 'nan-lavash'] },
  { sentence: 'دو سیخ دل کبابی و یک سیخ قلوه', expectedFoodIds: ['del-kababi', 'gholveh-kababi'] },
  { sentence: 'چهار عدد بال کبابی', expectedFoodIds: ['bal-kababi'], expectedFirstQty: 4 },
  { sentence: 'دو سیخ کوبیده مرغ', expectedFoodIds: ['kabab-koobideh-morgh'] },
  { sentence: '200 گرم سینه مرغ گریل و 150 گرم برنج آبکش', expectedFoodIds: ['grilled-chicken-breast', 'berenj-abkesh'], expectedFirstQty: 200, expectedFirstUnit: 'گرم' },
  { sentence: 'یک عدد ران مرغ پخته', expectedFoodIds: ['chicken-thigh-cooked'] },
  { sentence: 'یک تکه ماهی قزل‌آلا کبابی', expectedFoodIds: ['grilled-trout'] },
  { sentence: 'یک تکه ماهی سرخ‌شده', expectedFoodIds: ['fried-fish'] },
  { sentence: '۱۵۰ گرم ماهی سالمون گریل', expectedFoodIds: ['salmon-grilled'], expectedFirstQty: 150 },
  { sentence: 'یک پرس میگو گریل', expectedFoodIds: ['shrimp-cooked'] },
  { sentence: 'یک پرس میگو سوخاری', expectedFoodIds: ['shrimp-fried'] },
  { sentence: '200 گرم استیک گوشت گوساله', expectedFoodIds: ['beef-steak'] },
  { sentence: '۱۵۰ گرم سینه بوقلمون گریل', expectedFoodIds: ['turkey-breast'] },
  { sentence: 'دو تکه گوشت گوسفندی پخته', expectedFoodIds: ['lamb-cooked'] },
  { sentence: 'یک کاسه خوراک مرغ و سبزیجات', expectedFoodIds: ['khorak-morgh-sabzijat'] },
  { sentence: 'یک کاسه آش رشته', expectedFoodIds: ['ash-reshteh'] },
  { sentence: 'یک پیاله آش شله قلمکار', expectedFoodIds: ['ash-sholeh'] },
  { sentence: 'یک کاسه آش دوغ', expectedFoodIds: ['ash-doogh'] },
  { sentence: 'یک کاسه آش جو', expectedFoodIds: ['ash-jo'] },
  { sentence: 'یک کاسه آش انار', expectedFoodIds: ['ash-anar'] },
  { sentence: 'یک کاسه سوپ جو و یک کف دست نان سنگک', expectedFoodIds: ['barley-soup', 'nan-sangak'] },

  // --- Soups, Kuku, Kotlet, Eggplant & Home Dinners (66-90) ---
  { sentence: 'یک کاسه سوپ مرغ', expectedFoodIds: ['soup-vermicelli'] },
  { sentence: 'یک کاسه سوپ قارچ', expectedFoodIds: ['soup-mushroom'] },
  { sentence: 'یک کاسه سوپ عدس', expectedFoodIds: ['soup-lentil'] },
  { sentence: 'یک کاسه آبگوشت و دو کف دست سنگک', expectedFoodIds: ['abgoosht', 'nan-sangak'] },
  { sentence: 'یک کاسه دیزی و یک پیاله ترشی', expectedFoodIds: ['abgoosht', 'torshi-liteh'] },
  { sentence: 'یک کاسه اشکنه', expectedFoodIds: ['eshteneh'] },
  { sentence: 'یک کاسه کشک و بادمجان و دو کف دست بربری', expectedFoodIds: ['kashk-bademjan', 'nan-barbari'] },
  { sentence: 'یک کاسه میرزا قاسمی و یک کف دست سنگک', expectedFoodIds: ['mirza-ghasemi', 'nan-sangak'] },
  { sentence: 'یک کاسه حلیم بادمجان', expectedFoodIds: ['halim-bademjan'] },
  { sentence: 'یک پرس املت و دو کف دست بربری و یک لیوان چای شیرین', expectedFoodIds: ['omelette', 'nan-barbari', 'sweet-tea'] },
  { sentence: 'دو عدد نیمرو و یک کف دست تافتون', expectedFoodIds: ['nimroo', 'nan-taftoon'] },
  { sentence: 'دو تکه کوکو سبزی و یک گوجه و یک خیار', expectedFoodIds: ['kuku-sabzi', 'tomato', 'cucumber'] },
  { sentence: 'سه عدد کوکو سیب‌زمینی', expectedFoodIds: ['kuku-sibzamini'] },
  { sentence: 'سه عدد کتلت و دو برگ لواش', expectedFoodIds: ['kotlet', 'nan-lavash'] },
  { sentence: 'دو عدد شامی لپه', expectedFoodIds: ['shami-lapeh'] },
  { sentence: 'یک عدد کوفته تبریزی', expectedFoodIds: ['koofteh-tabrizi'] },
  { sentence: 'پنج عدد دلمه برگ مو و یک پیاله ماست', expectedFoodIds: ['dolmeh', 'yogurt'] },
  { sentence: 'یک عدد دلمه فلفل دلمه‌ای', expectedFoodIds: ['dolmeh-felfel'] },
  { sentence: 'یک کاسه سالاد الویه و یک نان باگت', expectedFoodIds: ['olivieh', 'nan-baguette'] },
  { sentence: 'دو کفگیر ماکارونی و یک تکه ته‌دیگ سیب‌زمینی', expectedFoodIds: ['macaroni', 'tahdig-sibzamini'] },
  { sentence: 'یک پرس پاستا آلفردو با مرغ', expectedFoodIds: ['pasta-alfredo'] },
  { sentence: 'یک کاسه پاستا پستو', expectedFoodIds: ['pasta-penne-pesto'] },
  { sentence: 'یک تکه لازانیا گوشت', expectedFoodIds: ['lasagna'] },
  { sentence: 'یک بسته نودل', expectedFoodIds: ['noodle-instant'] },
  { sentence: 'دو کفگیر ماکارونی سبوس‌دار پخته', expectedFoodIds: ['pasta-whole-wheat'] },

  // --- Breads, Rice, Potatoes & Fast Foods (91-125) ---
  { sentence: 'دو کفگیر برنج قهوه‌ای پخته', expectedFoodIds: ['berenj-ghahvei'] },
  { sentence: 'یک کاسه بلغور گندم پخته', expectedFoodIds: ['bulgur-cooked'] },
  { sentence: 'چهار قاشق کینوا پخته', expectedFoodIds: ['quinoa-cooked'] },
  { sentence: 'یک عدد سیب‌زمینی آب‌پز', expectedFoodIds: ['boiled-potato'] },
  { sentence: 'یک عدد سیب‌زمینی تنوری', expectedFoodIds: ['baked-potato'] },
  { sentence: 'یک کاسه پوره سیب‌زمینی', expectedFoodIds: ['mashed-potato'] },
  { sentence: 'یک عدد سیب‌زمینی شیرین پخته', expectedFoodIds: ['sweet-potato'] },
  { sentence: 'دو برش نان تست سبوس‌دار', expectedFoodIds: ['nan-toast-whole'] },
  { sentence: 'دو برش نان تست و یک قاشق کره بادام‌زمینی', expectedFoodIds: ['nan-toast', 'peanut-butter'] },
  { sentence: 'یک عدد نان همبرگر', expectedFoodIds: ['nan-hamburger'] },
  { sentence: 'دو برش نان شیرمال', expectedFoodIds: ['nan-shirmal'] },
  { sentence: 'یک تکه نان قندی', expectedFoodIds: ['nan-ghandi'] },
  { sentence: 'دو تکه نان خشک ترد', expectedFoodIds: ['nan-khoshk'] },
  { sentence: 'یک کف دست نان روغنی محلی', expectedFoodIds: ['nan-roghani'] },
  { sentence: 'یک عدد نان تورتیلا', expectedFoodIds: ['nan-tortilla'] },
  { sentence: 'دو برش نان پروتئینی', expectedFoodIds: ['nan-protein'] },
  { sentence: 'یک عدد کروسان و یک فنجان قهوه لاته', expectedFoodIds: ['croissant', 'cafe-latte'] },
  { sentence: 'دو اسلایس پیتزا مخلوط و یک لیوان نوشابه', expectedFoodIds: ['pizza-makhloot', 'cola-soda'], expectedFirstQty: 2, expectedFirstUnit: 'اسلایس' },
  { sentence: 'دو برش پیتزا پپرونی', expectedFoodIds: ['pizza-pepperoni'] },
  { sentence: 'دو برش پیتزا مارگاریتا', expectedFoodIds: ['pizza-margherita'] },
  { sentence: 'دو برش پیتزا مرغ و قارچ', expectedFoodIds: ['pizza-chicken'] },
  { sentence: 'یک عدد همبرگر کلاسیک و یک کاسه سیب‌زمینی سرخ‌کرده', expectedFoodIds: ['hamburger-classic', 'french-fries'] },
  { sentence: 'یک عدد چیزبرگر', expectedFoodIds: ['cheeseburger'] },
  { sentence: 'یک عدد برگر مرغ سوخاری', expectedFoodIds: ['zinger-burger'] },
  { sentence: 'یک عدد ساندویچ بندری و یک قوطی دلستر', expectedFoodIds: ['sandwich-bandari', 'delster'] },
  { sentence: 'یک عدد ساندویچ فلافل', expectedFoodIds: ['sandwich-falafel'] },
  { sentence: 'پنج عدد فلافل', expectedFoodIds: ['falafel-piece'], expectedFirstQty: 5 },
  { sentence: 'یک عدد ساندویچ هات‌داگ', expectedFoodIds: ['sandwich-hotdog'] },
  { sentence: 'یک عدد ساندویچ ژامبون سرد', expectedFoodIds: ['sandwich-jambon'] },
  { sentence: 'یک عدد ساندویچ فیله مرغ', expectedFoodIds: ['sandwich-chicken'] },
  { sentence: 'یک عدد ساندویچ رست‌بیف', expectedFoodIds: ['sandwich-roastbeef'] },
  { sentence: 'سه تکه فیله استریپس سوخاری', expectedFoodIds: ['chicken-strips'] },
  { sentence: 'شش عدد ناگت مرغ', expectedFoodIds: ['chicken-nugget'], expectedFirstQty: 6 },
  { sentence: 'دو تکه اسنک گوشت و پنیر', expectedFoodIds: ['snack-toast'] },
  { sentence: 'دو عدد سمبوسه و یک لیوان ذرت مکزیکی', expectedFoodIds: ['samboseh', 'mexican-corn'] },

  // --- More Fast Food, Breakfast & Dairy (126-160) ---
  { sentence: 'یک عدد پیراشکی گوشت', expectedFoodIds: ['pirashki-goosht'] },
  { sentence: 'یک عدد ساندویچ شاورما مرغ', expectedFoodIds: ['shawarma'] },
  { sentence: 'یک پرس کباب ترکی گوشت', expectedFoodIds: ['doner-beef'] },
  { sentence: 'دو برش نان سیر', expectedFoodIds: ['garlic-bread'] },
  { sentence: 'یک کاسه سالاد سزار با مرغ', expectedFoodIds: ['caesar-salad'] },
  { sentence: 'دو عدد سوسیس سرخ‌شده و یک قاشق کچاپ', expectedFoodIds: ['sausage-cooked', 'ketchup-sauce'] },
  { sentence: 'دو ورق کالباس و یک قاشق سس مایونز', expectedFoodIds: ['kielbasa', 'mayo-sauce'] },
  { sentence: 'یک قاشق روغن زیتون', expectedFoodIds: ['olive-oil'] },
  { sentence: 'سه عدد سفیده تخم‌مرغ پخته و یک تخم‌مرغ آب‌پز', expectedFoodIds: ['egg-white', 'boiled-egg'] },
  { sentence: 'یک کاسه عدسی و یک کف دست سنگک', expectedFoodIds: ['adasi', 'nan-sangak'] },
  { sentence: 'یک کاسه خوراک لوبیا چیتی', expectedFoodIds: ['khorak-loobia'] },
  { sentence: 'یک کاسه حلیم', expectedFoodIds: ['halim'] },
  { sentence: 'یک پرس کله‌پاچه و دو کف دست سنگک', expectedFoodIds: ['kale-pache', 'nan-sangak'] },
  { sentence: 'دو قاشق ارده و شیره و یک کف دست بربری', expectedFoodIds: ['ardeh-shireh', 'nan-barbari'] },
  { sentence: 'یک قاشق حلوا ارده', expectedFoodIds: ['halva-ardeh'] },
  { sentence: 'دو قاشق چایخوری کره و یک قاشق غذاخوری عسل', expectedFoodIds: ['butter', 'honey'] },
  { sentence: 'یک قاشق مربا و یک قاشق خامه صبحانه', expectedFoodIds: ['jam', 'khameh'] },
  { sentence: 'یک قاشق نوتلا و دو برش نان تست', expectedFoodIds: ['hazelnut-spread', 'nan-toast'] },
  { sentence: 'پنج قاشق جو دوسر پرک و یک لیوان شیر کم‌چرب', expectedFoodIds: ['oats-dry', 'milk'] },
  { sentence: 'یک کاسه اوتمیل پخته با شیر و یک موز', expectedFoodIds: ['oatmeal-cooked', 'banana'] },
  { sentence: 'دو عدد پنکیک خانگی و یک قاشق عسل', expectedFoodIds: ['pancake', 'honey'] },
  { sentence: 'سه قاشق گرانولا و یک پیاله ماست یونانی', expectedFoodIds: ['granola', 'greek-yogurt'] },
  { sentence: 'یک کاسه کورن‌فلکس ساده و یک لیوان شیر پرچرب', expectedFoodIds: ['cornflakes', 'milk-fullfat'] },
  { sentence: 'یک تکه پنیر لیقوان و دو عدد گردو و یک کف دست سنگک', expectedFoodIds: ['lighvan-cheese', 'walnut', 'nan-sangak'] },
  { sentence: 'یک قاشق پنیر خامه‌ای و دو برش نان تست', expectedFoodIds: ['cream-cheese', 'nan-toast'] },
  { sentence: 'یک پیاله پنیر کاتیج', expectedFoodIds: ['cottage-cheese'] },
  { sentence: 'دو ورق پنیر گودا', expectedFoodIds: ['cheddar-cheese'] },
  { sentence: 'یک قاشق سرشیر و یک قاشق عسل', expectedFoodIds: ['sarshir', 'honey'] },
  { sentence: 'یک پیاله ماست سون', expectedFoodIds: ['yogurt-highfat'] },
  { sentence: 'دو قاشق ماست موسیر', expectedFoodIds: ['strained-yogurt'] },
  { sentence: 'یک پیاله ماست و خیار', expectedFoodIds: ['mast-khiar'] },
  { sentence: 'یک پیاله بورانی اسفناج', expectedFoodIds: ['borani-esfenaj'] },
  { sentence: 'دو قاشق کشک مایع', expectedFoodIds: ['kashk'] },
  { sentence: 'یک لیوان کفیر', expectedFoodIds: ['kefir'] },
  { sentence: 'یک پاکت شیرکاکائو', expectedFoodIds: ['chocolate-milk'] },

  // --- Nuts, Sweets, Fruits, Drinks & Packaged Foods (161-200) ---
  { sentence: 'یک مشت آجیل مخلوط', expectedFoodIds: ['mixed-ajil'] },
  { sentence: 'ده عدد بادام و ده عدد پسته', expectedFoodIds: ['almond', 'pistachio'], expectedFirstQty: 10 },
  { sentence: 'پنج عدد فندق و پنج عدد بادام هندی', expectedFoodIds: ['hazelnut', 'cashew'] },
  { sentence: 'یک مشت بادام‌زمینی', expectedFoodIds: ['peanut'] },
  { sentence: 'یک مشت تخمه آفتابگردان', expectedFoodIds: ['sunflower-seeds'] },
  { sentence: 'یک مشت تخمه کدو', expectedFoodIds: ['pumpkin-seeds'] },
  { sentence: 'یک مشت نخودچی و یک قاشق کشمش', expectedFoodIds: ['chickpea-roasted', 'raisins'] },
  { sentence: 'سه عدد انجیر خشک و یک قاشق توت خشک', expectedFoodIds: ['dried-fig', 'dried-mulberry'] },
  { sentence: 'چهار عدد قیسی و دو عدد آلو خشک', expectedFoodIds: ['dried-apricot', 'dried-plum'] },
  { sentence: 'یک ورق لواشک', expectedFoodIds: ['lavashak'] },
  { sentence: 'یک قاشق دانه چیا و یک قاشق تخم کتان', expectedFoodIds: ['chia-seeds', 'flax-seeds'] },
  { sentence: 'دو تکه باقلوا ایرانی و یک فنجان چای ساده', expectedFoodIds: ['baklava', 'tea'] },
  { sentence: 'یک تکه زولبیا و دو عدد بامیه', expectedFoodIds: ['zoolbia', 'bamieh'] },
  { sentence: 'دو تکه سوهان قم و یک عدد گز', expectedFoodIds: ['sohan', 'gaz'] },
  { sentence: 'یک عدد کیک یزدی و یک لیوان چای شیرین', expectedFoodIds: ['yazdi-cake', 'sweet-tea'] },
  { sentence: 'یک عدد شیرینی دانمارکی', expectedFoodIds: ['danish-pastry'] },
  { sentence: 'یک تکه شیرینی ناپلئونی', expectedFoodIds: ['napoleon-pastry'] },
  { sentence: 'دو عدد نان خامه‌ای', expectedFoodIds: ['cream-puff'] },
  { sentence: 'یک برش رولت خامه‌ای', expectedFoodIds: ['cream-roll'] },
  { sentence: 'یک عدد کلوچه فومن', expectedFoodIds: ['koloocheh'] },
  { sentence: 'دو عدد قطاب یزدی', expectedFoodIds: ['ghotab'] },
  { sentence: 'دو قاشق حلوا مجلسی', expectedFoodIds: ['halva-irani'] },
  { sentence: 'یک پیاله شله‌زرد و یک پیاله فرنی', expectedFoodIds: ['sholehzard', 'fereni'] },
  { sentence: 'یک کاسه شیربرنج', expectedFoodIds: ['shirberenj'] },
  { sentence: 'دو قاشق سمنو', expectedFoodIds: ['samanu'] },
  { sentence: 'یک کاسه فالوده شیرازی و یک اسکوپ بستنی سنتی', expectedFoodIds: ['faloodeh', 'saffron-ice-cream'] },
  { sentence: 'یک برش کیک ساده خانگی و یک عدد دونات', expectedFoodIds: ['sponge-cake', 'donut'] },
  { sentence: 'یک برش چیزکیک و یک فنجان قهوه ساده', expectedFoodIds: ['cheesecake', 'black-coffee'] },
  { sentence: 'یک برش تیرامیسو', expectedFoodIds: ['tiramisu'] },
  { sentence: 'یک عدد پرتقال و دو عدد نارنگی', expectedFoodIds: ['orange', 'tangerine'] },
  { sentence: 'یک پیاله انار و یک برش هندوانه', expectedFoodIds: ['pomegranate', 'watermelon'] },
  { sentence: 'یک کاسه طالبی و یک پیاله انگور', expectedFoodIds: ['melon', 'grapes'] },
  { sentence: 'یک عدد هلو و یک عدد گلابی و دو عدد کیوی', expectedFoodIds: ['peach', 'pear', 'kiwi'] },
  { sentence: 'یک پیاله توت‌فرنگی و یک پیاله گیلاس', expectedFoodIds: ['strawberry', 'cherries'] },
  { sentence: 'نصف عدد آووکادو', expectedFoodIds: ['avocado'], expectedFirstQty: 0.5 },
  { sentence: 'یک لیوان شربت خاکشیر و یک لیوان شربت سکنجبین', expectedFoodIds: ['sharbat-khakshir', 'sharbat-sekanjabin'] },
  { sentence: 'یک لیوان آب هویج بستنی', expectedFoodIds: ['carrot-juice-icecream'] },
  { sentence: 'یک لیوان شیرموز و یک لیوان چای ماسالا', expectedFoodIds: ['banana-milkshake', 'masala-chai'] },
  { sentence: 'یک قوطی تن ماهی در آب‌نمک و دو عدد رایس کیک', expectedFoodIds: ['tuna-in-water', 'rice-cake'] },
  { sentence: 'یک اسکوپ پروتئین وی و یک عدد پروتئین بار', expectedFoodIds: ['whey-protein', 'protein-bar'] },

  // --- Packaged Snacks, Mixed Digits, Arabic Chars, Typos & Ambiguity (201-215) ---
  { sentence: 'سه عدد بیسکویت ساقه‌طلایی و یک لیوان چای ساده', expectedFoodIds: ['sagheh-talayi', 'tea'] },
  { sentence: 'چهار عدد بیسکویت پتی‌بور', expectedFoodIds: ['petit-beurre'] },
  { sentence: 'یک بسته ویفر شکلاتی', expectedFoodIds: ['wafer-chocolate'] },
  { sentence: 'دو تکه شکلات تلخ ۷۰٪', expectedFoodIds: ['dark-chocolate-70'] },
  { sentence: 'یک مشت چیپس سیب‌زمینی و یک مشت پفک نمکی', expectedFoodIds: ['potato-chips', 'cheese-puffs'] },
  { sentence: 'یک کاسه پاپ‌کورن', expectedFoodIds: ['popcorn'] },
  { sentence: 'یک عدد تی‌تاپ', expectedFoodIds: ['titap-cake'] },
  { sentence: 'یک عدد بستنی چوبی شکلاتی', expectedFoodIds: ['packaged-icecream-bar'] },
  { sentence: 'دو عدد قره قروت', expectedFoodIds: ['kashk-khoshk'] },
  { sentence: '۲ قاشق زیتون پرورده + ۵ عدد زیتون سبز', expectedFoodIds: ['zeytoon-parvardeh', 'olive-green'] },
  { sentence: '١ عدد بلال + یک پیاله باقالی پخته + یک عدد لبو', expectedFoodIds: ['corn-boiled', 'broad-beans-cooked', 'beetroot-cooked'] },
  { sentence: 'دو کفگیر برنج', expectedFoodIds: ['berenj-kateh'], expectAmbiguousFirst: true },
  { sentence: 'یک پیاله ماست', expectedFoodIds: ['yogurt'], expectAmbiguousFirst: true },
  { sentence: 'یک تکه پنیر', expectedFoodIds: ['white-cheese'], expectAmbiguousFirst: true },
  { sentence: 'یک سیخ کباب', expectedFoodIds: ['kabab-koobideh'], expectAmbiguousFirst: true },
]

describe(`Persian Food Parser Golden Corpus (${GOLDEN_SENTENCES.length} real-world sentences)`, () => {
  it('contains at least 200 golden everyday Persian sentences', () => {
    expect(GOLDEN_SENTENCES.length).toBeGreaterThanOrEqual(200)
  })

  it.each(GOLDEN_SENTENCES)(
    'parses: "$sentence"',
    ({ sentence, expectedFoodIds, expectedFirstQty, expectedFirstUnit, expectAmbiguousFirst }) => {
      const result = parsePersianFoodInput(sentence, DEFAULT_IRANIAN_FOODS)

      expect(result.unmatchedSegments).toEqual([])
      expect(result.items.map((i) => i.food.id)).toEqual(expectedFoodIds)

      if (expectedFirstQty !== undefined) {
        expect(result.items[0].quantity).toBe(expectedFirstQty)
      }
      if (expectedFirstUnit !== undefined) {
        expect(result.items[0].unit).toBe(expectedFirstUnit)
      }
      if (expectAmbiguousFirst) {
        expect(result.items[0].isAmbiguous).toBe(true)
        expect((result.items[0].alternatives ?? []).length).toBeGreaterThan(0)
      }
    },
  )
})
