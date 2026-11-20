// Owner: skills. The seven field icons of the signature set, by field id (spec 9.1, DESIGN-BRIEF 6).
import type { ReactNode } from "react";

import {
  IconFieldBusiness,
  IconFieldData,
  IconFieldDesign,
  IconFieldHr,
  IconFieldMarketing,
  IconFieldProfessional,
  IconFieldSoftware,
  type IconProps,
} from "@/components/icons";
import type { FieldId } from "@/lib/types";

const ICONS = {
  data: IconFieldData,
  software: IconFieldSoftware,
  design: IconFieldDesign,
  marketing: IconFieldMarketing,
  business: IconFieldBusiness,
  hr: IconFieldHr,
  professional: IconFieldProfessional,
} as const satisfies Record<FieldId, (props: IconProps) => ReactNode>;

export function FieldIcon({ field, ...props }: IconProps & { readonly field: FieldId }): ReactNode {
  const Icon = ICONS[field];
  return <Icon {...props} />;
}
