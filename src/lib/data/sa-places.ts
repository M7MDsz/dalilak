// Owner: data. Every city and governorate of Saudi Arabia (13 regions: the 13 seats of the regional emirates, 141
// governorates, and 6 large cities that are not a governorate seat), so «دليلك» knows «شقراء» as well as «الرياض»
// (20 Nov 2026). Pure module.
//
// THE LIST (checked 20 Nov 2026):
//   Saudipedia (the Ministry of Media's encyclopedia), «قائمة محافظات منطقة …» for each region, which cites the Ministry
//   of Interior, the Saudi Geological Survey and the Bureau of Experts, e.g.
//   https://saudipedia.com/قائمة-محافظات-منطقة-الرياض (Tabuk's six: https://saudipedia.com/منطقة-تبوك),
//   cross-checked with Wikipedia: https://ar.wikipedia.org/wiki/قائمة_محافظات_السعودية and
//   https://en.wikipedia.org/wiki/List_of_governorates_of_Saudi_Arabia. Saudipedia adds الفرشة (Asir) and صوير (Al-Jouf);
//   English Wikipedia adds الأمواه (Asir, also on Saudipedia). All three are in. The six cities: Wikipedia's list of
//   cities (https://en.wikipedia.org/wiki/List_of_cities_and_towns_in_Saudi_Arabia) that are not a governorate seat.
//
// THE COORDINATES (the town itself, not the middle of the governorate; checked 20 Nov 2026), `src` on each row:
//   gn     GeoNames, https://download.geonames.org/export/dump/SA.zip, where it agrees within 8 km with Wikidata or
//          Wikipedia (most rows);
//   wd     Wikidata, the town's item (P625), https://www.wikidata.org, agreeing with a second source;
//   osm    OpenStreetMap Nominatim, https://nominatim.openstreetmap.org, the town's node (العرضيات: «بلدية العرضية
//          الشمالية», 8 km south of نمرة as Saudipedia places the governorate; القرى: the governorate's own area, it has
//          no town node; العديد: سلوى, its main town);
//   wp     Wikipedia's own coordinates for the place, agreeing with Wikidata within 8 km;
//   metro  البيضاء (Eastern Province, set up in 2022) has no published seat point: Sabq and Okaz place it inside the
//          Dammam urban area, between the Abu Hadriyah road and Buqayq, so it is tied to Dammam, not to a guessed point.
// Distances are straight lines (haversine, mean Earth radius 6371.0088 km): a road is longer.
import type { JobCityId } from "@/lib/types";

/** The 13 administrative regions, in the Ministry of Interior's usual order. */
export const SA_REGION_IDS = [
  "riyadh",
  "makkah",
  "madinah",
  "qassim",
  "eastern",
  "asir",
  "tabuk",
  "hail",
  "northern-borders",
  "jazan",
  "najran",
  "baha",
  "jouf",
] as const;
export type SaRegionId = (typeof SA_REGION_IDS)[number];

export interface SaRegion {
  readonly id: SaRegionId;
  /** «منطقة الرياض», «المنطقة الشرقية». */
  readonly name: string;
  /** The seat of the region's emirate (a row of SA_PLACES). */
  readonly seat: string;
  /** How people name the region on its own («القصيم», «الشرقية»), when that is not the seat's own name. */
  readonly aliases: readonly string[];
}

export const SA_REGIONS: readonly SaRegion[] = [
  { id: "riyadh", name: "منطقة الرياض", seat: "الرياض", aliases: [] },
  { id: "makkah", name: "منطقة مكة المكرمة", seat: "مكة المكرمة", aliases: [] },
  { id: "madinah", name: "منطقة المدينة المنورة", seat: "المدينة المنورة", aliases: [] },
  { id: "qassim", name: "منطقة القصيم", seat: "بريدة", aliases: ["القصيم", "Qassim", "Al Qassim", "Qasim"] },
  { id: "eastern", name: "المنطقة الشرقية", seat: "الدمام", aliases: ["المنطقة الشرقية", "الشرقية", "Eastern Province"] },
  { id: "asir", name: "منطقة عسير", seat: "أبها", aliases: ["عسير", "Asir", "Aseer"] },
  { id: "tabuk", name: "منطقة تبوك", seat: "تبوك", aliases: [] },
  { id: "hail", name: "منطقة حائل", seat: "حائل", aliases: [] },
  { id: "northern-borders", name: "منطقة الحدود الشمالية", seat: "عرعر", aliases: ["الحدود الشمالية"] },
  { id: "jazan", name: "منطقة جازان", seat: "جازان", aliases: [] },
  { id: "najran", name: "منطقة نجران", seat: "نجران", aliases: [] },
  { id: "baha", name: "منطقة الباحة", seat: "الباحة", aliases: [] },
  { id: "jouf", name: "منطقة الجوف", seat: "سكاكا", aliases: ["الجوف"] },
];

/** seat: the region's emirate seat · governorate: a governorate (its seat town) · city: a large city inside one. */
export type SaPlaceKind = "seat" | "governorate" | "city";

/** Where a row's coordinates come from (see the header). */
export type SaPlaceSource = "gn" | "wd" | "osm" | "wp" | "metro";

/** The big job markets of the app's jobs (every job city but «عن بُعد»). */
export type JobMarketId = Exclude<JobCityId, "remote">;

export interface SaPlace {
  /** The usual Arabic spelling («شقراء», «وادي الدواسر»). */
  readonly name: string;
  readonly region: SaRegionId;
  readonly kind: SaPlaceKind;
  /** [latitude, longitude] of the town, in degrees; null only for البيضاء (see `metroOf`). */
  readonly at: readonly [number, number] | null;
  readonly src: SaPlaceSource;
  /** Other official or common names of the same place («جيزان», «محايل», «مهد الذهب»). */
  readonly aliases?: readonly string[];
  /** Part of a big market's own urban area (no point of its own). */
  readonly metroOf?: JobMarketId;
}

export const SA_PLACES: readonly SaPlace[] = [
  // منطقة الرياض
  { name: "الرياض", region: "riyadh", kind: "seat", at: [24.6877, 46.7219], src: "gn" },
  { name: "الدرعية", region: "riyadh", kind: "governorate", at: [24.7519, 46.5387], src: "gn" },
  { name: "الخرج", region: "riyadh", kind: "governorate", at: [24.1554, 47.3346], src: "gn", aliases: ["Kharj", "Al Kharj", "Alkharj", "السيح"] },
  { name: "الدوادمي", region: "riyadh", kind: "governorate", at: [24.5077, 44.3924], src: "gn" },
  { name: "المجمعة", region: "riyadh", kind: "governorate", at: [25.9110, 45.3567], src: "gn" },
  { name: "القويعية", region: "riyadh", kind: "governorate", at: [24.0651, 45.2844], src: "gn" },
  { name: "الأفلاج", region: "riyadh", kind: "governorate", at: [22.2921, 46.7238], src: "gn", aliases: ["ليلى"] },
  { name: "وادي الدواسر", region: "riyadh", kind: "governorate", at: [20.4644, 44.7872], src: "wd", aliases: ["الخماسين"] },
  { name: "الزلفي", region: "riyadh", kind: "governorate", at: [26.2995, 44.8154], src: "gn" },
  { name: "شقراء", region: "riyadh", kind: "governorate", at: [25.2402, 45.2510], src: "gn", aliases: ["Shaqra"] },
  { name: "حوطة بني تميم", region: "riyadh", kind: "governorate", at: [23.5000, 46.8333], src: "wp" },
  { name: "عفيف", region: "riyadh", kind: "governorate", at: [23.9065, 42.9172], src: "gn" },
  { name: "الغاط", region: "riyadh", kind: "governorate", at: [26.0289, 44.9468], src: "gn" },
  { name: "السليل", region: "riyadh", kind: "governorate", at: [20.4607, 45.5779], src: "gn" },
  { name: "ضرما", region: "riyadh", kind: "governorate", at: [24.5955, 46.1337], src: "gn", aliases: ["ضرماء"] },
  { name: "المزاحمية", region: "riyadh", kind: "governorate", at: [24.4695, 46.2810], src: "gn" },
  { name: "رماح", region: "riyadh", kind: "governorate", at: [25.5639, 47.1641], src: "gn" },
  { name: "ثادق", region: "riyadh", kind: "governorate", at: [25.2968, 45.8698], src: "gn" },
  { name: "حريملاء", region: "riyadh", kind: "governorate", at: [25.1258, 46.1286], src: "gn" },
  { name: "الحريق", region: "riyadh", kind: "governorate", at: [23.6355, 46.5064], src: "gn" },
  { name: "مرات", region: "riyadh", kind: "governorate", at: [25.0706, 45.4577], src: "gn" },
  { name: "الرين", region: "riyadh", kind: "governorate", at: [23.5427, 45.5152], src: "gn" },
  { name: "الدلم", region: "riyadh", kind: "governorate", at: [23.9910, 47.1618], src: "gn" },
  // منطقة مكة المكرمة
  { name: "مكة المكرمة", region: "makkah", kind: "seat", at: [21.4266, 39.8256], src: "gn" },
  { name: "جدة", region: "makkah", kind: "governorate", at: [21.4901, 39.1862], src: "gn" },
  { name: "الطائف", region: "makkah", kind: "governorate", at: [21.2703, 40.4158], src: "gn", aliases: ["Taif", "Al Taif", "Ta'if"] },
  { name: "القنفذة", region: "makkah", kind: "governorate", at: [19.1417, 41.0797], src: "wd" },
  { name: "الليث", region: "makkah", kind: "governorate", at: [20.1480, 40.2722], src: "gn" },
  { name: "رابغ", region: "makkah", kind: "governorate", at: [22.7986, 39.0349], src: "gn" },
  { name: "خليص", region: "makkah", kind: "governorate", at: [22.1555, 39.3201], src: "gn" },
  { name: "الخرمة", region: "makkah", kind: "governorate", at: [21.9115, 42.0309], src: "gn" },
  { name: "رنية", region: "makkah", kind: "governorate", at: [21.2597, 42.8485], src: "wd" },
  { name: "تربة", region: "makkah", kind: "governorate", at: [21.2141, 41.6331], src: "gn" },
  { name: "الجموم", region: "makkah", kind: "governorate", at: [21.6195, 39.6966], src: "gn" },
  { name: "الكامل", region: "makkah", kind: "governorate", at: [22.2606, 39.7969], src: "gn" },
  { name: "المويه", region: "makkah", kind: "governorate", at: [22.4333, 41.7583], src: "gn" },
  { name: "ميسان", region: "makkah", kind: "governorate", at: [20.7372, 40.8387], src: "osm" },
  { name: "أضم", region: "makkah", kind: "governorate", at: [20.4497, 40.8791], src: "osm" },
  { name: "العرضيات", region: "makkah", kind: "governorate", at: [19.5319, 41.6692], src: "osm" },
  { name: "بحرة", region: "makkah", kind: "governorate", at: [21.4019, 39.4460], src: "gn" },
  // منطقة المدينة المنورة
  { name: "المدينة المنورة", region: "madinah", kind: "seat", at: [24.4686, 39.6142], src: "gn" },
  { name: "ينبع", region: "madinah", kind: "governorate", at: [24.0895, 38.0618], src: "gn", aliases: ["Yanbu", "Yanbu al Bahr"] },
  { name: "العلا", region: "madinah", kind: "governorate", at: [26.6085, 37.9232], src: "gn", aliases: ["AlUla", "Al Ula", "Al-Ula", "Ula"] },
  { name: "المهد", region: "madinah", kind: "governorate", at: [23.4997, 40.8841], src: "gn", aliases: ["مهد الذهب"] },
  { name: "الحناكية", region: "madinah", kind: "governorate", at: [24.8837, 40.5440], src: "gn" },
  { name: "بدر", region: "madinah", kind: "governorate", at: [23.7829, 38.7905], src: "gn" },
  { name: "خيبر", region: "madinah", kind: "governorate", at: [25.7134, 39.2803], src: "gn" },
  { name: "العيص", region: "madinah", kind: "governorate", at: [25.0635, 38.1087], src: "gn" },
  { name: "وادي الفرع", region: "madinah", kind: "governorate", at: [23.4829, 39.8422], src: "wd" },
  // منطقة القصيم
  { name: "بريدة", region: "qassim", kind: "seat", at: [26.3260, 43.9750], src: "gn", aliases: ["Buraidah", "Buraydah", "Buraida"] },
  { name: "عنيزة", region: "qassim", kind: "governorate", at: [26.0879, 43.9637], src: "gn", aliases: ["Unaizah", "Unayzah", "Onaizah"] },
  { name: "الرس", region: "qassim", kind: "governorate", at: [25.8694, 43.4973], src: "gn" },
  { name: "المذنب", region: "qassim", kind: "governorate", at: [25.8601, 44.2223], src: "gn" },
  { name: "البكيرية", region: "qassim", kind: "governorate", at: [26.1392, 43.6578], src: "gn" },
  { name: "البدائع", region: "qassim", kind: "governorate", at: [25.9855, 43.7366], src: "gn" },
  { name: "الأسياح", region: "qassim", kind: "governorate", at: [26.7958, 44.2036], src: "osm" },
  { name: "النبهانية", region: "qassim", kind: "governorate", at: [25.8607, 43.0647], src: "gn" },
  { name: "الشماسية", region: "qassim", kind: "governorate", at: [26.3261, 44.2587], src: "gn" },
  { name: "عيون الجواء", region: "qassim", kind: "governorate", at: [26.4983, 43.6312], src: "gn" },
  { name: "رياض الخبراء", region: "qassim", kind: "governorate", at: [26.0667, 43.5534], src: "gn" },
  { name: "عقلة الصقور", region: "qassim", kind: "governorate", at: [25.8292, 42.2012], src: "gn" },
  { name: "ضرية", region: "qassim", kind: "governorate", at: [24.7157, 42.9284], src: "osm" },
  { name: "أبانات", region: "qassim", kind: "governorate", at: [25.5067, 42.8614], src: "wd" },
  // المنطقة الشرقية
  { name: "الدمام", region: "eastern", kind: "seat", at: [26.4344, 50.1033], src: "gn" },
  { name: "الأحساء", region: "eastern", kind: "governorate", at: [25.3647, 49.5876], src: "gn", aliases: ["Al Ahsa", "Al-Ahsa", "Alahsa", "Ahsa", "Hasa", "Al Hasa", "الحسا"] },
  { name: "حفر الباطن", region: "eastern", kind: "governorate", at: [28.4328, 45.9708], src: "gn", aliases: ["حفرالباطن"] },
  { name: "الجبيل", region: "eastern", kind: "governorate", at: [27.0174, 49.6225], src: "gn", aliases: ["Jubail", "Al Jubail"] },
  { name: "القطيف", region: "eastern", kind: "governorate", at: [26.5654, 50.0089], src: "gn" },
  { name: "الخبر", region: "eastern", kind: "governorate", at: [26.2794, 50.2083], src: "gn" },
  { name: "الخفجي", region: "eastern", kind: "governorate", at: [28.4391, 48.4913], src: "gn" },
  { name: "رأس تنورة", region: "eastern", kind: "governorate", at: [26.7074, 50.0673], src: "gn" },
  { name: "بقيق", region: "eastern", kind: "governorate", at: [25.9340, 49.6688], src: "gn", aliases: ["أبقيق"] },
  { name: "النعيرية", region: "eastern", kind: "governorate", at: [27.4732, 48.4748], src: "gn" },
  { name: "قرية العليا", region: "eastern", kind: "governorate", at: [27.5586, 47.7041], src: "gn" },
  { name: "العديد", region: "eastern", kind: "governorate", at: [24.7408, 50.7583], src: "osm" },
  { name: "البيضاء", region: "eastern", kind: "governorate", at: null, src: "metro", metroOf: "dammam" },
  { name: "الهفوف", region: "eastern", kind: "city", at: [25.3647, 49.5876], src: "gn", aliases: ["Hofuf", "Al Hofuf", "Hufuf"] },
  { name: "المبرز", region: "eastern", kind: "city", at: [25.4077, 49.5903], src: "gn" },
  { name: "الظهران", region: "eastern", kind: "city", at: [26.2886, 50.1140], src: "gn" },
  { name: "سيهات", region: "eastern", kind: "city", at: [26.4835, 50.0485], src: "gn" },
  { name: "صفوى", region: "eastern", kind: "city", at: [26.6497, 49.9552], src: "gn" },
  { name: "تاروت", region: "eastern", kind: "city", at: [26.5733, 50.0403], src: "gn" },
  // منطقة عسير
  { name: "أبها", region: "asir", kind: "seat", at: [18.2164, 42.5053], src: "gn", aliases: ["Abha"] },
  { name: "خميس مشيط", region: "asir", kind: "governorate", at: [18.3000, 42.7333], src: "gn" },
  { name: "بيشة", region: "asir", kind: "governorate", at: [20.0005, 42.6052], src: "gn" },
  { name: "النماص", region: "asir", kind: "governorate", at: [19.1455, 42.1201], src: "gn" },
  { name: "محايل عسير", region: "asir", kind: "governorate", at: [18.5464, 42.0489], src: "osm", aliases: ["محايل"] },
  { name: "ظهران الجنوب", region: "asir", kind: "governorate", at: [17.6618, 43.5194], src: "osm" },
  { name: "تثليث", region: "asir", kind: "governorate", at: [19.5318, 43.5197], src: "gn" },
  { name: "سراة عبيدة", region: "asir", kind: "governorate", at: [18.0890, 43.1320], src: "gn" },
  { name: "رجال ألمع", region: "asir", kind: "governorate", at: [18.2125, 42.2733], src: "osm" },
  { name: "بلقرن", region: "asir", kind: "governorate", at: [19.5633, 41.9580], src: "osm", aliases: ["سبت العلاية"] },
  { name: "أحد رفيدة", region: "asir", kind: "governorate", at: [18.1968, 42.8220], src: "wd" },
  { name: "المجاردة", region: "asir", kind: "governorate", at: [19.1320, 41.9240], src: "gn" },
  { name: "البرك", region: "asir", kind: "governorate", at: [18.2172, 41.5364], src: "osm" },
  { name: "بارق", region: "asir", kind: "governorate", at: [18.9297, 41.9295], src: "gn" },
  { name: "تنومة", region: "asir", kind: "governorate", at: [18.9535, 42.1703], src: "osm" },
  { name: "طريب", region: "asir", kind: "governorate", at: [18.5674, 43.2071], src: "wd" },
  { name: "الحرجة", region: "asir", kind: "governorate", at: [17.9218, 43.3677], src: "osm" },
  { name: "الأمواه", region: "asir", kind: "governorate", at: [18.7140, 43.6610], src: "osm" },
  { name: "الفرشة", region: "asir", kind: "governorate", at: [17.7510, 43.1557], src: "osm" },
  // منطقة تبوك
  { name: "تبوك", region: "tabuk", kind: "seat", at: [28.3998, 36.5715], src: "gn", aliases: ["Tabuk", "Tabouk"] },
  { name: "الوجه", region: "tabuk", kind: "governorate", at: [26.2309, 36.4649], src: "gn" },
  { name: "ضباء", region: "tabuk", kind: "governorate", at: [27.3513, 35.6901], src: "gn" },
  { name: "تيماء", region: "tabuk", kind: "governorate", at: [27.6223, 38.5388], src: "gn" },
  { name: "أملج", region: "tabuk", kind: "governorate", at: [25.0213, 37.2685], src: "gn" },
  { name: "حقل", region: "tabuk", kind: "governorate", at: [29.2861, 34.9386], src: "wd" },
  { name: "البدع", region: "tabuk", kind: "governorate", at: [28.4947, 35.0122], src: "wd" },
  // منطقة حائل
  { name: "حائل", region: "hail", kind: "seat", at: [27.5219, 41.6907], src: "gn", aliases: ["Hail", "Ha'il", "Hayil"] },
  { name: "بقعاء", region: "hail", kind: "governorate", at: [27.9065, 42.3890], src: "gn" },
  { name: "الغزالة", region: "hail", kind: "governorate", at: [26.7875, 41.3157], src: "osm" },
  { name: "الشنان", region: "hail", kind: "governorate", at: [27.1748, 42.4449], src: "gn" },
  { name: "الحائط", region: "hail", kind: "governorate", at: [25.9916, 40.4662], src: "wd" },
  { name: "السليمي", region: "hail", kind: "governorate", at: [26.2903, 41.3596], src: "osm" },
  { name: "الشملي", region: "hail", kind: "governorate", at: [26.8577, 40.3295], src: "gn" },
  { name: "موقق", region: "hail", kind: "governorate", at: [27.3840, 41.1763], src: "gn" },
  { name: "سميراء", region: "hail", kind: "governorate", at: [26.4942, 42.1249], src: "gn" },
  // منطقة الحدود الشمالية
  { name: "عرعر", region: "northern-borders", kind: "seat", at: [30.9753, 41.0381], src: "gn" },
  { name: "رفحاء", region: "northern-borders", kind: "governorate", at: [29.6343, 43.5194], src: "gn" },
  { name: "طريف", region: "northern-borders", kind: "governorate", at: [31.6720, 38.6630], src: "gn" },
  { name: "العويقيلة", region: "northern-borders", kind: "governorate", at: [30.3628, 42.2394], src: "gn" },
  // منطقة جازان
  { name: "جازان", region: "jazan", kind: "seat", at: [16.8892, 42.5511], src: "gn", aliases: ["Jazan", "Jizan", "Gizan", "جيزان"] },
  { name: "صبيا", region: "jazan", kind: "governorate", at: [17.1495, 42.6254], src: "gn", aliases: ["صبياء"] },
  { name: "أبو عريش", region: "jazan", kind: "governorate", at: [16.9689, 42.8325], src: "wd", aliases: ["ابوعريش"] },
  { name: "صامطة", region: "jazan", kind: "governorate", at: [16.5960, 42.9444], src: "wd" },
  { name: "بيش", region: "jazan", kind: "governorate", at: [17.3760, 42.5386], src: "gn" },
  { name: "الدرب", region: "jazan", kind: "governorate", at: [17.7229, 42.2526], src: "gn" },
  { name: "الحرث", region: "jazan", kind: "governorate", at: [16.7886, 43.2219], src: "wd" },
  { name: "ضمد", region: "jazan", kind: "governorate", at: [17.1043, 42.7816], src: "gn" },
  { name: "الريث", region: "jazan", kind: "governorate", at: [17.6038, 42.8609], src: "gn" },
  { name: "فرسان", region: "jazan", kind: "governorate", at: [16.7022, 42.1183], src: "gn", aliases: ["جزر فرسان"] },
  { name: "الدائر", region: "jazan", kind: "governorate", at: [17.3375, 43.1364], src: "gn" },
  { name: "العارضة", region: "jazan", kind: "governorate", at: [17.0393, 43.0859], src: "gn" },
  { name: "أحد المسارحة", region: "jazan", kind: "governorate", at: [16.7098, 42.9550], src: "gn" },
  { name: "العيدابي", region: "jazan", kind: "governorate", at: [17.2352, 42.9404], src: "osm" },
  { name: "فيفاء", region: "jazan", kind: "governorate", at: [17.2806, 43.1373], src: "gn", aliases: ["فيفا"] },
  { name: "الطوال", region: "jazan", kind: "governorate", at: [16.5294, 42.9676], src: "gn" },
  { name: "هروب", region: "jazan", kind: "governorate", at: [17.4369, 42.8868], src: "gn" },
  // منطقة نجران
  { name: "نجران", region: "najran", kind: "seat", at: [17.4933, 44.1277], src: "gn", aliases: ["Najran"] },
  { name: "شرورة", region: "najran", kind: "governorate", at: [17.4908, 47.1126], src: "gn" },
  { name: "حبونا", region: "najran", kind: "governorate", at: [17.8472, 44.0208], src: "gn" },
  { name: "بدر الجنوب", region: "najran", kind: "governorate", at: [17.8000, 43.7333], src: "wd" },
  { name: "يدمة", region: "najran", kind: "governorate", at: [18.5292, 44.2031], src: "gn" },
  { name: "ثار", region: "najran", kind: "governorate", at: [18.1667, 44.6000], src: "wd" },
  { name: "خباش", region: "najran", kind: "governorate", at: [17.5563, 44.7480], src: "gn" },
  // منطقة الباحة
  { name: "الباحة", region: "baha", kind: "seat", at: [20.0129, 41.4677], src: "gn" },
  { name: "بلجرشي", region: "baha", kind: "governorate", at: [19.8594, 41.5572], src: "gn", aliases: ["بالجرشي"] },
  { name: "المندق", region: "baha", kind: "governorate", at: [20.1077, 41.2878], src: "wd" },
  { name: "المخواة", region: "baha", kind: "governorate", at: [19.7794, 41.4356], src: "osm" },
  { name: "قلوة", region: "baha", kind: "governorate", at: [20.0000, 41.0833], src: "wp" },
  { name: "العقيق", region: "baha", kind: "governorate", at: [20.2736, 41.6643], src: "gn" },
  { name: "القرى", region: "baha", kind: "governorate", at: [20.2508, 41.3504], src: "osm" },
  { name: "غامد الزناد", region: "baha", kind: "governorate", at: [19.5931, 41.5211], src: "wd" },
  { name: "الحجرة", region: "baha", kind: "governorate", at: [20.2333, 41.0500], src: "gn" },
  { name: "بني حسن", region: "baha", kind: "governorate", at: [20.0535, 41.3737], src: "osm" },
  // منطقة الجوف
  { name: "سكاكا", region: "jouf", kind: "seat", at: [29.9697, 40.2064], src: "gn" },
  { name: "القريات", region: "jouf", kind: "governorate", at: [31.3318, 37.3428], src: "gn" },
  { name: "دومة الجندل", region: "jouf", kind: "governorate", at: [29.8148, 39.8572], src: "gn" },
  { name: "طبرجل", region: "jouf", kind: "governorate", at: [30.4999, 38.2160], src: "gn" },
  { name: "صوير", region: "jouf", kind: "governorate", at: [30.1171, 40.3892], src: "gn" },
];

/** The job markets' own rows: الرياض, جدة, الدمام. */
const MARKET_PLACE: Readonly<Record<JobMarketId, string>> = { riyadh: "الرياض", jeddah: "جدة", dammam: "الدمام" };
export const JOB_MARKET_IDS: readonly JobMarketId[] = ["riyadh", "jeddah", "dammam"];

export function getSaRegion(id: SaRegionId): SaRegion {
  const region = SA_REGIONS.find((r) => r.id === id);
  if (!region) throw new Error(`data: unknown region ${id}`);
  return region;
}

/** The row of a place by its name (exactly as in SA_PLACES), or null. */
export function findSaPlace(name: string): SaPlace | null {
  return SA_PLACES.find((p) => p.name === name) ?? null;
}

const EARTH_RADIUS_KM = 6371.0088;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** The great-circle (straight-line) distance between two [lat, lon] points, in km (haversine). */
export function distanceKm(a: readonly [number, number], b: readonly [number, number]): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The nearest big job market (الرياض, جدة or الدمام) and the straight-line distance to it, in whole km. A place inside a
 * market's urban area (`metroOf`) gets that market and km null.
 */
export function nearestJobMarket(place: SaPlace): { readonly market: JobMarketId; readonly km: number | null } {
  if (place.metroOf) return { market: place.metroOf, km: null };
  const from = place.at;
  if (!from) throw new Error(`data: ${place.name} has no coordinates`);
  let best: { market: JobMarketId; km: number } | null = null;
  for (const market of JOB_MARKET_IDS) {
    const at = findSaPlace(MARKET_PLACE[market])?.at;
    if (!at) continue;
    const km = distanceKm(from, at);
    if (!best || km < best.km) best = { market, km };
  }
  if (!best) throw new Error("data: no job market has coordinates");
  return { market: best.market, km: Math.round(best.km) };
}
