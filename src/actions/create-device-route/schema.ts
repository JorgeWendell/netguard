import { z } from "zod";

const optionalText = z.string().max(255).optional();

export const routeFieldsSchema = z.object({
  dstAddress: z.string().min(1).max(64),
  gateway: optionalText,
  interface: optionalText,
  distance: z.number().int().min(0).max(255).optional(),
  routingTable: optionalText,
  checkGateway: z.enum(["ping", "arp", "none", ""]).optional(),
  prefSrc: optionalText,
  comment: z.string().max(255).optional(),
  disabled: z.boolean().optional(),
});

function validateGatewayOrInterface(
  data: z.infer<typeof routeFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  if (!data.gateway?.trim() && !data.interface?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe gateway ou interface",
      path: ["gateway"],
    });
  }
}

export const createDeviceRouteSchema = routeFieldsSchema
  .extend({
    deviceId: z.string().uuid(),
  })
  .superRefine(validateGatewayOrInterface);

export const updateDeviceRouteSchema = routeFieldsSchema
  .extend({
    deviceId: z.string().uuid(),
    routeId: z.string().min(1),
  })
  .superRefine(validateGatewayOrInterface);

export const removeDeviceRouteSchema = z.object({
  deviceId: z.string().uuid(),
  routeId: z.string().min(1),
});

export const setDeviceRouteSchema = z.object({
  deviceId: z.string().uuid(),
  routeId: z.string().min(1),
  disabled: z.boolean(),
});
