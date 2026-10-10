export type SecretFinding = {
  kind: string;
  location: string;
  fingerprint: string;
};

export function scanText(text: string, location: string): SecretFinding[];
