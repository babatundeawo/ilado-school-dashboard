/* =========================================================
   db.js — tiny local-storage wrapper, shared by every page.
   Everything imported into this app is parsed in the browser
   and saved ONLY to this browser's localStorage. Nothing is
   ever sent to a server (this site has no backend at all).
   ========================================================= */
const STORE_KEY = "iscgs_register_v1";

const DB = {
  _cache: null,

  _empty(){
    return {
      students: [],
      results: [],
      marking: [],
      staff: { teaching: [], nonTeaching: [], corps: [] },
      meta: { imports: [] }
    };
  },

  load(){
    if(this._cache) return this._cache;
    try{
      const raw = localStorage.getItem(STORE_KEY);
      if(raw){
        this._cache = JSON.parse(raw);
      }else if(typeof window !== "undefined" && window.__PRELOADED__){
        // First run on this device: seed from the data baked into this build,
        // then save so it behaves exactly like an imported dataset from now on.
        this._cache = window.__PRELOADED__;
        this.save();
      }else{
        this._cache = this._empty();
      }
    }catch(e){
      console.error("Could not read local data, starting fresh.", e);
      this._cache = this._empty();
    }
    const empty = this._empty();
    for(const k in empty){ if(!(k in this._cache)) this._cache[k] = empty[k]; }
    return this._cache;
  },

  save(){
    try{
      localStorage.setItem(STORE_KEY, JSON.stringify(this._cache));
      return true;
    }catch(e){
      console.error("Could not save locally (storage may be full).", e);
      return false;
    }
  },

  clearAll(){
    localStorage.removeItem(STORE_KEY);
    this._cache = this._empty();
    this.save();
  },

  logImport(entry){
    const data = this.load();
    data.meta.imports.unshift({ ...entry, importedAt: new Date().toISOString() });
    data.meta.imports = data.meta.imports.slice(0, 30);
    this.save();
  }
};
