import { z } from "zod";

export const deviceUpdateDeviceIdSchema = z.object({
  deviceId: z.string().uuid(),
});

export const setDeviceUpdateChannelSchema = deviceUpdateDeviceIdSchema.extend({
  channel: z.enum(["stable", "long-term", "testing"]),
});
