import {
  Juz,
  JUZ_STATUS,
  KhitmaGroup_Sequential,
  NUM_OF_AJZA,
} from './entities';

describe('KhitmaGroup_Sequential', () => {
  describe('getPreviousCycleAjza', () => {
    it('moves each member to the previous juz and wraps juz 1 to juz 30', () => {
      const currentAjza = Array.from(
        { length: NUM_OF_AJZA },
        (_, index) =>
          new Juz({
            index,
            owner: `member-${index + 1}`,
            status: JUZ_STATUS.BOOKED,
          })
      );

      const previousCycleAjza =
        KhitmaGroup_Sequential.getPreviousCycleAjza(currentAjza);

      expect(previousCycleAjza[29].owner).toBe('member-1');
      expect(previousCycleAjza[0].owner).toBe('member-2');
      expect(previousCycleAjza[28].owner).toBe('member-30');
    });

    it('keeps idle ajza idle and resets assigned ajza to booked', () => {
      const currentAjza = KhitmaGroup_Sequential.getEmptyAjzaArray();
      currentAjza[0] = new Juz({
        index: 0,
        owner: 'member-1',
        status: JUZ_STATUS.DONE,
      });

      const previousCycleAjza =
        KhitmaGroup_Sequential.getPreviousCycleAjza(currentAjza);

      expect(previousCycleAjza[29]).toEqual(
        new Juz({
          index: 29,
          owner: 'member-1',
          status: JUZ_STATUS.BOOKED,
        })
      );
      expect(previousCycleAjza[0]).toEqual(
        new Juz({
          index: 0,
          owner: '',
          status: JUZ_STATUS.IDLE,
        })
      );
    });
  });
});
