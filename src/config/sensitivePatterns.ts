export interface SensitivePattern {
  label: string;
  pattern: RegExp;
}

export const sensitivePatterns: readonly SensitivePattern[] = [
  { label: "password", pattern: /\bpassword\s*=/giu },
  { label: "secret", pattern: /\bsecret\s*=/giu },
  { label: "token", pattern: /\btoken\s*=/giu },
  { label: "api_key", pattern: /\bapi_key\s*=/giu },
  { label: "apikey", pattern: /\bapikey\s*=/giu },
  { label: "JDBC URL", pattern: /\bjdbc:/giu },
  {
    label: "private IPv4 (10/8)",
    pattern: /\b10(?:\.\d{1,3}){3}\b/gu,
  },
  {
    label: "private IPv4 (172.16/12)",
    pattern: /\b172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}\b/gu,
  },
  {
    label: "private IPv4 (192.168/16)",
    pattern: /\b192\.168(?:\.\d{1,3}){2}\b/gu,
  },
  { label: ".internal domain", pattern: /\.internal\b/giu },
  { label: ".local domain", pattern: /\.local\b/giu },
  { label: "corp marker", pattern: /\bcorp\b/giu },
  {
    label: "localhost with port",
    pattern: /\blocalhost:\d{1,5}\b/giu,
  },
];
