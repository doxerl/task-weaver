import React, { createContext, useContext, useState, ReactNode } from 'react';

const YEAR_STORAGE_KEY = 'finance_selected_year';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  // localStorage'dan oku, yoksa mevcut yılı kullan
  const [selectedYear, setSelectedYearState] = useState(() => {
    const stored = localStorage.getItem(YEAR_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 2020 && parsed <= 2030) {
        return parsed;
      }
    }
    return new Date().getFullYear();
  });
  
  // Yıl değiştiğinde localStorage'a yaz
  const setSelectedYear = (year: number) => {
    setSelectedYearState(year);
    localStorage.setItem(YEAR_STORAGE_KEY, year.toString());
  };
  
  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
}
