export function normalizeDomain(input: string): string {
  const domain = input.trim().toLowerCase();
  const hostname =
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

  if (domain.length > 253 || !hostname.test(domain)) {
    throw new Error(
      "Enter a hostname such as example.com, without a scheme, path, or port.",
    );
  }

  return domain;
}
