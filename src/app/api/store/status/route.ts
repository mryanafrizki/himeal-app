import { NextResponse } from "next/server";
import { getStoreSettings, getStoreHours, isStoreOpen } from "@/lib/db";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export async function GET() {
  try {
    const settings = getStoreSettings();
    const hours = getStoreHours();
    const storeStatus = isStoreOpen();

    const now = new Date();
    const currentDay = now.getDay();
    const currentDayHours = hours.find((h) => h.day_of_week === currentDay) || null;

    // Find next open day/time
    let nextOpenDay: string | null = null;
    let nextOpenTime: string | null = null;

    if (!storeStatus.isOpen && settings.store_mode === "open") {
      // Check if store opens later today
      if (currentDayHours && currentDayHours.is_open) {
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        if (currentTime < currentDayHours.open_time) {
          nextOpenDay = DAY_NAMES[currentDay];
          nextOpenTime = currentDayHours.open_time;
        }
      }

      // If not found, check next days
      if (!nextOpenDay) {
        for (let offset = 1; offset <= 7; offset++) {
          const checkDay = (currentDay + offset) % 7;
          const dayHours = hours.find((h) => h.day_of_week === checkDay);
          if (dayHours && dayHours.is_open) {
            nextOpenDay = DAY_NAMES[checkDay];
            nextOpenTime = dayHours.open_time;
            break;
          }
        }
      }
    }

    return NextResponse.json({
      mode: settings.store_mode,
      isOpen: storeStatus.isOpen,
      currentDayHours: currentDayHours
        ? {
            dayOfWeek: currentDayHours.day_of_week,
            dayName: DAY_NAMES[currentDayHours.day_of_week],
            openTime: currentDayHours.open_time,
            closeTime: currentDayHours.close_time,
            isOpen: currentDayHours.is_open === 1,
          }
        : null,
      infoMessage: settings.info_message,
      maintenanceMessage: settings.maintenance_message,
      nextOpenDay,
      nextOpenTime,
    });
  } catch (error) {
    console.error("[GET /api/store/status]", error);
    return NextResponse.json(
      { error: "Failed to get store status" },
      { status: 500 }
    );
  }
}
