import { base44Backend } from '@/infrastructure/base44/base44Backend';

let backend = base44Backend;
export function configureBackend(adapter) { backend = adapter; }
export function getBackend() { return backend; }
