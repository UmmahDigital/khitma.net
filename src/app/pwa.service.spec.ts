import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaService } from './pwa.service';
import { CommonService } from './service/common.service';

describe('PwaService', () => {
  it('offers the update only once the new version is ready', () => {
    const versionUpdates = new Subject<VersionEvent>();
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => new Subject() } as any);

    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: { versionUpdates } },
        { provide: MatDialog, useValue: dialog },
        { provide: CommonService, useValue: { translation: { dialog: { update: 'تحديث البرنامج', updateDesc: '' } } } },
      ],
    });
    TestBed.inject(PwaService);

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } } as VersionEvent);
    expect(dialog.open).not.toHaveBeenCalled();

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    } as VersionEvent);
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });
});
