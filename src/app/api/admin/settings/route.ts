import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin";
import {
  getStoreSettings,
  updateStoreSettings,
  getStoreHours,
  updateStoreHours,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const settings = getStoreSettings();
    const hours = getStoreHours();

    return NextResponse.json({
      settings: {
        storeMode: settings.store_mode,
        infoMessage: settings.info_message,
        maintenanceMessage: settings.maintenance_message,
        qrisEnabled: settings.qris_enabled === 1,
        qrisFeeMode: settings.qris_fee_mode,
        updatedAt: settings.updated_at,
      },
      hours: hours.map((h) => ({
        dayOfWeek: h.day_of_week,
        openTime: h.open_time,
        closeTime: h.close_time,
        isOpen: h.is_open === 1,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/settings]", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Update store settings — accept both camelCase and snake_case
    const settingsUpdate: Record<string, unknown> = {};
    const storeMode = body.storeMode ?? body.store_mode;
    const infoMessage = body.infoMessage ?? body.info_message;
    const maintenanceMessage = body.maintenanceMessage ?? body.maintenance_message;
    const qrisEnabled = body.qrisEnabled ?? body.qris_enabled ?? body.qris_active;
    const qrisFeeMode = body.qrisFeeMode ?? body.qris_fee_mode ?? body.qris_fee_payer;
    if (storeMode !== undefined) settingsUpdate.store_mode = storeMode;
    if (infoMessage !== undefined) settingsUpdate.info_message = infoMessage;
    if (maintenanceMessage !== undefined) settingsUpdate.maintenance_message = maintenanceMessage;
    if (qrisEnabled !== undefined) settingsUpdate.qris_enabled = typeof qrisEnabled === "boolean" ? (qrisEnabled ? 1 : 0) : qrisEnabled;
    if (qrisFeeMode !== undefined) settingsUpdate.qris_fee_mode = qrisFeeMode;

    if (Object.keys(settingsUpdate).length > 0) {
      updateStoreSettings(settingsUpdate as Parameters<typeof updateStoreSettings>[0]);
    }

    // Update store hours — accept both array format and operating_hours object
    if (body.hours && Array.isArray(body.hours)) {
      updateStoreHours(
        body.hours.map((h: { dayOfWeek: number; openTime: string; closeTime: string; isOpen: boolean }) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isOpen: h.isOpen ? 1 : 0,
        }))
      );
    } else if (body.operating_hours && typeof body.operating_hours === "object") {
      const dayNameToNum: Record<string, number> = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };
      const hoursArr = Object.entries(body.operating_hours).map(([key, val]) => {
        const v = val as { enabled: boolean; open: string; close: string };
        return {
          dayOfWeek: dayNameToNum[key] ?? 0,
          openTime: v.open,
          closeTime: v.close,
          isOpen: v.enabled ? 1 : 0,
        };
      });
      updateStoreHours(hoursArr);
    }

    // Return updated data
    const settings = getStoreSettings();
    const hours = getStoreHours();

    return NextResponse.json({
      settings: {
        storeMode: settings.store_mode,
        infoMessage: settings.info_message,
        maintenanceMessage: settings.maintenance_message,
        qrisEnabled: settings.qris_enabled === 1,
        qrisFeeMode: settings.qris_fee_mode,
        updatedAt: settings.updated_at,
      },
      hours: hours.map((h) => ({
        dayOfWeek: h.day_of_week,
        openTime: h.open_time,
        closeTime: h.close_time,
        isOpen: h.is_open === 1,
      })),
    });
  } catch (error) {
    console.error("[PATCH /api/admin/settings]", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
