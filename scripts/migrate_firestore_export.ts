import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DESTINATION_PROJECT_ID = 'bitwise-c1645';
const MIGRATION_STATE_COLLECTION = '_migration_metadata';
const BATCH_SIZE = 20;
const MAX_BATCH_ATTEMPTS = 5;

type ExportDocument = Record<string, unknown> & { id: string };
type FirestoreExport = Record<string, ExportDocument[]>;
type MigrationState = {
  destinationProjectId: string;
  exportSha256: string;
  exportFile: string;
  status: 'in_progress' | 'completed';
  completedCollections: string[];
  documentCounts: Record<string, number>;
  updatedAt: string;
};

const parseArguments = (args: string[]) => {
  const options: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (arg === '--apply' || arg === '--dry-run' || arg === '--validate-only' || arg === '--verify-only') {
      options[arg.slice(2)] = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    options[arg.slice(2)] = value;
    index++;
  }

  const modes = ['apply', 'dry-run', 'validate-only', 'verify-only'].filter(mode => options[mode]);
  if (modes.length !== 1) {
    throw new Error('Choose exactly one mode: --validate-only, --dry-run, --apply, or --verify-only.');
  }
  if (typeof options.export !== 'string') {
    throw new Error('Provide the export file with --export "path-to-export.json".');
  }
  if (modes[0] !== 'validate-only' && typeof options['service-account'] !== 'string') {
    throw new Error('Provide the destination key with --service-account "path-outside-repository.json".');
  }
  return {
    mode: modes[0] as 'apply' | 'dry-run' | 'validate-only' | 'verify-only',
    exportPath: path.resolve(options.export),
    serviceAccountPath: typeof options['service-account'] === 'string'
      ? path.resolve(options['service-account'])
      : undefined
  };
};

const validateExport = (value: unknown): FirestoreExport => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The export root must be a JSON object of collection names to document arrays.');
  }

  const result: FirestoreExport = {};
  for (const [collectionName, records] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_-]+$/.test(collectionName)) {
      throw new Error(`Unsupported collection name: ${collectionName}`);
    }
    if (!Array.isArray(records)) {
      throw new Error(`Collection "${collectionName}" is not a document array.`);
    }
    const seenIds = new Set<string>();
    result[collectionName] = records.map((record, index) => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new Error(`Invalid document at ${collectionName}[${index}].`);
      }
      if (Object.prototype.hasOwnProperty.call(record, 'error')) {
        throw new Error(`Export contains an error at ${collectionName}[${index}]: ${String(record.error)}`);
      }
      if (typeof record.id !== 'string' || !record.id || record.id.includes('/') ||
        Buffer.byteLength(record.id, 'utf8') > 1500) {
        throw new Error(`Invalid Firestore document ID at ${collectionName}[${index}].`);
      }
      if (seenIds.has(record.id)) {
        throw new Error(`Duplicate document ID "${record.id}" in collection "${collectionName}".`);
      }
      seenIds.add(record.id);
      return record as ExportDocument;
    });
  }
  if (Object.keys(result).length === 0) throw new Error('The export contains no collections.');
  return result;
};

const isInsideDirectory = (filePath: string, directoryPath: string): boolean => {
  const relativePath = path.relative(directoryPath, filePath);
  return relativePath === '' || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
};

const getRetryDelay = (error: unknown, attempt: number): number | null => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code).toLowerCase()
    : '';
  const retryable = [
    '4',
    '8',
    '10',
    '14',
    'aborted',
    'deadline-exceeded',
    'resource-exhausted',
    'unavailable'
  ]
    .some(retryableCode => code === retryableCode || code.endsWith(`/${retryableCode}`));
  if (!retryable || attempt >= MAX_BATCH_ATTEMPTS - 1) return null;
  return Math.min(1000 * (2 ** attempt), 10000);
};

const commitBatch = async (
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  documents: ExportDocument[]
): Promise<void> => {
  for (let attempt = 0; attempt < MAX_BATCH_ATTEMPTS; attempt++) {
    try {
      const batch = db.batch();
      documents.forEach(document => {
        batch.set(db.collection(collectionName).doc(document.id), document);
      });
      await batch.commit();
      return;
    } catch (error) {
      const delay = getRetryDelay(error, attempt);
      if (delay === null) throw error;
      console.warn(`Temporary Firestore write failure; retrying batch in ${delay} ms.`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const exportBytes = await readFile(options.exportPath);
  const exportHash = createHash('sha256').update(exportBytes).digest('hex');
  const data = validateExport(JSON.parse(exportBytes.toString('utf8')));
  const documentCounts = Object.fromEntries(
    Object.entries(data).map(([collectionName, documents]) => [collectionName, documents.length])
  );
  const totalDocuments = Object.values(documentCounts).reduce((sum, count) => sum + count, 0);

  console.log(`Validated ${Object.keys(data).length} collections and ${totalDocuments} documents.`);
  console.log(`Export SHA-256: ${exportHash}`);

  if (options.mode === 'validate-only') {
    console.log('Validation only; no Firebase credentials were loaded and no database was accessed.');
    return;
  }

  if (!options.serviceAccountPath) throw new Error('Destination service-account key path is required.');
  const repoRoot = await realpath(process.cwd());
  const serviceAccountPath = await realpath(options.serviceAccountPath);
  if (isInsideDirectory(serviceAccountPath, repoRoot)) {
    throw new Error('Keep the service-account key outside the repository. No migration was started.');
  }

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  if (serviceAccount.project_id !== DESTINATION_PROJECT_ID) {
    throw new Error(`The selected service-account key is not for ${DESTINATION_PROJECT_ID}. No migration was started.`);
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: DESTINATION_PROJECT_ID
      });
  const db = getFirestore(app);
  const stateRef = db.collection(MIGRATION_STATE_COLLECTION).doc(exportHash);
  if (options.mode === 'verify-only') {
    const actualCounts: Record<string, number> = {};
    for (const collectionName of Object.keys(data)) {
      const result = await db.collection(collectionName).count().get();
      actualCounts[collectionName] = result.data().count;
    }
    const countMismatches = Object.entries(documentCounts).filter(
      ([collectionName, expectedCount]) => actualCounts[collectionName] !== expectedCount
    );
    const migrationSnapshot = await stateRef.get();
    const migrationState = migrationSnapshot.exists
      ? migrationSnapshot.data() as MigrationState
      : undefined;
    console.log('Destination counts:', JSON.stringify(actualCounts, null, 2));
    if (countMismatches.length > 0) {
      throw new Error(`Destination counts do not match the export: ${countMismatches.map(([name]) => name).join(', ')}.`);
    }
    if (migrationState?.status !== 'completed') {
      throw new Error('Collection counts match, but the migration marker is not completed.');
    }
    console.log(`Verification passed: all ${totalDocuments} exported documents are present in ${DESTINATION_PROJECT_ID}.`);
    return;
  }
  const existingState = await stateRef.get();
  let state: MigrationState;

  if (existingState.exists) {
    state = existingState.data() as MigrationState;
    if (
      state.destinationProjectId !== DESTINATION_PROJECT_ID ||
      state.exportSha256 !== exportHash
    ) {
      throw new Error('Existing migration marker does not match this export and destination. No writes were started.');
    }
    if (state.status === 'completed') {
      console.log('This exact export has already been fully migrated to the destination; nothing to do.');
      return;
    }
    console.log('Found an incomplete migration for this exact export; safely resuming it.');
  } else {
    const nonEmptyCollections: string[] = [];
    for (const collectionName of Object.keys(data)) {
      const snapshot = await db.collection(collectionName).limit(1).get();
      if (!snapshot.empty) nonEmptyCollections.push(collectionName);
    }
    if (nonEmptyCollections.length > 0) {
      throw new Error(
        `Destination is not empty in these exported collections: ${nonEmptyCollections.join(', ')}. ` +
        'No data was changed. Use an empty destination project.'
      );
    }

    if (options.mode === 'dry-run') {
      console.log(`Dry run successful: ${DESTINATION_PROJECT_ID} has empty target collections.`);
      console.log('No migration writes were made. Re-run with --apply to import the export.');
      return;
    }

    state = {
      destinationProjectId: DESTINATION_PROJECT_ID,
      exportSha256: exportHash,
      exportFile: path.basename(options.exportPath),
      status: 'in_progress',
      completedCollections: [],
      documentCounts,
      updatedAt: new Date().toISOString()
    };
    await stateRef.create(state);
  }

  if (options.mode === 'dry-run') {
    console.log('Dry run successful: an incomplete marker for this exact export exists and can be resumed.');
    return;
  }

  for (const [collectionName, documents] of Object.entries(data)) {
    if (state.completedCollections.includes(collectionName)) {
      console.log(`Skipping already completed collection: ${collectionName}`);
      continue;
    }
    console.log(`Importing ${collectionName}: ${documents.length} documents.`);
    for (let index = 0; index < documents.length; index += BATCH_SIZE) {
      const batchDocuments = documents.slice(index, index + BATCH_SIZE);
      await commitBatch(db, collectionName, batchDocuments);
      console.log(`  Imported ${Math.min(index + batchDocuments.length, documents.length)} / ${documents.length}.`);
    }
    state.completedCollections.push(collectionName);
    state.updatedAt = new Date().toISOString();
    await stateRef.set(state);
  }

  state.status = 'completed';
  state.updatedAt = new Date().toISOString();
  await stateRef.set(state);
  console.log(`Migration completed: ${totalDocuments} documents imported to ${DESTINATION_PROJECT_ID}.`);
  console.log('Keep the source project and export until destination verification is complete.');
};

main().catch(error => {
  console.error(`Firestore migration stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
