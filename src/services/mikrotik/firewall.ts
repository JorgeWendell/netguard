import type { MikrotikRecord, MikrotikSession } from "./types";

export type NatRuleInput = {
  chain: "srcnat" | "dstnat";
  action: "masquerade" | "dst-nat" | "src-nat" | "accept" | "redirect";
  protocol?: string;
  srcAddress?: string;
  dstAddress?: string;
  srcPort?: string;
  dstPort?: string;
  inInterface?: string;
  outInterface?: string;
  toAddresses?: string;
  toPorts?: string;
  comment?: string;
  disabled?: boolean;
};

export type CreateNatRuleInput = NatRuleInput;

export type UpdateNatRuleInput = NatRuleInput & {
  ruleId: string;
};

export type FilterRuleInput = {
  chain: "input" | "forward" | "output";
  action:
    | "accept"
    | "drop"
    | "reject"
    | "fasttrack-connection"
    | "log"
    | "jump"
    | "return"
    | "passthrough";
  protocol?: string;
  srcAddress?: string;
  dstAddress?: string;
  srcPort?: string;
  dstPort?: string;
  inInterface?: string;
  outInterface?: string;
  connectionState?: string;
  comment?: string;
  disabled?: boolean;
};

export type CreateFilterRuleInput = FilterRuleInput;

export type UpdateFilterRuleInput = FilterRuleInput & {
  ruleId: string;
};

type ParamOptions = { clearIfEmpty?: boolean };

function appendRuleParam(
  params: string[],
  key: string,
  value?: string | boolean,
  options?: ParamOptions,
): void {
  if (value === undefined) return;

  if (typeof value === "boolean") {
    params.push(`=${key}=${value ? "yes" : "no"}`);
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (options?.clearIfEmpty) {
      params.push(`=!${key}`);
    }
    return;
  }

  params.push(`=${key}=${trimmed}`);
}

function buildNatParams(
  input: NatRuleInput,
  options?: ParamOptions,
): string[] {
  const params: string[] = [];

  appendRuleParam(params, "chain", input.chain, options);
  appendRuleParam(params, "action", input.action, options);
  appendRuleParam(params, "protocol", input.protocol, options);
  appendRuleParam(params, "src-address", input.srcAddress, options);
  appendRuleParam(params, "dst-address", input.dstAddress, options);
  appendRuleParam(params, "src-port", input.srcPort, options);
  appendRuleParam(params, "dst-port", input.dstPort, options);
  appendRuleParam(params, "in-interface", input.inInterface, options);
  appendRuleParam(params, "out-interface", input.outInterface, options);
  appendRuleParam(params, "to-addresses", input.toAddresses, options);
  appendRuleParam(params, "to-ports", input.toPorts, options);
  appendRuleParam(params, "comment", input.comment, options);

  if (input.disabled !== undefined) {
    appendRuleParam(params, "disabled", input.disabled, options);
  }

  return params;
}

function buildFilterParams(
  input: FilterRuleInput,
  options?: ParamOptions,
): string[] {
  const params: string[] = [];

  appendRuleParam(params, "chain", input.chain, options);
  appendRuleParam(params, "action", input.action, options);
  appendRuleParam(params, "protocol", input.protocol, options);
  appendRuleParam(params, "src-address", input.srcAddress, options);
  appendRuleParam(params, "dst-address", input.dstAddress, options);
  appendRuleParam(params, "src-port", input.srcPort, options);
  appendRuleParam(params, "dst-port", input.dstPort, options);
  appendRuleParam(params, "in-interface", input.inInterface, options);
  appendRuleParam(params, "out-interface", input.outInterface, options);
  appendRuleParam(params, "connection-state", input.connectionState, options);
  appendRuleParam(params, "comment", input.comment, options);

  if (input.disabled !== undefined) {
    appendRuleParam(params, "disabled", input.disabled, options);
  }

  return params;
}

export async function fetchFirewallFilterRules(
  session: MikrotikSession,
): Promise<MikrotikRecord[]> {
  return session
    .write("/ip/firewall/filter/print")
    .catch(() => [] as MikrotikRecord[]);
}

export async function fetchFirewallNatRules(
  session: MikrotikSession,
): Promise<MikrotikRecord[]> {
  return session
    .write("/ip/firewall/nat/print")
    .catch(() => [] as MikrotikRecord[]);
}

export async function setFirewallRuleDisabled(
  session: MikrotikSession,
  path: "/ip/firewall/filter" | "/ip/firewall/nat",
  ruleId: string,
  disabled: boolean,
): Promise<void> {
  await session.write(`${path}/set`, [
    `=.id=${ruleId}`,
    `=disabled=${disabled ? "yes" : "no"}`,
  ]);
}

export async function createNatRule(
  session: MikrotikSession,
  input: CreateNatRuleInput,
): Promise<void> {
  const params = buildNatParams(input);

  if (params.length < 2) {
    throw new Error("Informe pelo menos chain e action");
  }

  await session.write("/ip/firewall/nat/add", params);
}

export async function updateNatRule(
  session: MikrotikSession,
  input: UpdateNatRuleInput,
): Promise<void> {
  const params = buildNatParams(input, { clearIfEmpty: true });

  if (params.length === 0) {
    throw new Error("Nenhum campo para atualizar");
  }

  await session.write("/ip/firewall/nat/set", [`=.id=${input.ruleId}`, ...params]);
}

export async function removeNatRule(
  session: MikrotikSession,
  ruleId: string,
): Promise<void> {
  await session.write("/ip/firewall/nat/remove", [`=.id=${ruleId}`]);
}

export async function createFilterRule(
  session: MikrotikSession,
  input: CreateFilterRuleInput,
): Promise<void> {
  const params = buildFilterParams(input);

  if (params.length < 2) {
    throw new Error("Informe pelo menos chain e action");
  }

  await session.write("/ip/firewall/filter/add", params);
}

export async function updateFilterRule(
  session: MikrotikSession,
  input: UpdateFilterRuleInput,
): Promise<void> {
  const params = buildFilterParams(input, { clearIfEmpty: true });

  if (params.length === 0) {
    throw new Error("Nenhum campo para atualizar");
  }

  await session.write("/ip/firewall/filter/set", [
    `=.id=${input.ruleId}`,
    ...params,
  ]);
}

export async function removeFilterRule(
  session: MikrotikSession,
  ruleId: string,
): Promise<void> {
  await session.write("/ip/firewall/filter/remove", [`=.id=${ruleId}`]);
}
