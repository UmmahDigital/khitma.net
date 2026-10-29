import { khitmaName, memorialDua, purposeLabel, purposeTitle } from './purpose';

describe('khitma purposes', () => {
  it('writes the title for someone who passed away, or who is ill, with the right pronoun', () => {
    expect(purposeTitle('memorial', ' محمد ', 'male', {})).toBe('ختمة عن روح محمد رحمه الله');
    expect(purposeTitle('memorial', 'فاطمة', 'female', {})).toBe('ختمة عن روح فاطمة رحمها الله');
    expect(purposeTitle('healing', 'خالد', 'male', {})).toBe('ختمة لشفاء خالد شفاه الله');
    expect(purposeTitle('healing', 'سارة', 'female', {})).toBe('ختمة لشفاء سارة شفاها الله');
    expect(purposeTitle('ramadan', '', 'male', {})).toBe('ختمة رمضان');
  });

  it('suggests nothing without a name, or for other purposes', () => {
    expect(purposeTitle('memorial', '  ', 'male', {})).toBeNull();
    expect(purposeTitle('intention', 'محمد', 'male', {})).toBeNull();
    expect(purposeTitle(null, 'محمد', 'male', {})).toBeNull();
  });

  it('uses the translation in other languages', () => {
    const en = { purpose: { memorialFemaleTitle: 'Khitma for {name}, may Allah have mercy on her', memorial: 'Someone who passed away' } };
    expect(purposeTitle('memorial', 'Maryam', 'female', en)).toBe('Khitma for Maryam, may Allah have mercy on her');
    expect(purposeLabel('memorial', en)).toBe('Someone who passed away');
    expect(purposeLabel('healing', {})).toBe('لشفاء مريض');
  });

  it('names a khitma without saying "khitma" twice', () => {
    expect(khitmaName('ختمة عن روح محمد رحمه الله')).toBe('ختمة عن روح محمد رحمه الله');
    expect(khitmaName('الختمة الأسبوعية')).toBe('الختمة الأسبوعية');
    expect(khitmaName('العائلة')).toBe('ختمة «العائلة»');
  });

  it('has the supplication for the deceased in both genders', () => {
    expect(memorialDua('male')).toBe('اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ');
    expect(memorialDua(undefined)).toBe(memorialDua('male'));
    expect(memorialDua('female')).toBe('اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا، وَعَافِهَا وَاعْفُ عَنْهَا، وَأَكْرِمْ نُزُلَهَا، وَوَسِّعْ مُدْخَلَهَا');
  });
});
