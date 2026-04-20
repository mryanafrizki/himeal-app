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

    // Update store settings
    const settingsUpdate: Record<string, unknown> = {};
    if (body.storeMode !== undefined) settingsUpdate.store_mode = body.storeMode;
    if (body.infoMessage !== undefined) settingsUpdate.info_message = body.infoMessage;
    if (body.maintenanceMessage !== undefined) settingsUpdate.maintenance_message = body.maintenanceMessage;
    if (body.qrisEnabled !== undefined) settingsUpdate.qris_enabled = body.qrisEnabled ? 1 : 0;
    if (body.qrisFeeMode !== undefined) settingsUpdate.qris_fee_mode = body.qrisFeeMode;

    if (Object.keys(settingsUpdate).length > 0) {
      updateStoreSettings(settingsUpdate as Parameters<typeof updateStoreSettings>[0]);
    }

    // Update store hours
    if (body.hours && Array.isArray(body.hours)) {
      updateStoreHours(
        body.hours.map((h: { dayOfWeek: number; openTime: string; closeTime: string; isOpen: boolean }) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isOpen: h.isOpen ? 1 : 0,
        }))
      );
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
