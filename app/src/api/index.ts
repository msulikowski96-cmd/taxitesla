import { DEMO_MODE } from '../config';
import { localApi } from './local';
import { remoteApi } from './remote';

export const api = DEMO_MODE ? localApi : remoteApi;
export * from './types';
