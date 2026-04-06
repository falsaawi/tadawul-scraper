function getRiyadhDate(): Date {
  const now = new Date();
  const riyadhStr = now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" });
  return new Date(riyadhStr);
}

export function isTradingDay(): boolean {
  const riyadh = getRiyadhDate();
  const day = riyadh.getDay();
  // Sunday=0 through Thursday=4
  return day >= 0 && day <= 4;
}

export function isTradingHours(): boolean {
  if (!isTradingDay()) return false;
  const riyadh = getRiyadhDate();
  const hours = riyadh.getHours();
  const minutes = riyadh.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  // 10:00 AM = 600, 3:05 PM = 905 (5 min buffer after close)
  return timeInMinutes >= 600 && timeInMinutes <= 905;
}

export function getTradingStatus(): {
  isOpen: boolean;
  message: string;
  nextEvent: string;
} {
  const riyadh = getRiyadhDate();
  const day = riyadh.getDay();
  const hours = riyadh.getHours();
  const minutes = riyadh.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (day >= 5) {
    return {
      isOpen: false,
      message: "Weekend - Market Closed",
      nextEvent: "Opens Sunday 10:00 AM",
    };
  }

  if (timeInMinutes < 600) {
    return {
      isOpen: false,
      message: "Pre-Market",
      nextEvent: "Opens at 10:00 AM",
    };
  }

  if (timeInMinutes >= 600 && timeInMinutes <= 900) {
    return {
      isOpen: true,
      message: "Market Open",
      nextEvent: `Closes at 3:00 PM`,
    };
  }

  return {
    isOpen: false,
    message: "After Hours - Market Closed",
    nextEvent: day === 4 ? "Opens Sunday 10:00 AM" : "Opens tomorrow 10:00 AM",
  };
}

export function getRiyadhTimeString(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
