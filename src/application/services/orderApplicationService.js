import { getBackend } from '../backend';
export const orderApplicationService = { list: (query) => getBackend().listOrders(query) };
