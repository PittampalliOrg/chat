// lib/repository/factory.ts  – production‑ready, fully‑typed
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { createClient, type RedisClientType } from 'redis';
import { DaprClient, CommunicationProtocolEnum } from '@dapr/dapr';
import { v4 as uuid } from 'uuid';
import type { Item } from '@/lib/repository/types';

/* ------------------------------------------------------------------ */
/*  Public contracts                                                  */
/* ------------------------------------------------------------------ */
export interface Repository {
  dispose(): Promise<void>;
  isReal(): boolean;
  get(id: string): Promise<Item | null>;
  list(): Promise<Item[]>;
  update(i: Item): Promise<Item | null>;
  create(i: Item): Promise<Item>;
  delete(id: string): Promise<void>;
}
export interface RepositoryFactory { create(): Promise<Repository>; }

/* ------------------------------------------------------------------ */
/*  Factory selector – precedence: Dapr ▸ Mongo ▸ Redis ▸ Postgres ▸ Mem */
/* ------------------------------------------------------------------ */
export function createFactory(): RepositoryFactory {
  if (process.env.CONNECTION_STATESTORE_COMPONENTNAME)
    return new DaprFactory(process.env.CONNECTION_STATESTORE_COMPONENTNAME);

  if (process.env.CONNECTION_MONGODB_CONNECTIONSTRING)
    return new MongoFactory(process.env.CONNECTION_MONGODB_CONNECTIONSTRING);

  if (process.env.CONNECTION_REDIS_URL)
    return new RedisFactory(process.env.CONNECTION_REDIS_URL);

  if (process.env.CONNECTION_POSTGRES_HOST) {
    const {
      CONNECTION_POSTGRES_HOST: host,
      CONNECTION_POSTGRES_PORT: port = '5432',
      CONNECTION_POSTGRES_USERNAME: user = '',
      CONNECTION_POSTGRES_PASSWORD: pass = '',
      CONNECTION_POSTGRES_DATABASE: db = '',
    } = process.env;
    return new PostgresFactory(`postgresql://${user}:${pass}@${host}:${port}/${db}`);
  }
  return new InMemoryFactory();
}

/* ------------------------------------------------------------------ */
/*  In‑memory implementation                                          */
/* ------------------------------------------------------------------ */
class InMemoryFactory implements RepositoryFactory {
  private readonly store: Record<string, Item> = {};
  async create() { return new InMemoryRepo(this.store); }
}
class InMemoryRepo implements Repository {
  constructor(private readonly s: Record<string, Item>) {}
  isReal() { return false; }
  dispose() { return Promise.resolve(); }
  get(id: string) { return Promise.resolve(this.s[id] ?? null); }
  list() { return Promise.resolve(Object.values(this.s)); }
  update(i: Item) { if(!i.id||!this.s[i.id]) return null as any; this.s[i.id]=i; return Promise.resolve(i); }
  create(i: Item) { i.id=uuid(); this.s[i.id]=i; return Promise.resolve(i); }
  delete(id: string) { delete this.s[id]; return Promise.resolve(); }
}

/* ------------------------------------------------------------------ */
/*  MongoDB                                                            */
/* ------------------------------------------------------------------ */
class MongoFactory implements RepositoryFactory {
  constructor(private readonly cs: string) {}
  async create() { const c=new MongoClient(this.cs); await c.connect(); return new MongoRepo(c); }
}
class MongoRepo implements Repository {
  constructor(private readonly c: MongoClient) {}
  private col() { return this.c.db('todos').collection<Item>('todos'); }
  isReal(){ return true; }
  dispose(){ return this.c.close(); }
  get(id: string){ return this.col().findOne({id}); }
  list(){ return this.col().find({}).toArray(); }
  async update(i: Item){ if(!i.id) return null; const r=await this.col().findOneAndReplace({id:i.id},i,{returnDocument:'after'}); return (r as any)?.value ?? null; }
  async create(i: Item){ i.id=uuid(); await this.col().insertOne(i); return i; }
  async delete(id: string){ await this.col().deleteOne({id}); }
}

/* ------------------------------------------------------------------ */
/*  PostgreSQL                                                         */
/* ------------------------------------------------------------------ */
class PostgresFactory implements RepositoryFactory {
  constructor(private readonly cs: string) {}
  async create() { const p=new Pool({connectionString:this.cs}); await p.query(`
      CREATE TABLE IF NOT EXISTS items(id UUID PRIMARY KEY,title TEXT NOT NULL,done BOOLEAN NOT NULL)`); return new PostgresRepo(p); }
}
class PostgresRepo implements Repository {
  constructor(private readonly p:Pool){}
  isReal(){return true;}
  dispose(){return this.p.end();}
  async get(id:string){const{rows}=await this.p.query('SELECT * FROM items WHERE id=$1',[id]);return rows[0]??null;}
  async list(){const{rows}=await this.p.query('SELECT * FROM items');return rows;}
  async update(i:Item){const{rows}=await this.p.query('UPDATE items SET title=$1,done=$2 WHERE id=$3 RETURNING *',[i.title,i.done,i.id]);return rows[0]??null;}
  async create(i:Item){i.id=uuid();const{rows}=await this.p.query('INSERT INTO items(id,title,done)VALUES($1,$2,$3) RETURNING *',[i.id,i.title,i.done]);return rows[0];}
  async delete(id:string){await this.p.query('DELETE FROM items WHERE id=$1',[id]);}
}

/* ------------------------------------------------------------------ */
/*  Redis (node‑redis v4)                                              */
/* ------------------------------------------------------------------ */
class RedisFactory implements RepositoryFactory {
  constructor(private readonly url:string){}
  async create(){const r:RedisClientType=createClient({url:this.url});r.on('error',(e)=>console.error('[redis]',e));await r.connect();return new RedisRepo(r);}
}
class RedisRepo implements Repository{
  constructor(private readonly r:RedisClientType){}
  isReal(){return true;}
  async dispose(){await this.r.quit();}
  async get(id:string){const v=await this.r.hGet('items',id);return v?JSON.parse(v):null;}
  async list(){return (await this.r.hVals('items')).map((s)=>JSON.parse(s));}
  async update(i:Item){if(!i.id) return null;const ex=await this.r.hExists('items',i.id);if(!ex) return null;await this.r.hSet('items',i.id,JSON.stringify(i));return i;}
  async create(i:Item){i.id=uuid();await this.r.hSet('items',i.id,JSON.stringify(i));return i;}
  async delete(id:string){await this.r.hDel('items',id);}
}

/* ------------------------------------------------------------------ */
/*  Dapr state‑store  (new: one key per item + index key)              */
/* ------------------------------------------------------------------ */
const INDEX_KEY = 'items-index';
class DaprFactory implements RepositoryFactory {
  constructor(private readonly component:string){}
  async create(){return new DaprRepo(this.component,new DaprClient({communicationProtocol:CommunicationProtocolEnum.GRPC}));}
}

class DaprRepo implements Repository {
  constructor(private readonly store:string, private readonly c:DaprClient){}
  async dispose(){await this.c.stop();}
  isReal(){return true;}

  /* ---------- helpers ---------- */
  private async getIndex():Promise<string[]>{
    const raw = (await this.c.state.get(this.store, INDEX_KEY)) as string | undefined;
    if(!raw||raw==='') return [];
    return typeof raw==='string'?JSON.parse(raw):raw as unknown as string[];
  }
  private async saveIndex(ids:string[]){ await this.c.state.save(this.store,[{key:INDEX_KEY,value:ids}]); }
  private key(id:string){ return `item:${id}`; }

  /* ---------- CRUD ---------- */
  async get(id:string){
    const st = await this.c.state.get(this.store,this.key(id));
    return st ? (typeof st==='string'?JSON.parse(st as string):st as Item) : null;
  }

  async list(){
    const ids = await this.getIndex();
    if(ids.length===0) return [];
    // bulk‑get is more efficient than N×get
    const bulk = await this.c.state.getBulk(this.store, ids.map(this.key));
    return bulk.map((b:any)=>(typeof b.data==='string'?JSON.parse(b.data):b.data) as Item);
  }

  async create(i:Item){
    i.id = uuid();
    const ids = await this.getIndex();
    ids.push(i.id);
    await this.c.state.save(this.store,[
      {key:this.key(i.id), value:i},
      {key:INDEX_KEY, value:ids}
    ]);
    return i;
  }

  async update(i:Item){
    if(!i.id) return null;
    const exists = await this.get(i.id);
    if(!exists) return null;
    await this.c.state.save(this.store,[{key:this.key(i.id), value:i}]);
    return i;
  }

  async delete(id:string){
    const ids = await this.getIndex();
    const next = ids.filter(x=>x!==id);
    await this.c.state.delete(this.store,this.key(id));
    await this.saveIndex(next);
  }
}
