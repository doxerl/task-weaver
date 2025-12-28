// ISO 8601 hafta numarası ve hafta yılı hesaplama
export function getISOWeekData(date: Date): { weekNumber: number; weekYear: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  // ISO 8601: Hafta Perşembe gününe göre belirlenir
  const dayOfWeek = d.getDay() || 7; // Pazar'ı 7 yap (Pazartesi=1)
  
  // Haftanın Perşembe gününü bul
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - dayOfWeek + 4);
  
  // ISO hafta yılı = Perşembe'nin yılı
  const weekYear = thursday.getFullYear();
  
  // Yılın ilk Perşembesini bul (4 Ocak her zaman 1. haftada)
  const jan4 = new Date(weekYear, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7;
  const firstThursday = new Date(jan4);
  firstThursday.setDate(jan4.getDate() - jan4DayOfWeek + 4);
  
  // Hafta numarasını hesapla
  const weekNumber = Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return { weekNumber, weekYear };
}
