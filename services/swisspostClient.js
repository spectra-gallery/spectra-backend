const axios = require('axios');

function buildClient({ baseURL, apiKey, apiKeyHeader = 'X-Apim-Api-Key', apiClientId, apiClientSecret, timeout = 8000 }) {
  const instance = axios.create({ baseURL, timeout });
  instance.interceptors.request.use((config) => {
    if (apiKey) config.headers[apiKeyHeader] = apiKey;
    if (apiClientId) config.headers['X-Client-Id'] = apiClientId;
    if (apiClientSecret) config.headers['X-Client-Secret'] = apiClientSecret;
    return config;
  });
  return instance;
}

const countryFields = 'isoCode,displayName';

class SwissPostClient {
  constructor({ baseURL, apiKey, apiKeyHeader, apiClientId, apiClientSecret, countriesPath = '/countries', productsPath = '/products', paramMap } = {}) {
    this.http = buildClient({ baseURL, apiKey, apiKeyHeader, apiClientId, apiClientSecret });
    this.countriesPath = countriesPath;
    this.productsPath = productsPath;
    this.paramMap = Object.assign({ isoCode: 'isoCode', format: 'format', weight: 'weight', lang: 'lang', fields: 'fields' }, paramMap);
  }

  async getCountries({ lang = 'en' } = {}) {
    const params = {};
    params[this.paramMap.lang] = lang;
    params[this.paramMap.fields] = countryFields;
    const { data } = await this.http.get(this.countriesPath, { params });
    return Array.isArray(data?.countries) ? data.countries : [];
  }

  async getProducts({ isoCode, format, weight }) {
    const params = {};
    params[this.paramMap.isoCode] = String(isoCode || '').toUpperCase();
    params[this.paramMap.format] = format;
    params[this.paramMap.weight] = Number(weight);
    const { data } = await this.http.get(this.productsPath, { params });
    return data;
  }
}

class SwissPostAddressClient {
  constructor({ baseURL, apiKey, apiKeyHeader, apiClientId, apiClientSecret, validatePath = '/addresses/validate' }) {
    this.http = buildClient({ baseURL, apiKey, apiKeyHeader, apiClientId, apiClientSecret });
    this.validatePath = validatePath;
  }

  async validateAddress({ street, zip, city, countryIso2 }) {
    const payload = { street, zip, city, countryIso2 };
    const { data } = await this.http.post(this.validatePath, payload);
    return data;
  }
}

module.exports = { SwissPostClient, SwissPostAddressClient };
