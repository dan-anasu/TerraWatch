const STORAGE_KEY = 'terrawatch.monitoring-areas.v1';

/**
 * Persistence boundary for monitoring areas. Keep page code dependent on this
 * interface so localStorage can later be replaced by API-backed methods.
 */
export const areaRepository = {
  async list() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      throw new Error('Browser storage is unavailable. Enable local storage and try again.');
    }
    if (!raw) return [];
    try {
      const areas = JSON.parse(raw);
      if (!Array.isArray(areas)) throw new Error('invalid data');
      return areas;
    } catch {
      throw new Error('Saved monitoring areas could not be read. The local storage data may be damaged.');
    }
  },

  async create(area) {
    const areas = await this.list();
    const registrationTimestamp = new Date().toISOString();
    const record = {
      id: globalThis.crypto?.randomUUID?.() || `area-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name: area.name.trim(),
      description: area.description.trim(),
      areaType: area.areaType,
      geometry: area.geometry,
      areaHectares: area.areaHectares,
      areaSquareKilometres: area.areaSquareKilometres,
      registrationTimestamp,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...areas, record]));
    } catch {
      throw new Error('This area could not be saved. Check available browser storage and try again.');
    }
    return record;
  },

  async delete(id) {
    const areas = await this.list();
    const remaining = areas.filter((area) => area.id !== id);
    if (remaining.length === areas.length) throw new Error('This area is no longer in the registered areas list. Refresh and try again.');
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    } catch {
      throw new Error('This area could not be deleted from browser storage. Try again.');
    }
    return remaining;
  },
};
