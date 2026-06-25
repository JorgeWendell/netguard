import type { MikrotikInterfaceData } from "../types";
import type { BridgePortData } from "../bridge";

export type AccessInterfaceRow = MikrotikInterfaceData & {
  parentName?: string;
};

export function resolveInterfaceParents(
  interfaces: MikrotikInterfaceData[],
  bridgePorts: BridgePortData[],
): AccessInterfaceRow[] {
  const bridgeParentByInterface = new Map(
    bridgePorts.map((port) => [port.interface, port.bridge]),
  );

  return interfaces.map((iface) => {
    const bridgeParent = bridgeParentByInterface.get(iface.name);
    const vlanParent =
      iface.type === "vlan" ? iface.parentName : undefined;
    const parentName = bridgeParent ?? vlanParent ?? undefined;

    return {
      ...iface,
      parentName,
    };
  });
}

export type InterfaceTreeRow = AccessInterfaceRow & {
  depth: number;
};

export function flattenInterfaceTree(
  interfaces: AccessInterfaceRow[],
): InterfaceTreeRow[] {
  const byName = new Map(interfaces.map((iface) => [iface.name, iface]));

  const isChild = (iface: AccessInterfaceRow) =>
    Boolean(
      iface.parentName &&
        iface.parentName !== iface.name &&
        byName.has(iface.parentName),
    );

  const childrenByParent = new Map<string, AccessInterfaceRow[]>();

  for (const iface of interfaces) {
    if (!isChild(iface) || !iface.parentName) continue;

    const siblings = childrenByParent.get(iface.parentName) ?? [];
    siblings.push(iface);
    childrenByParent.set(iface.parentName, siblings);
  }

  const roots = interfaces
    .filter((iface) => !isChild(iface))
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: InterfaceTreeRow[] = [];
  const visited = new Set<string>();

  const walk = (iface: AccessInterfaceRow, depth: number) => {
    if (visited.has(iface.name)) return;
    visited.add(iface.name);

    result.push({ ...iface, depth });

    const children = (childrenByParent.get(iface.name) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const child of children) {
      walk(child, depth + 1);
    }
  };

  for (const root of roots) {
    walk(root, 0);
  }

  for (const iface of interfaces) {
    if (!visited.has(iface.name)) {
      walk(iface, 0);
    }
  }

  return result;
}
