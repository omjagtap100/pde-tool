import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize.js";

/** Matches existing local `orgs` table (token + legacy org fields). */
export type OrgAttrs = {
  org_id: string;
  token: string;
  schema_version: string;
  org_name: string;
  registered_at: Date;
  approved_regions: string[];
  approved_zones: string[];
  policy_pin: string;
  contact_email: string;
  policy_profile: string | null;
  enabled_policies: Record<string, string[]> | null;
};

type OrgCreate = Optional<
  OrgAttrs,
  "schema_version" | "approved_regions" | "approved_zones" | "policy_pin" | "policy_profile" | "enabled_policies"
>;

export class Org extends Model<OrgAttrs, OrgCreate> implements OrgAttrs {
  declare org_id: string;
  declare token: string;
  declare schema_version: string;
  declare org_name: string;
  declare registered_at: Date;
  declare approved_regions: string[];
  declare approved_zones: string[];
  declare policy_pin: string;
  declare contact_email: string;
  declare policy_profile: string | null;
  declare enabled_policies: Record<string, string[]> | null;
}

Org.init(
  {
    org_id: { type: DataTypes.STRING(64), allowNull: false, primaryKey: true },
    token: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    schema_version: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "1" },
    org_name: { type: DataTypes.STRING(255), allowNull: false },
    registered_at: { type: DataTypes.DATE, allowNull: false },
    approved_regions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    approved_zones: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    policy_pin: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "main" },
    contact_email: { type: DataTypes.STRING(255), allowNull: false },
    policy_profile: { type: DataTypes.STRING(64), allowNull: true },
    enabled_policies: { type: DataTypes.JSON, allowNull: true },
  },
  { sequelize, tableName: "orgs", underscored: true }
);
