import { test as setup } from '@playwright/test';
import { resetFirestore } from '../support/firestore';
import { seedGlobalDocs } from '../support/fixtures';

setup('reset the Firestore emulator and seed shared documents', async () => {
  await resetFirestore();
  await seedGlobalDocs();
});
