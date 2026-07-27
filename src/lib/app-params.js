const DEFAULT_APP_ID = '6a5ed621ac293f2abc6083e5';

const isNode = typeof window === 'undefined';
const memoryStorage = new Map();

const storage = isNode
  ? {
      getItem: (key) => memoryStorage.get(key) ?? null,
      setItem: (key, value) => memoryStorage.set(key, String(value)),
      removeItem: (key) => memoryStorage.delete(key),
    }
  : window.localStorage;

const toSnakeCase = (value) =>
  value.replace(/([A-Z])/g, '_$1').toLowerCase();

const cleanValue = (value) => {
  if (typeof value !== 'string') return value;
  const cleaned = value.trim();
  return cleaned || undefined;
};

const getAppParamValue = (
  paramName,
  { defaultValue, removeFromUrl = false } = {},
) => {
  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const cleanedDefault = cleanValue(defaultValue);

  if (isNode) return cleanedDefault ?? null;

  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = cleanValue(urlParams.get(paramName));

  if (removeFromUrl && urlParams.has(paramName)) {
    urlParams.delete(paramName);
    const remainingQuery = urlParams.toString();
    const newUrl = `${window.location.pathname}${
      remainingQuery ? `?${remainingQuery}` : ''
    }${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  // Build configuration always wins over stale values saved by another app.
  if (cleanedDefault) {
    storage.setItem(storageKey, cleanedDefault);
    return cleanedDefault;
  }

  return cleanValue(storage.getItem(storageKey)) ?? null;
};

const getAppParams = () => {
  if (!isNode && getAppParamValue('clear_access_token') === 'true') {
    storage.removeItem('base44_access_token');
    storage.removeItem('token');
  }

  const configuredAppId =
    cleanValue(import.meta.env.VITE_BASE44_APP_ID) || DEFAULT_APP_ID;

  const configuredFunctionsVersion = cleanValue(
    import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
  );

  const configuredBaseUrl = cleanValue(
    import.meta.env.VITE_BASE44_APP_BASE_URL,
  );

  const appId = getAppParamValue('app_id', {
    defaultValue: configuredAppId,
  });

  if (!appId) {
    throw new Error('SalonFlow could not determine the Base44 app ID.');
  }

  return {
    appId,
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', {
      defaultValue: isNode ? undefined : window.location.href,
    }),
    functionsVersion: getAppParamValue('functions_version', {
      defaultValue: configuredFunctionsVersion,
    }),
    appBaseUrl: getAppParamValue('app_base_url', {
      defaultValue: configuredBaseUrl,
    }),
  };
};

export const appParams = getAppParams();
