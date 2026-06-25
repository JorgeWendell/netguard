import type { AvailabilityEventRow } from "@/lib/events/get-availability-events";
import { getAvailabilityEvents } from "@/lib/events/get-availability-events";
import type { DeviceServiceRow } from "@/lib/services/get-device-services";
import { getDeviceServices } from "@/lib/services/get-device-services";

import {
  REPORT_MAX_AVAILABILITY_ROWS,
  REPORT_MAX_SERVICE_ROWS,
} from "./constants";

export type ReportFilters = {
  companyId?: string;
  locationId?: string;
  deviceId?: string;
  dateFrom: string;
  dateTo: string;
};

export type ReportData = {
  availability: AvailabilityEventRow[];
  services: DeviceServiceRow[];
  availabilityTruncated: boolean;
  servicesTruncated: boolean;
  generatedAt: string;
};

export async function getReportData(filters: ReportFilters): Promise<ReportData> {
  const queryFilters = {
    companyId: filters.companyId,
    locationId: filters.locationId,
    deviceId: filters.deviceId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  const [availability, services] = await Promise.all([
    getAvailabilityEvents({
      ...queryFilters,
      limit: REPORT_MAX_AVAILABILITY_ROWS + 1,
    }),
    getDeviceServices(queryFilters),
  ]);

  const availabilityTruncated =
    availability.length > REPORT_MAX_AVAILABILITY_ROWS;
  const servicesTruncated = services.length > REPORT_MAX_SERVICE_ROWS;

  return {
    availability: availability.slice(0, REPORT_MAX_AVAILABILITY_ROWS),
    services: services.slice(0, REPORT_MAX_SERVICE_ROWS),
    availabilityTruncated,
    servicesTruncated,
    generatedAt: new Date().toISOString(),
  };
}
