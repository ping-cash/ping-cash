export type TShirtSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'custom';

export interface ResourceSpec {
  cpu: string;
  memory: string;
  storage: string;
}

export interface TShirtCapabilities {
  bandwidth: string; // "100 GB/mo" / "Unmetered"
  backupRetention: string; // "—" / "7 days" / "60 days"
  auditLogs: string; // matches backup retention
  uptimeSla: string; // "—" / "99.9%" / "99.99%"
  responseSla: string; // "—" / "8h" / "1h"
  supportChannel: string; // "Community" / "Email" / "Email + Chat" / "+ Phone" / "Named team"
}

export interface TShirtTier {
  id: TShirtSize;
  label: string;
  name: string;
  tagline: string;
  description: string;
  resources: ResourceSpec;
  monthlyPrice: number; // baisa — Scale uses a "from" floor
  priceFrom?: boolean; // Scale tier shows "From OMR X" prefix
  popular?: boolean;
  features: string[];
  capabilities: TShirtCapabilities;
}

export type MarketplaceCategory =
  | 'cms'
  | 'email'
  | 'communication'
  | 'productivity'
  | 'crm'
  | 'analytics'
  | 'ecommerce'
  | 'project-management'
  | 'erp'
  | 'invoicing'
  | 'marketing'
  | 'scheduling'
  | 'devtools'
  | 'monitoring'
  | 'ai'
  | 'documents'
  | 'security'
  | 'knowledge-base'
  | 'forms'
  | 'support'
  | 'social-media'
  | 'database'
  | 'video-conferencing'
  | 'photo-management';

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'domain' | 'password' | 'select' | 'toggle';
  required: boolean;
  default?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
}

export interface MarketplaceApp {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: MarketplaceCategory;
  tags: string[];
  icon: string;
  color: string;
  minimumSize: TShirtSize;
  recommendedSize: TShirtSize;
  website: string;
  license: string;
  featured: boolean;
  popular: boolean;
  features: string[];
  configFields: ConfigField[];
  relatedApps: string[];
}

export interface Bundle {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon: string;
  apps: string[];
  discount: number;
  recommendedSize: TShirtSize;
}

export type AddOnCategory =
  | 'security'
  | 'backup'
  | 'monitoring'
  | 'infrastructure'
  | 'support';

export interface AddOn {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  category: AddOnCategory;
  monthlyPrice: number;
  included: boolean;
  tool?: string;
}

export interface TenantState {
  id: string;
  companyName: string;
  email: string;
  vclusterName: string;
  vclusterStatus: 'creating' | 'running' | 'suspended' | 'error' | 'deleting';
  apps: DeployedApp[];
  size: TShirtSize;
  addOns: string[];
  createdAt: string;
  resourceUsage: ResourceUsage;
}

export interface DeployedApp {
  slug: string;
  status: 'deploying' | 'running' | 'error' | 'updating' | 'stopped';
  url: string;
  version: string;
  deployedAt: string;
  healthy: boolean;
}

export interface ResourceUsage {
  cpuUsed: string;
  cpuLimit: string;
  memoryUsed: string;
  memoryLimit: string;
  storageUsed: string;
  storageLimit: string;
}

export interface ProvisionStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  duration?: number;
  error?: string;
}
