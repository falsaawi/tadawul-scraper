// Curated Arabic short-name -> Tadawul symbol dictionary.
//
// The broker's dividend report uses short Arabic names (e.g. "الراجحي",
// "اس تي سي") while the scraper stores English names. This dictionary bridges
// the two. Entries are high-confidence only — an incorrect link is worse than
// leaving a company unlinked, so ambiguous names are intentionally omitted and
// will surface as "unlinked" in the mapping table.
//
// Names are written exactly as they appear in the dividend report so the
// Arabic-aware matcher resolves them via an exact normalised match.

export interface NameCode {
  symbol: string;
  name: string;
}

export const SAUDI_NAME_DICTIONARY: NameCode[] = [
  // Banks
  { symbol: "1120", name: "الراجحي" },
  { symbol: "1140", name: "البلاد" },
  { symbol: "1150", name: "الإنماء" },
  { symbol: "1180", name: "الأهلي" },
  { symbol: "1020", name: "الجزيرة" },

  // Telecom
  { symbol: "7010", name: "اس تي سي" },
  { symbol: "7020", name: "إتحاد إتصالات" },
  { symbol: "7030", name: "زين السعودية" },
  { symbol: "7202", name: "سلوشنز" },
  { symbol: "7203", name: "علم" },

  // Petrochemicals / materials
  { symbol: "2010", name: "سابك" },
  { symbol: "2020", name: "سابك للمغذيات الزراعية" },
  { symbol: "2330", name: "المتقدمة" },
  { symbol: "2290", name: "ينساب" },
  { symbol: "2310", name: "سبكيم العالمية" },
  { symbol: "2250", name: "المجموعة السعودية" },
  { symbol: "2002", name: "بتروكيم" },
  { symbol: "2223", name: "لوبريف" },
  { symbol: "2380", name: "بترو رابغ" },
  { symbol: "2001", name: "كيمانول" },
  { symbol: "1210", name: "تكوين" },

  // Cement
  { symbol: "3030", name: "أسمنت السعودية" },
  { symbol: "3040", name: "أسمنت القصيم" },
  { symbol: "3080", name: "أسمنت الشرقية" },
  { symbol: "3020", name: "أسمنت اليمامة" },
  { symbol: "3060", name: "أسمنت ينبع" },
  { symbol: "3090", name: "أسمنت تبوك" },
  { symbol: "3002", name: "أسمنت نجران" },
  { symbol: "3008", name: "أسمنت الشمالية" },
  { symbol: "3001", name: "أسمنت حائل" },
  { symbol: "3050", name: "أسمنت الجنوب" },
  { symbol: "3091", name: "أسمنت الجوف" },

  // Industrials / capital goods
  { symbol: "2040", name: "الفخارية" },
  { symbol: "2320", name: "البابطين" },
  { symbol: "1302", name: "بوان" },
  { symbol: "1212", name: "أسترا الصناعية" },
  { symbol: "1303", name: "الصناعات الكهربائية" },
  { symbol: "1304", name: "اليمامة للحديد" },
  { symbol: "1202", name: "مبكو" },
  { symbol: "1322", name: "أماك" },
  { symbol: "1214", name: "شاكر" },
  { symbol: "1321", name: "أنابيب الشرق" },
  { symbol: "4270", name: "طباعة وتغليف" },

  // Energy / utilities
  { symbol: "2222", name: "أرامكو السعودية" },
  { symbol: "4200", name: "الدريس" },
  { symbol: "2083", name: "مرافق" },

  // Transport / logistics
  { symbol: "4030", name: "البحري" },
  { symbol: "4031", name: "الخدمات الأرضية" },
  { symbol: "4260", name: "بدجت السعودية" },
  { symbol: "2190", name: "سال" },

  // Food & agriculture
  { symbol: "2050", name: "مجموعة صافولا" },
  { symbol: "2270", name: "سدافكو" },
  { symbol: "2280", name: "المراعي" },
  { symbol: "6001", name: "حلواني إخوان" },
  { symbol: "6002", name: "هرفي للأغذية" },
  { symbol: "6004", name: "كاتريون" },
  { symbol: "6015", name: "أمريكانا" },

  // Retail
  { symbol: "4001", name: "أسواق ع العثيم" },
  { symbol: "4003", name: "إكسترا" },
  { symbol: "4006", name: "أسواق المزرعة" },
  { symbol: "4008", name: "ساكو" },
  { symbol: "4240", name: "سينومي ريتيل" },
  { symbol: "4321", name: "سينومي سنترز" },

  // Healthcare
  { symbol: "4002", name: "المواساة" },
  { symbol: "4004", name: "دله الصحية" },
  { symbol: "4007", name: "الحمادي" },
  { symbol: "4009", name: "رعاية" },
  { symbol: "4017", name: "فقيه الطبية" },
  { symbol: "4163", name: "الدواء" },
  { symbol: "4164", name: "النهدي" },

  // Real estate
  { symbol: "4300", name: "دار الأركان" },
  { symbol: "4320", name: "الأندلس" },
  { symbol: "4230", name: "البحر الأحمر" },

  // Services / HR
  { symbol: "1831", name: "مهارة" },
  { symbol: "1834", name: "سماسكو" },
  { symbol: "4290", name: "الخليج للتدريب" },

  // Financials / capital markets
  { symbol: "1111", name: "مجموعة تداول" },
  { symbol: "2382", name: "أديس" },

  // REITs
  { symbol: "4330", name: "الرياض ريت" },
  { symbol: "4336", name: "ملكية ريت" },
  { symbol: "4338", name: "الخبير ريت" },
  { symbol: "4340", name: "الراجحي ريت" },
];
