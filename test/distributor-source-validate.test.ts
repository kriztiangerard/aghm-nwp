import { validateDistributorSourceInput } from '../backend/src/pricing/distributor-sources/validate';

describe('validateDistributorSourceInput', () => {
  it('passes with all required fields present and a valid URL', () => {
    const result = validateDistributorSourceInput({
      vendorName: 'TP-Link',
      distributorName: 'DynaQuest PC',
      sourceUrl: 'https://example.com/product/123',
    });
    expect(result.valid).toBe(true);
  });

  it('fails when a required field is missing', () => {
    const result = validateDistributorSourceInput({ vendorName: 'TP-Link' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('distributorName is required');
    expect(result.errors).toContain('sourceUrl is required');
  });

  it('fails when sourceUrl is not a valid URL', () => {
    const result = validateDistributorSourceInput({
      vendorName: 'TP-Link',
      distributorName: 'DynaQuest PC',
      sourceUrl: 'not-a-url',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('sourceUrl must be a valid URL');
  });
});
