import { captureLandingRef, impactLines, isRefCode, landingRef, newRefCode, withoutRef, withRef } from './referral';

describe('referral links', () => {
  it('makes short codes without look-alike characters', () => {
    const code = newRefCode(new Uint8Array([0, 1, 2, 31, 32, 63, 200, 255]));
    expect(code).toBe('abc9a9i9');
    expect(isRefCode(newRefCode())).toBe(true);
    expect(newRefCode()).toMatch(/^[a-km-np-z2-9]{8}$/);
  });

  it('adds the code to a link, keeping its query and hash', () => {
    expect(withRef('https://khitma.net/group/abc', 'k7f2xq9a')).toBe('https://khitma.net/group/abc?r=k7f2xq9a');
    expect(withRef('https://khitma.net/group/abc?x=1#top', 'k7f2xq9a')).toBe('https://khitma.net/group/abc?x=1&r=k7f2xq9a#top');
    expect(withRef('https://khitma.net/group/abc', null)).toBe('https://khitma.net/group/abc');
  });

  it('reads the code and the group from a landing address, ignoring anything else', () => {
    expect(landingRef('/group/abc123', '?r=k7f2xq9a')).toEqual({ code: 'k7f2xq9a', groupId: 'abc123' });
    expect(landingRef('/group/abc123/join', '?r=k7f2xq9a')).toEqual({ code: 'k7f2xq9a', groupId: 'abc123' });
    expect(landingRef('/', '?r=k7f2xq9a')).toEqual({ code: 'k7f2xq9a', groupId: null });
    expect(landingRef('/group/abc123', '?r=<script>')).toBeNull();
    expect(landingRef('/group/abc123', '')).toBeNull();
    expect(withoutRef('?r=k7f2xq9a')).toBe('');
    expect(withoutRef('?type=onetime&r=k7f2xq9a')).toBe('?type=onetime');
  });

  it('keeps a landing reference and cleans the address, but not for the phone’s own link', () => {
    const storage = new Map<string, string>();
    const replaced: string[] = [];
    const fakeWindow = (search: string) =>
      ({
        location: { pathname: '/group/abc123', search, hash: '' },
        history: { state: null, replaceState: (_: unknown, __: string, url: string) => replaced.push(url) },
        localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
      }) as unknown as Window;

    captureLandingRef(fakeWindow('?r=k7f2xq9a'));
    expect(replaced).toEqual(['/group/abc123']);
    expect(JSON.parse(storage.get('referrals')!).landing).toEqual(jasmine.objectContaining({ code: 'k7f2xq9a', groupId: 'abc123' }));

    storage.clear();
    storage.set('refCode', 'mycode22');
    captureLandingRef(fakeWindow('?r=mycode22'));
    expect(storage.has('referrals')).toBe(false);
  });
});

describe('invitation impact', () => {
  it('says nothing until someone joined', () => {
    expect(impactLines(null, {}, 'ar')).toEqual([]);
    expect(impactLines({ joined: 0, read: 3 }, {}, 'ar')).toEqual([]);
  });

  it('agrees in number in Arabic', () => {
    expect(impactLines({ joined: 1 }, {}, 'ar')).toEqual(['انضمّ عبر دعواتك شخص واحد.']);
    expect(impactLines({ joined: 1, read: 1 }, {}, 'ar')).toEqual(['انضمّ عبر دعواتك شخص واحد، وقرأ جزءًا واحدًا.']);
    expect(impactLines({ joined: 2, read: 2 }, {}, 'ar')).toEqual(['انضمّ عبر دعواتك شخصان، وقرآ جزأين.']);
    expect(impactLines({ joined: 7, read: 12 }, {}, 'ar')).toEqual(['انضمّ عبر دعواتك 7 أشخاص، وقرؤوا 12 جزءًا.']);
    expect(impactLines({ joined: 11, read: 5 }, {}, 'ar')).toEqual(['انضمّ عبر دعواتك 11 شخصًا، وقرؤوا 5 أجزاء.']);
    expect(impactLines({ joined: 100, read: 103 }, {}, 'ar')).toEqual(['انضمّ عبر دعواتك 100 شخص، وقرؤوا 103 أجزاء.']);
    expect(impactLines({ joined: 3, started: 1 }, {}, 'ar')).toEqual(['انضمّ عبر دعواتك 3 أشخاص.', 'وبدأ واحد منهم ختمة جديدة.']);
    expect(impactLines({ joined: 9, started: 4 }, {}, 'ar')[1]).toBe('وبدأ 4 منهم ختمة جديدة.');
  });

  it('uses one line per number in other languages', () => {
    const translation = { referral: { joined: 'Joined: {n}', read: 'Read: {n}', started: 'Started: {n}' } };
    expect(impactLines({ joined: 7, read: 12, started: 1 }, translation, 'en')).toEqual(['Joined: 7', 'Read: 12', 'Started: 1']);
    expect(impactLines({ joined: 1 }, translation, 'en')).toEqual(['Joined: 1']);
  });
});
