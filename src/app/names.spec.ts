import { nameKey } from './names';

describe('names written two ways', () => {
  it('compare as one name', () => {
    expect(nameKey('فاطمة')).toBe(nameKey('فاطمه'));
    expect(nameKey('أمّ محمّد')).toBe(nameKey('ام محمد'));
    expect(nameKey('هدى')).toBe(nameKey('هدي'));
    expect(nameKey('عائشة')).toBe(nameKey('عايشه'));
    // Marks WhatsApp copies along with a name, the tatweel, and spacing.
    expect(nameKey('سعاد\u200f')).toBe(nameKey('سعاد'));
    expect(nameKey('سعـاد')).toBe(nameKey('سعاد'));
    expect(nameKey('  أم   خالد ')).toBe(nameKey('ام خالد'));
    expect(nameKey('Sara')).toBe(nameKey('sara'));
    expect(nameKey('فاطمة')).not.toBe(nameKey('فاطمة الزهراء'));
  });
});
